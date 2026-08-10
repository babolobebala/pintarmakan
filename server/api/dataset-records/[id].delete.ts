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
      ownerBidangId: true,
      periodDate: true,
      status: true
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
    action: 'delete',
    ownerBidangId: record.ownerBidangId
  })

  await db.datasetRecord.delete({
    where: {
      id: recordId
    }
  })

  await db.auditLog.create({
    data: {
      actorId: session.user.id,
      action: 'dataset_record.delete',
      entityType: 'dataset_record',
      entityId: recordId,
      metadata: {
        datasetId: record.datasetId,
        regionId: record.regionId,
        periodDate: record.periodDate.toISOString().slice(0, 10),
        ownerBidangId: record.ownerBidangId,
        status: record.status
      }
    }
  })

  return {
    success: true
  }
})
