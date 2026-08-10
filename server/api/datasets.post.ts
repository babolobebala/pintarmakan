import { createError, readBody } from 'h3'
import { z } from 'zod'

import { db } from '#server/utils/db'
import {
  buildDatasetOwnerPermissionWriteInput,
  buildDatasetWriteInput,
  serializeDataset
} from '#server/utils/datasets'
import { appPermissions } from '~~/auth/permissions'
import { datasetIdPattern, getDatasetPeriodicity } from '~~/shared/datasets'
import { requirePermission } from '~~/server/utils/access'

const createDatasetSchema = z.object({
  id: z.string().trim().min(1).max(191).regex(datasetIdPattern, 'Dataset ID must use uppercase letters, numbers, and underscores only.'),
  ownerBidangId: z.string().trim().min(1).max(191),
  name: z.string().trim().min(1).max(191),
  description: z.string().trim().max(65535).nullable().optional(),
  dataSchema: z.unknown(),
  dataConfig: z.unknown()
})

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, appPermissions.datasetsCreate)
  const body = createDatasetSchema.parse(await readBody(event))
  const ownerBidangId = body.ownerBidangId.trim()

  const [existingDataset, ownerBidang] = await Promise.all([
    db.dataset.findUnique({
      where: {
        id: body.id
      },
      select: {
        id: true
      }
    }),
    db.authBidang.findUnique({
      where: {
        id: ownerBidangId
      },
      select: {
        id: true,
        name: true
      }
    })
  ])

  if (existingDataset) {
    throw createError({
      statusCode: 409,
      statusMessage: `Dataset ID "${body.id}" already exists.`
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

  try {
    const dataset = await db.$transaction(async (tx) => {
      const createdDataset = await tx.dataset.create({
        data: {
          id: body.id,
          ...datasetInput
        },
        include: {
          ownerBidang: {
            select: {
              name: true
            }
          }
        }
      })

      await tx.authBidangDatasetPermission.upsert({
        where: {
          bidangId_datasetId: {
            bidangId: createdDataset.ownerBidangId,
            datasetId: createdDataset.id
          }
        },
        create: {
          bidangId: createdDataset.ownerBidangId,
          datasetId: createdDataset.id,
          ...buildDatasetOwnerPermissionWriteInput()
        },
        update: buildDatasetOwnerPermissionWriteInput()
      })

      await tx.auditLog.create({
        data: {
          actorId: session.user.id,
          action: 'dataset.create',
          entityType: 'dataset',
          entityId: createdDataset.id,
          metadata: {
            datasetId: createdDataset.id,
            ownerBidangId: createdDataset.ownerBidangId,
            name: createdDataset.name,
            periodicity: getDatasetPeriodicity(createdDataset.dataConfig)
          }
        }
      })

      return createdDataset
    })

    return serializeDataset(dataset)
  } catch (error) {
    if (typeof error === 'object' && error && 'code' in error && error.code === 'P2002') {
      throw createError({
        statusCode: 409,
        statusMessage: `Dataset ID "${body.id}" already exists.`
      })
    }

    throw error
  }
})
