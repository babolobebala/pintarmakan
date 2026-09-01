import { createError, readMultipartFormData } from 'h3'

import { prepareDatasetRecordImport } from '#server/utils/dataset-record-import'
import { appPermissions } from '~~/auth/permissions'
import { requirePermission } from '~~/server/utils/access'

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, appPermissions.businessDataCreate)
  const parts = await readMultipartFormData(event)
  const datasetId = parts?.find(part => part.name === 'datasetId')?.data.toString('utf8').trim() ?? ''
  const file = parts?.find(part => part.name === 'file')

  if (!file?.filename) {
    throw createError({
      statusCode: 400,
      statusMessage: 'File impor wajib dipilih.'
    })
  }

  return prepareDatasetRecordImport(session.user, datasetId, file)
    .then(result => result.preview)
})
