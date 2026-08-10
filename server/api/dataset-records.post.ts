import { createError, readBody } from 'h3'
import { z } from 'zod'

import { db } from '#server/utils/db'
import {
  assertDatasetPermissionForUser,
  assertRegionAllowedForDataset,
  buildDatasetRecordPayload,
  listAccessibleDatasetsForUser,
  serializeDatasetRecord
} from '#server/utils/dataset-records'
import { appPermissions } from '~~/auth/permissions'
import { getDatasetPeriodicity } from '~~/shared/datasets'
import { requirePermission } from '~~/server/utils/access'

const createDatasetRecordSchema = z.object({
  datasetId: z.string().trim().min(1).max(191),
  regionId: z.string().trim().min(1).max(191),
  ownerBidangId: z.string().trim().min(1).max(191).optional(),
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

  const accessibleDatasets = await listAccessibleDatasetsForUser(session.user)
  const datasetOption = accessibleDatasets.find(item => item.id === body.datasetId)

  if (!datasetOption || !datasetOption.permissions.canCreate) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden'
    })
  }

  const ownerBidangCandidates = datasetOption.ownerBidangsForCreate
  const ownerBidangId = body.ownerBidangId?.trim()
    || (ownerBidangCandidates.length === 1 ? ownerBidangCandidates[0]?.id : '')

  if (!ownerBidangId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Owner Bidang must be selected.'
    })
  }

  await assertDatasetPermissionForUser(session.user, {
    datasetId: body.datasetId,
    action: 'create',
    ownerBidangId
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
        ownerBidangId,
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
        ownerBidang: {
          select: {
            id: true,
            name: true
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
          ownerBidangId: record.ownerBidangId,
          status: record.status
        }
      }
    })

    return serializeDatasetRecord(record, {
      periodicity: getDatasetPeriodicity(dataset.dataConfig),
      canUpdate: datasetOption.permissions.isSuperAdmin
        || datasetOption.updateBidangIds.includes(record.ownerBidangId),
      canDelete: datasetOption.permissions.isSuperAdmin
        || datasetOption.deleteBidangIds.includes(record.ownerBidangId)
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
