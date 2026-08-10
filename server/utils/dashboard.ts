import type {
  DashboardKey,
  DashboardKpiPayload,
  DashboardPayload,
  DashboardProduksiPayload,
  DashboardStatusMapPayload,
  DashboardStatusMapRecord,
  DashboardUtamaPayload
} from '~~/shared/dashboard'

import { getDatasetSchemaFields } from '~~/shared/datasets'
import { db } from '~~/server/utils/db'

const dashboardUtamaDatasetIds = [
  'IKP_TAHUNAN',
  'PPH_KETERSEDIAAN_TAHUNAN',
  'PPH_KONSUMSI_TAHUNAN',
  'STATUS_KETAHANAN_PANGAN_TAHUNAN'
] as const

const dashboardUtamaKpiConfigs = [{
  key: 'ikp',
  datasetId: 'IKP_TAHUNAN',
  title: 'Indeks Ketahanan Pangan',
  description: 'Nilai tahunan IKP tingkat kabupaten.'
}, {
  key: 'pphKetersediaan',
  datasetId: 'PPH_KETERSEDIAAN_TAHUNAN',
  title: 'PPH Ketersediaan',
  description: 'Skor Pola Pangan Harapan berbasis ketersediaan pangan.'
}, {
  key: 'pphKonsumsi',
  datasetId: 'PPH_KONSUMSI_TAHUNAN',
  title: 'PPH Konsumsi',
  description: 'Skor Pola Pangan Harapan berbasis konsumsi pangan.'
}] as const

type DashboardKpiKey = (typeof dashboardUtamaKpiConfigs)[number]['key']

type DashboardDatasetDefinition = {
  id: string
  description: string | null
  dataSchema: unknown
  updatedAt: Date
}

