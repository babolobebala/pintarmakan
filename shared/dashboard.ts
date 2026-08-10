import { getDatasetSchemaFields } from '~~/shared/datasets'

export const dashboardOptions = [{
  key: 'utama',
  label: 'Dashboard Utama',
  description: 'IKP, PPH Ketersediaan, PPH Konsumsi, dan status ketahanan pangan desa.',
  icon: 'i-lucide-layout-dashboard'
}, {
  key: 'produksi-pangan',
  label: 'Dashboard Produksi Pangan',
  description: 'Placeholder widget produksi untuk memvalidasi pergantian dashboard.',
  icon: 'i-lucide-chart-column-big'
}] as const

export type DashboardKey = (typeof dashboardOptions)[number]['key']

export interface DashboardMeta {
  title: string
  updatedAt: string
}

export interface DashboardDatasetDefinition {
  id: string
  name: string
  dataSchema: unknown
}

export interface DashboardDatasetRecord {
  regionId: string
  regionName: string
  parentRegionName: string | null
  periodDate: string
  year: number
  data: Record<string, unknown>
}

export interface DashboardDatasetBundle {
  definition: DashboardDatasetDefinition
  records: DashboardDatasetRecord[]
}

export interface DashboardUtamaPayload {
  key: 'utama'
  kind: 'utama'
  meta: DashboardMeta
  datasets: {
    IKP_TAHUNAN: DashboardDatasetBundle
    PPH_KETERSEDIAAN_TAHUNAN: DashboardDatasetBundle
    PPH_KONSUMSI_TAHUNAN: DashboardDatasetBundle
    STATUS_KETAHANAN_PANGAN_TAHUNAN: DashboardDatasetBundle
  }
}

export interface DashboardPlaceholderWidget {
  id: string
  title: string
  value: string
  note: string
  icon: string
  badge: string
}

export interface DashboardProduksiPayload {
  key: 'produksi-pangan'
  kind: 'produksi'
  meta: DashboardMeta
  widgets: DashboardPlaceholderWidget[]
}

export type DashboardPayload = DashboardUtamaPayload | DashboardProduksiPayload

const dashboardKeySet = new Set<DashboardKey>(dashboardOptions.map(option => option.key))

export function isDashboardKey(value: unknown): value is DashboardKey {
  return typeof value === 'string' && dashboardKeySet.has(value as DashboardKey)
}

export function getDashboardAvailableYears(records: readonly DashboardDatasetRecord[]) {
  return Array.from(new Set(
    records
      .map(record => record.year)
      .filter((year): year is number => Number.isInteger(year))
  )).sort((left, right) => right - left)
}

export function resolveDashboardDefaultYear(records: readonly DashboardDatasetRecord[]) {
  return getDashboardAvailableYears(records)[0] ?? null
}

export function filterDashboardRecordsByYear(
  records: readonly DashboardDatasetRecord[],
  year: number | null
) {
  if (year === null) {
    return []
  }

  return records.filter(record => record.year === year)
}

export function findDashboardPreviousYear(
  records: readonly DashboardDatasetRecord[],
  year: number | null
) {
  if (year === null) {
    return null
  }

  return getDashboardAvailableYears(records).find(candidate => candidate < year) ?? null
}

export function getDashboardDatasetField(dataSchema: unknown, preferredKey: string) {
  const fields = getDatasetSchemaFields(dataSchema)

  return fields.find(field => field.key === preferredKey)
    ?? fields.find(field => field.type === 'number')
    ?? fields[0]
    ?? null
}

export function readDashboardRecordNumber(record: DashboardDatasetRecord | undefined, fieldKey: string | null) {
  if (!record || !fieldKey) {
    return null
  }

  const value = record.data[fieldKey]
  const normalized = typeof value === 'number' ? value : Number(value)

  return Number.isFinite(normalized) ? normalized : null
}

export function readDashboardRecordText(record: DashboardDatasetRecord | undefined, fieldKey: string | null) {
  if (!record || !fieldKey) {
    return null
  }

  const value = record.data[fieldKey]

  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }

  return null
}
