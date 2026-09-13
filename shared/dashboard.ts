import {
  getDatasetPeriodRange,
  getDatasetSchemaFields,
  validateCanonicalDatasetPeriodDate
} from '~~/shared/datasets'
import type {
  CanonicalDatasetPeriodicity,
  DatasetMode,
  DatasetRegionLevel,
  DatasetSchemaField
} from '~~/shared/datasets'

export const dashboardIndicatorOptions = [{
  key: 'produksi-ketersediaan',
  label: 'Produksi dan Ketersediaan',
  icon: 'i-lucide-wheat'
}, {
  key: 'stok-pangan',
  label: 'Stok Pangan',
  icon: 'i-lucide-package'
}, {
  key: 'cadangan-pangan-pemerintah',
  label: 'Cadangan Pangan Pemerintah',
  icon: 'i-lucide-warehouse'
}, {
  key: 'harga-pangan',
  label: 'Harga Pangan',
  icon: 'i-lucide-trending-up'
}, {
  key: 'distribusi-pasokan',
  label: 'Distribusi dan Pasokan',
  icon: 'i-lucide-truck'
}, {
  key: 'konsumsi-pph',
  label: 'Konsumsi dan PPH',
  icon: 'i-lucide-utensils'
}, {
  key: 'keamanan-pangan',
  label: 'Keamanan Pangan',
  icon: 'i-lucide-shield-check'
}, {
  key: 'kerawanan-pangan',
  label: 'Kerawanan Pangan',
  icon: 'i-lucide-triangle-alert'
}, {
  key: 'wilayah-kelompok-rentan',
  label: 'Wilayah dan Kelompok Rentan',
  icon: 'i-lucide-map-pinned'
}, {
  key: 'data-pendukung',
  label: 'Data Pendukung',
  icon: 'i-lucide-database'
}] as const

export type DashboardIndicatorKey = (typeof dashboardIndicatorOptions)[number]['key']
export type DashboardViewKey = 'dashboard-utama' | DashboardIndicatorKey
/** @deprecated Use DashboardViewKey for selector/API state and DashboardIndicatorKey for the ten canonical groups. */
export type DashboardKey = DashboardViewKey

export const dashboardOptions = [{
  key: 'dashboard-utama',
  label: 'Dashboard Utama',
  icon: 'i-lucide-layout-dashboard'
}, ...dashboardIndicatorOptions] as const

export function getDashboardOption(key: DashboardViewKey) {
  const option = dashboardOptions.find(option => option.key === key)

  if (!option) {
    throw new Error(`Dashboard indicator option not found: ${key}`)
  }

  return option
}

export type DashboardCardKey
  = | 'ikp'
    | 'pph'
    | 'status-ketahanan-pangan'
    | 'cppd'
    | 'harga-pangan'
    | 'cpm-gabah'
    | 'cpm-jagung'
    | 'lumbung-pangan'
    | 'produksi-padi'
    | 'produksi-jagung'
    | 'produksi-daging-hewan-ternak'
    | 'produksi-telur-unggas'
    | 'produksi-buah-buahan'
    | 'produksi-sayur-sayuran'
    | 'proyeksi-neraca-beras'
    | 'proyeksi-neraca-jagung-pipilan-kering'
    | 'proyeksi-neraca-kedelai-biji-kering'
    | 'proyeksi-neraca-bawang-merah'
    | 'proyeksi-neraca-bawang-putih'
    | 'proyeksi-neraca-cabai-besar'
    | 'proyeksi-neraca-cabai-rawit'
    | 'proyeksi-neraca-daging-sapi-kerbau'
    | 'proyeksi-neraca-daging-ayam'
    | 'proyeksi-neraca-telur-ayam-ras'
    | 'proyeksi-neraca-gula-pasir-konsumsi'
    | 'proyeksi-neraca-minyak-goreng'

type DashboardCardBaseDefinition = {
  readonly key: DashboardCardKey
  readonly datasetId: string
  readonly title: string
  readonly periodicity: CanonicalDatasetPeriodicity
  /** Optional Dashboard-only upper period bound; it never changes Dataset coverage. */
  readonly displayEndPeriod?: string
}

type DashboardRegionalCardBaseDefinition = DashboardCardBaseDefinition & {
  readonly mode: 'REGIONAL'
  readonly regionLevel: DatasetRegionLevel
}

type DashboardTabularCardBaseDefinition = DashboardCardBaseDefinition & {
  readonly mode: 'TABULAR'
}

export type DashboardKpiCardDefinition = DashboardRegionalCardBaseDefinition & {
  readonly key: 'ikp'
  readonly type: 'KPI'
  readonly periodicity: 'TAHUNAN'
  readonly regionLevel: 'KABUPATEN'
  readonly fieldKey: 'ikp'
  readonly icon: string
  readonly badgeColor: 'success' | 'info' | 'warning' | 'neutral'
}

export type DashboardDualKpiCardDefinition = DashboardRegionalCardBaseDefinition & {
  readonly key: 'pph'
  readonly type: 'DUAL_KPI'
  readonly periodicity: 'TAHUNAN'
  readonly regionLevel: 'KABUPATEN'
  readonly fieldKeys: readonly ['pph_konsumsi', 'pph_ketersediaan']
}

