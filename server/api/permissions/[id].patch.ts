import { createError, getRouterParam, readBody } from 'h3'
import { z } from 'zod'

import { db } from '#server/utils/db'
import { requirePermission } from '~~/server/utils/rbac'

const updatePermissionSchema = z.object({
  label: z.string().trim().min(2).max(191),
  description: z.string().trim().max(2000).optional().or(z.literal('')),
  group: z.string().trim().min(2).max(191)
})

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, 'permissions.update')
  const permissionId = getRouterParam(event, 'id')

  if (!permissionId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing permission id.'
    })
  }

  const body = updatePermissionSchema.parse(await readBody(event))
  const permission = await db.permission.findUnique({
    where: {
      id: permissionId
    },
    select: {
      id: true,
      key: true,
      isSystem: true
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
      statusMessage: 'System permissions are managed in code and cannot be edited here.'
    })
  }

  await db.$transaction([
    db.permission.update({
      where: {
        id: permissionId
      },
      data: {
        label: body.label,
        description: body.description?.trim() || null,
        group: body.group
      }
    }),
    db.auditLog.create({
      data: {
        actorId: session.user.id,
        action: 'permissions.update',
        entityType: 'permission',
        entityId: permissionId,
        metadata: {
          key: permission.key,
          group: body.group
        }
      }
    })
  ])

  return {
    success: true
  }
})
