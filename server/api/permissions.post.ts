import { createError, readBody } from 'h3'
import { z } from 'zod'

import { isPermissionKey } from '#shared/rbac'
import { db } from '#server/utils/db'
import { requirePermission } from '~~/server/utils/rbac'

const createPermissionSchema = z.object({
  key: z.string().trim().min(3).max(191).refine(isPermissionKey, {
    message: 'Use lowercase segments separated by dots, for example billing.export.'
  }),
  label: z.string().trim().min(2).max(191),
  description: z.string().trim().max(2000).optional().or(z.literal('')),
  group: z.string().trim().min(2).max(191)
})

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, 'permissions.create')
  const body = createPermissionSchema.parse(await readBody(event))

  const existingPermission = await db.permission.findUnique({
    where: {
      key: body.key
    },
    select: {
      id: true
    }
  })

  if (existingPermission) {
    throw createError({
      statusCode: 409,
      statusMessage: 'A permission with that key already exists.'
    })
  }

  const permission = await db.$transaction(async (tx) => {
    const savedPermission = await tx.permission.create({
      data: {
        key: body.key,
        label: body.label,
        description: body.description?.trim() || null,
        group: body.group,
        isSystem: false
      },
      select: {
        id: true,
        key: true
      }
    })

    await tx.auditLog.create({
      data: {
        actorId: session.user.id,
        action: 'permissions.create',
        entityType: 'permission',
        entityId: savedPermission.id,
        metadata: {
          key: savedPermission.key,
          group: body.group
        }
      }
    })

    return savedPermission
  })

  return permission
})
