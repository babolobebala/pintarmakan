import { appPermissions } from '~~/auth/permissions'
import { requirePermission } from '~~/server/utils/access'
import { listAccessibleDatasetsForUser } from '#server/utils/dataset-records'

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, appPermissions.businessDataRead)

  return {
    datasets: await listAccessibleDatasetsForUser(session.user)
  }
})