export type DashboardMultiKpiCardDefinition = DashboardRegionalCardBaseDefinition & {
  readonly key: 'cppd'
  readonly type: 'MULTI_KPI'
  readonly periodicity: 'BULANAN'
  readonly regionLevel: 'KABUPATEN'
  readonly fieldKeys: readonly ['stok_awal', 'pengadaan', 'penyaluran', 'stok_akhir']
}

export type DashboardDistributionCardDefinition = DashboardRegionalCardBaseDefinition & {
  readonly key: 'status-ketahanan-pangan'
  readonly type: 'DISTRIBUTION'
  readonly periodicity: 'TAHUNAN'
  readonly regionLevel: 'DESA'
  readonly fieldKey: 'priority'
  readonly values: readonly [1, 2, 3, 4, 5, 6]
}

export type DashboardFieldTimeSeriesCardDefinition = DashboardRegionalCardBaseDefinition & {
  readonly key: 'harga-pangan'
  readonly type: 'FIELD_TIME_SERIES'
  readonly periodicity: 'HARIAN'
  readonly regionLevel: 'KABUPATEN'
  readonly selectableFields: 'schema-numeric'
}

export type DashboardRegionalMetricCardDefinition = DashboardRegionalCardBaseDefinition & {
  readonly key:
    | 'produksi-padi'
    | 'produksi-jagung'
    | 'produksi-daging-hewan-ternak'
    | 'produksi-telur-unggas'
    | 'produksi-buah-buahan'
    | 'produksi-sayur-sayuran'
  readonly type: 'REGIONAL_METRIC'
  readonly periodicity: 'TAHUNAN'
  readonly regionLevel: 'KECAMATAN'
  readonly selectableFieldKeys?: readonly string[]
  readonly selectableFields?: 'schema-numeric'
  readonly defaultFieldKey?: string
}

export type DashboardTabularMonthSeriesCardDefinition = DashboardTabularCardBaseDefinition & {
  readonly key: 'cpm-gabah' | 'cpm-jagung'
  readonly type: 'TABULAR_MONTH_SERIES'
  readonly periodicity: 'TAHUNAN'
  readonly monthFieldKeys: readonly [
    'januari', 'februari', 'maret', 'april', 'mei', 'juni',
    'juli', 'agustus', 'september', 'oktober', 'november', 'desember'
  ]
  readonly aggregation: 'SUM_MEANINGFUL_VALUES'
}

export type DashboardTabularSummaryCardDefinition = DashboardTabularCardBaseDefinition & {
  readonly key: 'lumbung-pangan'
  readonly type: 'TABULAR_SUMMARY'
  readonly periodicity: 'TAHUNAN'
}

export type DashboardNeracaTimeSeriesCardDefinition = DashboardRegionalCardBaseDefinition & {
  readonly key: Extract<DashboardCardKey, `proyeksi-neraca-${string}`>
  readonly type: 'NERACA_TIME_SERIES'
  readonly periodicity: 'BULANAN'
  readonly regionLevel: 'KABUPATEN'
  readonly fieldKeys: readonly [
    'total_ketersediaan',
    'total_kebutuhan',
    'neraca',
    'ketahanan_stok'
  ]
}

export type DashboardCardDefinition
  = | DashboardKpiCardDefinition
    | DashboardDualKpiCardDefinition
    | DashboardMultiKpiCardDefinition
    | DashboardDistributionCardDefinition
    | DashboardFieldTimeSeriesCardDefinition
    | DashboardRegionalMetricCardDefinition
    | DashboardTabularMonthSeriesCardDefinition
    | DashboardTabularSummaryCardDefinition
    | DashboardNeracaTimeSeriesCardDefinition

const neracaFieldKeys = [
  'total_ketersediaan',
  'total_kebutuhan',
  'neraca',
  'ketahanan_stok'
] as const

function createNeracaCard(
  key: DashboardNeracaTimeSeriesCardDefinition['key'],
  datasetId: string,
  title: string
): DashboardNeracaTimeSeriesCardDefinition {
  return {
    key,
    datasetId,
    title,
    type: 'NERACA_TIME_SERIES',
    mode: 'REGIONAL',
    periodicity: 'BULANAN',
    regionLevel: 'KABUPATEN',
    fieldKeys: neracaFieldKeys
  }
}

