import { adminAc, defaultStatements } from 'better-auth/plugins/admin/access'
import { createAccessControl } from 'better-auth/plugins/access'

export const appRoleOptions = ['super-admin', 'admin', 'manager', 'staff'] as const
export type AppRole = typeof appRoleOptions[number]

export const ac = createAccessControl({
  ...defaultStatements,
  dashboard: ['view'],
  inbox: ['view'],
  customers: ['view', 'create', 'update', 'delete'],
  settings: ['view'],
  settingsMembers: ['view', 'manage'],
  settingsNotifications: ['view'],
  settingsSecurity: ['view'],
  users: ['view', 'create', 'update', 'assign-role', 'deactivate'],
  roles: ['view', 'manage'],
  permissions: ['view', 'manage'],
  auditLogs: ['view']
} as const)

export const authRoles = {
  'super-admin': ac.newRole({
    ...adminAc.statements,
    dashboard: ['view'],
    inbox: ['view'],
    customers: ['view', 'create', 'update', 'delete'],
    settings: ['view'],
    settingsMembers: ['view', 'manage'],
    settingsNotifications: ['view'],
    settingsSecurity: ['view'],
    users: ['view', 'create', 'update', 'assign-role', 'deactivate'],
    roles: ['view', 'manage'],
    permissions: ['view', 'manage'],
    auditLogs: ['view']
  }),
  admin: ac.newRole({
    ...adminAc.statements,
    dashboard: ['view'],
    inbox: ['view'],
    customers: ['view', 'create', 'update', 'delete'],
    settings: ['view'],
    settingsMembers: ['view', 'manage'],
    settingsNotifications: ['view'],
    settingsSecurity: ['view'],
    users: ['view', 'create', 'update', 'assign-role', 'deactivate'],
    roles: ['view'],
    auditLogs: ['view']
  }),
  manager: ac.newRole({
    dashboard: ['view'],
    inbox: ['view'],
    customers: ['view', 'create', 'update'],
    settings: ['view'],
    settingsMembers: ['view'],
    settingsNotifications: ['view']
  }),
  staff: ac.newRole({
    dashboard: ['view'],
    inbox: ['view'],
    customers: ['view']
  })
} as const

export const defaultUserRole: AppRole = 'staff'

export const permissionRequests = {
  'dashboard.view': { dashboard: ['view'] },
  'inbox.view': { inbox: ['view'] },
  'customers.view': { customers: ['view'] },
  'customers.create': { customers: ['create'] },
  'customers.update': { customers: ['update'] },
  'customers.delete': { customers: ['delete'] },
  'settings.view': { settings: ['view'] },
  'settings.members.view': { settingsMembers: ['view'] },
  'settings.members.manage': { settingsMembers: ['manage'] },
  'settings.notifications.view': { settingsNotifications: ['view'] },
  'settings.security.view': { settingsSecurity: ['view'] },
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

export function parseStoredRoles(value?: string | null): AppRole[] {
  if (!value) {
    return []
  }

  return Array.from(new Set(
    value
      .split(',')
      .map((role) => role.trim())
      .filter((role): role is AppRole => {
        return appRoleOptions.includes(role as AppRole)
      })
  ))
}

export function getPermissionsForRoles(roles: readonly AppRole[]) {
  const permissions = new Set<AppPermission>()

  for (const role of roles) {
    const authRole = authRoles[role]

    for (const permission of permissionList) {
      if (authRole.authorize(permissionRequests[permission]).success) {
        permissions.add(permission)
      }
    }
  }

  return Array.from(permissions)
}
