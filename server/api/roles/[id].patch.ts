import { createError, getRouterParam, readBody } from 'h3'
import { z } from 'zod'

import { db } from '#server/utils/db'
import { ensurePermissionsExist, requirePermission, syncRolePermissions } from '~~/server/utils/rbac'

const updateRoleSchema = z.object({
  name: z.string().trim().min(2).max(191),
  description: z.string().trim().max(2000).optional().or(z.literal('')),
  permissions: z.array(z.string().trim().min(1)).min(1, 'Select at least one permission')
})

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, 'roles.update')
  const roleId = getRouterParam(event, 'id')

  if (!roleId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing role id.'
    })
  }

  const body = updateRoleSchema.parse(await readBody(event))
  const permissions = await ensurePermissionsExist(body.permissions)
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

  await db.$transaction(async (tx) => {
    await tx.role.update({
      where: {
        id: roleId
      },
      data: {
        name: body.name,
        description: body.description?.trim() || null,
        isSystem: role.isSystem
      }
    })

    await syncRolePermissions(tx, roleId, permissions)

    await tx.auditLog.create({
      data: {
        actorId: session.user.id,
        action: 'roles.update',
        entityType: 'role',
        entityId: roleId,
        metadata: {
          slug: role.slug,
          permissions
        }
      }
    })
  })

  return {
    success: true
  }
})
