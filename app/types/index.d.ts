import type { AvatarProps } from '@nuxt/ui'

export interface Member {
  id: string
  name: string
  email: string
  avatar?: AvatarProps
  roles: string[]
  isBanned: boolean
  hasPassword: boolean
}

export interface AuthSessionUser {
  id: string
  name: string
  email: string
  image?: string | null
  role?: string | null
  roles: string[]
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
