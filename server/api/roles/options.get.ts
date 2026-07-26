import { getRoleOptions, requireAnyPermission } from '~~/server/utils/rbac'

export default defineEventHandler(async (event) => {
  await requireAnyPermission(event, ['roles.view', 'users.create', 'users.assign-role'])

  return getRoleOptions()
})
