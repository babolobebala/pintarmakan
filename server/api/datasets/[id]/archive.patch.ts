import { createError, getRouterParam, readBody } from 'h3'
import { z } from 'zod'

import { db } from '#server/utils/db'
import { serializeDataset } from '#server/utils/datasets'
import { appPermissions } from '~~/auth/permissions'
import { requirePermission } from '~~/server/utils/access'

const archiveDatasetSchema = z.object({
  archived: z.boolean()
})

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, appPermissions.datasetsUpdate)
  const datasetId = getRouterParam(event, 'id')

  if (!datasetId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing dataset id.'
    })
  }

  const body = archiveDatasetSchema.parse(await readBody(event))
  const existingDataset = await db.dataset.findUnique({
    where: {
      id: datasetId
    },
    include: {
      ownerBidang: {
        select: {
          name: true
        }
      }
    }
  })

  if (!existingDataset) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Dataset not found.'
    })
  }

  if (Boolean(existingDataset.archivedAt) === body.archived) {
    return serializeDataset(existingDataset)
  }

  const dataset = await db.$transaction(async (tx) => {
    const archivedAt = body.archived ? new Date() : null
    const updatedDataset = await tx.dataset.update({
      where: {
        id: datasetId
      },
      data: {
        archivedAt
      },
      include: {
        ownerBidang: {
          select: {
            name: true
          }
        }
      }
    })

    await tx.auditLog.create({
      data: {
        actorId: session.user.id,
        action: body.archived ? 'dataset.archive' : 'dataset.unarchive',
        entityType: 'dataset',
        entityId: updatedDataset.id,
        metadata: {
          datasetId: updatedDataset.id,
          archivedAt: updatedDataset.archivedAt?.toISOString() ?? null
        }
      }
    })

    return updatedDataset
  })

  return serializeDataset(dataset)
})
