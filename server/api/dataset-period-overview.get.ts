import { createError, getQuery } from 'h3'

import { appPermissions } from '~~/auth/permissions'
import { listDatasetPeriodOverviewForUser } from '#server/utils/dataset-records'
import { requirePermission } from '~~/server/utils/access'

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, appPermissions.businessDataRead)
  const query = getQuery(event)
  const datasetId = typeof query.datasetId === 'string' ? query.datasetId.trim() : ''

  if (!datasetId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Dataset is required.'
    })
  }

  return listDatasetPeriodOverviewForUser(session.user, datasetId)
})
