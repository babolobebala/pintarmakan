import { createError, getQuery, setHeader } from 'h3'

import { appPermissions } from '~~/auth/permissions'
import { createDatasetWorkbookSpreadsheet } from '#server/utils/dataset-workbook-spreadsheet'
import { requirePermission } from '~~/server/utils/access'

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, appPermissions.businessDataRead)
  const query = getQuery(event)
  const datasetId = typeof query.datasetId === 'string' ? query.datasetId.trim() : ''

  if (!datasetId) {
    throw createError({ statusCode: 400, statusMessage: 'Dataset is required.' })
  }

  const spreadsheet = await createDatasetWorkbookSpreadsheet(session.user, {
    datasetId,
    mode: 'export'
  })

  setHeader(event, 'Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  setHeader(event, 'Content-Disposition', `attachment; filename="${spreadsheet.filename}"`)

  return spreadsheet.data
})
