import { createError, getQuery, setHeader } from 'h3'

import { appPermissions } from '~~/auth/permissions'
import { createDatasetTablePeriodSpreadsheet } from '#server/utils/dataset-table-period-spreadsheet'
import { requirePermission } from '~~/server/utils/access'

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, appPermissions.businessDataRead)
  const query = getQuery(event)
  const datasetId = typeof query.datasetId === 'string' ? query.datasetId.trim() : ''
  const periodDate = typeof query.periodDate === 'string' ? query.periodDate.trim() : ''

  if (!datasetId || !periodDate) {
    throw createError({ statusCode: 400, statusMessage: 'Dataset and period are required.' })
  }

  const spreadsheet = await createDatasetTablePeriodSpreadsheet(session.user, {
    datasetId,
    periodDate,
    mode: 'export'
  })

  setHeader(event, 'Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  setHeader(event, 'Content-Disposition', `attachment; filename="${spreadsheet.filename}"`)

  return spreadsheet.data
})
