import { createError } from 'h3'

import {
  getHighestEffectiveRole,
  hasRoleAtLeast,
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
import { db, type Prisma } from '#server/utils/db'
import { serializeDataset } from '#server/utils/datasets'

type DatasetPermissionAction = 'read' | 'create' | 'update' | 'delete' | 'import' | 'export'

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

type PermissionRow = Prisma.AuthBidangDatasetPermissionGetPayload<{
  include: {
    bidang: {
      select: {
        id: true
        name: true
        description: true
      }
    }
    dataset: true
  }
}>

function getDatasetPermissionField(action: DatasetPermissionAction) {
  switch (action) {
    case 'create':
      return 'canCreate'
    case 'update':
      return 'canUpdate'
    case 'delete':
      return 'canDelete'
    case 'import':
      return 'canImport'
    case 'export':
      return 'canExport'
    case 'read':
    default:
      return 'canRead'
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

export async function listAccessibleDatasetsForUser(user: ScopedUser) {
  const scope = await getUserDataScope(user)

  if (scope.isSuperAdmin) {
    const [datasets, bidangs] = await Promise.all([
      db.dataset.findMany({
        orderBy: [
          { name: 'asc' },
          { id: 'asc' }
        ]
      }),
      listBidangOptions()
    ])

    return datasets.map((dataset) => {
      const serializedDataset = serializeDataset(dataset)

      return {
        ...serializedDataset,
        regionLevel: getDatasetRegionLevel(dataset.dataConfig),
        permissions: {
          canRead: true,
          canCreate: true,
          canUpdate: true,
          canDelete: true,
          canImport: true,
          canExport: true,
          isSuperAdmin: true
        },
        ownerBidangsForCreate: bidangs,
        ownerBidangsForImport: bidangs,
        updateBidangIds: bidangs.map(bidang => bidang.id),
        deleteBidangIds: bidangs.map(bidang => bidang.id)
      }
    })
  }

  if (scope.bidangIds.length === 0) {
    return []
  }

  const rows = await db.authBidangDatasetPermission.findMany({
    where: {
      bidangId: {
        in: [...scope.bidangIds]
      }
    },
    orderBy: [
      { datasetId: 'asc' },
      { bidangId: 'asc' }
    ],
    include: {
      bidang: {
        select: {
          id: true,
          name: true,
          description: true
        }
      },
      dataset: true
    }
  }) as PermissionRow[]

  const datasetsById = new Map<string, ReturnType<typeof serializeDataset> & {
    regionLevel: string | null
    permissions: {
      canRead: boolean
      canCreate: boolean
      canUpdate: boolean
      canDelete: boolean
      canImport: boolean
      canExport: boolean
      isSuperAdmin: boolean
    }
    ownerBidangsForCreate: Array<{
      id: string
      name: string
      description?: string | null
    }>
    ownerBidangsForImport: Array<{
      id: string
      name: string
      description?: string | null
    }>
    updateBidangIds: string[]
    deleteBidangIds: string[]
  }>()

  for (const row of rows) {
    const existing = datasetsById.get(row.datasetId)

    if (!existing) {
      datasetsById.set(row.datasetId, {
        ...serializeDataset(row.dataset),
        regionLevel: getDatasetRegionLevel(row.dataset.dataConfig),
        permissions: {
          canRead: row.canRead,
          canCreate: row.canCreate,
          canUpdate: row.canUpdate,
          canDelete: row.canDelete,
          canImport: row.canImport,
          canExport: row.canExport,
          isSuperAdmin: false
        },
        ownerBidangsForCreate: row.canCreate ? [row.bidang] : [],
        ownerBidangsForImport: row.canImport ? [row.bidang] : [],
        updateBidangIds: row.canUpdate ? [row.bidangId] : [],
        deleteBidangIds: row.canDelete ? [row.bidangId] : []
      })

      continue
    }

    existing.permissions.canRead ||= row.canRead
    existing.permissions.canCreate ||= row.canCreate
    existing.permissions.canUpdate ||= row.canUpdate
    existing.permissions.canDelete ||= row.canDelete
    existing.permissions.canImport ||= row.canImport
    existing.permissions.canExport ||= row.canExport

    if (row.canCreate && !existing.ownerBidangsForCreate.some(bidang => bidang.id === row.bidangId)) {
      existing.ownerBidangsForCreate.push(row.bidang)
    }

    if (row.canImport && !existing.ownerBidangsForImport.some(bidang => bidang.id === row.bidangId)) {
      existing.ownerBidangsForImport.push(row.bidang)
    }

    if (row.canUpdate && !existing.updateBidangIds.includes(row.bidangId)) {
      existing.updateBidangIds.push(row.bidangId)
    }

    if (row.canDelete && !existing.deleteBidangIds.includes(row.bidangId)) {
      existing.deleteBidangIds.push(row.bidangId)
    }
  }

  return Array.from(datasetsById.values())
    .filter(dataset => dataset.permissions.canRead)
    .sort((left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id))
}

export async function assertDatasetPermissionForUser(user: ScopedUser, options: {
  readonly datasetId: string
  readonly action: DatasetPermissionAction
  readonly ownerBidangId?: string | null
}) {
  const scope = await getUserDataScope(user)

  if (scope.isSuperAdmin) {
    return scope
  }

  if (scope.bidangIds.length === 0) {
    throw getForbiddenError()
  }

  if (options.action === 'read' || options.action === 'export') {
    const row = await db.authBidangDatasetPermission.findFirst({
      where: {
        datasetId: options.datasetId,
        bidangId: {
          in: [...scope.bidangIds]
        },
        [getDatasetPermissionField(options.action)]: true
      },
      select: {
        id: true
      }
    })

    if (!row) {
      throw getForbiddenError()
    }

    return scope
  }

  const ownerBidangId = options.ownerBidangId?.trim()

  if (!ownerBidangId || !scope.bidangIdSet.has(ownerBidangId)) {
    throw getForbiddenError()
  }

  const row = await db.authBidangDatasetPermission.findFirst({
    where: {
      datasetId: options.datasetId,
      bidangId: ownerBidangId,
      [getDatasetPermissionField(options.action)]: true
    },
    select: {
      id: true
    }
  })

  if (!row) {
    throw getForbiddenError()
  }

  return scope
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
  readonly ownerBidangId: string
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
  readonly ownerBidang: {
    readonly name: string
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
    ownerBidangId: record.ownerBidangId,
    ownerBidangName: record.ownerBidang.name,
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
