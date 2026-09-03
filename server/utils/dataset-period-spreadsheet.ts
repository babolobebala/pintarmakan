import { createRequire } from 'node:module'

import { getDatasetPeriodWorkspaceForUser } from '#server/utils/dataset-records'
import { getDatasetPeriodSpreadsheetFieldLabels } from '#server/utils/dataset-period-spreadsheet-headers'

const nodeRequire = createRequire(import.meta.url)
const XLSX = nodeRequire('xlsx') as typeof import('xlsx')

type ScopedUser = {
  readonly id: string
  readonly role?: string | null
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

function getIdentityHeaders(regionLevel: string | null) {
  switch (regionLevel) {
    case 'DESA':
      return ['regionId', 'Kecamatan', 'Desa/Kelurahan']
    case 'KECAMATAN':
      return ['regionId', 'Kecamatan']
    case 'KABUPATEN':
    default:
      return ['regionId', 'Kabupaten']
  }
}

export async function createDatasetPeriodSpreadsheet(user: ScopedUser, options: {
  readonly datasetId: string
  readonly periodDate: string
  readonly mode: 'template' | 'export'
}) {
  const workspace = await getDatasetPeriodWorkspaceForUser(user, options)
  const identityHeaders = getIdentityHeaders(workspace.dataset.regionLevel)
  const headers = [...identityHeaders, ...getDatasetPeriodSpreadsheetFieldLabels(workspace.dataset.fields)]
  const rows = workspace.rows.map((row) => {
    const identityValues = workspace.dataset.regionLevel === 'DESA'
      ? [row.regionId, row.parentRegionName ?? '', row.regionName]
      : [row.regionId, row.regionName]
    const businessValues = workspace.dataset.fields.map((field) => {
      const value = options.mode === 'export' ? row.record?.data[field.key] : undefined

      return value === undefined || value === null ? '' : value
    })

    return [...identityValues, ...businessValues]
  })
  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows])

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data')

  const prefix = options.mode === 'template' ? 'template-' : ''
  const filename = `${prefix}${slugifyFilename(workspace.dataset.name)}-${workspace.periodDate}.xlsx`

  return {
    filename,
    data: XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' }) as Buffer
  }
}
