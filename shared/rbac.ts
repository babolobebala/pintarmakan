export const permissionRequests = {
  'dashboard.read': { dashboard: ['read'] },
  'settings.read': { settings: ['read'] },
  'users.read': { users: ['read'] },
  'users.create': { users: ['create'] },
  'users.update': { users: ['update'] },
  'users.delete': { users: ['delete'] },
  'roles.read': { roles: ['read'] },
  'roles.create': { roles: ['create'] },
  'roles.update': { roles: ['update'] },
  'roles.delete': { roles: ['delete'] },
  'permissions.read': { permissions: ['read'] },
  'permissions.create': { permissions: ['create'] },
  'permissions.update': { permissions: ['update'] },
  'permissions.delete': { permissions: ['delete'] },
  'audit-logs.read': { auditLogs: ['read'] }
} as const

export type BuiltInPermission = keyof typeof permissionRequests
export type AppPermission = string

export const permissionMetadata: Record<BuiltInPermission, { label: string, description: string, group: string }> = {
  'dashboard.read': {
    label: 'Read Dashboard',
    description: 'Open the main dashboard.',
    group: 'Dashboard'
  },
  'settings.read': {
    label: 'Read Settings',
    description: 'Access the settings area.',
    group: 'Settings'
  },
  'users.read': {
    label: 'Read Users',
    description: 'Read approved user records.',
    group: 'Users'
  },
  'users.create': {
    label: 'Create Users',
    description: 'Approve and create internal users.',
    group: 'Users'
  },
  'users.update': {
    label: 'Update Users',
    description: 'Change existing user records, role assignments, and passwords.',
    group: 'Users'
  },
  'users.delete': {
    label: 'Delete Users',
    description: 'Remove or deactivate internal accounts.',
    group: 'Users'
  },
  'roles.read': {
    label: 'Read Roles',
    description: 'Browse available roles.',
    group: 'Roles'
  },
  'roles.create': {
    label: 'Create Roles',
    description: 'Create custom roles.',
    group: 'Roles'
  },
  'roles.update': {
    label: 'Update Roles',
    description: 'Edit custom roles and their permission sets.',
    group: 'Roles'
  },
  'roles.delete': {
    label: 'Delete Roles',
    description: 'Delete custom roles.',
    group: 'Roles'
  },
  'permissions.read': {
    label: 'Read Permissions',
    description: 'Inspect permission definitions.',
    group: 'Permissions'
  },
  'permissions.create': {
    label: 'Create Permissions',
    description: 'Create permission definitions.',
    group: 'Permissions'
  },
  'permissions.update': {
    label: 'Update Permissions',
    description: 'Edit permission definitions.',
    group: 'Permissions'
  },
  'permissions.delete': {
    label: 'Delete Permissions',
    description: 'Delete permission definitions.',
    group: 'Permissions'
  },
  'audit-logs.read': {
    label: 'Read Audit Logs',
    description: 'Review audit log history.',
    group: 'Audit Logs'
  }
}

export interface PermissionDefinition {
  key: string
  label: string
  description: string
  group: string
  isSystem: boolean
}

export const initialPermissionDefinitions = Object.entries(permissionMetadata).map(([key, metadata]) => {
  return {
    key,
    label: metadata.label,
    description: metadata.description,
    group: metadata.group,
    isSystem: true
  }
}) satisfies PermissionDefinition[]

export interface RoleDefinition {
  slug: string
  name: string
  description: string
  permissions: AppPermission[]
  isSystem: boolean
}

export function slugifyRoleName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function isRoleSlug(value: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
}

export function parseStoredRoles(value?: string | null): string[] {
  if (!value) {
    return []
  }

  return Array.from(new Set(
    value
      .split(',')
      .map(role => role.trim())
      .filter(role => isRoleSlug(role))
  ))
}

export function formatRoleLabel(role: string) {
  return role
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function getInitialPermissionDefinition(key: string) {
  return initialPermissionDefinitions.find(permission => permission.key === key)
}
