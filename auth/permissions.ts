import { createAccessControl } from 'better-auth/plugins/access'
import { adminAc, defaultStatements } from 'better-auth/plugins/admin/access'

export const appStatements = {
  ...defaultStatements,
  dashboard: ['read'],
  settings: ['read'],
  members: ['read', 'create', 'update', 'delete', 'set-password', 'ban'],
  auditLogs: ['read']
} as const

export type AppStatements = typeof appStatements
type AppStatementKey = keyof AppStatements
type AppStatementAction<TKey extends AppStatementKey> = AppStatements[TKey][number]
type AppActionRequest<TKey extends AppStatementKey> = readonly AppStatementAction<TKey>[] | {
  readonly actions: readonly AppStatementAction<TKey>[]
  readonly connector: 'AND' | 'OR'
}

export type AppAccessRequest = {
  readonly [TKey in AppStatementKey]?: AppActionRequest<TKey>
}

export const ac = createAccessControl(appStatements)

const userStatements = {
  dashboard: ['read']
} as const satisfies AppAccessRequest

const operatorStatements = {
  dashboard: ['read'],
  settings: ['read'],
  members: ['read']
} as const satisfies AppAccessRequest

const adminStatements = {
  dashboard: ['read'],
  settings: ['read'],
  members: ['read', 'create', 'update', 'delete', 'set-password', 'ban'],
  user: ['create', 'list', 'get', 'update', 'set-role', 'ban', 'set-password'],
  session: ['revoke']
} as const satisfies AppAccessRequest

const superAdminStatements = {
  ...adminAc.statements,
  dashboard: ['read'],
  settings: ['read'],
  members: ['read', 'create', 'update', 'delete', 'set-password', 'ban'],
  auditLogs: ['read']
} as const satisfies AppAccessRequest

export const predefinedRoles = {
  'user': {
    name: 'User',
    description: 'Read-only Untuk Semua Dashboard',
    statements: userStatements
  },
  'operator': {
    name: 'Operator',
    description: '+ Input data, tergantung kepada bidang yang dituju',
    statements: operatorStatements
  },
  'admin': {
    name: 'Admin',
    description: '+ Input semua bidang dan Kontrol Akses Akun',
    statements: adminStatements
  },
  'super-admin': {
    name: 'Super Admin',
    description: 'Semua',
    statements: superAdminStatements
  }
} as const

export type AppRoleSlug = keyof typeof predefinedRoles

export const roles = {
  'user': ac.newRole(predefinedRoles.user.statements),
  'operator': ac.newRole(predefinedRoles.operator.statements),
  'admin': ac.newRole(predefinedRoles.admin.statements),
  'super-admin': ac.newRole(predefinedRoles['super-admin'].statements)
} as const

export const defaultRole: AppRoleSlug = 'user'
export const adminRoleSlugs = ['admin', 'super-admin'] as const satisfies readonly AppRoleSlug[]

export const roleOptions = (Object.entries(predefinedRoles) as Array<[AppRoleSlug, (typeof predefinedRoles)[AppRoleSlug]]>).map(([slug, role]) => {
  return {
    slug,
    name: role.name,
    description: role.description,
    isSystem: true
  }
})

export const appPermissions = {
  dashboardRead: { dashboard: ['read'] },
  settingsRead: { settings: ['read'] },
  membersRead: { members: ['read'] },
  membersCreate: { members: ['create'] },
  membersUpdate: { members: ['update'] },
  membersDelete: { members: ['delete'] },
  membersSetPassword: { members: ['set-password'] },
  membersBan: { members: ['ban'] },
  auditLogsRead: { auditLogs: ['read'] }
} as const satisfies Record<string, AppAccessRequest>

function dedupeStrings(values: readonly string[]) {
  return Array.from(new Set(values.map(value => value.trim()).filter(Boolean)))
}

export function isKnownRole(role: string): role is AppRoleSlug {
  return Object.prototype.hasOwnProperty.call(predefinedRoles, role)
}

export function parseStoredRoles(value?: string | null) {
  if (!value) {
    return []
  }

  return dedupeStrings(value.split(','))
}

export function normalizeRoleSelection(values: readonly string[]) {
  const normalizedRoles = parseStoredRoles(values.join(',')).filter(isKnownRole)

  if (normalizedRoles.length > 0) {
    return normalizedRoles
  }

  return [defaultRole]
}

export function getUnknownRoles(values: readonly string[]) {
  return parseStoredRoles(values.join(',')).filter(role => !isKnownRole(role))
}

export function getEffectiveRoles(roleValue?: string | null) {
  const normalizedRoles = parseStoredRoles(roleValue).filter(isKnownRole)

  if (normalizedRoles.length > 0) {
    return normalizedRoles
  }

  return [defaultRole]
}

export function hasAccessForRole(roleValue: string | null | undefined, request: AppAccessRequest) {
  return getEffectiveRoles(roleValue).some((role) => {
    return roles[role].authorize(request).success
  })
}

export function hasAnyAccessForRole(roleValue: string | null | undefined, requests: readonly AppAccessRequest[]) {
  return requests.some(request => hasAccessForRole(roleValue, request))
}

export function formatRoleLabel(role: string) {
  return role
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}
