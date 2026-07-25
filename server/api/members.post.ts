import { readBody } from 'h3'
import { z } from 'zod'

import { db } from '~~/lib/db'
import { appRoleOptions } from '~~/lib/rbac'
import { requirePermission } from '~~/server/utils/rbac'

const createMemberSchema = z.object({
  name: z.string().trim().min(2).max(191),
  email: z.email().trim().max(191),
  password: z.string().min(8).max(128).optional().or(z.literal('')),
  roles: z.array(z.enum(appRoleOptions))
    .min(1)
})

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, 'users.create')
  const body = createMemberSchema.parse(await readBody(event))
  const password = body.password?.trim() || undefined

  const user = await db.$transaction(async (tx) => {
    const savedUser = await tx.user.upsert({
      where: {
        email: body.email
      },
      update: {
        name: body.name,
        isActive: true,
        emailVerified: true
      },
      create: {
        id: crypto.randomUUID(),
        name: body.name,
        email: body.email,
        emailVerified: true,
        isActive: true
      }
    })

    await tx.auditLog.create({
      data: {
        actorId: session.user.id,
        action: 'users.create',
        entityType: 'user',
        entityId: savedUser.id,
        metadata: {
          email: savedUser.email,
          roles: body.roles,
          passwordProvisioned: !!password
        }
      }
    })

    return savedUser
  })

  const { auth } = await import('~~/lib/auth')

  await auth.api.setRole({
    headers: event.headers,
    body: {
      userId: user.id,
      role: body.roles
    }
  })

  if (password) {
    await auth.api.setUserPassword({
      headers: event.headers,
      body: {
        userId: user.id,
        newPassword: password
      }
    })
  }

  return {
    id: user.id
  }
})
