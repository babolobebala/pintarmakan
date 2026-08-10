import type {
  DashboardDatasetBundle,
  DashboardDatasetDefinition,
  DashboardDatasetRecord,
  DashboardKey,
  DashboardPayload,
  DashboardProduksiPayload,
  DashboardUtamaPayload
} from '~~/shared/dashboard'

import { db } from '~~/server/utils/db'

const dashboardUtamaDatasetIds = [
  'IKP_TAHUNAN',
  'PPH_KETERSEDIAAN_TAHUNAN',
  'PPH_KONSUMSI_TAHUNAN',
  'STATUS_KETAHANAN_PANGAN_TAHUNAN'
] as const

const dashboardUtamaDatasetNameMap: Record<(typeof dashboardUtamaDatasetIds)[number], string> = {
  IKP_TAHUNAN: 'Indeks Ketahanan Pangan',
  PPH_KETERSEDIAAN_TAHUNAN: 'PPH Ketersediaan',
  PPH_KONSUMSI_TAHUNAN: 'PPH Konsumsi',
  STATUS_KETAHANAN_PANGAN_TAHUNAN: 'Status Ketahanan Pangan'
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function toRecordYear(date: Date) {
  return Number(toIsoDate(date).slice(0, 4))
}

function getLatestUpdatedAt(dates: Date[]) {
  const timestamp = dates.reduce((latest, current) => Math.max(latest, current.getTime()), 0)
  return new Date(timestamp || Date.now())
}

function createFallbackDefinition(datasetId: (typeof dashboardUtamaDatasetIds)[number]): DashboardDatasetDefinition {
  return {
    id: datasetId,
    name: dashboardUtamaDatasetNameMap[datasetId],
    dataSchema: {}
  }
}

function serializeRecord(record: {
  datasetId: string
  regionId: string
  periodDate: Date
  data: unknown
  region: {
    name: string
    parent: {
      name: string
    } | null
  }
}): DashboardDatasetRecord {
  return {
    regionId: record.regionId,
    regionName: record.region.name,
    parentRegionName: record.region.parent?.name ?? null,
    periodDate: toIsoDate(record.periodDate),
    year: toRecordYear(record.periodDate),
    data: isJsonObject(record.data) ? record.data : {}
  }
}

async function loadDashboardUtamaPayload(): Promise<DashboardUtamaPayload> {
  const [datasetDefinitions, datasetRecords] = await Promise.all([
    db.dataset.findMany({
      where: {
        id: {
          in: [...dashboardUtamaDatasetIds]
        }
      },
      select: {
        id: true,
        name: true,
        dataSchema: true,
        updatedAt: true
      }
    }),
    db.datasetRecord.findMany({
      where: {
        datasetId: {
          in: [...dashboardUtamaDatasetIds]
        },
        status: 'PUBLISHED'
      },
      orderBy: [{
        periodDate: 'desc'
      }, {
        regionId: 'asc'
      }],
      select: {
        datasetId: true,
        regionId: true,
        periodDate: true,
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
  ])

  const definitionMap = new Map(datasetDefinitions.map(definition => [definition.id, definition]))
  const recordsByDataset = new Map<string, DashboardDatasetRecord[]>()

  for (const record of datasetRecords) {
    const collection = recordsByDataset.get(record.datasetId) ?? []
    collection.push(serializeRecord(record))
    recordsByDataset.set(record.datasetId, collection)
  }

  const datasets = Object.fromEntries(
    dashboardUtamaDatasetIds.map((datasetId) => {
      const definition = definitionMap.get(datasetId)

      return [datasetId, {
        definition: definition
          ? {
              id: definition.id,
              name: definition.name,
              dataSchema: definition.dataSchema
            }
          : createFallbackDefinition(datasetId),
        records: recordsByDataset.get(datasetId) ?? []
      } satisfies DashboardDatasetBundle]
    })
  ) as DashboardUtamaPayload['datasets']

  const updatedAt = getLatestUpdatedAt([
    ...datasetDefinitions.map(definition => definition.updatedAt),
    ...datasetRecords.map(record => record.updatedAt)
  ])

  return {
    key: 'utama',
    kind: 'utama',
    meta: {
      title: 'Dashboard Ketahanan Pangan',
      updatedAt: updatedAt.toISOString()
    },
    datasets
  }
}

function getDashboardProduksiPayload(): DashboardProduksiPayload {
  return {
    key: 'produksi-pangan',
    kind: 'produksi',
    meta: {
      title: 'Dashboard Produksi Pangan',
      updatedAt: new Date().toISOString()
    },
    widgets: [{
      id: 'produksi-padi',
      title: 'Produksi Padi',
      value: 'Placeholder',
      note: 'Menunggu integrasi dataset produksi padi.',
      icon: 'i-lucide-wheat',
      badge: 'Dummy'
    }, {
      id: 'produksi-jagung',
      title: 'Produksi Jagung',
      value: 'Placeholder',
      note: 'Menunggu integrasi dataset jagung.',
      icon: 'i-lucide-chart-column',
      badge: 'Dummy'
    }, {
      id: 'hortikultura',
      title: 'Produksi Hortikultura',
      value: 'Placeholder',
      note: 'Ruang ini disiapkan untuk agregasi hortikultura.',
      icon: 'i-lucide-sprout',
      badge: 'Dummy'
    }, {
      id: 'tren-produksi',
      title: 'Tren Produksi',
      value: 'Widget dummy',
      note: 'Panel lebar untuk chart atau peta produksi di tahap berikutnya.',
      icon: 'i-lucide-chart-no-axes-combined',
      badge: 'Dummy'
    }]
  }
}

export async function getDashboardPayload(dashboard: DashboardKey): Promise<DashboardPayload> {
  switch (dashboard) {
    case 'utama':
      return loadDashboardUtamaPayload()
    case 'produksi-pangan':
      return getDashboardProduksiPayload()
  }
}
