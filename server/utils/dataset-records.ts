import { createError } from 'h3'

import {
  appPermissions,
  getHighestEffectiveRole,
  hasAccessForRole,
  hasRoleAtLeast,
  type AppAccessRequest,
  type AppRoleSlug
} from '~~/auth/permissions'
import {
  formatDatasetPeriod,
  getDatasetPeriodicity,
  getDatasetRegionLevel,
  normalizeDatasetPeriodInput,
  validateDatasetRecordData
} from '~~/shared/datasets'
import { getAssignedBidangIdsForUser, listBidangOptions } from '#server/utils/bidang'
import { db } from '#server/utils/db'
import { serializeDataset } from '#server/utils/datasets'

type DatasetPermissionAction = 'read' | 'create' | 'update' | 'delete'

type ScopedUser = {
  readonly id: string
  readonly role?: string | null
}

type UserDataScope = {
  readonly highestRole: AppRoleSlug
  readonly isSuperAdmin: boolean
  readonly bidangIds: readonly string[]
  readonly bidangIdSet: ReadonlySet<string>
}

type OwnedDatasetRow = {
  readonly id: string
  readonly ownerBidangId: string
  readonly name: string
  readonly description: string | null
  readonly dataSchema: unknown
  readonly dataConfig: unknown
  readonly archivedAt: Date | null
  readonly createdAt: Date
  readonly updatedAt: Date
  readonly ownerBidang: {
    readonly id: string
    readonly name: string
    readonly description: string | null
  }
}

type DatasetPermissionContext = {
  readonly scope: UserDataScope
  readonly dataset: ReturnType<typeof serializeOwnedDataset>
}

function getDatasetActionPermission(action: DatasetPermissionAction): AppAccessRequest {
  switch (action) {
    case 'create':
      return appPermissions.businessDataCreate
    case 'update':
      return appPermissions.businessDataUpdate
    case 'delete':
      return appPermissions.businessDataDelete
    case 'read':
    default:
      return appPermissions.businessDataRead
  }
}

function getForbiddenError() {
  return createError({
    statusCode: 403,
    statusMessage: 'Forbidden'
  })
}

function getDataManagementAccessError() {
  return createError({
    statusCode: 403,
    statusMessage: 'Only operator, admin, or super-admin roles can access operational data management.'
  })
}

function assertDatasetActionCapability(user: ScopedUser, action: DatasetPermissionAction) {
  if (!hasAccessForRole(user.role, getDatasetActionPermission(action))) {
    throw getForbiddenError()
  }
}

function getPermissionFlags(user: ScopedUser, archivedAt?: Date | null) {
  const isArchived = !!archivedAt

  return {
    canRead: hasAccessForRole(user.role, getDatasetActionPermission('read')),
    canCreate: !isArchived && hasAccessForRole(user.role, getDatasetActionPermission('create')),
    canUpdate: !isArchived && hasAccessForRole(user.role, getDatasetActionPermission('update')),
    canDelete: !isArchived && hasAccessForRole(user.role, getDatasetActionPermission('delete'))
  }
}

function serializeOwnedDataset(dataset: OwnedDatasetRow, user: ScopedUser, isSuperAdmin: boolean) {
  const serializedDataset = serializeDataset(dataset)
  const permissions = getPermissionFlags(user, dataset.archivedAt)

  return {
    ...serializedDataset,
    regionLevel: getDatasetRegionLevel(dataset.dataConfig),
    permissions: {
      ...permissions,
      isSuperAdmin
    }
  }
}

async function getScopedBidangIdsForUser(user: ScopedUser, highestRole: AppRoleSlug) {
  if (highestRole === 'admin') {
    const bidangs = await db.authBidang.findMany({
      orderBy: {
        id: 'asc'
      },
      select: {
        id: true
      }
    })

    return bidangs.map(bidang => bidang.id)
  }

  if (highestRole !== 'operator') {
    return []
  }

  return getAssignedBidangIdsForUser(user.id)
}

async function listBidangOptionsForScope(scope: UserDataScope) {
  if (scope.bidangIds.length === 0) {
    return []
  }

  const bidangs = await listBidangOptions()

  return bidangs.filter(bidang => scope.bidangIdSet.has(bidang.id))
}

export async function getUserDataScope(user: ScopedUser): Promise<UserDataScope> {
  const highestRole = getHighestEffectiveRole(user.role)

  if (!hasRoleAtLeast(highestRole, 'operator')) {
    throw getDataManagementAccessError()
  }

  if (highestRole === 'super-admin') {
    const bidangs = await db.authBidang.findMany({
      orderBy: {
        id: 'asc'
      },
      select: {
        id: true
      }
    })
    const bidangIds = bidangs.map(bidang => bidang.id)

    return {
      highestRole,
      isSuperAdmin: true,
      bidangIds,
      bidangIdSet: new Set(bidangIds)
    }
  }

  const bidangIds = await getScopedBidangIdsForUser(user, highestRole)

  return {
    highestRole,
    isSuperAdmin: false,
    bidangIds,
    bidangIdSet: new Set(bidangIds)
  }
}

export async function listAccessibleBidangsForUser(user: ScopedUser) {
  const scope = await getUserDataScope(user)

  return listBidangOptionsForScope(scope)
}

