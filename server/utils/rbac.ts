import { createError, type H3Event } from 'h3'

import type { AppPermission, AppRole } from '~~/lib/rbac'
import { db } from '~~/lib/db'
import { getPermissionsForRoles, parseStoredRoles } from '~~/lib/rbac'
import { requireAuthSession } from '~~/server/utils/auth'

export async function getUserRoles(userId: string) {
  const user = await db.user.findUnique({
    where: {
      id: userId
    },
    select: {
      role: true
    }
  })

  return parseStoredRoles(user?.role)
}

export async function getUserPermissions(userId: string) {
  const { permissions } = await getUserAccess(userId)
  return new Set(permissions)
}

export async function getUserAccess(userId: string) {
  const user = await db.user.findUnique({
    where: {
      id: userId
    },
    select: {
      role: true
    }
  })

  const roles = parseStoredRoles(user?.role)
  const permissions = getPermissionsForRoles(roles)

  return {
    roles,
    permissions
  }
}

export async function hasRole(userId: string, role: AppRole) {
  const roles = await getUserRoles(userId)
  return roles.includes(role)
}

export async function hasPermission(userId: string, permission: AppPermission) {
  return (await getUserPermissions(userId)).has(permission)
}

export async function requireRole(event: H3Event, role: AppRole) {
  const session = await requireAuthSession(event)

  if (!(await hasRole(session.user.id, role))) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden'
    })
  }

  return session
}

export async function requirePermission(event: H3Event, permission: AppPermission) {
  const session = await requireAuthSession(event)

  if (!(await hasPermission(session.user.id, permission))) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden'
    })
  }

  return session
}