/** Canonical Dataset dashboard card catalog. Layout belongs to dashboard grids. */
export const dashboardCardDefinitions = [
  {
    key: 'ikp',
    datasetId: 'IKP_TAHUNAN',
    title: 'Indeks Ketahanan Pangan (IKP)',
    type: 'KPI',
    mode: 'REGIONAL',
    periodicity: 'TAHUNAN',
    displayEndPeriod: '2025-01-01',
    regionLevel: 'KABUPATEN',
    fieldKey: 'ikp',
    icon: 'i-lucide-badge-info',
    badgeColor: 'success'
  },
  {
    key: 'cpm-gabah',
    datasetId: 'CPM_GABAH_TAHUNAN',
    title: 'Cadangan Pangan Masyarakat (CPM) - Gabah',
    type: 'TABULAR_MONTH_SERIES',
    mode: 'TABULAR',
    periodicity: 'TAHUNAN',
    monthFieldKeys: [
      'januari', 'februari', 'maret', 'april', 'mei', 'juni',
      'juli', 'agustus', 'september', 'oktober', 'november', 'desember'
    ],
    aggregation: 'SUM_MEANINGFUL_VALUES'
  },
  {
    key: 'lumbung-pangan',
    datasetId: 'LUMBUNG_PANGAN_TAHUNAN',
    title: 'Lumbung Pangan',
    type: 'TABULAR_SUMMARY',
    mode: 'TABULAR',
    periodicity: 'TAHUNAN'
  },
  {
    key: 'pph',
    datasetId: 'PPH_TAHUNAN',
    title: 'Pola Pangan Harapan (PPH)',
    type: 'DUAL_KPI',
    mode: 'REGIONAL',
    periodicity: 'TAHUNAN',
    displayEndPeriod: '2025-01-01',
    regionLevel: 'KABUPATEN',
    fieldKeys: ['pph_konsumsi', 'pph_ketersediaan']
  },
  {
    key: 'status-ketahanan-pangan',
    datasetId: 'STATUS_KETAHANAN_PANGAN_TAHUNAN',
    title: 'Status Ketahanan Pangan Desa',
    type: 'DISTRIBUTION',
    mode: 'REGIONAL',
    periodicity: 'TAHUNAN',
    regionLevel: 'DESA',
    fieldKey: 'priority',
    values: [1, 2, 3, 4, 5, 6]
  },
  {
    key: 'cppd',
    datasetId: 'CPPD_BULANAN',
    title: 'Cadangan Pangan Pemerintah Daerah (CPPD)',
    type: 'MULTI_KPI',
    mode: 'REGIONAL',
    periodicity: 'BULANAN',
    displayEndPeriod: '2026-06-01',
    regionLevel: 'KABUPATEN',
    fieldKeys: ['stok_awal', 'pengadaan', 'penyaluran', 'stok_akhir']
  },
  {
    key: 'harga-pangan',
    datasetId: 'HARGA_PANGAN_HARIAN',
    title: 'Perkembangan Harga Pangan',
    type: 'FIELD_TIME_SERIES',
    mode: 'REGIONAL',
    periodicity: 'HARIAN',
    regionLevel: 'KABUPATEN',
    selectableFields: 'schema-numeric'
  },
  {
    key: 'cpm-jagung',
    datasetId: 'CPM_JAGUNG_TAHUNAN',
    title: 'Cadangan Pangan Masyarakat (CPM) - Jagung',
    type: 'TABULAR_MONTH_SERIES',
    mode: 'TABULAR',
    periodicity: 'TAHUNAN',
    monthFieldKeys: [
      'januari', 'februari', 'maret', 'april', 'mei', 'juni',
      'juli', 'agustus', 'september', 'oktober', 'november', 'desember'
    ],
    aggregation: 'SUM_MEANINGFUL_VALUES'
  },
  {
    key: 'produksi-padi',
    datasetId: 'PRODUKTIFITAS_PADI_KECAMATAN_TAHUNAN',
    title: 'Produksi Padi',
    type: 'REGIONAL_METRIC',
    mode: 'REGIONAL',
    periodicity: 'TAHUNAN',
    regionLevel: 'KECAMATAN',
    displayEndPeriod: '2025-01-01',
    selectableFieldKeys: ['luas_panen', 'hasil_per_hektar', 'produksi'],
    defaultFieldKey: 'produksi'
  },
  {
    key: 'produksi-jagung',
    datasetId: 'PRODUKSI_JAGUNG_KECAMATAN_TAHUNAN',
    title: 'Produksi Jagung',
    type: 'REGIONAL_METRIC',
    mode: 'REGIONAL',
    periodicity: 'TAHUNAN',
    regionLevel: 'KECAMATAN',
    displayEndPeriod: '2025-01-01',
    selectableFieldKeys: ['luas_panen', 'hasil_per_hektar', 'produksi'],
    defaultFieldKey: 'produksi'
  },
  {
    key: 'produksi-daging-hewan-ternak',
    datasetId: 'PRODUKSI_DAGING_HEWAN_TERNAK_KECAMATAN_TAHUNAN',
    title: 'Produksi Daging Hewan Ternak',
    type: 'REGIONAL_METRIC',
    mode: 'REGIONAL',
    periodicity: 'TAHUNAN',
    regionLevel: 'KECAMATAN',
    displayEndPeriod: '2025-01-01',
    selectableFields: 'schema-numeric'
  },
  {
    key: 'produksi-telur-unggas',
    datasetId: 'PRODUKSI_TELUR_UNGGAS_KECAMATAN_TAHUNAN',
    title: 'Produksi Telur Unggas',
    type: 'REGIONAL_METRIC',
    mode: 'REGIONAL',
    periodicity: 'TAHUNAN',
    regionLevel: 'KECAMATAN',
    displayEndPeriod: '2025-01-01',
    selectableFields: 'schema-numeric'
  },
  {
    key: 'produksi-buah-buahan',
    datasetId: 'PRODUKSI_BUAH_BUAHAN_KECAMATAN_TAHUNAN',
    title: 'Produksi Buah-Buahan',
    type: 'REGIONAL_METRIC',
    mode: 'REGIONAL',
    periodicity: 'TAHUNAN',
    regionLevel: 'KECAMATAN',
    displayEndPeriod: '2025-01-01',
    selectableFields: 'schema-numeric'
  },
  {
    key: 'produksi-sayur-sayuran',
    datasetId: 'PRODUKSI_SAYUR_SAYURAN_KECAMATAN_TAHUNAN',
    title: 'Produksi Sayur-Sayuran',
    type: 'REGIONAL_METRIC',
    mode: 'REGIONAL',
    periodicity: 'TAHUNAN',
    regionLevel: 'KECAMATAN',
    displayEndPeriod: '2025-01-01',
    selectableFields: 'schema-numeric'
  },
  createNeracaCard('proyeksi-neraca-beras', 'PROYEKSI_NERACA_BERAS_TAHUNAN', 'Proyeksi Neraca Beras'),
  createNeracaCard('proyeksi-neraca-jagung-pipilan-kering', 'PROYEKSI_NERACA_JAGUNG_PIPILAN_KERING_TAHUNAN', 'Proyeksi Neraca Jagung Pipilan Kering'),
  createNeracaCard('proyeksi-neraca-kedelai-biji-kering', 'PROYEKSI_NERACA_KEDELAI_BIJI_KERING_TAHUNAN', 'Proyeksi Neraca Kedelai Biji Kering'),
  createNeracaCard('proyeksi-neraca-bawang-merah', 'PROYEKSI_NERACA_BAWANG_MERAH_TAHUNAN', 'Proyeksi Neraca Bawang Merah'),
  createNeracaCard('proyeksi-neraca-bawang-putih', 'PROYEKSI_NERACA_BAWANG_PUTIH_TAHUNAN', 'Proyeksi Neraca Bawang Putih'),
  createNeracaCard('proyeksi-neraca-cabai-besar', 'PROYEKSI_NERACA_CABAI_BESAR_TAHUNAN', 'Proyeksi Neraca Cabai Besar'),
  createNeracaCard('proyeksi-neraca-cabai-rawit', 'PROYEKSI_NERACA_CABAI_RAWIT_TAHUNAN', 'Proyeksi Neraca Cabai Rawit'),
  createNeracaCard('proyeksi-neraca-daging-sapi-kerbau', 'PROYEKSI_NERACA_DAGING_SAPI_KERBAU_TAHUNAN', 'Proyeksi Neraca Daging Sapi/Kerbau'),
  createNeracaCard('proyeksi-neraca-daging-ayam', 'PROYEKSI_NERACA_DAGING_AYAM_TAHUNAN', 'Proyeksi Neraca Daging Ayam'),
  createNeracaCard('proyeksi-neraca-telur-ayam-ras', 'PROYEKSI_NERACA_TELUR_AYAM_RAS_TAHUNAN', 'Proyeksi Neraca Telur Ayam Ras'),
  createNeracaCard('proyeksi-neraca-gula-pasir-konsumsi', 'PROYEKSI_NERACA_GULA_PASIR_KONSUMSI_TAHUNAN', 'Proyeksi Neraca Gula Pasir Konsumsi'),
  createNeracaCard('proyeksi-neraca-minyak-goreng', 'PROYEKSI_NERACA_MINYAK_GORENG_TAHUNAN', 'Proyeksi Neraca Minyak Goreng')
] as const satisfies readonly DashboardCardDefinition[]

