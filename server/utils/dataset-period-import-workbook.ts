import type { WorkBook } from 'xlsx'

import {
  getDatasetPeriodicity,
  getDatasetRecordPeriodRangeError,
  resolveDatasetPeriodSheetName
} from '~~/shared/datasets'

export type ResolvedDatasetImportSheet = {
  readonly sheetName: string
  readonly periodDate: string
}

export function resolveDatasetImportWorkbookSheets(dataConfig: unknown, workbook: Pick<WorkBook, 'SheetNames'>) {
  const periodicity = getDatasetPeriodicity(dataConfig)

  if (!periodicity) {
    throw new Error('Periode Dataset tidak didukung.')
  }

  if (workbook.SheetNames.length === 0) {
    throw new Error('File tidak memiliki worksheet yang dapat diimpor.')
  }

  const resolvedSheets: ResolvedDatasetImportSheet[] = []
  const seenPeriods = new Set<string>()

  for (const sheetName of workbook.SheetNames) {
    const periodDate = resolveDatasetPeriodSheetName(periodicity, sheetName)
    const periodRangeError = getDatasetRecordPeriodRangeError(dataConfig, periodDate)

    if (periodRangeError) {
      throw new Error(`${sheetName}: ${periodRangeError}`)
    }

    if (seenPeriods.has(periodDate)) {
      throw new Error(`Worksheet periode ${sheetName} duplikat.`)
    }

    seenPeriods.add(periodDate)
    resolvedSheets.push({ sheetName, periodDate })
  }

  return resolvedSheets
}

export function resolveDatasetPeriodImportWorksheet(dataConfig: unknown, workbook: Pick<WorkBook, 'SheetNames'>, expectedPeriodDate: string) {
  const sheets = resolveDatasetImportWorkbookSheets(dataConfig, workbook)

  if (sheets.length !== 1) {
    throw new Error('XLSX untuk satu periode harus memiliki tepat satu worksheet.')
  }

  const sheet = sheets[0]

  if (sheet?.periodDate !== expectedPeriodDate) {
    throw new Error(`Worksheet ${sheet?.sheetName ?? ''} tidak cocok dengan periode yang sedang dikelola.`)
  }

  return sheet
}
