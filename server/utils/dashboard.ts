import type {
  DashboardCardDefinition,
  DashboardCardKey,
  DashboardDatasetBundle,
  DashboardDatasetCoverage,
  DashboardDatasetDefinition,
  DashboardDatasetRecord,
  DashboardDatasetTableRecord,
  DashboardConfiguredPayload,
  DashboardEmptyPayload,
  DashboardKey,
  DashboardUtamaPayload,
  DashboardPayload
} from '~~/shared/dashboard'

import {
  getDashboardIndicatorCardDefinitions,
  getDashboardOption,
  isDashboardCardDefinitionCompatible,
  isDashboardCardDisplayCoverageCompatible,
  dashboardUtamaCardDefinitions
} from '~~/shared/dashboard'
import {
  getDatasetSource,
  validateDatasetConfigDefinition,
  validateDatasetSchemaDefinition
} from '~~/shared/datasets'
import { db } from '~~/server/utils/db'
import { sumbawaBaratRegionId } from '~~/server/utils/region-scope'

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

function createFallbackDefinition(card: DashboardCardDefinition): DashboardDatasetDefinition {
  return {
    id: card.datasetId,
    name: card.title,
    dataSchema: {},
    source: null,
    coverage: null,
    mode: null,
    regionLevel: null
  }
}

type DashboardDatasetRow = {
  dataSchema: unknown
  dataConfig: unknown
  archivedAt: Date | null
}

function getDashboardCardDatasetContract(
  card: DashboardCardDefinition,
  definition: DashboardDatasetRow | undefined
): {
  coverage: DashboardDatasetCoverage
  mode: DashboardDatasetDefinition['mode']
  regionLevel: DashboardDatasetDefinition['regionLevel']
} | null {
  if (!definition || definition.archivedAt) {
    return null
  }

  try {
    const dataConfig = validateDatasetConfigDefinition(definition.dataConfig)
    const dataSchema = validateDatasetSchemaDefinition(definition.dataSchema)
    const regionMatches = card.mode === 'TABULAR'
      ? dataConfig.mode === 'TABULAR'
      : dataConfig.mode === 'REGIONAL' && dataConfig.regionLevel === card.regionLevel
    const coverage = {
      periodicity: dataConfig.periodicity,
      startPeriod: dataConfig.startPeriod,
      endPeriod: dataConfig.endPeriod ?? null
    }

    if (
      !regionMatches
      || dataConfig.periodicity !== card.periodicity
      || !isDashboardCardDefinitionCompatible(card, dataSchema)
      || !isDashboardCardDisplayCoverageCompatible(card, coverage)
    ) {
      return null
    }

    return {
      coverage,
      mode: dataConfig.mode,
      regionLevel: dataConfig.mode === 'REGIONAL' ? dataConfig.regionLevel : null
    }
  } catch {
    return null
  }
}