/** Canonical P1–P6 labels and visual mapping used by food-security dashboard views. */
export const dashboardFoodSecurityPriorityLegend = [
  { valueKey: '1', code: 'P1', category: 'Sangat rentan', color: '#D73027' },
  { valueKey: '2', code: 'P2', category: 'Rentan', color: '#FC8D59' },
  { valueKey: '3', code: 'P3', category: 'Cukup rentan', color: '#FEE08B' },
  { valueKey: '4', code: 'P4', category: 'Cukup tahan', color: '#D9EF8B' },
  { valueKey: '5', code: 'P5', category: 'Tahan', color: '#91CF60' },
  { valueKey: '6', code: 'P6', category: 'Sangat tahan', color: '#1A9850' }
] as const

export type DashboardCatalogCardDefinition = (typeof dashboardCardDefinitions)[number]

const cardDefinitionMap = new Map<DashboardCardKey, DashboardCardDefinition>(
  dashboardCardDefinitions.map(card => [card.key, card])
)

export function getDashboardCardDefinition(key: DashboardCardKey) {
  return cardDefinitionMap.get(key) ?? null
}

export function getDashboardIndicatorCardDefinitions(indicator: DashboardIndicatorKey) {
  return (dashboardIndicatorCardKeys[indicator] ?? []).map((key) => {
    const definition = getDashboardCardDefinition(key)

    if (!definition) {
      throw new Error(`Dashboard card definition not found: ${key}`)
    }

    return definition
  })
}

