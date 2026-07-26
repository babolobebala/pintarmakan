import { parseStoredRoles } from '#shared/rbac'
import { db } from '#server/utils/db'
import { getRoleDefinitions, requirePermission } from '~~/server/utils/rbac'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'roles.view')

  const [roles, users] = await Promise.all([
    getRoleDefinitions(),
    db.user.findMany({
      select: {
        role: true
      }
    })
  ])

  const assignments = new Map<string, number>()

  for (const user of users) {
    for (const role of parseStoredRoles(user.role)) {
      assignments.set(role, (assignments.get(role) ?? 0) + 1)
    }
  }

  return roles.map((role) => {
    return {
      id: role.id,
      slug: role.slug,
      name: role.name,
      description: role.description,
      permissions: role.permissions,
      isSystem: role.isSystem,
      canEdit: !role.isSystem,
      canDelete: !role.isSystem,
      assignedUserCount: assignments.get(role.slug) ?? 0
    }
  })
})
