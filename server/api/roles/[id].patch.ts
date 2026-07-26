import { createError, getRouterParam, readBody } from 'h3'
import { z } from 'zod'

import type { AppPermission } from '#shared/rbac'
import { permissionList } from '#shared/rbac'
import { db } from '#server/utils/db'
import { requirePermission } from '~~/server/utils/rbac'

const permissionSet = new Set(permissionList)

const updateRoleSchema = z.object({
  name: z.string().trim().min(2).max(191),
  description: z.string().trim().max(2000).optional().or(z.literal('')),
  permissions: z.array(z.string()).min(1, 'Select at least one permission').superRefine((value, ctx) => {
    for (const permission of value) {
      if (!permissionSet.has(permission as AppPermission)) {
        ctx.addIssue({
          code: 'custom',
          message: 'Select only valid permissions.'
        })
        return
      }
    }
  })
})

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, 'roles.manage')
  const roleId = getRouterParam(event, 'id')

  if (!roleId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing role id.'
    })
  }

  const body = updateRoleSchema.parse(await readBody(event))

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
      statusMessage: 'System roles cannot be edited here.'
    })
  }

  await db.role.update({
    where: {
      id: roleId
    },
    data: {
      name: body.name,
      description: body.description?.trim() || null,
      permissions: body.permissions as AppPermission[]
    }
  })

  await db.auditLog.create({
    data: {
      actorId: session.user.id,
      action: 'roles.update',
      entityType: 'role',
      entityId: roleId,
      metadata: {
        slug: role.slug,
        permissions: body.permissions as AppPermission[]
      }
    }
  })

  return {
    success: true
  }
})