/** The current grid's deliberately small, curated subset. */
export const dashboardUtamaCardKeys = [
  'ikp',
  'pph',
  'cppd',
  'status-ketahanan-pangan',
  'harga-pangan',
  'cpm-gabah',
  'cpm-jagung',
  'lumbung-pangan',
  'produksi-padi',
  'produksi-jagung',
  'produksi-daging-hewan-ternak',
  'produksi-telur-unggas',
  'produksi-buah-buahan',
  'produksi-sayur-sayuran',
  'proyeksi-neraca-beras',
  'proyeksi-neraca-jagung-pipilan-kering',
  'proyeksi-neraca-kedelai-biji-kering',
  'proyeksi-neraca-bawang-merah',
  'proyeksi-neraca-bawang-putih',
  'proyeksi-neraca-cabai-besar',
  'proyeksi-neraca-cabai-rawit',
  'proyeksi-neraca-daging-sapi-kerbau',
  'proyeksi-neraca-daging-ayam',
  'proyeksi-neraca-telur-ayam-ras',
  'proyeksi-neraca-gula-pasir-konsumsi',
  'proyeksi-neraca-minyak-goreng'
] as const

export type DashboardUtamaCardKey = (typeof dashboardUtamaCardKeys)[number]
export type DashboardUtamaCardDefinition = Extract<DashboardCardDefinition, {
  readonly key: DashboardUtamaCardKey
}>

export const dashboardUtamaCardDefinitions = dashboardUtamaCardKeys.map((key) => {
  const definition = getDashboardCardDefinition(key)

  if (!definition) {
    throw new Error(`Dashboard card definition not found: ${key}`)
  }

  return definition
}) as readonly DashboardUtamaCardDefinition[]

/**
 * Dashboard Utama compact front row.
 *
 * These descriptors only refine the Dashboard Utama front surface. Each one maps
 * to a canonical card key (`cardKey`) that owns the Dataset bundle and the shared
 * detail-modal context, so PPH Konsumsi / PPH Ketersediaan reuse the canonical
 * `pph` card while CPPD reuses the canonical `cppd` card.
 */
export const dashboardUtamaSummaryCardKeys = [
  'ikp',
  'pph-konsumsi',
  'pph-ketersediaan',
  'cppd'
] as const

export type DashboardUtamaSummaryCardKey = (typeof dashboardUtamaSummaryCardKeys)[number]

export type DashboardUtamaSummaryCardDescriptor = {
  readonly key: DashboardUtamaSummaryCardKey
  /** Canonical card that owns the Dataset bundle and the shared detail modal context. */
  readonly cardKey: DashboardUtamaCardKey
  /** Canonical Dataset numeric schema field shown as the main value / trend. */
  readonly fieldKey: string
  /** Front-only title used by the compact card. */
  readonly title: string
  readonly icon: string
  /** Front-only mini trend chart; disabled for cards that are not trend-oriented. */
  readonly showTrend?: boolean
  /** Display-only unit suffix appended to the formatted numeric value (never stored). */
  readonly unitSuffix?: string
}

export const dashboardUtamaSummaryCards: readonly DashboardUtamaSummaryCardDescriptor[] = [{
  key: 'ikp',
  cardKey: 'ikp',
  fieldKey: 'ikp',
  title: 'Indeks Ketahanan Pangan (IKP)',
  icon: 'i-lucide-badge-info'
}, {
  key: 'pph-konsumsi',
  cardKey: 'pph',
  fieldKey: 'pph_konsumsi',
  title: 'PPH Konsumsi',
  icon: 'i-lucide-utensils'
}, {
  key: 'pph-ketersediaan',
  cardKey: 'pph',
  fieldKey: 'pph_ketersediaan',
  title: 'PPH Ketersediaan',
  icon: 'i-lucide-wheat'
}, {
  key: 'cppd',
  cardKey: 'cppd',
  fieldKey: 'stok_akhir',
  title: 'Cadangan Pangan Pemerintah',
  icon: 'i-lucide-warehouse',
  showTrend: false,
  unitSuffix: 'Ton'
}]

export const dashboardCpmCardKeys = ['cpm-gabah', 'cpm-jagung'] as const
export type DashboardCpmCardKey = (typeof dashboardCpmCardKeys)[number]

export const dashboardCpmCardDefinitions = dashboardCpmCardKeys.map((key) => {
  const definition = getDashboardCardDefinition(key)

  if (!definition || definition.type !== 'TABULAR_MONTH_SERIES') {
    throw new Error(`Dashboard CPM card definition not found: ${key}`)
  }

  return definition
}) as readonly DashboardTabularMonthSeriesCardDefinition[]

export const dashboardLumbungCardDefinition = getDashboardCardDefinition('lumbung-pangan') as DashboardTabularSummaryCardDefinition

/** Dashboard Produksi Pangan composition: six REGIONAL_METRIC cards in display order. */
export const dashboardProduksiCardKeys = [
  'produksi-padi',
  'produksi-jagung',
  'produksi-daging-hewan-ternak',
  'produksi-telur-unggas',
  'produksi-buah-buahan',
  'produksi-sayur-sayuran'
] as const

