import { createError, getRouterParam, readBody } from 'h3'
import { z } from 'zod'

import { appPermissions } from '~~/auth/permissions'
import { comparableDatasetValue } from '#server/utils/dataset-records'
import {
  buildDatasetTableRecordPayload,
  getTabularDatasetPermissionContextForUser
} from '#server/utils/dataset-table-records'
import { db } from '#server/utils/db'
import { requirePermission } from '~~/server/utils/access'

const updateDatasetTableRecordSchema = z.object({
  datasetId: z.string().trim().min(1).max(191),
  periodDate: z.string().trim().min(1),
  data: z.unknown()
})

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, appPermissions.businessDataUpdate)
  const recordId = getRouterParam(event, 'id')

  if (!recordId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing record id.' })
  }

  const body = updateDatasetTableRecordSchema.parse(await readBody(event))
  const context = await getTabularDatasetPermissionContextForUser(session.user, {
    datasetId: body.datasetId,
    action: 'update'
  })
  const payload = buildDatasetTableRecordPayload(context.dataset, body)

  return db.$transaction(async (tx) => {
    const current = await tx.datasetTableRecord.findUnique({
      where: { id: recordId }
    })

    if (!current) {
      throw createError({ statusCode: 404, statusMessage: 'Record not found.' })
    }

    const currentPeriodDate = current.periodDate.toISOString().slice(0, 10)

    if (current.datasetId !== context.dataset.id || currentPeriodDate !== payload.periodDate) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Record does not belong to the selected dataset period.'
      })
    }

    if (comparableDatasetValue(current.data) === comparableDatasetValue(payload.data)) {
      return {
        id: current.id,
        datasetId: current.datasetId,
        periodDate: currentPeriodDate,
        data: current.data as Record<string, unknown>,
        createdAt: current.createdAt.toISOString(),
        updatedAt: current.updatedAt.toISOString(),
        unchanged: true
      }
    }

    const history = await tx.datasetTableRecordHistory.create({
      data: {
        sourceRecordId: current.id,
        datasetId: current.datasetId,
        periodDate: current.periodDate,
        data: current.data as never,
        createdBy: current.createdBy,
        createdAt: current.createdAt,
        updatedAt: current.updatedAt,
        changeType: 'UPDATE',
        changedBy: session.user.id
      }
    })
    const record = await tx.datasetTableRecord.update({
      where: { id: current.id },
      data: { data: payload.data as never, updatedBy: session.user.id }
    })

    await tx.auditLog.create({
      data: {
        actorId: session.user.id,
        action: 'dataset_table_record.update',
        entityType: 'dataset_table_record',
        entityId: record.id,
        metadata: {
          datasetId: record.datasetId,
          periodDate: payload.periodDate,
          changedFields: ['data'],
          historyRecordId: history.id
        }
      }
    })

    return {
      id: record.id,
      datasetId: record.datasetId,
      periodDate: payload.periodDate,
      data: record.data as Record<string, unknown>,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
      unchanged: false
    }
  })
})
