import { createError, getRouterParam, readBody } from 'h3'
import { z } from 'zod'

import { db } from '#server/utils/db'
import {
  buildDatasetWriteInput,
  getDatasetChangedFields,
  serializeDataset
} from '#server/utils/datasets'
import { appPermissions } from '~~/auth/permissions'
import { datasetIdPattern, getDatasetPeriodicity } from '~~/shared/datasets'
import { requirePermission } from '~~/server/utils/access'

const updateDatasetSchema = z.object({
  id: z.string().trim().max(191).regex(datasetIdPattern).optional(),
  ownerBidangId: z.string().trim().min(1).max(191),
  name: z.string().trim().min(1).max(191),
  description: z.string().trim().max(65535).nullable().optional(),
  dataSchema: z.unknown(),
  dataConfig: z.unknown()
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

  const body = updateDatasetSchema.parse(await readBody(event))

  if (body.id && body.id !== datasetId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Dataset ID cannot be changed after creation.'
    })
  }

  const ownerBidangId = body.ownerBidangId.trim()
  const [existingDataset, ownerBidang] = await Promise.all([
    db.dataset.findUnique({
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
    }),
    db.authBidang.findUnique({
      where: {
        id: ownerBidangId
      },
      select: {
        id: true
      }
    })
  ])

  if (!existingDataset) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Dataset not found.'
    })
  }

  if (!ownerBidang) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Selected owner Bidang was not found.'
    })
  }

  let datasetInput: ReturnType<typeof buildDatasetWriteInput>

  try {
    datasetInput = buildDatasetWriteInput(body)
  } catch (error) {
    throw createError({
      statusCode: 400,
      statusMessage: error instanceof Error ? error.message : 'Invalid dataset payload.'
    })
  }

  const changedFields = getDatasetChangedFields(existingDataset, datasetInput)

  if (changedFields.length === 0) {
    return serializeDataset(existingDataset)
  }

  const dataset = await db.$transaction(async (tx) => {
    const updatedDataset = await tx.dataset.update({
      where: {
        id: datasetId
      },
      data: datasetInput,
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
        action: 'dataset.update',
        entityType: 'dataset',
        entityId: updatedDataset.id,
        metadata: {
          datasetId: updatedDataset.id,
          changedFields,
          before: {
            ownerBidangId: existingDataset.ownerBidangId
          },
          after: {
            ownerBidangId: updatedDataset.ownerBidangId
          },
          periodicityBefore: getDatasetPeriodicity(existingDataset.dataConfig),
          periodicityAfter: getDatasetPeriodicity(updatedDataset.dataConfig)
        }
      }
    })

    return updatedDataset
  })

  return serializeDataset(dataset)
})
