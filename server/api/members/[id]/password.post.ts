import { createError, getRouterParam, readBody } from 'h3'
import { z } from 'zod'

import { auth } from '~~/lib/auth'
import { db } from '~~/lib/db'
import { requirePermission } from '~~/server/utils/rbac'

const setPasswordSchema = z.object({
  password: z.string().trim().min(8).max(128)
})

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, 'users.update')
  const userId = getRouterParam(event, 'id')

  if (!userId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing member id.'
    })
  }

  const body = setPasswordSchema.parse(await readBody(event))

  await auth.api.setUserPassword({
    headers: event.headers,
    body: {
      userId,
      newPassword: body.password
    }
  })

  await db.auditLog.create({
    data: {
      actorId: session.user.id,
      action: 'users.set-password',
      entityType: 'user',
      entityId: userId,
      metadata: {
        passwordProvisioned: true
      }
    }
  })

  return {
    success: true
  }
})
