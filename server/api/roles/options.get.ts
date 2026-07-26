import { getRoleOptions, requireAnyPermission } from '~~/server/utils/rbac'

export default defineEventHandler(async (event) => {
  await requireAnyPermission(event, ['roles.read', 'users.create', 'users.update'])

  return getRoleOptions()
})
