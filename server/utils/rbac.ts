import { createError, type H3Event } from 'h3'

import type { AppPermission } from '#shared/rbac'
import { parseStoredRoles, permissionList, systemRoleDefinitions, systemRoleSlugs } from '#shared/rbac'
import { db } from '#server/utils/db'
import { requireAuthSession } from '~~/server/utils/auth'

const systemRoleMap = new Map(systemRoleDefinitions.map(role => [role.slug, role]))

function parseRolePermissions(value: unknown): AppPermission[] {
  if (!Array.isArray(value)) {
    return []
  }

  const permissionSet = new Set(permissionList)

  return Array.from(new Set(
    value.filter((permission): permission is AppPermission => {
      return typeof permission === 'string' && permissionSet.has(permission as AppPermission)
    })
  ))
}

export async function getRoleDefinitions() {
  const customRoles = await db.role.findMany({
    orderBy: {
      name: 'asc'
    },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      permissions: true,
      isSystem: true,
      createdAt: true,
      updatedAt: true
    }
  })

  return [
    ...systemRoleDefinitions.map((role) => {
      return {
        ...role,
        id: role.slug,
        createdAt: null,
        updatedAt: null
      }
    }),
    ...customRoles.map((role) => {
      return {
        ...role,
        description: role.description || '',
        permissions: parseRolePermissions(role.permissions)
      }
    })
  ]
}

export async function getRoleDefinitionMap() {
  const roles = await getRoleDefinitions()

  return new Map(roles.map(role => [role.slug, role]))
}

export async function getRoleOptions() {
  const roles = await getRoleDefinitions()

  return roles.map((role) => {
    return {
      slug: role.slug,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem
    }
  })
}

export async function ensureRolesExist(roles: readonly string[]) {
  const normalizedRoles = parseStoredRoles(roles.join(','))
  const customRoleSlugs = normalizedRoles.filter(role => !systemRoleSlugs.includes(role))

  if (customRoleSlugs.length > 0) {
    const existingRoles = await db.role.findMany({
      where: {
        slug: {
          in: customRoleSlugs
        }
      },
      select: {
        slug: true
      }
    })

    const existingRoleSet = new Set(existingRoles.map(role => role.slug))
    const unknownRoles = customRoleSlugs.filter(role => !existingRoleSet.has(role))

    if (unknownRoles.length > 0) {
      throw createError({
        statusCode: 400,
        statusMessage: `Unknown role: ${unknownRoles.join(', ')}`
      })
    }
  }

  return normalizedRoles
}

export async function getPermissionsForRoles(roles: readonly string[]) {
  const normalizedRoles = parseStoredRoles(roles.join(','))
  const permissions = new Set<AppPermission>()

  for (const role of normalizedRoles) {
    const systemRole = systemRoleMap.get(role)

    if (systemRole) {
      for (const permission of systemRole.permissions) {
        permissions.add(permission)
      }
    }
  }

  const customRoleSlugs = normalizedRoles.filter(role => !systemRoleMap.has(role))

  if (customRoleSlugs.length > 0) {
    const customRoles = await db.role.findMany({
      where: {
        slug: {
          in: customRoleSlugs
        }
      },
      select: {
        permissions: true
      }
    })

    for (const role of customRoles) {
      for (const permission of parseRolePermissions(role.permissions)) {
        permissions.add(permission)
      }
    }
  }

  return Array.from(permissions)
}

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
  const permissions = await getPermissionsForRoles(roles)

  return {
    roles,
    permissions
  }
}

export async function hasRole(userId: string, role: string) {
  const roles = await getUserRoles(userId)
  return roles.includes(role)
}

export async function hasPermission(userId: string, permission: AppPermission) {
  return (await getUserPermissions(userId)).has(permission)
}

export async function requireRole(event: H3Event, role: string) {
  const session = await requireAuthSession(event)

  if (!(await hasRole(session.user.id, role))) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden'
    })
  }

  return session
}

export async function requireAnyPermission(event: H3Event, permissions: readonly AppPermission[]) {
  const session = await requireAuthSession(event)
  const userPermissions = await getUserPermissions(session.user.id)

  if (!permissions.some(permission => userPermissions.has(permission))) {
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
