import { appPermissions } from '~~/auth/permissions'
import { requirePermission } from '~~/server/utils/access'
import { listDataManagementOptionsForUser } from '#server/utils/dataset-records'

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, appPermissions.businessDataRead)

  return listDataManagementOptionsForUser(session.user)
})
