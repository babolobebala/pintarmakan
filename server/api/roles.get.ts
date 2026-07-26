import { db } from '#server/utils/db'
import { getRoleDefinitions, requirePermission } from '~~/server/utils/rbac'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'roles.read')

  const [roles, users] = await Promise.all([
    getRoleDefinitions(),
    db.user.findMany({
      select: {
        userRoles: {
          select: {
            role: {
              select: {
                slug: true
              }
            }
          }
        }
      }
    })
  ])

  const assignments = new Map<string, number>()

  for (const user of users) {
    const assignedRoles = new Set(user.userRoles.map(({ role }) => role.slug))

    for (const role of assignedRoles) {
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
      canEdit: true,
      canDelete: !role.isSystem,
      assignedUserCount: assignments.get(role.slug) ?? 0
    }
  })
})
