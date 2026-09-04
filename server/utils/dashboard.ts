import type {
  DashboardUtamaCardDefinition,
  DashboardDatasetBundle,
  DashboardDatasetDefinition,
  DashboardDatasetRecord,
  DashboardKey,
  DashboardPayload,
  DashboardProduksiPayload,
  DashboardUtamaPayload
} from '~~/shared/dashboard'

import {
  validateDatasetConfigDefinition,
  validateDatasetSchemaDefinition
} from '~~/shared/datasets'
import { dashboardUtamaCardDefinitions } from '~~/shared/dashboard'
import { db } from '~~/server/utils/db'

const dashboardUtamaDatasetIds = [...new Set(
  dashboardUtamaCardDefinitions.map(card => card.datasetId)
)]

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

function createFallbackDefinition(card: DashboardUtamaCardDefinition): DashboardDatasetDefinition {
  return {
    id: card.datasetId,
    name: card.title,
    dataSchema: {}
  }
}

function isDashboardCardDatasetSupported(
  card: DashboardUtamaCardDefinition,
  definition: {
    dataSchema: unknown
    dataConfig: unknown
    archivedAt: Date | null
  } | undefined
) {
  if (!definition || definition.archivedAt) {
    return false
  }

  try {
    const dataConfig = validateDatasetConfigDefinition(definition.dataConfig)
    const dataSchema = validateDatasetSchemaDefinition(definition.dataSchema)

    return dataConfig.mode === card.mode
      && dataConfig.periodicity === card.periodicity
      && dataConfig.regionLevel === card.regionLevel
      && dataSchema.fields.some(field => field.key === card.fieldKey)
  } catch {
    return false
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
          in: dashboardUtamaDatasetIds
        }
      },
      select: {
        id: true,
        name: true,
        dataSchema: true,
        dataConfig: true,
        archivedAt: true,
        updatedAt: true
      }
    }),
    db.datasetRecord.findMany({
      where: {
        datasetId: {
          in: dashboardUtamaDatasetIds
        },
        status: 'PUBLISHED',
        dataset: {
          archivedAt: null
        }
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
  const supportedDatasetIds = new Set(
    dashboardUtamaCardDefinitions
      .filter(card => isDashboardCardDatasetSupported(card, definitionMap.get(card.datasetId)))
      .map(card => card.datasetId)
  )

  for (const record of datasetRecords) {
    if (!supportedDatasetIds.has(record.datasetId)) {
      continue
    }

    const collection = recordsByDataset.get(record.datasetId) ?? []
    collection.push(serializeRecord(record))
    recordsByDataset.set(record.datasetId, collection)
  }

  const cards = Object.fromEntries(
    dashboardUtamaCardDefinitions.map((card) => {
      const definition = definitionMap.get(card.datasetId)
      const available = isDashboardCardDatasetSupported(card, definition)

      return [card.key, {
        definition: definition
          ? {
              id: definition.id,
              name: definition.name,
              dataSchema: definition.dataSchema
            }
          : createFallbackDefinition(card),
        records: available ? recordsByDataset.get(card.datasetId) ?? [] : [],
        available
      } satisfies DashboardDatasetBundle]
    })
  ) as DashboardUtamaPayload['cards']

  const updatedAt = getLatestUpdatedAt([
    ...datasetDefinitions
      .filter(definition => supportedDatasetIds.has(definition.id))
      .map(definition => definition.updatedAt),
    ...datasetRecords
      .filter(record => supportedDatasetIds.has(record.datasetId))
      .map(record => record.updatedAt)
  ])

  return {
    key: 'utama',
    kind: 'utama',
    meta: {
      title: 'Dashboard Ketahanan Pangan',
      updatedAt: updatedAt.toISOString()
    },
    cards
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
