import { createError } from 'h3'
import { createRequire } from 'node:module'
import type { WorkBook } from 'xlsx'

import type { DatasetSchemaField } from '~~/shared/datasets'
import {
  getDatasetSchemaFields,
  validateDatasetRecordData
} from '~~/shared/datasets'
import { comparableDatasetValue } from '#server/utils/dataset-records'
import {
  getTabularDatasetPermissionContextForUser,
  resolveTabularDatasetPeriod
} from '#server/utils/dataset-table-records'
import { resolveDatasetTablePeriodSpreadsheetHeaders } from '#server/utils/dataset-table-period-spreadsheet-headers'
import { db } from '#server/utils/db'

const nodeRequire = createRequire(import.meta.url)
const XLSX = nodeRequire('xlsx') as typeof import('xlsx')

type ScopedUser = {
  readonly id: string
  readonly role?: string | null
}

type ImportFile = {
  readonly filename?: string
  readonly data: Uint8Array
}

type ImportAction = 'CREATE' | 'UPDATE' | 'UNCHANGED'

type SourceSpreadsheetRow = {
  row: readonly unknown[]
  rowNumber: number
  recordId: string
  rawData: Record<string, unknown>
  hasExtraColumns: boolean
  meaningful: boolean
}

type PreparedImportRow = {
  rowNumber: number
  recordId: string
  data: Record<string, unknown>
  action: ImportAction | null
  errors: string[]
}

const maxImportFileBytes = 5 * 1024 * 1024
const maxImportRows = 500

function getErrorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'statusMessage' in error) {
    const statusMessage = error.statusMessage

    if (typeof statusMessage === 'string' && statusMessage.trim()) {
      return statusMessage
    }
  }

  return error instanceof Error ? error.message : 'Periode tidak valid.'
}

function padDatePart(value: number) {
  return String(value).padStart(2, '0')
}

function formatLocalDate(value: Date) {
  return `${value.getFullYear()}-${padDatePart(value.getMonth() + 1)}-${padDatePart(value.getDate())}`
}

function formatSerialDate(value: number) {
  const date = XLSX.SSF.parse_date_code(value)

  if (!date) {
    return ''
  }

  return `${date.y}-${padDatePart(date.m)}-${padDatePart(date.d)}`
}

function getCellText(value: unknown) {
  if (value === null || value === undefined) {
    return ''
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false'
  }

  if (value instanceof Date) {
    return formatLocalDate(value)
  }

  return String(value).trim()
}

function isBlankCell(value: unknown) {
  return getCellText(value) === ''
}

function isEmptyRow(row: readonly unknown[]) {
  return row.every(cell => isBlankCell(cell))
}

function isMeaningfulRawValue(value: unknown) {
  if (typeof value === 'boolean' || typeof value === 'number') {
    return true
  }

  return getCellText(value) !== ''
}

function getRawValueForField(field: DatasetSchemaField, value: unknown): unknown {
  switch (field.type) {
    case 'boolean':
      if (typeof value === 'boolean') {
        return value
      }

      if (typeof value === 'number') {
        return value === 1 ? true : value === 0 ? false : value
      }

      return getCellText(value)
    case 'number':
      if (typeof value === 'number') {
        return value
      }

      if (value instanceof Date) {
        return ''
      }

      if (typeof value === 'string') {
        const trimmed = value.trim()

        if (!trimmed) {
          return ''
        }

        return trimmed.includes(',') && !trimmed.includes('.')
          ? trimmed.replace(',', '.')
          : trimmed
      }

      return ''
    case 'date':
      if (value instanceof Date) {
        return formatLocalDate(value)
      }

      if (typeof value === 'number') {
        return formatSerialDate(value)
      }

      return getCellText(value)
    case 'select':
    case 'string':
    case 'text':
    case 'textarea':
    default:
      return getCellText(value)
  }
}

