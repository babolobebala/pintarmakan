import { createError, getQuery } from 'h3'

import { appPermissions } from '~~/auth/permissions'
import { getDatasetPeriodWorkspaceForUser } from '#server/utils/dataset-records'
import { requirePermission } from '~~/server/utils/access'

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, appPermissions.businessDataRead)
  const query = getQuery(event)
  const datasetId = typeof query.datasetId === 'string' ? query.datasetId.trim() : ''
  const periodDate = typeof query.periodDate === 'string' ? query.periodDate.trim() : ''

  if (!datasetId || !periodDate) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Dataset and period are required.'
    })
  }

  return getDatasetPeriodWorkspaceForUser(session.user, {
    datasetId,
    periodDate
  })
})
