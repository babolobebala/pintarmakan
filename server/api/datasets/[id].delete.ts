import { createError, getRouterParam } from 'h3'

import { db } from '#server/utils/db'
import { appPermissions } from '~~/auth/permissions'
import { getDatasetPeriodicity } from '~~/shared/datasets'
import { requirePermission } from '~~/server/utils/access'

const deleteBlockedMessage = 'Dataset cannot be deleted because it is already used by existing records or permissions.'

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, appPermissions.datasetsDelete)
  const datasetId = getRouterParam(event, 'id')

  if (!datasetId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing dataset id.'
    })
  }

  const existingDataset = await db.dataset.findUnique({
    where: {
      id: datasetId
    }
  })

  if (!existingDataset) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Dataset not found.'
    })
  }

  const [recordCount, permissionCount] = await db.$transaction([
    db.datasetRecord.count({
      where: {
        datasetId
      }
    }),
    db.authBidangDatasetPermission.count({
      where: {
        datasetId
      }
    })
  ])

  if (recordCount > 0 || permissionCount > 0) {
    throw createError({
      statusCode: 409,
      statusMessage: deleteBlockedMessage
    })
  }

  try {
    await db.dataset.delete({
      where: {
        id: datasetId
      }
    })
  } catch (error) {
    if (typeof error === 'object' && error && 'code' in error && error.code === 'P2003') {
      throw createError({
        statusCode: 409,
        statusMessage: deleteBlockedMessage
      })
    }

    throw error
  }

  await db.auditLog.create({
    data: {
      actorId: session.user.id,
      action: 'dataset.delete',
      entityType: 'dataset',
      entityId: datasetId,
      metadata: {
        datasetId,
        name: existingDataset.name,
        periodicity: getDatasetPeriodicity(existingDataset.dataConfig)
      }
    }
  })

  return {
    success: true
  }
})
