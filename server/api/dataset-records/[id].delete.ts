import { createError, getRouterParam } from 'h3'

import { db } from '#server/utils/db'
import { assertDatasetPermissionForUser } from '#server/utils/dataset-records'
import { appPermissions } from '~~/auth/permissions'
import { requirePermission } from '~~/server/utils/access'

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, appPermissions.businessDataDelete)
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
      datasetId: true,
      regionId: true,
      periodDate: true,
      data: true,
      status: true,
      createdBy: true,
      createdAt: true,
      updatedAt: true
    }
  })

  if (!record) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Record not found.'
    })
  }

  await assertDatasetPermissionForUser(session.user, {
    datasetId: record.datasetId,
    action: 'delete'
  })

  await db.$transaction(async (tx) => {
    const history = await tx.datasetRecordHistory.create({
      data: {
        sourceRecordId: record.id,
        datasetId: record.datasetId,
        regionId: record.regionId,
        periodDate: record.periodDate,
        data: record.data as never,
        status: record.status,
        createdBy: record.createdBy,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        changeType: 'DELETE',
        changedBy: session.user.id
      }
    })

    await tx.datasetRecord.delete({
      where: {
        id: recordId
      }
    })

    await tx.auditLog.create({
      data: {
        actorId: session.user.id,
        action: 'dataset_record.delete',
        entityType: 'dataset_record',
        entityId: recordId,
        metadata: {
          datasetId: record.datasetId,
          regionId: record.regionId,
          periodDate: record.periodDate.toISOString().slice(0, 10),
          status: record.status,
          historyRecordId: history.id
        }
      }
    })
  })

  return {
    success: true
  }
})
