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
  getDatasetMode,
  getDatasetPeriodRange,
  getDatasetPeriodicity,
  getDatasetRegionLevel,
  getDatasetRecordPeriodRangeError,
  getDatasetSchemaFields,
  normalizeDatasetPeriodInput,
  validateCanonicalDatasetPeriodDate,
  validateDatasetRecordData
} from '~~/shared/datasets'
import { getAssignedBidangIdsForUser, listBidangOptions } from '#server/utils/bidang'
import { db } from '#server/utils/db'
import { serializeDataset } from '#server/utils/datasets'
import { getSumbawaBaratRegionScopeWhere } from '#server/utils/region-scope'

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
  const datasetContext = await getDatasetPermissionContextForUser(user, options)

  if (getDatasetMode(datasetContext.dataset.dataConfig) !== 'REGIONAL') {
    throw createError({
      statusCode: 409,
      statusMessage: 'TABULAR datasets use DatasetTableRecord storage and are not available through DatasetRecord operations.'
    })
  }

  return datasetContext
}

export async function listDatasetPeriodOverviewForUser(user: ScopedUser, datasetId: string) {
  const datasetContext = await getDatasetPermissionContextForUser(user, {
    datasetId,
    action: 'read'
  })
  const { dataset } = datasetContext
  const mode = getDatasetMode(dataset.dataConfig)
  const periodDates = getDatasetPeriodRange(dataset.dataConfig)

  if (mode === 'TABULAR') {
    const periodAggregates = await db.datasetTableRecord.groupBy({
      by: ['periodDate'],
      where: {
        datasetId,
        periodDate: periodDates.length > 0
          ? {
              gte: new Date(`${periodDates[0]}T00:00:00.000Z`),
              lte: new Date(`${periodDates[periodDates.length - 1]}T00:00:00.000Z`)
            }
          : undefined
      },
      _count: {
        _all: true
      },
      _max: {
        updatedAt: true
      }
    })
    const aggregatesByPeriod = new Map(
      periodAggregates.map(period => [
        period.periodDate.toISOString().slice(0, 10),
        {
          recordCount: period._count._all,
          latestUpdatedAt: period._max.updatedAt?.toISOString() ?? null
        }
      ])
    )

    return {
      datasetId,
      mode,
      expectedRegionCount: null,
      periods: periodDates.map(periodDate => {
        const aggregate = aggregatesByPeriod.get(periodDate)

        return {
          periodDate,
          recordCount: aggregate?.recordCount ?? 0,
          latestUpdatedAt: aggregate?.latestUpdatedAt ?? null
        }
      })
    }
  }

  if (mode !== 'REGIONAL') {
    throw createError({
      statusCode: 409,
      statusMessage: 'Dataset mode is not supported for period overview.'
    })
  }

  const regionLevel = getDatasetRegionLevel(dataset.dataConfig)
  const [periodAggregates, expectedRegionCount] = await Promise.all([
    db.datasetRecord.groupBy({
      by: ['periodDate'],
      where: {
        datasetId,
        periodDate: periodDates.length > 0
          ? {
              gte: new Date(`${periodDates[0]}T00:00:00.000Z`),
              lte: new Date(`${periodDates[periodDates.length - 1]}T00:00:00.000Z`)
            }
          : undefined
      },
      _count: {
        _all: true
      },
      _max: {
        updatedAt: true
      }
    }),
    regionLevel
      ? db.region.count({
          where: getSumbawaBaratRegionScopeWhere(regionLevel)
        })
      : Promise.resolve(0)
  ])
  const aggregatesByPeriod = new Map(
    periodAggregates.map(period => [
      period.periodDate.toISOString().slice(0, 10),
      {
        recordCount: period._count._all,
        latestUpdatedAt: period._max.updatedAt?.toISOString() ?? null
      }
    ])
  )

  return {
    datasetId,
    mode,
    expectedRegionCount,
    periods: periodDates.map(periodDate => {
      const aggregate = aggregatesByPeriod.get(periodDate)

      return {
        periodDate,
        recordCount: aggregate?.recordCount ?? 0,
        latestUpdatedAt: aggregate?.latestUpdatedAt ?? null
      }
    })
  }
}

