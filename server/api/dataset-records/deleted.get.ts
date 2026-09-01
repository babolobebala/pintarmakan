import { createError, getQuery } from 'h3'

import { db } from '#server/utils/db'
import { assertDatasetPermissionForUser } from '#server/utils/dataset-records'
import { appPermissions } from '~~/auth/permissions'
import { formatDatasetPeriod, normalizeDatasetPeriodInput } from '~~/shared/datasets'
import { requirePermission } from '~~/server/utils/access'

const deletedRecordListLimit = 200

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
  const periodValue = typeof query.periodValue === 'string' && query.periodValue.trim()
    ? query.periodValue.trim()
    : undefined
  const periodDate = periodValue
    ? normalizeDatasetPeriodInput(datasetContext.dataset.periodicity as never, periodValue)
    : null

  const deleteSnapshots = await db.datasetRecordHistory.findMany({
    where: {
      datasetId,
      regionId,
      periodDate: periodDate ? new Date(`${periodDate}T00:00:00.000Z`) : undefined,
      changeType: 'DELETE'
    },
    orderBy: [
      { changedAt: 'desc' },
      { id: 'desc' }
    ],
    take: deletedRecordListLimit,
    select: {
      sourceRecordId: true,
      regionId: true,
      periodDate: true,
      data: true,
      status: true,
      changedAt: true,
      region: {
        select: {
          name: true,
          level: true
        }
      },
      changer: {
        select: {
          name: true
        }
      }
    }
  })

  const liveRecords = await db.datasetRecord.findMany({
    where: {
      id: {
        in: deleteSnapshots.map(snapshot => snapshot.sourceRecordId)
      }
    },
    select: {
      id: true
    }
  })
  const liveRecordIds = new Set(liveRecords.map(record => record.id))
  const seenSourceRecordIds = new Set<string>()

  return deleteSnapshots.flatMap((snapshot) => {
    if (liveRecordIds.has(snapshot.sourceRecordId) || seenSourceRecordIds.has(snapshot.sourceRecordId)) {
      return []
    }

    seenSourceRecordIds.add(snapshot.sourceRecordId)
    const normalizedPeriodDate = snapshot.periodDate.toISOString().slice(0, 10)

    return [{
      id: snapshot.sourceRecordId,
      datasetId,
      regionId: snapshot.regionId,
      regionName: snapshot.region.name,
      regionLevel: snapshot.region.level,
      periodDate: normalizedPeriodDate,
      periodLabel: formatDatasetPeriod(datasetContext.dataset.periodicity as never, normalizedPeriodDate),
      status: snapshot.status,
      data: snapshot.data as Record<string, unknown>,
      deletedAt: snapshot.changedAt.toISOString(),
      deletedByName: snapshot.changer?.name ?? null
    }]
  })
})