export type DashboardProduksiCardKey = (typeof dashboardProduksiCardKeys)[number]
export type DashboardProduksiCardDefinition = Extract<DashboardCardDefinition, {
  readonly key: DashboardProduksiCardKey
}>

export const dashboardProduksiCardDefinitions = dashboardProduksiCardKeys.map((key) => {
  const definition = getDashboardCardDefinition(key)

  if (!definition) {
    throw new Error(`Dashboard card definition not found: ${key}`)
  }

  return definition
}) as readonly DashboardProduksiCardDefinition[]

/**
 * Dashboard Produksi Pangan front presentation.
 *
 * Every Produksi card is rendered as an annual aggregate of the Dataset's
 * Kecamatan records for the selected year. Detailed Kecamatan rows remain
 * available through the canonical shared detail modal. Aggregation happens on
 * the already-loaded, bounded Dashboard payload (no extra queries).
 */
export type DashboardProduksiSummaryAggregation
  = | {
    readonly kind: 'field'
    readonly fieldKey: string
  }
  | {
    readonly kind: 'schema-numeric'
  }

export type DashboardProduksiSummaryRowDefinition = {
  readonly key: string
  readonly label: string
  readonly unit: string
  readonly aggregation: DashboardProduksiSummaryAggregation
}

export type DashboardProduksiSummaryCardDescriptor = {
  /** Canonical card owning the Dataset bundle and the shared detail modal context. */
  readonly cardKey: DashboardProduksiCardKey
  readonly rows: readonly DashboardProduksiSummaryRowDefinition[]
}

export const dashboardProduksiSummaryCards: readonly DashboardProduksiSummaryCardDescriptor[] = [{
  cardKey: 'produksi-padi',
  rows: [
    {
      key: 'luas-panen',
      label: 'Luas Panen',
      unit: 'Ha',
      aggregation: { kind: 'field', fieldKey: 'luas_panen' }
    },
    {
      key: 'produksi',
      label: 'Produksi',
      unit: 'Ton',
      aggregation: { kind: 'field', fieldKey: 'produksi' }
    }
  ]
}, {
  cardKey: 'produksi-jagung',
  rows: [
    {
      key: 'luas-panen',
      label: 'Luas Panen',
      unit: 'Ha',
      aggregation: { kind: 'field', fieldKey: 'luas_panen' }
    },
    {
      key: 'produksi',
      label: 'Produksi',
      unit: 'Ton',
      aggregation: { kind: 'field', fieldKey: 'produksi' }
    }
  ]
}, {
  cardKey: 'produksi-daging-hewan-ternak',
  rows: [{
    key: 'total',
    label: 'Total Produksi Daging',
    unit: 'Kg',
    aggregation: { kind: 'schema-numeric' }
  }]
}, {
  cardKey: 'produksi-telur-unggas',
  rows: [{
    key: 'total',
    label: 'Total Produksi Telur',
    unit: 'Butir',
    aggregation: { kind: 'schema-numeric' }
  }]
}, {
  cardKey: 'produksi-buah-buahan',
  rows: [{
    key: 'total',
    label: 'Total Produksi Buah-Buahan',
    unit: 'Kuintal',
    aggregation: { kind: 'schema-numeric' }
  }]
}, {
  cardKey: 'produksi-sayur-sayuran',
  rows: [{
    key: 'total',
    label: 'Total Produksi Sayur-Sayuran',
    unit: 'Kuintal',
    aggregation: { kind: 'schema-numeric' }
  }]
}]

export function getDashboardProduksiSummaryCard(cardKey: DashboardProduksiCardKey) {
  return dashboardProduksiSummaryCards.find(card => card.cardKey === cardKey) ?? null
}

/** Dashboard Proyeksi Pangan composition: the 12 canonical Neraca cards in catalog order. */
export const dashboardProyeksiCardKeys = [
  'proyeksi-neraca-beras',
  'proyeksi-neraca-jagung-pipilan-kering',
  'proyeksi-neraca-kedelai-biji-kering',
  'proyeksi-neraca-bawang-merah',
  'proyeksi-neraca-bawang-putih',
  'proyeksi-neraca-cabai-besar',
  'proyeksi-neraca-cabai-rawit',
  'proyeksi-neraca-daging-sapi-kerbau',
  'proyeksi-neraca-daging-ayam',
  'proyeksi-neraca-telur-ayam-ras',
  'proyeksi-neraca-gula-pasir-konsumsi',
  'proyeksi-neraca-minyak-goreng'
] as const

export type DashboardProyeksiCardKey = (typeof dashboardProyeksiCardKeys)[number]
export type DashboardProyeksiCardDefinition = Extract<DashboardCardDefinition, {
  readonly key: DashboardProyeksiCardKey
}>

export const dashboardProyeksiCardDefinitions = dashboardProyeksiCardKeys.map((key) => {
  const definition = getDashboardCardDefinition(key)

  if (!definition) {
    throw new Error(`Dashboard card definition not found: ${key}`)
  }

  return definition
}) as readonly DashboardProyeksiCardDefinition[]

