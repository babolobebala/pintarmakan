import { getPermissionDefinitions, requireAnyPermission } from '~~/server/utils/rbac'

export default defineEventHandler(async (event) => {
  await requireAnyPermission(event, ['permissions.read', 'roles.create', 'roles.update'])

  return getPermissionDefinitions()
})
