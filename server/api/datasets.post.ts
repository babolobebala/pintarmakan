import { createError, readBody } from 'h3'
import { z } from 'zod'

import { db } from '#server/utils/db'
import { buildDatasetWriteInput, serializeDataset } from '#server/utils/datasets'
import { appPermissions } from '~~/auth/permissions'
import { datasetIdPattern, getDatasetPeriodicity } from '~~/shared/datasets'
import { requirePermission } from '~~/server/utils/access'

const createDatasetSchema = z.object({
  id: z.string().trim().min(1).max(191).regex(datasetIdPattern, 'Dataset ID must use uppercase letters, numbers, and underscores only.'),
  name: z.string().trim().min(1).max(191),
  description: z.string().trim().max(65535).nullable().optional(),
  dataSchema: z.unknown(),
  dataConfig: z.unknown()
})

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, appPermissions.datasetsCreate)
  const body = createDatasetSchema.parse(await readBody(event))

  const existingDataset = await db.dataset.findUnique({
    where: {
      id: body.id
    },
    select: {
      id: true
    }
  })

  if (existingDataset) {
    throw createError({
      statusCode: 409,
      statusMessage: `Dataset ID "${body.id}" already exists.`
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

  let dataset: Awaited<ReturnType<typeof db.dataset.create>>

  try {
    dataset = await db.dataset.create({
      data: {
        id: body.id,
        ...datasetInput
      }
    })
  } catch (error) {
    if (typeof error === 'object' && error && 'code' in error && error.code === 'P2002') {
      throw createError({
        statusCode: 409,
        statusMessage: `Dataset ID "${body.id}" already exists.`
      })
    }

    throw error
  }

  await db.auditLog.create({
    data: {
      actorId: session.user.id,
      action: 'dataset.create',
      entityType: 'dataset',
      entityId: dataset.id,
      metadata: {
        datasetId: dataset.id,
        name: dataset.name,
        periodicity: getDatasetPeriodicity(dataset.dataConfig)
      }
    }
  })

  return serializeDataset(dataset)
})
