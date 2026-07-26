import type { AvatarProps } from '@nuxt/ui'
import type { AppPermission } from '#shared/rbac'

export interface Member {
  id: string
  name: string
  email: string
  avatar?: AvatarProps
  roles: string[]
  isActive: boolean
  hasPassword: boolean
}

export interface AuthSessionUser {
  id: string
  name: string
  email: string
  image?: string | null
  isActive: boolean
  roles: string[]
  permissions: string[]
}

export interface AuthSessionResponse {
  user: AuthSessionUser
  session: {
    id: string
    expiresAt: string | Date
  }
}

export interface RoleOption {
  slug: string
  name: string
  description: string
  isSystem: boolean
}

export interface PermissionRecord {
  key: string
  label: string
  description: string
  group: string
  isSystem: boolean
}

export interface RoleRecord extends RoleOption {
  id: string
  permissions: AppPermission[]
  canEdit: boolean
  canDelete: boolean
  assignedUserCount: number
}
