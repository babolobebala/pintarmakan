import type { AvatarProps } from '@nuxt/ui'

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
