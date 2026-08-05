import { readBody } from 'h3'
import { z } from 'zod'

import { createOrUpdateManagedUser } from '#server/utils/auth-admin'
import { db } from '#server/utils/db'
import { requirePermission, syncUserRoles } from '~~/server/utils/rbac'

const createMemberSchema = z.object({
  name: z.string().trim().min(2).max(191),
  email: z.email().trim().max(191),
  password: z.string().min(8).max(128).optional().or(z.literal('')),
  roles: z.array(z.string().trim().min(1)).min(1)
})

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, 'users.create')
  const body = createMemberSchema.parse(await readBody(event))
  const password = body.password?.trim() || undefined
  const roles = body.roles

  const user = await createOrUpdateManagedUser(event, session.user.id, {
    email: body.email,
    name: body.name,
    password
  })

  await db.$transaction(async (tx) => {
    const normalizedRoles = await syncUserRoles(tx, user.id, roles)

    await tx.auditLog.create({
      data: {
        actorId: session.user.id,
        action: 'users.create',
        entityType: 'user',
        entityId: user.id,
        metadata: {
          email: user.email,
          roles: normalizedRoles,
          passwordProvisioned: !!password
        }
      }
    })
  })

  return {
    id: user.id
  }
})
