import { createError, getRouterParam } from 'h3'

import { appPermissions, getEffectiveRoles } from '~~/auth/permissions'
import { requirePermission } from '~~/server/utils/access'
import { removeManagedUser } from '#server/utils/auth-admin'
import { db } from '#server/utils/db'

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, appPermissions.membersDelete)
  const userId = getRouterParam(event, 'id')

  if (!userId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing member id.'
    })
  }

  if (session.user.id === userId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'You cannot delete your own account.'
    })
  }

  const existingUser = await db.user.findUnique({
    where: {
      id: userId
    },
    select: {
      id: true,
      email: true,
      role: true
    }
  })

  if (!existingUser) {
    throw createError({
      statusCode: 404,
      statusMessage: 'User not found.'
    })
  }

  await removeManagedUser(event, userId)

  await db.auditLog.create({
    data: {
      actorId: session.user.id,
      action: 'members.delete',
      entityType: 'user',
      entityId: userId,
      metadata: {
        email: existingUser.email,
        roles: getEffectiveRoles(existingUser.role)
      }
    }
  })

  return {
    success: true
  }
})
