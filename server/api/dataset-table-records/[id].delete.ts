import { createError, getQuery, getRouterParam } from 'h3'

import { appPermissions } from '~~/auth/permissions'
import {
  getTabularDatasetPermissionContextForUser,
  resolveTabularDatasetPeriod
} from '#server/utils/dataset-table-records'
import { db } from '#server/utils/db'
import { requirePermission } from '~~/server/utils/access'

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, appPermissions.businessDataDelete)
  const recordId = getRouterParam(event, 'id')
  const query = getQuery(event)
  const datasetId = typeof query.datasetId === 'string' ? query.datasetId.trim() : ''
  const requestedPeriodDate = typeof query.periodDate === 'string' ? query.periodDate.trim() : ''

  if (!recordId || !datasetId || !requestedPeriodDate) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Record, dataset, and period are required.'
    })
  }

  const context = await getTabularDatasetPermissionContextForUser(session.user, {
    datasetId,
    action: 'delete'
  })
  const periodDate = resolveTabularDatasetPeriod(context.dataset, requestedPeriodDate)

  await db.$transaction(async (tx) => {
    const current = await tx.datasetTableRecord.findUnique({
      where: { id: recordId }
    })

    if (!current) {
      throw createError({ statusCode: 404, statusMessage: 'Record not found.' })
    }

    if (
      current.datasetId !== context.dataset.id
      || current.periodDate.toISOString().slice(0, 10) !== periodDate
    ) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Record does not belong to the selected dataset period.'
      })
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
        changeType: 'DELETE',
        changedBy: session.user.id
      }
    })

    await tx.datasetTableRecord.delete({ where: { id: current.id } })
    await tx.auditLog.create({
      data: {
        actorId: session.user.id,
        action: 'dataset_table_record.delete',
        entityType: 'dataset_table_record',
        entityId: current.id,
        metadata: {
          datasetId: current.datasetId,
          periodDate,
          historyRecordId: history.id
        }
      }
    })
  })

  return { success: true }
})
