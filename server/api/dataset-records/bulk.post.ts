import { readBody } from 'h3'
import { z } from 'zod'

import { appPermissions } from '~~/auth/permissions'
import { commitDatasetPeriodRows } from '#server/utils/dataset-records'
import { requirePermission } from '~~/server/utils/access'

const bulkDatasetRecordSchema = z.object({
  datasetId: z.string().trim().min(1).max(191),
  periodDate: z.string().trim().min(1),
  rows: z.array(z.object({
    regionId: z.string().trim().min(1).max(191),
    intent: z.literal(true),
    data: z.unknown()
  })).min(1).max(500)
})

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, appPermissions.businessDataRead)
  const body = bulkDatasetRecordSchema.parse(await readBody(event))

  return commitDatasetPeriodRows(session.user, {
    datasetId: body.datasetId,
    periodDate: body.periodDate,
    rows: body.rows,
    source: 'bulk_entry'
  })
})
