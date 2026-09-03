import type { DatasetManagementItem } from '~/types'

const datasetModeColors = {
  REGIONAL: 'primary',
  TABULAR: 'info'
} as const

const datasetPeriodicityColors = {
  HARIAN: 'success',
  BULANAN: 'info',
  TRIWULANAN: 'warning',
  TAHUNAN: 'primary'
} as const

const datasetRegionLevelColors = {
  KABUPATEN: 'primary',
  KECAMATAN: 'info',
  DESA: 'success'
} as const

const datasetOwnerColors = {
  DKP_KETERSEDIAAN: 'primary',
  DKP_DISTRIBUSI: 'warning'
} as const

export function getDatasetModeColor(value: DatasetManagementItem['mode']) {
  return datasetModeColors[value as keyof typeof datasetModeColors] ?? 'neutral'
}

export function getDatasetPeriodicityColor(value: string | null) {
  return datasetPeriodicityColors[value as keyof typeof datasetPeriodicityColors] ?? 'neutral'
}

export function getDatasetRegionLevelColor(value: string | null) {
  return datasetRegionLevelColors[value as keyof typeof datasetRegionLevelColors] ?? 'neutral'
}

export function getDatasetOwnerColor(value: string) {
  return datasetOwnerColors[value as keyof typeof datasetOwnerColors] ?? 'neutral'
}