function readSpreadsheetFile(file: ImportFile): {
  headers: readonly string[]
  rows: readonly unknown[][]
} {
  const filename = file.filename?.trim() || ''
  const extension = filename.toLowerCase().split('.').pop()

  if (!filename || (extension !== 'csv' && extension !== 'xlsx')) {
    throw createError({
      statusCode: 400,
      statusMessage: 'File harus berformat CSV atau XLSX.'
    })
  }

  if (file.data.byteLength === 0 || file.data.byteLength > maxImportFileBytes) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Ukuran file harus lebih dari 0 dan maksimal 5 MB.'
    })
  }

  let workbook: WorkBook

  try {
    workbook = XLSX.read(file.data, { type: 'array', raw: true })
  } catch {
    throw createError({
      statusCode: 400,
      statusMessage: 'File tidak dapat dibaca sebagai CSV atau XLSX yang valid.'
    })
  }

  const firstSheetName = workbook.SheetNames[0]
  const worksheet = firstSheetName ? workbook.Sheets[firstSheetName] : null

  if (!worksheet) {
    throw createError({
      statusCode: 400,
      statusMessage: 'File tidak memiliki worksheet yang dapat diimpor.'
    })
  }

  const sheetRows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    defval: '',
    raw: true,
    blankrows: true
  })

  if (sheetRows.length < 1) {
    throw createError({
      statusCode: 400,
      statusMessage: 'File harus memiliki header kolom.'
    })
  }

  const headers = (sheetRows[0] ?? []).map((header, index) => {
    const value = getCellText(header)

    return index === 0 ? value.replace(/^\uFEFF/, '') : value
  })

  const dataRows = sheetRows.slice(1)

  if (dataRows.length > maxImportRows) {
    throw createError({
      statusCode: 400,
      statusMessage: `File maksimal berisi ${maxImportRows} baris data.`
    })
  }

  return {
    headers,
    rows: dataRows.filter(row => !isEmptyRow(row))
  }
}

function buildSourceRows(
  fields: readonly DatasetSchemaField[],
  layout: {
    recordIdIndex: number
    columnIndexByKey: Map<string, number>
    recognizedColumnIndexes: Set<number>
  },
  dataRows: readonly unknown[][]
) {
  return dataRows.map((row, index): SourceSpreadsheetRow => {
    const recordId = getCellText(row[layout.recordIdIndex])
    const rawData = Object.fromEntries(
      fields.flatMap((field) => {
        const columnIndex = layout.columnIndexByKey.get(field.key) ?? -1

        if (columnIndex < 0) {
          return []
        }

        return [[field.key, getRawValueForField(field, row[columnIndex])]]
      })
    )
    const hasExtraColumns = row.some((cell, columnIndex) => {
      return !layout.recognizedColumnIndexes.has(columnIndex) && isMeaningfulRawValue(cell)
    })
    const meaningful = fields.some((field) => {
      const columnIndex = layout.columnIndexByKey.get(field.key) ?? -1

      return columnIndex >= 0 && isMeaningfulRawValue(rawData[field.key])
    })

    return {
      row,
      rowNumber: index + 2,
      recordId,
      rawData,
      hasExtraColumns,
      meaningful
    }
  })
}

