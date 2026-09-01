import type { Prisma } from '#server/utils/db'

import {
  getDatasetPeriodicity,
  getDatasetRegionLevel,
  parseDatasetJsonInput
} from '~~/shared/datasets'

type DatasetLike = {
  id: string
  ownerBidangId: string
  name: string
  description: string | null
  dataSchema: unknown
  dataConfig: unknown
  archivedAt: Date | null
  createdAt: Date
  updatedAt: Date
  ownerBidang?: {
    name: string
  } | null
}

type DatasetMutationInput = {
  ownerBidangId: string
  name: string
  description?: string | null
  dataSchema: unknown
  dataConfig: unknown
}

function normalizeDescription(value?: string | null) {
  const normalized = value?.trim()

  return normalized ? normalized : null
}

export function serializeDataset(dataset: DatasetLike) {
  return {
    id: dataset.id,
    ownerBidangId: dataset.ownerBidangId,
    ownerBidangName: dataset.ownerBidang?.name ?? dataset.ownerBidangId,
    name: dataset.name,
    description: dataset.description,
    dataSchema: dataset.dataSchema as Record<string, unknown>,
    dataConfig: dataset.dataConfig as Record<string, unknown>,
    periodicity: getDatasetPeriodicity(dataset.dataConfig),
    regionLevel: getDatasetRegionLevel(dataset.dataConfig),
    archivedAt: dataset.archivedAt?.toISOString() ?? null,
    createdAt: dataset.createdAt.toISOString(),
    updatedAt: dataset.updatedAt.toISOString()
  }
}

export function buildDatasetWriteInput(input: DatasetMutationInput) {
  return {
    ownerBidangId: input.ownerBidangId.trim(),
    name: input.name.trim(),
    description: normalizeDescription(input.description),
    dataSchema: parseDatasetJsonInput(input.dataSchema, 'Data schema') as Prisma.InputJsonObject,
    dataConfig: parseDatasetJsonInput(input.dataConfig, 'Data config') as Prisma.InputJsonObject
  }
}

export function getDatasetChangedFields(
  previous: Pick<DatasetLike, 'ownerBidangId' | 'name' | 'description' | 'dataSchema' | 'dataConfig'>,
  next: Pick<DatasetLike, 'ownerBidangId' | 'name' | 'description' | 'dataSchema' | 'dataConfig'>
) {
  const changedFields: string[] = []

  if (previous.ownerBidangId !== next.ownerBidangId) {
    changedFields.push('ownerBidangId')
  }

  if (previous.name !== next.name) {
    changedFields.push('name')
  }

  if (previous.description !== next.description) {
    changedFields.push('description')
  }

  if (JSON.stringify(previous.dataSchema) !== JSON.stringify(next.dataSchema)) {
    changedFields.push('dataSchema')
  }

  if (JSON.stringify(previous.dataConfig) !== JSON.stringify(next.dataConfig)) {
    changedFields.push('dataConfig')
  }

  return changedFields
}
