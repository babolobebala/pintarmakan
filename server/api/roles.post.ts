import { createError, readBody } from 'h3'
import { z } from 'zod'

import { slugifyRoleName } from '#shared/rbac'
import { db } from '#server/utils/db'
import { ensurePermissionsExist, requirePermission, syncRolePermissions } from '~~/server/utils/rbac'

const createRoleSchema = z.object({
  name: z.string().trim().min(2).max(191),
  description: z.string().trim().max(2000).optional().or(z.literal('')),
  permissions: z.array(z.string().trim().min(1)).min(1, 'Select at least one permission')
})

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, 'roles.create')
  const body = createRoleSchema.parse(await readBody(event))
  const slug = slugifyRoleName(body.name)
  const permissions = await ensurePermissionsExist(body.permissions)

  if (!slug) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Role name must include letters or numbers.'
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

  const role = await db.$transaction(async (tx) => {
    const savedRole = await tx.role.create({
      data: {
        slug,
        name: body.name,
        description: body.description?.trim() || null,
        isSystem: false
      },
      select: {
        id: true,
        slug: true
      }
    })

    await syncRolePermissions(tx, savedRole.id, permissions)

    await tx.auditLog.create({
      data: {
        actorId: session.user.id,
        action: 'roles.create',
        entityType: 'role',
        entityId: savedRole.id,
        metadata: {
          slug: savedRole.slug,
          permissions
        }
      }
    })

    return savedRole
  })

  return role
})
