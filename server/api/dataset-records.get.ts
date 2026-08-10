import { createError, getQuery } from 'h3'

import { db } from '#server/utils/db'
import {
  assertDatasetPermissionForUser,
  serializeDatasetRecord
} from '#server/utils/dataset-records'
import { appPermissions } from '~~/auth/permissions'
import { normalizeDatasetPeriodInput } from '~~/shared/datasets'
import { requirePermission } from '~~/server/utils/access'

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, appPermissions.businessDataRead)
  const query = getQuery(event)
  const datasetId = typeof query.datasetId === 'string' ? query.datasetId.trim() : ''

  if (!datasetId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Dataset is required.'
    })
  }

  const datasetContext = await assertDatasetPermissionForUser(session.user, {
    datasetId,
    action: 'read'
  })

  const regionId = typeof query.regionId === 'string' && query.regionId.trim()
    ? query.regionId.trim()
    : undefined
  const status = typeof query.status === 'string' && query.status.trim()
    ? query.status.trim()
    : undefined
  const periodValue = typeof query.periodValue === 'string' && query.periodValue.trim()
    ? query.periodValue.trim()
    : undefined

  const periodDate = periodValue
    ? normalizeDatasetPeriodInput(datasetContext.dataset.periodicity as never, periodValue)
    : null

  const records = await db.datasetRecord.findMany({
    where: {
      datasetId,
      regionId,
      status,
      periodDate: periodDate ? new Date(`${periodDate}T00:00:00.000Z`) : undefined
    },
    orderBy: [
      { periodDate: 'desc' },
      { regionId: 'asc' },
      { createdAt: 'desc' }
    ],
    include: {
      region: {
        select: {
          id: true,
          name: true,
          level: true
        }
      },
      creator: {
        select: {
          id: true,
          name: true
        }
      }
    }
  })

  return records.map(record => serializeDatasetRecord(record, {
    periodicity: datasetContext.dataset.periodicity,
    canUpdate: datasetContext.dataset.permissions.canUpdate,
    canDelete: datasetContext.dataset.permissions.canDelete
  }))
})
