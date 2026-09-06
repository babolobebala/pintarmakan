import { createError, readMultipartFormData } from 'h3'

import { appPermissions } from '~~/auth/permissions'
import { getDatasetMode } from '~~/shared/datasets'
import { commitDatasetWorkbookRecordImport } from '#server/utils/dataset-record-import'
import { getDatasetPermissionContextForUser } from '#server/utils/dataset-records'
import { commitDatasetTableWorkbookImport } from '#server/utils/dataset-table-record-import'
import { requirePermission } from '~~/server/utils/access'

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, appPermissions.businessDataRead)
  const parts = await readMultipartFormData(event)
  const datasetId = parts?.find(part => part.name === 'datasetId')?.data.toString('utf8').trim() ?? ''
  const file = parts?.find(part => part.name === 'file')

  if (!file?.filename) {
    throw createError({ statusCode: 400, statusMessage: 'File impor wajib dipilih.' })
  }

  const context = await getDatasetPermissionContextForUser(session.user, {
    datasetId,
    action: 'read'
  })

  if (getDatasetMode(context.dataset.dataConfig) === 'TABULAR') {
    return commitDatasetTableWorkbookImport(session.user, { datasetId: context.dataset.id, file })
  }

  if (getDatasetMode(context.dataset.dataConfig) === 'REGIONAL') {
    return commitDatasetWorkbookRecordImport(session.user, { datasetId: context.dataset.id, file })
  }

  throw createError({ statusCode: 400, statusMessage: 'Mode Dataset tidak didukung.' })
})
