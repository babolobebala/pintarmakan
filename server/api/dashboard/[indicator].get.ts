import { appPermissions } from '~~/auth/permissions'
import { isDashboardIndicatorKey } from '~~/shared/dashboard'
import { requirePermission } from '~~/server/utils/access'
import { getDashboardIndicatorPayload } from '~~/server/utils/dashboard'

export default defineEventHandler(async (event) => {
  await requirePermission(event, appPermissions.dashboardRead)

  const indicator = getRouterParam(event, 'indicator')

  if (!isDashboardIndicatorKey(indicator)) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Indicator not found'
    })
  }

  return getDashboardIndicatorPayload(indicator)
})