export async function prepareDatasetTableRecordImport(user: ScopedUser, options: {
  readonly datasetId: string
  readonly periodDate: string
  readonly file: ImportFile
}) {
  const normalizedDatasetId = options.datasetId.trim()

  if (!normalizedDatasetId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Dataset wajib dipilih.'
    })
  }

  const context = await getTabularDatasetPermissionContextForUser(user, {
    datasetId: normalizedDatasetId,
    action: 'read'
  })
  const dataset = context.dataset

  if (dataset.archivedAt) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Dataset is archived and read-only.'
    })
  }

  let periodDate: string

  try {
    periodDate = resolveTabularDatasetPeriod(dataset, options.periodDate)
  } catch (error) {
    throw createError({
      statusCode: 400,
      statusMessage: getErrorMessage(error)
    })
  }

  const { headers, rows: rawRows } = readSpreadsheetFile(options.file)
  const fields = getDatasetSchemaFields(dataset.dataSchema)
  const layout = resolveDatasetTablePeriodSpreadsheetHeaders(fields, headers)
  const preparedSourceRows = buildSourceRows(fields, layout, rawRows)

  if (preparedSourceRows.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'File tidak memiliki baris data yang dapat diimpor.'
    })
  }

  const rows: PreparedImportRow[] = preparedSourceRows.map(sourceRow => ({
    rowNumber: sourceRow.rowNumber,
    recordId: sourceRow.recordId,
    data: { ...sourceRow.rawData },
    action: null,
    errors: []
  }))

  const duplicateRecordIds = new Set<string>()
  const seenRecordIds = new Set<string>()

  for (const sourceRow of preparedSourceRows) {
    if (!sourceRow.recordId) {
      continue
    }

    if (seenRecordIds.has(sourceRow.recordId)) {
      duplicateRecordIds.add(sourceRow.recordId)
    }

    seenRecordIds.add(sourceRow.recordId)
  }

  for (let index = 0; index < preparedSourceRows.length; index += 1) {
    const sourceRow = preparedSourceRows[index]
    const row = rows[index]

    if (!row || !sourceRow) {
      continue
    }

    if (sourceRow.hasExtraColumns) {
      row.errors.push('Jumlah kolom pada baris tidak sesuai dengan header.')
      continue
    }

    if (row.recordId && duplicateRecordIds.has(row.recordId)) {
      row.errors.push('recordId duplikat di dalam file.')
      continue
    }

    if (!row.recordId && !sourceRow.meaningful) {
      continue
    }

    const { data, issues } = validateDatasetRecordData(dataset.dataSchema, row.data)

    if (issues.length > 0) {
      row.errors.push(...issues.map(issue => issue.message))
      continue
    }

    row.data = data
    row.action = row.recordId ? null : 'CREATE'
  }

  const rowsToLookup = rows.filter(row => row.errors.length === 0 && !!row.recordId)
  const existingRecords = rowsToLookup.length === 0
    ? []
    : await db.datasetTableRecord.findMany({
        where: {
          datasetId: dataset.id,
          periodDate: new Date(`${periodDate}T00:00:00.000Z`),
          id: { in: Array.from(new Set(rowsToLookup.map(row => row.recordId!))) }
        },
        select: {
          id: true,
          data: true
        }
      })
  const existingById = new Map(existingRecords.map(record => [record.id, record]))

  for (const row of rows) {
    if (row.errors.length > 0 || !row.recordId) {
      continue
    }

    const existing = existingById.get(row.recordId)

    if (!existing) {
      row.errors.push('recordId tidak ditemukan pada Dataset dan periode ini.')
      continue
    }

    row.action = comparableDatasetValue(existing.data) === comparableDatasetValue(row.data)
      ? 'UNCHANGED'
      : 'UPDATE'
  }

  const previewRows = rows.map(row => getPreviewRow(row))

  return {
    datasetId: dataset.id,
    periodDate,
    rows,
    preview: {
      totalRows: previewRows.length,
      validRows: previewRows.filter(row => row.errors.length === 0).length,
      invalidRows: previewRows.filter(row => row.errors.length > 0).length,
      createRows: previewRows.filter(row => row.action === 'CREATE').length,
      updateRows: previewRows.filter(row => row.action === 'UPDATE').length,
      unchangedRows: previewRows.filter(row => row.action === 'UNCHANGED').length,
      rows: previewRows
    }
  }
}

function getPreviewRow(row: PreparedImportRow) {
  return {
    rowNumber: row.rowNumber,
    recordId: row.recordId,
    action: row.action,
    data: row.data,
    errors: row.errors
  }
}

function isDatasetTransactionConflict(error: unknown) {
  return !!error
    && typeof error === 'object'
    && 'code' in error
    && (error.code === 'P2002' || error.code === 'P2034')
}

