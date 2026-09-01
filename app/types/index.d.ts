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
  ownerBidangId: string
  ownerBidangName: string
  name: string
  description: string | null
  dataSchema: Record<string, unknown>
  dataConfig: Record<string, unknown>
  periodicity: string | null
  regionLevel: string | null
  startPeriod: string | null
  endPeriod: string | null
  archivedAt: string | null
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
  isSuperAdmin: boolean
}

export interface DatasetRecordDatasetOption extends DatasetManagementItem {
  permissions: DatasetRecordActionPermissions
}

export interface DataManagementOptionsResponse {
  bidangs: BidangOption[]
  datasetsByBidang: Record<string, DatasetRecordDatasetOption[]>
}

export interface DatasetPeriodOverviewItem {
  periodDate: string
  recordCount: number
  latestUpdatedAt: string | null
}

export interface DatasetPeriodOverviewResponse {
  datasetId: string
  expectedRegionCount: number
  periods: DatasetPeriodOverviewItem[]
}

export interface DatasetPeriodWorkspaceField {
  key: string
  label: string
  type: 'string' | 'number' | 'boolean' | 'select' | 'date' | 'text' | 'textarea'
  required: boolean
  validation?: {
    minLength?: number
    maxLength?: number
    min?: number
    max?: number
    decimalPlaces?: number
  }
  options?: Array<{ value: string, label: string }>
}

export interface DatasetPeriodWorkspaceRow {
  regionId: string
  regionName: string
  regionLevel: string
  record: {
    id: string
    status: string
    data: Record<string, unknown>
    updatedAt: string
  } | null
}

export interface DatasetPeriodWorkspaceResponse {
  dataset: {
    id: string
    name: string
    periodicity: string | null
    regionLevel: string | null
    archivedAt: string | null
    fields: DatasetPeriodWorkspaceField[]
    permissions: {
      canCreate: boolean
      canUpdate: boolean
    }
  }
  periodDate: string
  expectedRegionCount: number
  recordCount: number
  rows: DatasetPeriodWorkspaceRow[]
}

export interface DatasetRecordBulkSaveResult {
  created: number
  updated: number
  unchanged: number
}

export interface DatasetRecordListItem {
  id: string
  datasetId: string
  regionId: string
  regionName: string
  regionLevel: string
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

export interface DatasetRecordHistoryItem {
  id: string
  sourceRecordId: string
  changeType: string
  changedAt: string
  changedByName: string | null
  status: string
  data: Record<string, unknown>
}

export interface DatasetRecordHistoryContext {
  id: string
  datasetId: string
  regionName: string
  periodLabel: string
}

export interface DeletedDatasetRecordListItem extends DatasetRecordHistoryContext {
  regionId: string
  regionLevel: string
  periodDate: string
  status: string
  data: Record<string, unknown>
  deletedAt: string
  deletedByName: string | null
}

export type DatasetRecordImportAction = 'CREATE' | 'UPDATE' | 'UNCHANGED' | null

export interface DatasetRecordImportPreviewRow {
  rowNumber: number
  regionId: string
  periodValue: string
  periodDate: string | null
  status: string
  data: Record<string, unknown>
  action: DatasetRecordImportAction
  errors: string[]
}

export interface DatasetRecordImportPreview {
  totalRows: number
  validRows: number
  invalidRows: number
  createRows: number
  updateRows: number
  unchangedRows: number
  rows: DatasetRecordImportPreviewRow[]
}

export interface DatasetRecordImportResult extends DatasetRecordImportPreview {
  created: number
  updated: number
  unchanged: number
}