/** Produksi dan Ketersediaan combines the approved actual and projection sections in one bounded payload. */
export const dashboardIndicatorCardKeys: Readonly<Partial<Record<DashboardIndicatorKey, readonly DashboardCardKey[]>>> = {
  'stok-pangan': [...dashboardCpmCardKeys],
  'cadangan-pangan-pemerintah': ['cppd'],
  'harga-pangan': ['harga-pangan'],
  'kerawanan-pangan': ['ikp', 'status-ketahanan-pangan'],
  'produksi-ketersediaan': [...dashboardProduksiCardKeys, ...dashboardProyeksiCardKeys]
}

/** Dashboard Harga Pangan Harian composition: the single canonical FIELD_TIME_SERIES card. */
export const dashboardHargaPanganCardKeys = [
  'harga-pangan'
] as const

export type DashboardHargaPanganCardKey = (typeof dashboardHargaPanganCardKeys)[number]
export type DashboardHargaPanganCardDefinition = Extract<DashboardCardDefinition, {
  readonly key: DashboardHargaPanganCardKey
}>

export const dashboardHargaPanganCardDefinitions = dashboardHargaPanganCardKeys.map((key) => {
  const definition = getDashboardCardDefinition(key)

  if (!definition) {
    throw new Error(`Dashboard card definition not found: ${key}`)
  }

  return definition
}) as readonly DashboardHargaPanganCardDefinition[]


export interface DashboardMeta {
  title: string
  updatedAt: string
}

export interface DashboardDatasetDefinition {
  id: string
  name: string
  dataSchema: unknown
  source: string | null
  coverage: DashboardDatasetCoverage | null
  mode: DatasetMode | null
  regionLevel: DatasetRegionLevel | null
}

export interface DashboardDatasetCoverage {
  periodicity: CanonicalDatasetPeriodicity
  startPeriod: string
  endPeriod: string | null
}

export interface DashboardDatasetRecord {
  regionId: string
  regionName: string
  parentRegionName: string | null
  periodDate: string
  year: number
  data: Record<string, unknown>
}

export interface DashboardDatasetTableRecord {
  periodDate: string
  year: number
  data: Record<string, unknown>
}

export interface DashboardDatasetBundle {
  definition: DashboardDatasetDefinition
  records: DashboardDatasetRecord[]
  tableRecords: DashboardDatasetTableRecord[]
  /** Exact canonical KSB Kecamatan names supplied for TABULAR map resolution. */
  canonicalKecamatanNames: string[]
  available: boolean
}

export interface DashboardCardDetailContext {
  card: DashboardCardDefinition
  dataset: DashboardDatasetBundle
  periodDate: string | null
}

export interface DashboardEmptyPayload {
  key: DashboardKey
  kind: 'empty'
  meta: DashboardMeta
  cards: Record<never, never>
}

export interface DashboardConfiguredPayload {
  key: DashboardKey
  kind: 'configured'
  meta: DashboardMeta
  cards: Partial<Record<DashboardCardKey, DashboardDatasetBundle>>
}

/** Legacy grid payload contracts retained until new group compositions are defined. */
export interface DashboardUtamaPayload {
  key: 'dashboard-utama'
  kind: 'dashboard-utama'
  meta: DashboardMeta
  cards: Record<DashboardUtamaCardKey, DashboardDatasetBundle>
}

export interface DashboardProduksiPayload {
  key: 'produksi-pangan'
  kind: 'produksi-pangan'
  meta: DashboardMeta
  cards: Record<DashboardProduksiCardKey, DashboardDatasetBundle>
}

export interface DashboardProyeksiPayload {
  key: 'proyeksi-pangan'
  kind: 'proyeksi-pangan'
  meta: DashboardMeta
  cards: Record<DashboardProyeksiCardKey, DashboardDatasetBundle>
}

export interface DashboardHargaPanganPayload {
  key: 'harga-pangan-harian'
  kind: 'harga-pangan-harian'
  meta: DashboardMeta
  cards: Record<DashboardHargaPanganCardKey, DashboardDatasetBundle>
}

export type DashboardPayload
  = | DashboardEmptyPayload
    | DashboardConfiguredPayload
    | DashboardUtamaPayload

const dashboardKeySet = new Set<DashboardViewKey>(dashboardOptions.map(option => option.key))

export function isDashboardKey(value: unknown): value is DashboardViewKey {
  return typeof value === 'string' && dashboardKeySet.has(value as DashboardViewKey)
}

/** Checks that a Dashboard-only period bound is a canonical period inside Dataset coverage. */
export function isDashboardCardDisplayCoverageCompatible(
  card: DashboardCardDefinition,
  coverage: DashboardDatasetCoverage
) {
  if (card.displayEndPeriod === undefined) {
    return true
  }

  try {
    const displayEndPeriod = validateCanonicalDatasetPeriodDate(
      coverage.periodicity,
      card.displayEndPeriod
    )

    return displayEndPeriod === card.displayEndPeriod
      && getDatasetPeriodRange(coverage).includes(displayEndPeriod)
  } catch {
    return false
  }
}

/** Resolves card presentation coverage without changing the Dataset's canonical coverage. */
export function getDashboardCardDisplayCoverage(
  card: DashboardCardDefinition,
  coverage: DashboardDatasetCoverage | null
) {
  if (!coverage || !isDashboardCardDisplayCoverageCompatible(card, coverage)) {
    return null
  }

  return {
    ...coverage,
    endPeriod: card.displayEndPeriod ?? coverage.endPeriod
  }
}

