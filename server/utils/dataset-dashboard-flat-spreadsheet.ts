import { createRequire } from 'node:module'

import { getDatasetPeriodSpreadsheetFieldLabels } from '#server/utils/dataset-period-spreadsheet-headers'
import { getDatasetPeriodSpreadsheetIdentityHeaders } from '#server/utils/dataset-period-spreadsheet-regions'
import { getDatasetPermissionContextForUser, getDatasetPeriodWorkspaceForUser } from '#server/utils/dataset-records'
import { getDatasetTablePeriodSpreadsheetFieldLabels } from '#server/utils/dataset-table-period-spreadsheet-headers'
import { getTabularDatasetPeriodWorkspaceForUser } from '#server/utils/dataset-table-records'
import {
  getDatasetMode,
  getDatasetPeriodRange,
  getDatasetPeriodicity,
  type DatasetReadablePeriodicity
} from '~~/shared/datasets'

const nodeRequire = createRequire(import.meta.url)
const XLSX = nodeRequire('xlsx') as typeof import('xlsx')

type ScopedUser = {
  readonly id: string
  readonly role?: string | null
}

type RegionalWorkspaceRow = {
  readonly regionName: string
  readonly parentRegionName: string | null
  readonly record: {
    readonly data: Record<string, unknown>
  } | null
}

function slugifyFilename(value: string) {
  const slug = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return slug || 'dataset'
}

function getPeriodHeader(periodicity: DatasetReadablePeriodicity) {
  switch (periodicity) {
    case 'TAHUNAN':
      return 'Tahun'
    case 'TRIWULANAN':
      return 'Triwulan'
    case 'BULANAN':
      return 'Bulan'
    case 'HARIAN':
    default:
      return 'Hari'
  }
}

function formatFlatExportPeriod(periodicity: DatasetReadablePeriodicity, periodDate: string) {
  const [yearString = '', monthString = '', dayString = ''] = periodDate.split('-')
  const year = Number(yearString)
  const month = Number(monthString)
  const day = Number(dayString)
  const date = new Date(Date.UTC(year, month - 1, day))

  switch (periodicity) {
    case 'TAHUNAN':
      return yearString
    case 'TRIWULANAN': {
      const quarter = Math.floor((month - 1) / 3)
      const numerals = ['I', 'II', 'III', 'IV'] as const

      return `Triwulan ${numerals[quarter] ?? ''} ${yearString}`.trim()
    }
    case 'BULANAN':
      return new Intl.DateTimeFormat('id-ID', {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC'
      }).format(date)
    case 'HARIAN':
    default:
      return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC'
      }).format(date)
  }
}

function getSpreadsheetValue(value: unknown) {
  return value === undefined || value === null ? '' : value
}

function getRegionalIdentityValues(regionLevel: string | null, row: RegionalWorkspaceRow) {
  return regionLevel === 'DESA'
    ? [row.parentRegionName ?? '', row.regionName]
    : [row.regionName]
}

export async function createDatasetDashboardFlatSpreadsheet(user: ScopedUser, options: {
  readonly datasetId: string
}) {
  const context = await getDatasetPermissionContextForUser(user, {
    datasetId: options.datasetId.trim(),
    action: 'read'
  })
  const dataset = context.dataset
  const datasetMode = getDatasetMode(dataset.dataConfig)
  const periodicity = getDatasetPeriodicity(dataset.dataConfig)
  const periodDates = getDatasetPeriodRange(dataset.dataConfig)

  if (!periodicity || (datasetMode !== 'REGIONAL' && datasetMode !== 'TABULAR')) {
    throw new Error('Konfigurasi Dataset tidak didukung.')
  }

  if (periodDates.length === 0) {
    throw new Error('Cakupan periode Dataset tidak tersedia.')
  }

  let headers: unknown[]
  let rows: unknown[][]

  if (datasetMode === 'REGIONAL') {
    const workspaces = [] as Awaited<ReturnType<typeof getDatasetPeriodWorkspaceForUser>>[]

    for (const periodDate of periodDates) {
      workspaces.push(await getDatasetPeriodWorkspaceForUser(user, {
        datasetId: dataset.id,
        periodDate
      }))
    }

    const firstWorkspace = workspaces[0]

    if (!firstWorkspace) {
      throw new Error('Cakupan periode Dataset tidak tersedia.')
    }

    const fields = firstWorkspace.dataset.fields
    const omitKabupatenIdentity = firstWorkspace.dataset.regionLevel === 'KABUPATEN'
      && workspaces.every(workspace => workspace.expectedRegionCount === 1)
    const identityHeaders = omitKabupatenIdentity
      ? []
      : getDatasetPeriodSpreadsheetIdentityHeaders(firstWorkspace.dataset.regionLevel)

    headers = [
      getPeriodHeader(periodicity),
      ...identityHeaders,
      ...getDatasetPeriodSpreadsheetFieldLabels(fields)
    ]
    rows = workspaces.flatMap((workspace) => {
      const periodLabel = formatFlatExportPeriod(periodicity, workspace.periodDate)

      return workspace.rows.map((row) => [
        periodLabel,
        ...(omitKabupatenIdentity
          ? []
          : getRegionalIdentityValues(workspace.dataset.regionLevel, row)),
        ...fields.map(field => getSpreadsheetValue(row.record?.data[field.key]))
      ])
    })
  } else {
    const workspaces = [] as Awaited<ReturnType<typeof getTabularDatasetPeriodWorkspaceForUser>>[]

    for (const periodDate of periodDates) {
      workspaces.push(await getTabularDatasetPeriodWorkspaceForUser(user, {
        datasetId: dataset.id,
        periodDate
      }))
    }

    const firstWorkspace = workspaces[0]

    if (!firstWorkspace) {
      throw new Error('Cakupan periode Dataset tidak tersedia.')
    }

    const fields = firstWorkspace.dataset.fields

    headers = [
      getPeriodHeader(periodicity),
      'recordId',
      ...getDatasetTablePeriodSpreadsheetFieldLabels(fields)
    ]
    rows = workspaces.flatMap((workspace) => {
      const periodLabel = formatFlatExportPeriod(periodicity, workspace.periodDate)

      return workspace.rows.map(row => [
        periodLabel,
        row.id,
        ...fields.map(field => getSpreadsheetValue(row.data[field.key]))
      ])
    })
  }

  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows])

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data')

  return {
    filename: `export-dashboard-${slugifyFilename(dataset.name)}-all-periods.xlsx`,
    data: XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' }) as Buffer
  }
}
