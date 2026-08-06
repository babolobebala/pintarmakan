import { appPermissions, roleOptions } from '~~/auth/permissions'
import { requireAnyPermission } from '~~/server/utils/access'

export default defineEventHandler(async (event) => {
  await requireAnyPermission(event, [
    appPermissions.membersCreate,
    appPermissions.membersUpdate
  ])

  return roleOptions
})
