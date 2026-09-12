import { createError, getQuery, setHeader } from 'h3'

import { appPermissions } from '~~/auth/permissions'
import { createDatasetDashboardFlatSpreadsheet } from '#server/utils/dataset-dashboard-flat-spreadsheet'
import { requirePermission } from '~~/server/utils/access'

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, appPermissions.businessDataRead)
  const query = getQuery(event)
  const datasetId = typeof query.datasetId === 'string' ? query.datasetId.trim() : ''

  if (!datasetId) {
    throw createError({ statusCode: 400, statusMessage: 'Dataset is required.' })
  }

  const spreadsheet = await createDatasetDashboardFlatSpreadsheet(session.user, { datasetId })

  setHeader(event, 'Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  setHeader(event, 'Content-Disposition', `attachment; filename="${spreadsheet.filename}"`)

  return spreadsheet.data
})