type DashboardRecord = {
  datasetId: string
  regionId: string
  data: unknown
  updatedAt: Date
  region?: {
    name: string
    parent: {
      name: string
    } | null
  }
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function toPeriodDate(year: number) {
  return new Date(`${year}-01-01T00:00:00.000Z`)
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function readNumericDataValue(data: unknown, key: string | null) {
  if (!key || !isJsonObject(data)) {
    return null
  }

  const value = data[key]
  const numericValue = typeof value === 'number' ? value : Number(value)

  return Number.isFinite(numericValue) ? numericValue : null
}

function readTextDataValue(data: unknown, key: string | null) {
  if (!key || !isJsonObject(data)) {
    return null
  }

  const value = data[key]

  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }

  return null
}

function getPreferredField(dataSchema: unknown, preferredKey: string) {
  const fields = getDatasetSchemaFields(dataSchema)
  return fields.find(field => field.key === preferredKey)
    ?? fields.find(field => field.type === 'number')
    ?? fields[0]
    ?? null
}

function resolveSelectedYear(requestedYear: string | undefined, availableYears: number[]) {
  const sortedYears = [...availableYears].sort((left, right) => right - left)

  if (sortedYears.length === 0) {
    return null
  }

  const parsedRequestedYear = requestedYear ? Number(requestedYear) : NaN

  return Number.isInteger(parsedRequestedYear) && sortedYears.includes(parsedRequestedYear)
    ? parsedRequestedYear
    : (sortedYears[0] ?? null)
}

function getMaxUpdatedAt(dates: Date[]) {
  const timestamp = dates.reduce((latest, current) => Math.max(latest, current.getTime()), 0)
  return timestamp > 0 ? new Date(timestamp) : new Date()
}

function getTrendDirection(value: number | null, previousValue: number | null): DashboardKpiPayload['trendDirection'] {
  if (value === null || previousValue === null) {
    return null
  }

  if (value > previousValue) {
    return 'up'
  }

  if (value < previousValue) {
    return 'down'
  }

  return 'flat'
}

function comparePriorityKeys(left: string, right: string) {
  const leftNumber = Number(left)
  const rightNumber = Number(right)
  const bothNumeric = Number.isFinite(leftNumber) && Number.isFinite(rightNumber)

  if (bothNumeric) {
    return leftNumber - rightNumber
  }

  return left.localeCompare(right, 'id-ID', { numeric: true, sensitivity: 'base' })
}

function buildKpiPayload(
  definition: DashboardDatasetDefinition | undefined,
  currentRecord: DashboardRecord | undefined,
  previousRecord: DashboardRecord | undefined,
  title: string,
  description: string,
  selectedYear: number | null
): DashboardKpiPayload {
  const field = getPreferredField(definition?.dataSchema, 'value')
  const value = readNumericDataValue(currentRecord?.data, field?.key ?? null)
  const previousValue = readNumericDataValue(previousRecord?.data, field?.key ?? null)
  const delta = value !== null && previousValue !== null ? value - previousValue : null

  return {
    datasetId: definition?.id ?? '',
    title,
    description: definition?.description || description,
    year: selectedYear,
    fieldKey: field?.key ?? null,
    fieldLabel: field?.label ?? null,
    unit: field?.unit ?? null,
    value,
    previousYear: selectedYear !== null ? selectedYear - 1 : null,
    previousValue,
    delta,
    trendDirection: getTrendDirection(value, previousValue)
  }
}

function buildStatusMapPayload(
  definition: DashboardDatasetDefinition | undefined,
  records: DashboardRecord[],
  selectedYear: number | null
): DashboardStatusMapPayload {
  const field = getPreferredField(definition?.dataSchema, 'priority')
  const normalizedRecords: DashboardStatusMapRecord[] = records
    .map((record) => {
      const priorityKey = readTextDataValue(record.data, field?.key ?? null)

      return {
        regionId: record.regionId,
        regionName: record.region?.name || record.regionId,
        parentRegionName: record.region?.parent?.name ?? null,
        priorityKey,
        priorityLabel: priorityKey ? `Prioritas ${priorityKey}` : null
      } satisfies DashboardStatusMapRecord
    })
    .sort((left, right) => left.regionName.localeCompare(right.regionName, 'id-ID'))

  const counts = new Map<string, number>()

  for (const record of normalizedRecords) {
    if (!record.priorityKey) {
      continue
    }

    counts.set(record.priorityKey, (counts.get(record.priorityKey) ?? 0) + 1)
  }

  return {
    datasetId: definition?.id ?? '',
    title: 'Status Ketahanan Pangan',
    description: definition?.description || 'Peta prioritas status ketahanan pangan per desa.',
    year: selectedYear,
    totalWithData: normalizedRecords.filter(record => !!record.priorityKey).length,
    countsByPriority: Array.from(counts.entries())
      .sort(([left], [right]) => comparePriorityKeys(left, right))
      .map(([key, count]) => ({
        key,
        label: `Prioritas ${key}`,
        count
      })),
    records: normalizedRecords
  }
}

async function loadDashboardUtamaPayload(requestedYear?: string): Promise<DashboardUtamaPayload> {
  const datasetDefinitions = await db.dataset.findMany({
    where: {
      id: {
        in: [...dashboardUtamaDatasetIds]
      }
    },
    select: {
      id: true,
      description: true,
      dataSchema: true,
      updatedAt: true
    }
  })

  const datasetMap = new Map(datasetDefinitions.map(dataset => [dataset.id, dataset]))
  const availableYearRecords = await db.datasetRecord.findMany({
    where: {
      datasetId: {
        in: [...dashboardUtamaDatasetIds]
      },
      status: 'PUBLISHED'
    },
    select: {
      periodDate: true
    }
  })

  const availableYears = Array.from(new Set(
    availableYearRecords.map(record => Number(toIsoDate(record.periodDate).slice(0, 4)))
  ))
    .filter((year): year is number => Number.isInteger(year))
    .sort((left, right) => right - left)

  const selectedYear = resolveSelectedYear(requestedYear, availableYears)
  const currentPeriodDate = selectedYear !== null ? toPeriodDate(selectedYear) : null
  const previousPeriodDate = selectedYear !== null ? toPeriodDate(selectedYear - 1) : null
  const currentRecords = currentPeriodDate
    ? await db.datasetRecord.findMany({
        where: {
          datasetId: {
            in: [...dashboardUtamaDatasetIds]
          },
          periodDate: currentPeriodDate,
          status: 'PUBLISHED'
        },
        select: {
          datasetId: true,
          regionId: true,
          data: true,
          updatedAt: true,
          region: {
            select: {
              name: true,
              parent: {
                select: {
                  name: true
                }
              }
            }
          }
        }
      })
    : []
  const previousKpiRecords = previousPeriodDate
    ? await db.datasetRecord.findMany({
        where: {
          datasetId: {
            in: dashboardUtamaKpiConfigs.map(config => config.datasetId)
          },
          periodDate: previousPeriodDate,
          status: 'PUBLISHED'
        },
        select: {
          datasetId: true,
          regionId: true,
          data: true,
          updatedAt: true
        }
      })
    : []
  const previousRecordMap = new Map(
    previousKpiRecords.map(record => [`${record.datasetId}:${record.regionId}`, record] as const)
  )

  const kpiPayloads = Object.fromEntries(
    dashboardUtamaKpiConfigs.map((config) => {
      const currentRecord = currentRecords.find(record => record.datasetId === config.datasetId)
      const previousRecord = currentRecord
        ? previousRecordMap.get(`${config.datasetId}:${currentRecord.regionId}`)
        : previousKpiRecords.find(record => record.datasetId === config.datasetId)

      return [config.key, buildKpiPayload(
        datasetMap.get(config.datasetId),
        currentRecord,
        previousRecord,
        config.title,
        config.description,
        selectedYear
      )]
    })
  ) as Record<DashboardKpiKey, DashboardKpiPayload>

  const statusPayload = buildStatusMapPayload(
    datasetMap.get('STATUS_KETAHANAN_PANGAN_TAHUNAN'),
    currentRecords.filter(record => record.datasetId === 'STATUS_KETAHANAN_PANGAN_TAHUNAN'),
    selectedYear
  )
  const updatedAt = getMaxUpdatedAt([
    ...datasetDefinitions.map(dataset => dataset.updatedAt),
    ...currentRecords.map(record => record.updatedAt),
    ...previousKpiRecords.map(record => record.updatedAt)
  ])

  return {
    key: 'utama',
    kind: 'utama',
    meta: {
      eyebrow: 'Monitoring operasional',
      title: 'Dashboard utama ketahanan pangan',
      description: 'Ringkasan indikator tahunan kabupaten dan status prioritas ketahanan pangan tingkat desa.',
      sourceLabel: 'Prisma · datasets / dataset_records / regions',
      databaseBacked: true,
      updatedAt: updatedAt.toISOString()
    },
    selectedYear,
    availableYears,
    ikp: kpiPayloads.ikp,
    pphKetersediaan: kpiPayloads.pphKetersediaan,
    pphKonsumsi: kpiPayloads.pphKonsumsi,
    statusKetahananPangan: statusPayload
  }
}

function getDashboardProduksiPayload(): DashboardProduksiPayload {
  return {
    key: 'produksi-pangan',
    kind: 'produksi',
    meta: {
      eyebrow: 'Monitoring sektoral',
      title: 'Dashboard produksi pangan',
      description: 'Placeholder widget untuk memvalidasi arsitektur multi-dashboard sebelum data produksi dihubungkan ke dataset riil.',
      sourceLabel: 'Placeholder dashboard',
      databaseBacked: false,
      updatedAt: new Date().toISOString()
    },
    widgets: [{
      id: 'produksi-padi',
      title: 'Produksi Padi',
      value: 'Menunggu integrasi',
      note: 'Widget ini disiapkan untuk agregasi produksi padi per periode dan wilayah.',
      icon: 'i-lucide-wheat',
      badge: 'Placeholder'
    }, {
      id: 'produksi-jagung',
      title: 'Produksi Jagung',
      value: 'Menunggu integrasi',
      note: 'Akan memakai grid widget yang sama ketika dataset produksi tersedia.',
      icon: 'i-lucide-chart-column',
      badge: 'Placeholder'
    }, {
      id: 'hortikultura',
      title: 'Produksi Hortikultura',
      value: 'Struktur siap',
      note: 'Komponen ini hanya memvalidasi pergantian dashboard tanpa route tambahan.',
      icon: 'i-lucide-sprout',
      badge: 'Placeholder'
    }, {
      id: 'tren-produksi',
      title: 'Tren Produksi',
      value: 'Widget dummy',
      note: 'Slot lebar disiapkan untuk chart atau peta produksi saat dataset riil ditambahkan.',
      icon: 'i-lucide-chart-no-axes-combined',
      badge: 'Placeholder'
    }]
  }
}

export async function getDashboardPayload(
  dashboard: DashboardKey,
  options?: {
    year?: string
  }
): Promise<DashboardPayload> {
  switch (dashboard) {
    case 'utama':
      return loadDashboardUtamaPayload(options?.year)
    case 'produksi-pangan':
      return getDashboardProduksiPayload()
  }
}