export async function getDatasetPeriodWorkspaceForUser(user: ScopedUser, options: {
  readonly datasetId: string
  readonly periodDate: string
}) {
  const datasetContext = await assertDatasetPermissionForUser(user, {
    datasetId: options.datasetId,
    action: 'read'
  })
  const { dataset } = datasetContext
  const periodicity = getDatasetPeriodicity(dataset.dataConfig)
  let periodDate: string

  try {
    periodDate = validateCanonicalDatasetPeriodDate(periodicity, options.periodDate)
  } catch (error) {
    throw createError({
      statusCode: 400,
      statusMessage: error instanceof Error ? error.message : 'Period is invalid.'
    })
  }

  const periodRangeError = getDatasetRecordPeriodRangeError(dataset.dataConfig, periodDate)

  if (periodRangeError) {
    throw createError({
      statusCode: 400,
      statusMessage: periodRangeError
    })
  }

  const regionLevel = getDatasetRegionLevel(dataset.dataConfig)
  const [regions, records] = await Promise.all([
    regionLevel
      ? db.region.findMany({
          where: getSumbawaBaratRegionScopeWhere(regionLevel),
          orderBy: [{ parent: { name: 'asc' } }, { name: 'asc' }, { id: 'asc' }],
          select: {
            id: true,
            name: true,
            level: true,
            parent: {
              select: {
                id: true,
                name: true
              }
            }
          }
        })
      : Promise.resolve([]),
    db.datasetRecord.findMany({
      where: {
        datasetId: dataset.id,
        periodDate: new Date(`${periodDate}T00:00:00.000Z`)
      },
      select: {
        id: true,
        regionId: true,
        status: true,
        data: true,
        updatedAt: true
      }
    })
  ])
  const recordsByRegionId = new Map(records.map(record => [record.regionId, record]))

  return {
    dataset: {
      id: dataset.id,
      name: dataset.name,
      periodicity,
      regionLevel,
      archivedAt: dataset.archivedAt,
      fields: getDatasetSchemaFields(dataset.dataSchema),
      permissions: {
        canCreate: dataset.permissions.canCreate,
        canUpdate: dataset.permissions.canUpdate
      }
    },
    periodDate,
    expectedRegionCount: regions.length,
    recordCount: records.length,
    rows: regions.map((region) => {
      const record = recordsByRegionId.get(region.id)

      return {
        regionId: region.id,
        regionName: region.name,
        parentRegionId: region.parent?.id ?? null,
        parentRegionName: region.parent?.name ?? null,
        regionLevel: region.level,
        record: record
          ? {
              id: record.id,
              status: record.status,
              data: record.data as Record<string, unknown>,
              updatedAt: record.updatedAt.toISOString()
            }
          : null
      }
    })
  }
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

export function assertDatasetPeriodInCoverage(dataConfig: unknown, periodDate: string) {
  const periodRangeError = getDatasetRecordPeriodRangeError(dataConfig, periodDate)

  if (periodRangeError) {
    throw createError({
      statusCode: 400,
      statusMessage: periodRangeError
    })
  }
}

function createDatasetRecordPayload(dataset: {
  readonly dataSchema: unknown
}, periodDate: string, input: {
  readonly status?: string | null
  readonly data: unknown
}) {
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

export function buildDatasetRecordPayload(dataset: {
  readonly dataSchema: unknown
  readonly dataConfig: unknown
}, input: {
  readonly periodValue: unknown
  readonly status?: string | null
  readonly data: unknown
}) {
  const periodDate = normalizeDatasetPeriodInput(getDatasetPeriodicity(dataset.dataConfig), input.periodValue)

  assertDatasetPeriodInCoverage(dataset.dataConfig, periodDate)

  return createDatasetRecordPayload(dataset, periodDate, input)
}

export function buildDatasetRecordPayloadFromCanonicalPeriodDate(dataset: {
  readonly dataSchema: unknown
  readonly dataConfig: unknown
}, input: {
  readonly periodDate: unknown
  readonly status?: string | null
  readonly data: unknown
}) {
  const periodDate = validateCanonicalDatasetPeriodDate(getDatasetPeriodicity(dataset.dataConfig), input.periodDate)

  assertDatasetPeriodInCoverage(dataset.dataConfig, periodDate)

  return createDatasetRecordPayload(dataset, periodDate, input)
}

export function comparableDatasetValue(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(comparableDatasetValue).join(',')}]`
  }

  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${comparableDatasetValue(item)}`)
      .join(',')}}`
  }

  return JSON.stringify(value)
}

function isDatasetTransactionConflict(error: unknown) {
  return !!error
    && typeof error === 'object'
    && 'code' in error
    && (error.code === 'P2002' || error.code === 'P2034')
}

export async function commitDatasetPeriodRows(user: ScopedUser, options: {
  readonly datasetId: string
  readonly periodDate: string
  readonly rows: readonly { readonly regionId: string, readonly data: unknown }[]
  readonly source: 'bulk_entry' | 'period_import'
}) {
  const datasetContext = await assertDatasetPermissionForUser(user, {
    datasetId: options.datasetId,
    action: 'read'
  })
  const dataset = datasetContext.dataset

  if (dataset.archivedAt) {
    throw createError({ statusCode: 409, statusMessage: 'Dataset is archived and read-only.' })
  }

  let periodDate: string

  try {
    periodDate = validateCanonicalDatasetPeriodDate(getDatasetPeriodicity(dataset.dataConfig), options.periodDate)
  } catch (error) {
    throw createError({
      statusCode: 400,
      statusMessage: error instanceof Error ? error.message : 'Period is invalid.'
    })
  }

  assertDatasetPeriodInCoverage(dataset.dataConfig, periodDate)

  const regionIds = Array.from(new Set(options.rows.map(row => row.regionId)))
  const regions = await db.region.findMany({
    where: {
      AND: [
        getSumbawaBaratRegionScopeWhere(dataset.regionLevel),
        { id: { in: regionIds } }
      ]
    },
    select: { id: true, name: true }
  })
  const regionsById = new Map(regions.map(region => [region.id, region]))
  const duplicateRegionIds = new Set<string>()
  const seenRegionIds = new Set<string>()

  for (const row of options.rows) {
    if (seenRegionIds.has(row.regionId)) {
      duplicateRegionIds.add(row.regionId)
    }

    seenRegionIds.add(row.regionId)
  }

  const rowErrors: Array<{
    regionId: string
    regionName: string
    fieldKey?: string
    message: string
  }> = []
  const preparedRows: Array<{ regionId: string, data: Record<string, unknown> }> = []

  for (const row of options.rows) {
    const region = regionsById.get(row.regionId)

    if (duplicateRegionIds.has(row.regionId)) {
      rowErrors.push({ regionId: row.regionId, regionName: region?.name ?? row.regionId, message: 'Wilayah dikirim lebih dari sekali.' })
      continue
    }

    if (!region) {
      rowErrors.push({ regionId: row.regionId, regionName: row.regionId, message: 'Wilayah berada di luar cakupan Kabupaten Sumbawa Barat.' })
      continue
    }

    const { issues } = validateDatasetRecordData(dataset.dataSchema, row.data)

    if (issues.length > 0) {
      rowErrors.push(
        ...issues.map(issue => ({
          regionId: row.regionId,
          regionName: region.name,
          fieldKey: issue.key,
          message: issue.message
        }))
      )
      continue
    }

    try {
      const payload = buildDatasetRecordPayloadFromCanonicalPeriodDate(dataset, {
        periodDate,
        status: 'draft',
        data: row.data
      })
      preparedRows.push({ regionId: row.regionId, data: payload.data })
    } catch (error) {
      rowErrors.push({
        regionId: row.regionId,
        regionName: region.name,
        message: error instanceof Error ? error.message : 'Data tidak valid.'
      })
    }
  }

  if (rowErrors.length > 0) {
    throw createError({ statusCode: 400, statusMessage: 'Sebagian baris tidak valid.', data: { rowErrors } })
  }

  try {
    return await db.$transaction(async (tx) => {
      const existingRecords = await tx.datasetRecord.findMany({
        where: {
          datasetId: dataset.id,
          regionId: { in: preparedRows.map(row => row.regionId) },
          periodDate: new Date(`${periodDate}T00:00:00.000Z`)
        },
        select: {
          id: true,
          regionId: true,
          data: true,
          status: true,
          createdBy: true,
          createdAt: true,
          updatedAt: true
        }
      })
      const existingByRegionId = new Map(existingRecords.map(record => [record.regionId, record]))
      const rowsToCreate = preparedRows.filter(row => !existingByRegionId.has(row.regionId))
      const rowsToUpdate = preparedRows.filter((row) => {
        const existing = existingByRegionId.get(row.regionId)

        return !!existing && comparableDatasetValue(existing.data) !== comparableDatasetValue(row.data)
      })

      if (rowsToCreate.length > 0) {
        await assertDatasetPermissionForUser(user, { datasetId: dataset.id, action: 'create' })
      }

      if (rowsToUpdate.length > 0) {
        await assertDatasetPermissionForUser(user, { datasetId: dataset.id, action: 'update' })
      }

      let created = 0
      let updated = 0
      let unchanged = 0

      for (const row of preparedRows) {
        const existing = existingByRegionId.get(row.regionId)

        if (!existing) {
          const record = await tx.datasetRecord.create({
            data: {
              datasetId: dataset.id,
              regionId: row.regionId,
              periodDate: new Date(`${periodDate}T00:00:00.000Z`),
              status: 'draft',
              data: row.data as never,
              createdBy: user.id,
              updatedBy: user.id
            }
          })
          await tx.auditLog.create({
            data: {
              actorId: user.id,
              action: 'dataset_record.create',
              entityType: 'dataset_record',
              entityId: record.id,
              metadata: { datasetId: record.datasetId, regionId: record.regionId, periodDate, status: record.status, source: options.source }
            }
          })
          created += 1
          continue
        }

        if (comparableDatasetValue(existing.data) === comparableDatasetValue(row.data)) {
          unchanged += 1
          continue
        }

        const history = await tx.datasetRecordHistory.create({
          data: {
            sourceRecordId: existing.id,
            datasetId: dataset.id,
            regionId: existing.regionId,
            periodDate: new Date(`${periodDate}T00:00:00.000Z`),
            data: existing.data as never,
            status: existing.status,
            createdBy: existing.createdBy,
            createdAt: existing.createdAt,
            updatedAt: existing.updatedAt,
            changeType: 'UPDATE',
            changedBy: user.id
          }
        })
        const record = await tx.datasetRecord.update({
          where: { id: existing.id },
          data: { data: row.data as never, updatedBy: user.id }
        })
        await tx.auditLog.create({
          data: {
            actorId: user.id,
            action: 'dataset_record.update',
            entityType: 'dataset_record',
            entityId: record.id,
            metadata: {
              datasetId: record.datasetId,
              regionId: record.regionId,
              periodDate,
              changedFields: ['data'],
              historyRecordId: history.id,
              source: options.source
            }
          }
        })
        updated += 1
      }

      return { created, updated, unchanged }
    }, { isolationLevel: 'Serializable' })
  } catch (error) {
    if (isDatasetTransactionConflict(error)) {
      throw createError({ statusCode: 409, statusMessage: 'Data periode berubah oleh pengguna lain. Muat ulang matriks lalu coba lagi.' })
    }

    throw error
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