export async function listDataManagementOptionsForUser(user: ScopedUser) {
  const scope = await getUserDataScope(user)
  const bidangs = await listBidangOptionsForScope(scope)
  const bidangIds = bidangs.map(bidang => bidang.id)
  const datasetsByBidang = Object.fromEntries(
    bidangs.map(bidang => [bidang.id, [] as Array<ReturnType<typeof serializeOwnedDataset>>])
  )

  if (bidangs.length === 0) {
    return {
      bidangs,
      datasetsByBidang
    }
  }

  const ownedDatasets = await db.dataset.findMany({
    where: {
      ownerBidangId: {
        in: bidangIds
      }
    },
    orderBy: [
      { ownerBidangId: 'asc' },
      { name: 'asc' },
      { id: 'asc' }
    ],
    include: {
      ownerBidang: {
        select: {
          id: true,
          name: true,
          description: true
        }
      }
    }
  })

  for (const dataset of ownedDatasets) {
    datasetsByBidang[dataset.ownerBidangId]?.push(
      serializeOwnedDataset(dataset, user, scope.isSuperAdmin)
    )
  }

  return {
    bidangs,
    datasetsByBidang
  }
}

export async function getDatasetPermissionContextForUser(user: ScopedUser, options: {
  readonly datasetId: string
  readonly action: DatasetPermissionAction
  readonly bidangId?: string | null
}) {
  const scope = await getUserDataScope(user)
  const dataset = await db.dataset.findUnique({
    where: {
      id: options.datasetId
    },
    include: {
      ownerBidang: {
        select: {
          id: true,
          name: true,
          description: true
        }
      }
    }
  })

  if (!dataset) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Dataset not found.'
    })
  }

  assertDatasetActionCapability(user, options.action)

  const ownerBidangId = dataset.ownerBidangId.trim()

  if (options.bidangId?.trim() && options.bidangId.trim() !== ownerBidangId) {
    throw getForbiddenError()
  }

  if (!scope.bidangIdSet.has(ownerBidangId)) {
    throw getForbiddenError()
  }

  if (options.action !== 'read' && dataset.archivedAt) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Dataset is archived and read-only.'
    })
  }

  return {
    scope,
    dataset: serializeOwnedDataset(dataset, user, scope.isSuperAdmin)
  } satisfies DatasetPermissionContext
}

export async function assertDatasetPermissionForUser(user: ScopedUser, options: {
  readonly datasetId: string
  readonly action: DatasetPermissionAction
  readonly bidangId?: string | null
}) {
  return getDatasetPermissionContextForUser(user, options)
}

export async function assertRegionAllowedForDataset(dataset: {
  readonly dataConfig: unknown
}, regionId: string) {
  const region = await db.region.findUnique({
    where: {
      id: regionId
    },
    select: {
      id: true,
      name: true,
      level: true,
      parentId: true
    }
  })

  if (!region) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Selected region was not found.'
    })
  }

  const regionLevel = getDatasetRegionLevel(dataset.dataConfig)

  if (regionLevel && region.level.toUpperCase() !== regionLevel) {
    throw createError({
      statusCode: 400,
      statusMessage: `Selected region must use the ${regionLevel} level.`
    })
  }

  return region
}

export function buildDatasetRecordPayload(dataset: {
  readonly dataSchema: unknown
  readonly dataConfig: unknown
}, input: {
  readonly periodValue: unknown
  readonly status?: string | null
  readonly data: unknown
}) {
  const periodDate = normalizeDatasetPeriodInput(
    getDatasetPeriodicity(dataset.dataConfig),
    input.periodValue
  )
  const { data, issues } = validateDatasetRecordData(dataset.dataSchema, input.data)

  if (issues.length > 0) {
    throw createError({
      statusCode: 400,
      statusMessage: issues[0]?.message || 'Invalid dataset data payload.'
    })
  }

  const status = input.status?.trim() || 'draft'

  if (!status) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Status is required.'
    })
  }

  return {
    periodDate,
    status,
    data
  }
}

export function serializeDatasetRecord(record: {
  readonly id: string
  readonly datasetId: string
  readonly regionId: string
  readonly periodDate: Date
  readonly status: string
  readonly data: unknown
  readonly createdAt: Date
  readonly updatedAt: Date
  readonly createdBy: string
  readonly region: {
    readonly name: string
    readonly level: string
  }
  readonly creator: {
    readonly name: string
  }
}, options: {
  readonly periodicity: ReturnType<typeof getDatasetPeriodicity>
  readonly canUpdate: boolean
  readonly canDelete: boolean
}) {
  const periodDate = record.periodDate.toISOString().slice(0, 10)

  return {
    id: record.id,
    datasetId: record.datasetId,
    regionId: record.regionId,
    regionName: record.region.name,
    regionLevel: record.region.level,
    periodDate,
    periodLabel: formatDatasetPeriod(options.periodicity, periodDate),
    status: record.status,
    data: record.data as Record<string, unknown>,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    createdBy: record.createdBy,
    createdByName: record.creator.name,
    permissions: {
      canUpdate: options.canUpdate,
      canDelete: options.canDelete
    }
  }
}
