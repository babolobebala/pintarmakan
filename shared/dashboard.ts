export const dashboardIndicatorOptions = [{
  key: 'ringkasan-ketahanan-pangan',
  label: 'Ringkasan Ketahanan Pangan',
  description: 'IKP, PPH, cadangan pangan, dan prioritas wilayah.',
  icon: 'i-lucide-layout-dashboard'
}, {
  key: 'produksi-pangan',
  label: 'Produksi Pangan',
  description: 'Produksi komoditas strategis per kecamatan.',
  icon: 'i-lucide-chart-column-big'
}] as const

export type DashboardIndicatorKey = (typeof dashboardIndicatorOptions)[number]['key']

export type DashboardMetricTone = 'emerald' | 'amber' | 'sky' | 'rose'

export interface DashboardIndicatorMeta {
  eyebrow: string
  title: string
  description: string
  sourceLabel: string
  databaseBacked: boolean
  updatedAt: string
}

export interface DashboardMetricCard {
  label: string
  value: string
  period: string
  delta: string
  tone: DashboardMetricTone
  note: string
}

export interface DashboardPriorityItem {
  label: string
  count: number
  description: string
  tone: string
}

export interface DashboardRegionalSnapshot {
  region: string
  ikp: number
  pph: number
  cppd: number
  status: string
}

export interface DashboardActionItem {
  title: string
  description: string
  badge: string
}

export interface DashboardTrendPoint {
  year: string
  ikp: number
  pph: number
  availability: number
}

export interface DashboardOverviewPayload {
  key: 'ringkasan-ketahanan-pangan'
  kind: 'overview'
  meta: DashboardIndicatorMeta
  metrics: DashboardMetricCard[]
  yearlyTrend: DashboardTrendPoint[]
  villagePriority: DashboardPriorityItem[]
  regionalSnapshots: DashboardRegionalSnapshot[]
  spotlightPrograms: DashboardActionItem[]
}

export type ProductionCommodityKey
  = 'padi'
    | 'jagung'
    | 'kedelai'
    | 'cabai'
    | 'bawangMerah'
    | 'sayuran'
    | 'buahBuahan'
    | 'dagingSapi'
    | 'ayam'
    | 'telur'
    | 'ikan'

export interface ProductionDistrictDatum {
  name: string
  lat: number
  lng: number
  harvestArea: number
  production: number
}

export interface ProductionCommodityDefinition {
  key: ProductionCommodityKey
  label: string
  unit: string
  note: string
  category: string
  districts: ProductionDistrictDatum[]
}

export interface DashboardProductionPayload {
  key: 'produksi-pangan'
  kind: 'production'
  meta: DashboardIndicatorMeta
  commodities: Record<ProductionCommodityKey, ProductionCommodityDefinition>
}

export type DashboardIndicatorPayload = DashboardOverviewPayload | DashboardProductionPayload

const dashboardIndicatorKeySet = new Set<DashboardIndicatorKey>(dashboardIndicatorOptions.map(option => option.key))

export function isDashboardIndicatorKey(value: unknown): value is DashboardIndicatorKey {
  return typeof value === 'string' && dashboardIndicatorKeySet.has(value as DashboardIndicatorKey)
}
