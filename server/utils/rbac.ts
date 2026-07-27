import type { Prisma } from '#server/generated/prisma/client'
import { createError, type H3Event } from 'h3'

import type { AppPermission, PermissionDefinition } from '#shared/rbac'
import { parseStoredRoles } from '#shared/rbac'
import { db } from '#server/utils/db'
import { requireAuthSession } from '~~/server/utils/auth'

type DatabaseClient = Prisma.TransactionClient | typeof db

function dedupeStrings(values: readonly string[]) {
  return Array.from(new Set(
    values
      .map(value => value.trim())
      .filter(Boolean)
  ))
}

export async function getPermissionDefinitions() {
  const storedPermissions = await db.permission.findMany({
    orderBy: [
      {
        group: 'asc'
      },
      {
        label: 'asc'
      }
    ],
    select: {
      id: true,
      key: true,
      label: true,
      description: true,
      group: true,
      isSystem: true,
      rolePermissions: {
        select: {
          role: {
            select: {
              slug: true,
              name: true
            }
          }
        }
      }
    }
  })

  return storedPermissions.map((permission) => {
    const assignedRoles = permission.rolePermissions
      .map(({ role }) => role)
      .sort((a, b) => a.name.localeCompare(b.name))

    return {
      id: permission.id,
      key: permission.key,
      label: permission.label,
      description: permission.description ?? '',
      group: permission.group,
      isSystem: permission.isSystem,
      assignedRoleCount: assignedRoles.length,
      assignedRoles,
      canEdit: !permission.isSystem,
      canDelete: !permission.isSystem && assignedRoles.length === 0
    } satisfies PermissionDefinition & {
      id: string
      assignedRoleCount: number
      assignedRoles: Array<{
        slug: string
        name: string
      }>
      canEdit: boolean
      canDelete: boolean
    }
  })
}

export async function getPermissionDefinitionMap() {
  const permissions = await getPermissionDefinitions()
  return new Map(permissions.map(permission => [permission.key, permission]))
}

export async function ensurePermissionsExist(permissions: readonly string[]) {
  const normalizedPermissions = dedupeStrings(permissions)
  const permissionMap = await getPermissionDefinitionMap()
  const unknownPermissions = normalizedPermissions.filter(permission => !permissionMap.has(permission))

  if (unknownPermissions.length > 0) {
    throw createError({
      statusCode: 400,
      statusMessage: `Unknown permission: ${unknownPermissions.join(', ')}`
    })
  }

  return normalizedPermissions
}

export async function syncRolePermissions(client: DatabaseClient, roleId: string, permissions: readonly string[]) {
  const normalizedPermissions = await ensurePermissionsExist(permissions)

  const storedPermissions = normalizedPermissions.length > 0
    ? await client.permission.findMany({
        where: {
          key: {
            in: normalizedPermissions
          }
        },
        select: {
          id: true,
          key: true
        }
      })
    : []

  const storedPermissionMap = new Map(storedPermissions.map(permission => [permission.key, permission.id]))
  const missingPermissions = normalizedPermissions.filter(permission => !storedPermissionMap.has(permission))

  if (missingPermissions.length > 0) {
    throw createError({
      statusCode: 500,
      statusMessage: `Permission records are missing from the database: ${missingPermissions.join(', ')}`
    })
  }

  await client.rolePermission.deleteMany({
    where: {
      roleId
    }
  })

  if (normalizedPermissions.length === 0) {
    return normalizedPermissions
  }

  await client.rolePermission.createMany({
    data: normalizedPermissions.map((permission) => {
      return {
        roleId,
        permissionId: storedPermissionMap.get(permission)!
      }
    }),
    skipDuplicates: true
  })

  return normalizedPermissions
}

export async function getRoleDefinitions() {
  const storedRoles = await db.role.findMany({
    orderBy: [
      {
        isSystem: 'desc'
      },
      {
        name: 'asc'
      }
    ],
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      isSystem: true,
      createdAt: true,
      updatedAt: true,
      rolePermissions: {
        select: {
          permission: {
            select: {
              key: true
            }
          }
        }
      }
    }
  })

  const normalizedStoredRoles = storedRoles.map((role) => {
    const storedPermissions = role.rolePermissions.map(({ permission }) => permission.key)

    return {
      id: role.id,
      slug: role.slug,
      name: role.name,
      description: role.description || '',
      permissions: dedupeStrings(storedPermissions),
      isSystem: role.isSystem,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt
    }
  })

  return normalizedStoredRoles
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
  const roleMap = await getRoleDefinitionMap()
  const unknownRoles = normalizedRoles.filter(role => !roleMap.has(role))

  if (unknownRoles.length > 0) {
    throw createError({
      statusCode: 400,
      statusMessage: `Unknown role: ${unknownRoles.join(', ')}`
    })
  }

  return normalizedRoles
}

export async function syncUserRoles(client: DatabaseClient, userId: string, roles: readonly string[]) {
  const normalizedRoles = await ensureRolesExist(roles)
  const storedRoles = normalizedRoles.length > 0
    ? await client.role.findMany({
        where: {
          slug: {
            in: normalizedRoles
          }
        },
        select: {
          id: true,
          slug: true
        }
      })
    : []

  const storedRoleMap = new Map(storedRoles.map(role => [role.slug, role.id]))
  const missingRoles = normalizedRoles.filter(role => !storedRoleMap.has(role))

  if (missingRoles.length > 0) {
    throw createError({
      statusCode: 500,
      statusMessage: `Role records are missing from the database: ${missingRoles.join(', ')}`
    })
  }

  await client.userRole.deleteMany({
    where: {
      userId
    }
  })

  if (normalizedRoles.length === 0) {
    return normalizedRoles
  }

  await client.userRole.createMany({
    data: normalizedRoles.map((role) => {
      return {
        userId,
        roleId: storedRoleMap.get(role)!
      }
    }),
    skipDuplicates: true
  })

  return normalizedRoles
}

export async function getPermissionsForRoles(roles: readonly string[]) {
  const normalizedRoles = parseStoredRoles(roles.join(','))
  const roleMap = await getRoleDefinitionMap()
  const permissions = new Set<AppPermission>()

  for (const role of normalizedRoles) {
    const roleDefinition = roleMap.get(role)

    if (roleDefinition) {
      for (const permission of roleDefinition.permissions) {
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
      userRoles: {
        select: {
          role: {
            select: {
              slug: true
            }
          }
        }
      }
    }
  })

  return dedupeStrings(user?.userRoles.map(({ role }) => role.slug) ?? [])
}

export async function getUserPermissions(userId: string) {
  const { permissions } = await getUserAccess(userId)
  return new Set(permissions)
}

export async function getUserAccess(userId: string) {
  const roles = await getUserRoles(userId)
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
