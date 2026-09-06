import { createRequire } from 'node:module'

import { createDatasetPeriodSpreadsheet } from '#server/utils/dataset-period-spreadsheet'
import { getDatasetPermissionContextForUser } from '#server/utils/dataset-records'
import { createDatasetTablePeriodSpreadsheet } from '#server/utils/dataset-table-period-spreadsheet'
import { getDatasetMode, getDatasetPeriodRange } from '~~/shared/datasets'

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

export async function createDatasetWorkbookSpreadsheet(user: ScopedUser, options: {
  readonly datasetId: string
  readonly mode: 'template' | 'export'
}) {
  const context = await getDatasetPermissionContextForUser(user, {
    datasetId: options.datasetId.trim(),
    action: 'read'
  })
  const dataset = context.dataset
  const datasetMode = getDatasetMode(dataset.dataConfig)
  const periodDates = getDatasetPeriodRange(dataset.dataConfig)

  if (datasetMode !== 'REGIONAL' && datasetMode !== 'TABULAR') {
    throw new Error('Mode Dataset tidak didukung.')
  }

  if (periodDates.length === 0) {
    throw new Error('Cakupan periode Dataset tidak tersedia.')
  }

  const workbook = XLSX.utils.book_new()

  for (const periodDate of periodDates) {
    const spreadsheet = datasetMode === 'REGIONAL'
      ? await createDatasetPeriodSpreadsheet(user, {
          datasetId: dataset.id,
          periodDate,
          mode: options.mode
        })
      : await createDatasetTablePeriodSpreadsheet(user, {
          datasetId: dataset.id,
          periodDate,
          mode: options.mode
        })
    const periodWorkbook = XLSX.read(spreadsheet.data, { type: 'buffer' })
    const sheetName = periodWorkbook.SheetNames[0]
    const worksheet = sheetName ? periodWorkbook.Sheets[sheetName] : null

    if (!sheetName || !worksheet) {
      throw new Error(`Worksheet periode ${periodDate} tidak dapat dibuat.`)
    }

    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
  }

  return {
    filename: `${options.mode === 'template' ? 'template' : 'export'}-${slugifyFilename(dataset.name)}-all-periods.xlsx`,
    data: XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' }) as Buffer
  }
}
