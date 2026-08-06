import type { H3Event } from 'h3'

import { createError } from 'h3'

import type { AppAccessRequest } from '~~/auth/permissions'
import { hasAccessForRole, hasAnyAccessForRole } from '~~/auth/permissions'
import { requireAuthSession } from '#server/utils/auth'

export async function requirePermission(event: H3Event, permission: AppAccessRequest) {
  const session = await requireAuthSession(event)

  if (!hasAccessForRole(session.user.role, permission)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden'
    })
  }

  return session
}

export async function requireAnyPermission(event: H3Event, permissions: readonly AppAccessRequest[]) {
  const session = await requireAuthSession(event)

  if (!hasAnyAccessForRole(session.user.role, permissions)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden'
    })
  }

  return session
}