function serializeRecord(record: {
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

function serializeTableRecord(record: {
  periodDate: Date
  data: unknown
}): DashboardDatasetTableRecord {
  return {
    periodDate: toIsoDate(record.periodDate),
    year: toRecordYear(record.periodDate),
    data: isJsonObject(record.data) ? record.data : {}
  }
}

/**
 * Resolves only the requested card definitions in two bounded queries: one for
 * REGIONAL records and one for TABULAR records. Future dashboard compositions
 * can choose any catalog subset without introducing per-card loading.
 */
async function loadDashboardCardBundles(
  requestedCards: readonly DashboardCardDefinition[]
) {
  const datasetIds = [...new Set(requestedCards.map(card => card.datasetId))]
  const regionalDatasetIds = [...new Set(
    requestedCards.filter(card => card.mode === 'REGIONAL').map(card => card.datasetId)
  )]
  const tabularDatasetIds = [...new Set(
    requestedCards.filter(card => card.mode === 'TABULAR').map(card => card.datasetId)
  )]
  const kabupatenDatasetIds = new Set(
    requestedCards
      .filter(card => card.mode === 'REGIONAL' && card.regionLevel === 'KABUPATEN')
      .map(card => card.datasetId)
  )

  const [datasetDefinitions, regionalRecords, tabularRecords] = await Promise.all([
    db.dataset.findMany({
      where: { id: { in: datasetIds } },
      select: {
        id: true,
        name: true,
        dataSchema: true,
        dataConfig: true,
        archivedAt: true,
        updatedAt: true
      }
    }),
    regionalDatasetIds.length
      ? db.datasetRecord.findMany({
          where: {
            datasetId: { in: regionalDatasetIds },
            dataset: { archivedAt: null }
          },
          orderBy: [{ periodDate: 'desc' }, { regionId: 'asc' }],
          select: {
            datasetId: true,
            regionId: true,
            periodDate: true,
            data: true,
            updatedAt: true,
            region: {
              select: {
                name: true,
                parent: { select: { name: true } }
              }
            }
          }
        })
      : Promise.resolve([]),
    tabularDatasetIds.length
      ? db.datasetTableRecord.findMany({
          where: {
            datasetId: { in: tabularDatasetIds },
            dataset: { archivedAt: null }
          },
          orderBy: { periodDate: 'desc' },
          select: {
            datasetId: true,
            periodDate: true,
            data: true,
            updatedAt: true
          }
        })
      : Promise.resolve([])
  ])

  const definitionMap = new Map(datasetDefinitions.map(definition => [definition.id, definition]))
  const contractByCard = new Map<DashboardCardKey, ReturnType<typeof getDashboardCardDatasetContract>>(
    requestedCards.map(card => [card.key, getDashboardCardDatasetContract(card, definitionMap.get(card.datasetId))])
  )
  const supportedRegionalDatasetIds = new Set(
    requestedCards
      .filter(card => card.mode === 'REGIONAL' && contractByCard.get(card.key))
      .map(card => card.datasetId)
  )
  const supportedTabularDatasetIds = new Set(
    requestedCards
      .filter(card => card.mode === 'TABULAR' && contractByCard.get(card.key))
      .map(card => card.datasetId)
  )
  const recordsByDataset = new Map<string, DashboardDatasetRecord[]>()
  const tableRecordsByDataset = new Map<string, DashboardDatasetTableRecord[]>()

  for (const record of regionalRecords) {
    if (
      !supportedRegionalDatasetIds.has(record.datasetId)
      || (kabupatenDatasetIds.has(record.datasetId) && record.regionId !== sumbawaBaratRegionId)
    ) {
      continue
    }

    const records = recordsByDataset.get(record.datasetId) ?? []
    records.push(serializeRecord(record))
    recordsByDataset.set(record.datasetId, records)
  }

  for (const record of tabularRecords) {
    if (!supportedTabularDatasetIds.has(record.datasetId)) {
      continue
    }

    const records = tableRecordsByDataset.get(record.datasetId) ?? []
    records.push(serializeTableRecord(record))
    tableRecordsByDataset.set(record.datasetId, records)
  }

  const bundles = new Map<DashboardCardKey, DashboardDatasetBundle>()

  for (const card of requestedCards) {
    const definition = definitionMap.get(card.datasetId)
    const contract = contractByCard.get(card.key) ?? null
    const available = contract !== null

    bundles.set(card.key, {
      definition: definition
        ? {
            id: definition.id,
            name: definition.name,
            dataSchema: definition.dataSchema,
            source: getDatasetSource(definition.dataConfig),
            coverage: contract?.coverage ?? null,
            mode: contract?.mode ?? null,
            regionLevel: contract?.regionLevel ?? null
          }
        : createFallbackDefinition(card),
      records: available && card.mode === 'REGIONAL'
        ? recordsByDataset.get(card.datasetId) ?? []
        : [],
      tableRecords: available && card.mode === 'TABULAR'
        ? tableRecordsByDataset.get(card.datasetId) ?? []
        : [],
      available
    })
  }

  return {
    bundles,
    updatedAt: getLatestUpdatedAt([
      ...datasetDefinitions.map(definition => definition.updatedAt),
      ...regionalRecords.map(record => record.updatedAt),
      ...tabularRecords.map(record => record.updatedAt)
    ])
  }
}

export async function getDashboardPayload(dashboard: DashboardKey): Promise<DashboardPayload> {
  const option = getDashboardOption(dashboard)

  if (dashboard === 'dashboard-utama') {
    const { bundles, updatedAt } = await loadDashboardCardBundles(dashboardUtamaCardDefinitions)

    return {
      key: dashboard,
      kind: 'dashboard-utama',
      meta: {
        title: option.label,
        updatedAt: updatedAt.toISOString()
      },
      cards: Object.fromEntries(dashboardUtamaCardDefinitions.map(card => [card.key, bundles.get(card.key)!]))
    } as DashboardUtamaPayload
  }

  const cards = getDashboardIndicatorCardDefinitions(dashboard)

  if (cards.length === 0) {
    return {
      key: dashboard,
      kind: 'empty',
      meta: {
        title: option.label,
        updatedAt: new Date().toISOString()
      },
      cards: {}
    } satisfies DashboardEmptyPayload
  }

  const { bundles, updatedAt } = await loadDashboardCardBundles(cards)

  return {
    key: dashboard,
    kind: 'configured',
    meta: {
      title: option.label,
      updatedAt: updatedAt.toISOString()
    },
    cards: Object.fromEntries(cards.map(card => [card.key, bundles.get(card.key)!]))
  } satisfies DashboardConfiguredPayload
}
