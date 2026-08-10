import { createError, readBody } from 'h3'
import { z } from 'zod'

import { db } from '#server/utils/db'
import {
  assertDatasetPermissionForUser,
  assertRegionAllowedForDataset,
  buildDatasetRecordPayload,
  serializeDatasetRecord
} from '#server/utils/dataset-records'
import { appPermissions } from '~~/auth/permissions'
import { getDatasetPeriodicity } from '~~/shared/datasets'
import { requirePermission } from '~~/server/utils/access'

const createDatasetRecordSchema = z.object({
  datasetId: z.string().trim().min(1).max(191),
  regionId: z.string().trim().min(1).max(191),
  periodValue: z.string().trim().min(1),
  status: z.string().trim().min(1).max(191).optional().or(z.literal('')),
  data: z.unknown()
})

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, appPermissions.businessDataCreate)
  const body = createDatasetRecordSchema.parse(await readBody(event))

  const dataset = await db.dataset.findUnique({
    where: {
      id: body.datasetId
    }
  })

  if (!dataset) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Dataset not found.'
    })
  }

  const datasetContext = await assertDatasetPermissionForUser(session.user, {
    datasetId: body.datasetId,
    action: 'create'
  })

  await assertRegionAllowedForDataset(dataset, body.regionId)

  const payload = buildDatasetRecordPayload(dataset, {
    periodValue: body.periodValue,
    status: body.status,
    data: body.data
  })

  try {
    const record = await db.datasetRecord.create({
      data: {
        datasetId: body.datasetId,
        regionId: body.regionId,
        periodDate: new Date(`${payload.periodDate}T00:00:00.000Z`),
        status: payload.status,
        data: payload.data as never,
        createdBy: session.user.id
      },
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

    await db.auditLog.create({
      data: {
        actorId: session.user.id,
        action: 'dataset_record.create',
        entityType: 'dataset_record',
        entityId: record.id,
        metadata: {
          datasetId: record.datasetId,
          regionId: record.regionId,
          periodDate: payload.periodDate,
          status: record.status
        }
      }
    })

    return serializeDatasetRecord(record, {
      periodicity: getDatasetPeriodicity(dataset.dataConfig),
      canUpdate: datasetContext.dataset.permissions.canUpdate,
      canDelete: datasetContext.dataset.permissions.canDelete
    })
  } catch (error) {
    if (typeof error === 'object' && error && 'code' in error && error.code === 'P2002') {
      throw createError({
        statusCode: 409,
        statusMessage: 'Data untuk dataset, wilayah, dan periode tersebut sudah tersedia. Silakan edit data yang sudah ada.'
      })
    }

    throw error
  }
})
