import { createError, readBody } from 'h3'
import { z } from 'zod'

import type { AppPermission } from '#shared/rbac'
import { permissionList, slugifyRoleName, systemRoleSlugs } from '#shared/rbac'
import { db } from '#server/utils/db'
import { requirePermission } from '~~/server/utils/rbac'

const permissionSet = new Set(permissionList)

const createRoleSchema = z.object({
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
  const body = createRoleSchema.parse(await readBody(event))
  const slug = slugifyRoleName(body.name)

  if (!slug) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Role name must include letters or numbers.'
    })
  }

  if (systemRoleSlugs.includes(slug)) {
    throw createError({
      statusCode: 409,
      statusMessage: 'That role name conflicts with a protected system role.'
    })
  }

  const existingRole = await db.role.findUnique({
    where: {
      slug
    },
    select: {
      id: true
    }
  })

  if (existingRole) {
    throw createError({
      statusCode: 409,
      statusMessage: 'A role with that name already exists.'
    })
  }

  const role = await db.role.create({
    data: {
      slug,
      name: body.name,
      description: body.description?.trim() || null,
      permissions: body.permissions as AppPermission[],
      isSystem: false
    },
    select: {
      id: true,
      slug: true
    }
  })

  await db.auditLog.create({
    data: {
      actorId: session.user.id,
      action: 'roles.create',
      entityType: 'role',
      entityId: role.id,
      metadata: {
        slug: role.slug,
        permissions: body.permissions as AppPermission[]
      }
    }
  })

  return role
})
