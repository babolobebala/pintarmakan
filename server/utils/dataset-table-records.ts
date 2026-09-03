import { createError } from 'h3'

import {
  getDatasetMode,
  getDatasetPeriodicity,
  getDatasetSchemaFields,
  validateCanonicalDatasetPeriodDate,
  validateDatasetRecordData
} from '~~/shared/datasets'
import {
  assertDatasetPeriodInCoverage,
  getDatasetPermissionContextForUser
} from '#server/utils/dataset-records'
import { db } from '#server/utils/db'

type ScopedUser = Parameters<typeof getDatasetPermissionContextForUser>[0]

function getTabularModeError() {
  return createError({
    statusCode: 409,
    statusMessage: 'REGIONAL datasets use DatasetRecord storage and are not available through DatasetTableRecord operations.'
  })
}

export async function getTabularDatasetPermissionContextForUser(
  user: ScopedUser,
  options: {
    readonly datasetId: string
    readonly action: 'read' | 'create' | 'update' | 'delete'
  }
) {
  const context = await getDatasetPermissionContextForUser(user, options)

  if (getDatasetMode(context.dataset.dataConfig) !== 'TABULAR') {
    throw getTabularModeError()
  }

  return context
}

export function resolveTabularDatasetPeriod(dataset: {
  readonly dataConfig: unknown
}, value: unknown) {
  const periodDate = validateCanonicalDatasetPeriodDate(
    getDatasetPeriodicity(dataset.dataConfig),
    value
  )

  assertDatasetPeriodInCoverage(dataset.dataConfig, periodDate)

  return periodDate
}

export function buildDatasetTableRecordPayload(dataset: {
  readonly dataSchema: unknown
  readonly dataConfig: unknown
}, input: {
  readonly periodDate: unknown
  readonly data: unknown
}) {
  const periodDate = resolveTabularDatasetPeriod(dataset, input.periodDate)
  const { data, issues } = validateDatasetRecordData(dataset.dataSchema, input.data)

  if (issues.length > 0) {
    throw createError({
      statusCode: 400,
      statusMessage: issues[0]?.message || 'Invalid dataset data payload.',
      data: { fieldErrors: issues }
    })
  }

  return { periodDate, data }
}

export async function getTabularDatasetPeriodWorkspaceForUser(
  user: ScopedUser,
  options: { readonly datasetId: string, readonly periodDate: unknown }
) {
  const context = await getTabularDatasetPermissionContextForUser(user, {
    datasetId: options.datasetId,
    action: 'read'
  })
  const periodDate = resolveTabularDatasetPeriod(context.dataset, options.periodDate)
  const rows = await db.datasetTableRecord.findMany({
    where: {
      datasetId: context.dataset.id,
      periodDate: new Date(`${periodDate}T00:00:00.000Z`)
    },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      data: true,
      createdAt: true,
      updatedAt: true
    }
  })

  return {
    dataset: {
      id: context.dataset.id,
      name: context.dataset.name,
      periodicity: getDatasetPeriodicity(context.dataset.dataConfig),
      archivedAt: context.dataset.archivedAt,
      fields: getDatasetSchemaFields(context.dataset.dataSchema),
      permissions: {
        canCreate: context.dataset.permissions.canCreate,
        canUpdate: context.dataset.permissions.canUpdate,
        canDelete: context.dataset.permissions.canDelete
      }
    },
    periodDate,
    rows: rows.map(row => ({
      id: row.id,
      data: row.data as Record<string, unknown>,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString()
    }))
  }
}
