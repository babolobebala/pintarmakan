import { createError, getRouterParam } from 'h3'

import { db } from '#server/utils/db'
import { requirePermission } from '~~/server/utils/rbac'

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, 'permissions.delete')
  const permissionId = getRouterParam(event, 'id')

  if (!permissionId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing permission id.'
    })
  }

  const permission = await db.permission.findUnique({
    where: {
      id: permissionId
    },
    select: {
      id: true,
      key: true,
      isSystem: true,
      _count: {
        select: {
          rolePermissions: true
        }
      }
    }
  })

  if (!permission) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Permission not found.'
    })
  }

  if (permission.isSystem) {
    throw createError({
      statusCode: 403,
      statusMessage: 'System permissions cannot be deleted here.'
    })
  }

  if (permission._count.rolePermissions > 0) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Unassign this permission from roles before deleting it.'
    })
  }

  await db.$transaction([
    db.permission.delete({
      where: {
        id: permissionId
      }
    }),
    db.auditLog.create({
      data: {
        actorId: session.user.id,
        action: 'permissions.delete',
        entityType: 'permission',
        entityId: permissionId,
        metadata: {
          key: permission.key
        }
      }
    })
  ])

  return {
    success: true
  }
})