export async function commitDatasetTableRecordImport(user: ScopedUser, options: {
  readonly datasetId: string
  readonly periodDate: string
  readonly file: ImportFile
}) {
  const prepared = await prepareDatasetTableRecordImport(user, options)

  if (prepared.preview.invalidRows > 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Import memiliki baris tidak valid. Perbaiki file lalu lakukan pratinjau kembali.'
    })
  }

  const rowsToWrite = prepared.rows.filter(row => row.action === 'CREATE' || row.action === 'UPDATE')

  if (rowsToWrite.length === 0) {
    return {
      ...prepared.preview,
      created: 0,
      updated: 0,
      unchanged: prepared.preview.unchangedRows
    }
  }

  const needsCreatePermission = rowsToWrite.some(row => row.action === 'CREATE')
  const needsUpdatePermission = rowsToWrite.some(row => row.action === 'UPDATE')

  try {
    const result = await db.$transaction(async (tx) => {
      if (needsCreatePermission) {
        await getTabularDatasetPermissionContextForUser(user, {
          datasetId: prepared.datasetId,
          action: 'create'
        })
      }

      if (needsUpdatePermission) {
        await getTabularDatasetPermissionContextForUser(user, {
          datasetId: prepared.datasetId,
          action: 'update'
        })
      }

      const updateRecordIds = Array.from(new Set(
        rowsToWrite
          .filter(row => row.action === 'UPDATE')
          .map(row => row.recordId!)
      ))
      const existingRecords = updateRecordIds.length === 0
        ? []
        : await tx.datasetTableRecord.findMany({
            where: {
              datasetId: prepared.datasetId,
              periodDate: new Date(`${prepared.periodDate}T00:00:00.000Z`),
              id: { in: updateRecordIds }
            },
            select: {
              id: true,
              datasetId: true,
              periodDate: true,
              data: true,
              createdBy: true,
              createdAt: true,
              updatedAt: true
            }
          })
      const existingById = new Map(existingRecords.map(record => [record.id, record]))
      let created = 0
      let updated = 0
      let unchanged = 0

      for (const row of rowsToWrite) {
        if (row.action === 'CREATE') {
          const record = await tx.datasetTableRecord.create({
            data: {
              datasetId: prepared.datasetId,
              periodDate: new Date(`${prepared.periodDate}T00:00:00.000Z`),
              data: row.data as never,
              createdBy: user.id,
              updatedBy: user.id
            }
          })

          await tx.auditLog.create({
            data: {
              actorId: user.id,
              action: 'dataset_table_record.create',
              entityType: 'dataset_table_record',
              entityId: record.id,
              metadata: {
                datasetId: record.datasetId,
                periodDate: prepared.periodDate,
                source: 'import'
              }
            }
          })
          created += 1
          continue
        }

        const existing = existingById.get(row.recordId!)

        if (!existing) {
          throw createError({
            statusCode: 400,
            statusMessage: `recordId ${row.recordId} tidak ditemukan pada Dataset dan periode ini.`
          })
        }

        if (
          existing.datasetId !== prepared.datasetId
          || existing.periodDate.toISOString().slice(0, 10) !== prepared.periodDate
        ) {
          throw createError({
            statusCode: 400,
            statusMessage: `recordId ${row.recordId} bukan milik Dataset dan periode ini.`
          })
        }

        if (comparableDatasetValue(existing.data) === comparableDatasetValue(row.data)) {
          unchanged += 1
          continue
        }

        const history = await tx.datasetTableRecordHistory.create({
          data: {
            sourceRecordId: existing.id,
            datasetId: existing.datasetId,
            periodDate: existing.periodDate,
            data: existing.data as never,
            createdBy: existing.createdBy,
            createdAt: existing.createdAt,
            updatedAt: existing.updatedAt,
            changeType: 'UPDATE',
            changedBy: user.id
          }
        })
        const record = await tx.datasetTableRecord.update({
          where: { id: existing.id },
          data: { data: row.data as never, updatedBy: user.id }
        })

        await tx.auditLog.create({
          data: {
            actorId: user.id,
            action: 'dataset_table_record.update',
            entityType: 'dataset_table_record',
            entityId: record.id,
            metadata: {
              datasetId: record.datasetId,
              periodDate: prepared.periodDate,
              changedFields: ['data'],
              historyRecordId: history.id,
              source: 'import'
            }
          }
        })
        updated += 1
      }

      return { created, updated, unchanged }
    }, { isolationLevel: 'Serializable' })

    return {
      ...prepared.preview,
      ...result
    }
  } catch (error) {
    if (isDatasetTransactionConflict(error)) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Data periode berubah oleh pengguna lain. Muat ulang ruang kerja lalu coba lagi.'
      })
    }

    throw error
  }
}
