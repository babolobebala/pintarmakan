import { createError, getRouterParam, readBody } from 'h3'
import { z } from 'zod'

import { appPermissions } from '~~/auth/permissions'
import { setManagedUserStatus } from '#server/utils/auth-admin'
import { db } from '#server/utils/db'
import { requirePermission } from '~~/server/utils/access'

const setStatusSchema = z.object({
  active: z.boolean()
})

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, appPermissions.membersBan)
  const userId = getRouterParam(event, 'id')

  if (!userId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing member id.'
    })
  }

  const body = setStatusSchema.parse(await readBody(event))

  await setManagedUserStatus(event, userId, body.active)

  await db.auditLog.create({
    data: {
      actorId: session.user.id,
      action: body.active ? 'members.activate' : 'members.deactivate',
      entityType: 'user',
      entityId: userId,
      metadata: {
        active: body.active
      }
    }
  })

  return {
    success: true
  }
})
