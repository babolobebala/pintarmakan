import { createRequire } from 'node:module'

import { getDatasetTablePeriodSpreadsheetFieldLabels } from '#server/utils/dataset-table-period-spreadsheet-headers'
import { getTabularDatasetPeriodWorkspaceForUser } from '#server/utils/dataset-table-records'

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

function getSpreadsheetValue(field: { type: string }, value: unknown) {
  if (value === undefined || value === null) {
    return ''
  }

  return value
}

export async function createDatasetTablePeriodSpreadsheet(user: ScopedUser, options: {
  readonly datasetId: string
  readonly periodDate: string
  readonly mode: 'template' | 'export'
}) {
  const workspace = await getTabularDatasetPeriodWorkspaceForUser(user, options)
  const headers = ['recordId', ...getDatasetTablePeriodSpreadsheetFieldLabels(workspace.dataset.fields)]

  const rows = workspace.rows.map((row) => {
    const businessValues = workspace.dataset.fields.map((field) => {
      const value = options.mode === 'export' ? row.data[field.key] : undefined

      return getSpreadsheetValue(field, value)
    })

    return [row.id, ...businessValues]
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
