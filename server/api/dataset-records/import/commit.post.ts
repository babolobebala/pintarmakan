import { createError, readMultipartFormData } from 'h3'

import { commitDatasetRecordImport } from '#server/utils/dataset-record-import'
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

  try {
    return await commitDatasetRecordImport(session.user, datasetId, file)
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      throw createError({
        statusCode: 409,
        statusMessage: 'Data berubah saat impor diproses. Lakukan pratinjau ulang lalu coba lagi.'
      })
    }

    throw error
  }
})
