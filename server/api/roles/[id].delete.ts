import { createError, getRouterParam } from 'h3'

import { parseStoredRoles } from '#shared/rbac'
import { db } from '#server/utils/db'
import { requirePermission } from '~~/server/utils/rbac'

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, 'roles.manage')
  const roleId = getRouterParam(event, 'id')

  if (!roleId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing role id.'
    })
  }

  const role = await db.role.findUnique({
    where: {
      id: roleId
    },
    select: {
      id: true,
      slug: true,
      isSystem: true
    }
  })

  if (!role) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Role not found.'
    })
  }

  if (role.isSystem) {
    throw createError({
      statusCode: 403,
      statusMessage: 'System roles cannot be deleted here.'
    })
  }

  const users = await db.user.findMany({
    select: {
      role: true
    }
  })

  const assignedUserCount = users.filter((user) => {
    return parseStoredRoles(user.role).includes(role.slug)
  }).length

  if (assignedUserCount > 0) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Unassign this role from members before deleting it.'
    })
  }

  await db.$transaction([
    db.role.delete({
      where: {
        id: roleId
      }
    }),
    db.auditLog.create({
      data: {
        actorId: session.user.id,
        action: 'roles.delete',
        entityType: 'role',
        entityId: roleId,
        metadata: {
          slug: role.slug
        }
      }
    })
  ])

  return {
    success: true
  }
})
