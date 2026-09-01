import { createError, getRouterParam } from 'h3'

import { db } from '#server/utils/db'
import { assertDatasetPermissionForUser } from '#server/utils/dataset-records'
import { appPermissions } from '~~/auth/permissions'
import { requirePermission } from '~~/server/utils/access'

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, appPermissions.businessDataRead)
  const recordId = getRouterParam(event, 'id')

  if (!recordId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing record id.'
    })
  }

  const record = await db.datasetRecord.findUnique({
    where: {
      id: recordId
    },
    select: {
      id: true,
      datasetId: true
    }
  })

  const historyContext = record
    ? null
    : await db.datasetRecordHistory.findFirst({
        where: {
          sourceRecordId: recordId
        },
        orderBy: [
          { changedAt: 'desc' },
          { id: 'desc' }
        ],
        select: {
          datasetId: true
        }
      })

  if (!record && !historyContext) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Record not found.'
    })
  }

  await assertDatasetPermissionForUser(session.user, {
    datasetId: record?.datasetId ?? historyContext!.datasetId,
    action: 'read'
  })

  const history = await db.datasetRecordHistory.findMany({
    where: {
      sourceRecordId: recordId
    },
    orderBy: [
      { changedAt: 'desc' },
      { id: 'desc' }
    ],
    select: {
      id: true,
      sourceRecordId: true,
      changeType: true,
      changedAt: true,
      status: true,
      data: true,
      changer: {
        select: {
          name: true
        }
      }
    }
  })

  return history.map(entry => ({
    id: entry.id,
    sourceRecordId: entry.sourceRecordId,
    changeType: entry.changeType,
    changedAt: entry.changedAt.toISOString(),
    changedByName: entry.changer?.name ?? null,
    status: entry.status,
    data: entry.data as Record<string, unknown>
  }))
})
