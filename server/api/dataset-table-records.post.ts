import { readBody } from 'h3'
import { z } from 'zod'

import { appPermissions } from '~~/auth/permissions'
import {
  buildDatasetTableRecordPayload,
  getTabularDatasetPermissionContextForUser
} from '#server/utils/dataset-table-records'
import { db } from '#server/utils/db'
import { requirePermission } from '~~/server/utils/access'

const createDatasetTableRecordSchema = z.object({
  datasetId: z.string().trim().min(1).max(191),
  periodDate: z.string().trim().min(1),
  data: z.unknown()
})

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, appPermissions.businessDataCreate)
  const body = createDatasetTableRecordSchema.parse(await readBody(event))
  const context = await getTabularDatasetPermissionContextForUser(session.user, {
    datasetId: body.datasetId,
    action: 'create'
  })
  const payload = buildDatasetTableRecordPayload(context.dataset, body)

  return db.$transaction(async (tx) => {
    const record = await tx.datasetTableRecord.create({
      data: {
        datasetId: context.dataset.id,
        periodDate: new Date(`${payload.periodDate}T00:00:00.000Z`),
        data: payload.data as never,
        createdBy: session.user.id,
        updatedBy: session.user.id
      }
    })

    await tx.auditLog.create({
      data: {
        actorId: session.user.id,
        action: 'dataset_table_record.create',
        entityType: 'dataset_table_record',
        entityId: record.id,
        metadata: {
          datasetId: record.datasetId,
          periodDate: payload.periodDate
        }
      }
    })

    return {
      id: record.id,
      datasetId: record.datasetId,
      periodDate: payload.periodDate,
      data: record.data as Record<string, unknown>,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString()
    }
  })
})
