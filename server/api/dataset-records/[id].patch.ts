import { createError, getRouterParam, readBody } from 'h3'
import { z } from 'zod'

import { db } from '#server/utils/db'
import {
  assertDatasetPermissionForUser,
  buildDatasetRecordPayload,
  listAccessibleDatasetsForUser,
  serializeDatasetRecord
} from '#server/utils/dataset-records'
import { appPermissions } from '~~/auth/permissions'
import { getDatasetPeriodicity, normalizeDatasetPeriodInput } from '~~/shared/datasets'
import { requirePermission } from '~~/server/utils/access'

const updateDatasetRecordSchema = z.object({
  datasetId: z.string().trim().min(1).max(191).optional(),
  regionId: z.string().trim().min(1).max(191).optional(),
  ownerBidangId: z.string().trim().min(1).max(191).optional(),
  periodValue: z.string().trim().min(1).optional(),
  periodDate: z.string().trim().min(1).optional(),
  status: z.string().trim().min(1).max(191).optional().or(z.literal('')),
  data: z.unknown()
})

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, appPermissions.businessDataUpdate)
  const recordId = getRouterParam(event, 'id')

  if (!recordId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing record id.'
    })
  }

  const body = updateDatasetRecordSchema.parse(await readBody(event))
  const existingRecord = await db.datasetRecord.findUnique({
    where: {
      id: recordId
    },
    include: {
      dataset: true,
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

  if (!existingRecord) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Record not found.'
    })
  }

  if (body.datasetId && body.datasetId !== existingRecord.datasetId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Dataset cannot be changed during edit.'
    })
  }

  if (body.regionId && body.regionId !== existingRecord.regionId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Region cannot be changed during edit.'
    })
  }

  if (body.ownerBidangId && body.ownerBidangId !== existingRecord.ownerBidangId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Owner Bidang cannot be changed during edit.'
    })
  }

  const existingPeriodDate = existingRecord.periodDate.toISOString().slice(0, 10)

  if (body.periodDate && body.periodDate !== existingPeriodDate) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Period cannot be changed during edit.'
    })
  }

  if (body.periodValue) {
    const normalizedPeriodDate = normalizeDatasetPeriodInput(
      getDatasetPeriodicity(existingRecord.dataset.dataConfig),
      body.periodValue
    )

    if (normalizedPeriodDate !== existingPeriodDate) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Period cannot be changed during edit.'
      })
    }
  }

  await assertDatasetPermissionForUser(session.user, {
    datasetId: existingRecord.datasetId,
    action: 'update',
    ownerBidangId: existingRecord.ownerBidangId
  })

  const accessibleDatasets = await listAccessibleDatasetsForUser(session.user)
  const datasetOption = accessibleDatasets.find(item => item.id === existingRecord.datasetId)

  if (!datasetOption) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden'
    })
  }

  const payload = buildDatasetRecordPayload(existingRecord.dataset, {
    periodValue: existingPeriodDate,
    status: body.status ?? existingRecord.status,
    data: body.data
  })
  const changedFields: string[] = []

  if (payload.status !== existingRecord.status) {
    changedFields.push('status')
  }

  if (JSON.stringify(payload.data) !== JSON.stringify(existingRecord.data)) {
    changedFields.push('data')
  }

  if (changedFields.length === 0) {
    return serializeDatasetRecord(existingRecord, {
      periodicity: getDatasetPeriodicity(existingRecord.dataset.dataConfig),
      canUpdate: datasetOption.permissions.isSuperAdmin
        || datasetOption.updateBidangIds.includes(existingRecord.ownerBidangId),
      canDelete: datasetOption.permissions.isSuperAdmin
        || datasetOption.deleteBidangIds.includes(existingRecord.ownerBidangId)
    })
  }

  const record = await db.datasetRecord.update({
    where: {
      id: recordId
    },
    data: {
      status: payload.status,
      data: payload.data as never
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
      action: 'dataset_record.update',
      entityType: 'dataset_record',
      entityId: record.id,
      metadata: {
        datasetId: record.datasetId,
        regionId: record.regionId,
        periodDate: existingPeriodDate,
        ownerBidangId: record.ownerBidangId,
        changedFields
      }
    }
  })

  return serializeDatasetRecord(record, {
    periodicity: getDatasetPeriodicity(existingRecord.dataset.dataConfig),
    canUpdate: datasetOption.permissions.isSuperAdmin
      || datasetOption.updateBidangIds.includes(record.ownerBidangId),
    canDelete: datasetOption.permissions.isSuperAdmin
      || datasetOption.deleteBidangIds.includes(record.ownerBidangId)
  })
})
