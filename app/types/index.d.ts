import type { AvatarProps } from '@nuxt/ui'

export interface Member {
  id: string
  name: string
  email: string
  avatar?: AvatarProps
  role: string
  roles: string[]
  bidangs: BidangOption[]
  isBanned: boolean
  hasPassword: boolean
}

export interface BidangOption {
  id: string
  name: string
  description?: string | null
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

export interface DatasetManagementItem {
  id: string
  name: string
  description: string | null
  dataSchema: Record<string, unknown>
  dataConfig: Record<string, unknown>
  periodicity: string | null
  createdAt: string
  updatedAt: string
}

export interface RegionItem {
  id: string
  name: string
  level: string
  parentId: string | null
}

export interface DatasetRecordActionPermissions {
  canRead: boolean
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
  canImport: boolean
  canExport: boolean
  isSuperAdmin: boolean
}

export interface DatasetRecordDatasetOption extends DatasetManagementItem {
  regionLevel: string | null
  permissions: DatasetRecordActionPermissions
  ownerBidangsForCreate: BidangOption[]
  ownerBidangsForImport: BidangOption[]
  updateBidangIds: string[]
  deleteBidangIds: string[]
}

export interface DatasetRecordListItem {
  id: string
  datasetId: string
  regionId: string
  regionName: string
  regionLevel: string
  ownerBidangId: string
  ownerBidangName: string
  periodDate: string
  periodLabel: string
  status: string
  data: Record<string, unknown>
  createdAt: string
  updatedAt: string
  createdBy: string
  createdByName: string
  permissions: {
    canUpdate: boolean
    canDelete: boolean
  }
}
