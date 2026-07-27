export type AppPermission = string

export interface PermissionDefinition {
  key: string
  label: string
  description: string
  group: string
  isSystem: boolean
}

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

export function isPermissionKey(value: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\.[a-z0-9]+(?:-[a-z0-9]+)*)+$/.test(value.trim())
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
