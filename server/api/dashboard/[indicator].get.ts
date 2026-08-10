import { appPermissions } from '~~/auth/permissions'
import { isDashboardKey } from '~~/shared/dashboard'
import { requirePermission } from '~~/server/utils/access'
import { getDashboardPayload } from '~~/server/utils/dashboard'

export default defineEventHandler(async (event) => {
  await requirePermission(event, appPermissions.dashboardRead)

  const dashboard = getRouterParam(event, 'indicator')
  const query = getQuery(event)
  const requestedYear = typeof query.year === 'string' ? query.year.trim() : undefined

  if (!isDashboardKey(dashboard)) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Dashboard not found'
    })
  }

  return getDashboardPayload(dashboard, {
    year: requestedYear
  })
})
