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
  eyebrow: string
  title: string
  description: string
  sourceLabel: string
  databaseBacked: boolean
  updatedAt: string
}

export interface DashboardKpiPayload {
  datasetId: string
  title: string
  description: string
  year: number | null
  fieldKey: string | null
  fieldLabel: string | null
  unit: string | null
  value: number | null
  previousYear: number | null
  previousValue: number | null
  delta: number | null
  trendDirection: 'up' | 'down' | 'flat' | null
}

export interface DashboardStatusPrioritySummaryItem {
  key: string
  label: string
  count: number
}

export interface DashboardStatusMapRecord {
  regionId: string
  regionName: string
  parentRegionName: string | null
  priorityKey: string | null
  priorityLabel: string | null
}

export interface DashboardStatusMapPayload {
  datasetId: string
  title: string
  description: string
  year: number | null
  totalWithData: number
  countsByPriority: DashboardStatusPrioritySummaryItem[]
  records: DashboardStatusMapRecord[]
}

export interface DashboardUtamaPayload {
  key: 'utama'
  kind: 'utama'
  meta: DashboardMeta
  selectedYear: number | null
  availableYears: number[]
  ikp: DashboardKpiPayload
  pphKetersediaan: DashboardKpiPayload
  pphKonsumsi: DashboardKpiPayload
  statusKetahananPangan: DashboardStatusMapPayload
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
