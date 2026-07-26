import { adminAc, defaultStatements } from 'better-auth/plugins/admin/access'
import { createAccessControl } from 'better-auth/plugins/access'

export const ac = createAccessControl({
  ...defaultStatements,
  dashboard: ['view'],
  settings: ['view'],
  settingsMembers: ['view', 'manage'],
  users: ['view', 'create', 'update', 'assign-role', 'deactivate'],
  roles: ['view', 'manage'],
  permissions: ['view', 'manage'],
  auditLogs: ['view']
} as const)

export const permissionRequests = {
  'dashboard.view': { dashboard: ['view'] },
  'settings.view': { settings: ['view'] },
  'settings.members.view': { settingsMembers: ['view'] },
  'settings.members.manage': { settingsMembers: ['manage'] },
  'users.view': { users: ['view'] },
  'users.create': { users: ['create'] },
  'users.update': { users: ['update'] },
  'users.assign-role': { users: ['assign-role'] },
  'users.deactivate': { users: ['deactivate'] },
  'roles.view': { roles: ['view'] },
  'roles.manage': { roles: ['manage'] },
  'permissions.view': { permissions: ['view'] },
  'permissions.manage': { permissions: ['manage'] },
  'audit-logs.view': { auditLogs: ['view'] }
} as const

export type AppPermission = keyof typeof permissionRequests
export const permissionList = Object.keys(permissionRequests) as AppPermission[]

export const permissionMetadata: Record<AppPermission, { label: string, description: string }> = {
  'dashboard.view': {
    label: 'Dashboard',
    description: 'Open the main dashboard.'
  },
  'settings.view': {
    label: 'Settings',
    description: 'Access the settings area.'
  },
  'settings.members.view': {
    label: 'View Members',
    description: 'See the members page and directory.'
  },
  'settings.members.manage': {
    label: 'Manage Members Settings',
    description: 'Change member-related settings and flows.'
  },
  'users.view': {
    label: 'View Users',
    description: 'Read approved user records.'
  },
  'users.create': {
    label: 'Create Users',
    description: 'Approve and create internal users.'
  },
  'users.update': {
    label: 'Update Users',
    description: 'Change existing user records and passwords.'
  },
  'users.assign-role': {
    label: 'Assign Roles',
    description: 'Attach roles to users.'
  },
  'users.deactivate': {
    label: 'Deactivate Users',
    description: 'Disable internal accounts.'
  },
  'roles.view': {
    label: 'View Roles',
    description: 'Browse available roles.'
  },
  'roles.manage': {
    label: 'Manage Roles',
    description: 'Create, edit, and delete custom roles.'
  },
  'permissions.view': {
    label: 'View Permissions',
    description: 'Inspect permission definitions.'
  },
  'permissions.manage': {
    label: 'Manage Permissions',
    description: 'Control permission definitions.'
  },
  'audit-logs.view': {
    label: 'View Audit Logs',
    description: 'Review audit log history.'
  }
}

export interface RoleDefinition {
  slug: string
  name: string
  description: string
  permissions: AppPermission[]
  isSystem: boolean
}

export const systemRoleDefinitions = [{
  slug: 'super-admin',
  name: 'Super Admin',
  description: 'Full access to the dashboard, member administration, role management, and audit data.',
  permissions: [...permissionList],
  isSystem: true
}, {
  slug: 'admin',
  name: 'Admin',
  description: 'Manage members and operational settings without full role administration.',
  permissions: [
    'dashboard.view',
    'settings.view',
    'settings.members.view',
    'settings.members.manage',
    'users.view',
    'users.create',
    'users.update',
    'users.assign-role',
    'users.deactivate',
    'roles.view',
    'audit-logs.view'
  ],
  isSystem: true
}, {
  slug: 'manager',
  name: 'Manager',
  description: 'View workspace settings and member lists.',
  permissions: [
    'dashboard.view',
    'settings.view',
    'settings.members.view'
  ],
  isSystem: true
}, {
  slug: 'staff',
  name: 'Staff',
  description: 'Basic dashboard access for day-to-day work.',
  permissions: [
    'dashboard.view'
  ],
  isSystem: true
}] satisfies RoleDefinition[]

export const systemRoleSlugs = systemRoleDefinitions.map(role => role.slug)
export const defaultUserRole = 'staff'

function createStatementsForPermissions(permissions: readonly AppPermission[]) {
  return permissions.reduce<Record<string, string[]>>((statements, permission) => {
    for (const [resource, actions] of Object.entries(permissionRequests[permission])) {
      statements[resource] = Array.from(new Set([...(statements[resource] ?? []), ...actions]))
    }

    return statements
  }, {})
}

export const authRoles = Object.fromEntries(
  systemRoleDefinitions.map((role) => {
    const baseStatements = role.slug === 'super-admin' || role.slug === 'admin'
      ? adminAc.statements
      : {}

    return [role.slug, ac.newRole({
      ...baseStatements,
      ...createStatementsForPermissions(role.permissions)
    })]
  })
)

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
