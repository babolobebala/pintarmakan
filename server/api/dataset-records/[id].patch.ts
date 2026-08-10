import { createError, getRouterParam, readBody } from 'h3'
import { z } from 'zod'

import { db } from '#server/utils/db'
import {
  assertDatasetPermissionForUser,
  buildDatasetRecordPayload,
  serializeDatasetRecord
} from '#server/utils/dataset-records'
import { appPermissions } from '~~/auth/permissions'
import { getDatasetPeriodicity, normalizeDatasetPeriodInput } from '~~/shared/datasets'
import { requirePermission } from '~~/server/utils/access'

const updateDatasetRecordSchema = z.object({
  datasetId: z.string().trim().min(1).max(191).optional(),
  regionId: z.string().trim().min(1).max(191).optional(),
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

  const datasetContext = await assertDatasetPermissionForUser(session.user, {
    datasetId: existingRecord.datasetId,
    action: 'update'
  })

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
      canUpdate: datasetContext.dataset.permissions.canUpdate,
      canDelete: datasetContext.dataset.permissions.canDelete
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
        changedFields
      }
    }
  })

  return serializeDatasetRecord(record, {
    periodicity: getDatasetPeriodicity(existingRecord.dataset.dataConfig),
    canUpdate: datasetContext.dataset.permissions.canUpdate,
    canDelete: datasetContext.dataset.permissions.canDelete
  })
})