/** Returns canonical periods by default; applies a card display override only when a card is supplied. */
export function getDashboardAvailablePeriods(
  coverage: DashboardDatasetCoverage | null,
  card?: DashboardCardDefinition
) {
  const displayCoverage = card
    ? getDashboardCardDisplayCoverage(card, coverage)
    : coverage

  return displayCoverage
    ? getDatasetPeriodRange(displayCoverage).reverse()
    : []
}

/** Returns only the immediately previous canonical covered period. */
export function getDashboardPreviousPeriod(
  periods: readonly string[],
  periodDate: string | null
) {
  if (!periodDate) {
    return null
  }

  const index = periods.indexOf(periodDate)

  return index >= 0 ? periods[index + 1] ?? null : null
}

export function getDashboardDatasetField(dataSchema: unknown, fieldKey: string) {
  return getDatasetSchemaFields(dataSchema).find(field => field.key === fieldKey) ?? null
}

export function getDashboardNumericSchemaFields(dataSchema: unknown) {
  return getDatasetSchemaFields(dataSchema).filter(field => field.type === 'number')
}

export function getDashboardSelectableFields(
  card: DashboardFieldTimeSeriesCardDefinition | DashboardRegionalMetricCardDefinition,
  dataSchema: unknown
) {
  const numericFields = getDashboardNumericSchemaFields(dataSchema)

  if (card.selectableFields === 'schema-numeric') {
    return numericFields
  }

  return numericFields.filter(field => card.selectableFieldKeys?.includes(field.key))
}

export function getDashboardRequiredFieldKeys(card: DashboardCardDefinition): readonly string[] {
  switch (card.type) {
    case 'KPI':
    case 'DISTRIBUTION':
      return [card.fieldKey]
    case 'DUAL_KPI':
    case 'MULTI_KPI':
    case 'NERACA_TIME_SERIES':
      return card.fieldKeys
    case 'TABULAR_MONTH_SERIES':
      return card.monthFieldKeys
    case 'TABULAR_SUMMARY':
      return []
    case 'REGIONAL_METRIC':
      return card.selectableFieldKeys ?? []
    case 'FIELD_TIME_SERIES':
      return []
  }
}

export function isDashboardCardDefinitionCompatible(
  card: DashboardCardDefinition,
  dataSchema: unknown
) {
  const fieldKeys = new Set(getDatasetSchemaFields(dataSchema).map(field => field.key))

  if (!getDashboardRequiredFieldKeys(card).every(fieldKey => fieldKeys.has(fieldKey))) {
    return false
  }

  if (card.type === 'FIELD_TIME_SERIES' || card.type === 'REGIONAL_METRIC') {
    return getDashboardSelectableFields(card, dataSchema).length > 0
  }

  return true
}

export function getDashboardDetailFields(card: DashboardCardDefinition, dataSchema: unknown) {
  const fields = getDatasetSchemaFields(dataSchema)

  return card.type === 'DISTRIBUTION'
    ? fields.filter(field => field.key === card.fieldKey)
    : fields
}

export function readDashboardRecordNumber(
  record: Pick<DashboardDatasetRecord, 'data'> | Pick<DashboardDatasetTableRecord, 'data'> | undefined,
  fieldKey: string | null
) {
  if (!record || !fieldKey) {
    return null
  }

  const value = record.data[fieldKey]

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }

  if (typeof value !== 'string' || !value.trim()) {
    return null
  }

  const normalized = Number(value)

  return Number.isFinite(normalized) ? normalized : null
}

/**
 * Sums only meaningful numeric values. Zero remains a real observation while
 * null, blanks, and non-numeric values are excluded.
 */
export function sumDashboardRecordFields(
  records: readonly DashboardDatasetRecord[],
  fieldKeys: readonly string[]
) {
  let total = 0
  let found = false

  for (const record of records) {
    for (const fieldKey of fieldKeys) {
      const value = readDashboardRecordNumber(record, fieldKey)

      if (value !== null) {
        total += value
        found = true
      }
    }
  }

  return found ? total : null
}

export type DashboardNeracaStatus = 'Surplus' | 'Defisit' | 'Seimbang'

/** The status always follows the stored Neraca value; a missing value has no status. */
export function getDashboardNeracaStatus(value: number | null): DashboardNeracaStatus | null {
  if (value === null) {
    return null
  }

  return value > 0 ? 'Surplus' : value < 0 ? 'Defisit' : 'Seimbang'
}

export function readDashboardRecordText(
  record: Pick<DashboardDatasetRecord, 'data'> | Pick<DashboardDatasetTableRecord, 'data'> | undefined,
  fieldKey: string | null
) {
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

export function formatDashboardValue(value: unknown, field?: DatasetSchemaField | null) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Intl.NumberFormat('id-ID', {
      maximumFractionDigits: field?.validation?.decimalPlaces ?? 2
    }).format(value)
  }

  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }

  if (typeof value === 'boolean') {
    return value ? 'Ya' : 'Tidak'
  }

  return '—'
}
