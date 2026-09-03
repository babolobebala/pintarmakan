import { createError, readMultipartFormData } from 'h3'

import { appPermissions } from '~~/auth/permissions'
import { prepareDatasetPeriodRecordImport } from '#server/utils/dataset-record-import'
import { requirePermission } from '~~/server/utils/access'

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, appPermissions.businessDataRead)
  const parts = await readMultipartFormData(event)
  const datasetId = parts?.find(part => part.name === 'datasetId')?.data.toString('utf8').trim() ?? ''
  const periodDate = parts?.find(part => part.name === 'periodDate')?.data.toString('utf8').trim() ?? ''
  const file = parts?.find(part => part.name === 'file')

  if (!file?.filename) {
    throw createError({ statusCode: 400, statusMessage: 'File impor wajib dipilih.' })
  }

  return prepareDatasetPeriodRecordImport(session.user, { datasetId, periodDate, file })
    .then(result => result.preview)
})
