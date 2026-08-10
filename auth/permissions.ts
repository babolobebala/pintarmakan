import { createAccessControl } from 'better-auth/plugins/access'
import { adminAc, defaultStatements } from 'better-auth/plugins/admin/access'

// DASHBOARD UNTUK READ DASHBOARD
// SETTING UNTUK PENGATURAN BIASA
// MEMBERS UNTUK KELOLA AUTHENTIKASI DAN AUTHORISASI
// AUDIT LOG UNTUK LOG
// BUSINESS DATA UNTUK DATA YANG NANTI BISA DIINPUT OLEH BIDANG APA AJA

export const appStatements = {
  ...defaultStatements,
  dashboard: ['read'],
  members: ['read', 'create', 'update', 'delete', 'set-password', 'ban'],
  datasets: ['read', 'create', 'update', 'delete'],
  auditLogs: ['read'],
  businessData: ['read', 'create', 'update', 'delete']
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

type AppRoleStatements = {
  readonly [TKey in AppStatementKey]?: readonly AppStatementAction<TKey>[]
}

export const ac = createAccessControl(appStatements)

export const roleHierarchy = ['user', 'operator', 'admin', 'super-admin'] as const
export type AppRoleSlug = (typeof roleHierarchy)[number]

const roleRank = Object.fromEntries(
  roleHierarchy.map((role, index) => [role, index])
) as Record<AppRoleSlug, number>

const userOwnStatements = {
  dashboard: ['read']
} as const satisfies AppRoleStatements

const operatorOwnStatements = {
  businessData: ['read', 'create', 'update', 'delete']
} as const satisfies AppRoleStatements

const adminOwnStatements = {
  members: ['read', 'create', 'update', 'delete', 'set-password', 'ban'],
  user: ['create', 'list', 'get', 'update', 'set-role', 'ban', 'set-password'],
  session: ['revoke']
} as const satisfies AppRoleStatements

const superAdminOwnStatements = {
  datasets: ['read', 'create', 'update', 'delete'],
  auditLogs: ['read']
} as const satisfies AppRoleStatements

function composeStatements(...sources: readonly AppRoleStatements[]) {
  const merged: Partial<Record<AppStatementKey, string[]>> = {}

  for (const source of sources) {
    for (const [resource, actions] of Object.entries(source) as Array<[AppStatementKey, readonly string[]]>) {
      const currentActions = merged[resource] ?? []

      merged[resource] = Array.from(new Set([...currentActions, ...actions]))
    }
  }

  return merged as AppRoleStatements
}

const userStatements = composeStatements(userOwnStatements)
const operatorStatements = composeStatements(userStatements, operatorOwnStatements)
const adminStatements = composeStatements(operatorStatements, adminOwnStatements)
const superAdminStatements = composeStatements(
  adminStatements,
  adminAc.statements as AppRoleStatements,
  superAdminOwnStatements
)

export const predefinedRoles = {
  'user': {
    name: 'User',
    description: 'Melihat dashboard dan data yang diizinkan.',
    statements: userStatements
  },
  'operator': {
    name: 'Operator',
    description: 'Hak User + input/pembaruan data pada Bidang yang ditugaskan.',
    statements: operatorStatements
  },
  'admin': {
    name: 'Admin',
    description: 'Hak Operator untuk seluruh Bidang + pengelolaan akun.',
    statements: adminStatements
  },
  'super-admin': {
    name: 'Super Admin',
    description: 'Akses penuh aplikasi dan administrasi sistem.',
    statements: superAdminStatements
  }
} as const satisfies Record<AppRoleSlug, {
  readonly name: string
  readonly description: string
  readonly statements: AppRoleStatements
}>

export const roles = {
  'user': ac.newRole(predefinedRoles.user.statements),
  'operator': ac.newRole(predefinedRoles.operator.statements),
  'admin': ac.newRole(predefinedRoles.admin.statements),
  'super-admin': ac.newRole(predefinedRoles['super-admin'].statements)
} as const

export const defaultRole: AppRoleSlug = 'user'
export const adminRoleSlugs = ['admin', 'super-admin'] as const satisfies readonly AppRoleSlug[]
export const assignableRoleSlugs = ['user', 'operator', 'admin'] as const satisfies readonly AppRoleSlug[]
export type AssignableRoleSlug = (typeof assignableRoleSlugs)[number]

export const roleOptions = roleHierarchy.map((slug) => {
  const role = predefinedRoles[slug]

  return {
    slug,
    name: role.name,
    description: role.description,
    isSystem: true
  }
})

export const appPermissions = {
  dashboardRead: { dashboard: ['read'] },
  membersRead: { members: ['read'] },
  membersCreate: { members: ['create'] },
  membersUpdate: { members: ['update'] },
  membersDelete: { members: ['delete'] },
  membersSetPassword: { members: ['set-password'] },
  membersBan: { members: ['ban'] },
  datasetsRead: { datasets: ['read'] },
  datasetsCreate: { datasets: ['create'] },
  datasetsUpdate: { datasets: ['update'] },
  datasetsDelete: { datasets: ['delete'] },
  auditLogsRead: { auditLogs: ['read'] },
  businessDataRead: { businessData: ['read'] },
  businessDataCreate: { businessData: ['create'] },
  businessDataUpdate: { businessData: ['update'] },
  businessDataDelete: { businessData: ['delete'] }
} as const satisfies Record<string, AppAccessRequest>

function dedupeStrings(values: readonly string[]) {
  return Array.from(new Set(values.map(value => value.trim()).filter(Boolean)))
}

function parseRoleInput(value?: string | readonly string[] | null) {
  if (Array.isArray(value)) {
    return dedupeStrings(value)
  }

  if (typeof value !== 'string') {
    return []
  }

  return dedupeStrings(value.split(','))
}

function getHighestRankedRole(rolesToCompare: readonly AppRoleSlug[]) {
  return rolesToCompare.reduce<AppRoleSlug>((highestRole, currentRole) => {
    return roleRank[currentRole] > roleRank[highestRole] ? currentRole : highestRole
  }, defaultRole)
}

export function isKnownRole(role: string): role is AppRoleSlug {
  return Object.prototype.hasOwnProperty.call(predefinedRoles, role)
}

export function isAssignableRole(role: string): role is AssignableRoleSlug {
  return role !== 'super-admin' && isKnownRole(role)
}

export const assignableRoleOptions = roleOptions.filter(role => isAssignableRole(role.slug))

export function parseStoredRoles(value?: string | null) {
  return parseRoleInput(value)
}

export function normalizeRoleSelection(value?: string | readonly string[] | null) {
  const normalizedRoles = parseRoleInput(value).filter(isKnownRole)

  if (normalizedRoles.length > 0) {
    return getHighestRankedRole(normalizedRoles)
  }

  return defaultRole
}

export function getUnknownRoles(value?: string | readonly string[] | null) {
  return parseRoleInput(value).filter(role => !isKnownRole(role))
}

export function getHighestEffectiveRole(roleValue?: string | null) {
  const normalizedRoles = parseStoredRoles(roleValue).filter(isKnownRole)

  if (normalizedRoles.length > 0) {
    return getHighestRankedRole(normalizedRoles)
  }

  return defaultRole
}

export function getEffectiveRoles(roleValue?: string | null) {
  return [getHighestEffectiveRole(roleValue)]
}

export function getInheritedRoleSlugs(roleValue?: string | AppRoleSlug | null) {
  const highestRole = roleValue && isKnownRole(roleValue)
    ? roleValue
    : getHighestEffectiveRole(roleValue)

  return roleHierarchy.slice(0, roleRank[highestRole] + 1)
}

export function hasRoleAtLeast(roleValue: string | AppRoleSlug | null | undefined, minimumRole: AppRoleSlug) {
  const highestRole = roleValue && isKnownRole(roleValue)
    ? roleValue
    : getHighestEffectiveRole(roleValue)

  return roleRank[highestRole] >= roleRank[minimumRole]
}

export function hasAccessForRole(roleValue: string | null | undefined, request: AppAccessRequest) {
  const highestRole = getHighestEffectiveRole(roleValue)

  return roles[highestRole].authorize(request).success
}

export function hasAnyAccessForRole(roleValue: string | null | undefined, requests: readonly AppAccessRequest[]) {
  return requests.some(request => hasAccessForRole(roleValue, request))
}

export function formatRoleLabel(role: string) {
  if (isKnownRole(role)) {
    return predefinedRoles[role].name
  }

  return role
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}
