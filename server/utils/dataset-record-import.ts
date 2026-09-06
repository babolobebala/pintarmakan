import { createError } from 'h3'
import { createRequire } from 'node:module'
import type { WorkBook } from 'xlsx'

import {
  getDatasetPeriodicity,
  getDatasetRecordPeriodRangeError,
  getDatasetSchemaFields,
  validateCanonicalDatasetPeriodDate
} from '~~/shared/datasets'
import { db } from '#server/utils/db'
import {
  assertDatasetPermissionForUser,
  buildDatasetRecordPayload,
  buildDatasetRecordPayloadFromCanonicalPeriodDate,
  commitDatasetPeriodRows
} from '#server/utils/dataset-records'
import {
  getDatasetPeriodSpreadsheetIdentityHeaders,
  resolveDatasetPeriodSpreadsheetRegions,
  type DatasetSpreadsheetRegionContext
} from '#server/utils/dataset-period-spreadsheet-regions'
import { resolveDatasetPeriodSpreadsheetFieldHeaders } from '#server/utils/dataset-period-spreadsheet-headers'
import {
  resolveDatasetImportWorkbookSheets,
  resolveDatasetPeriodImportWorksheet
} from '#server/utils/dataset-period-import-workbook'

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

type ImportAction = 'CREATE' | 'UPDATE' | 'UNCHANGED' | 'SKIPPED'

type PreparedImportRow = {
  rowNumber: number
  regionId: string
  regionName: string
  regionContext: DatasetSpreadsheetRegionContext
  periodValue: string
  status: string
  data: Record<string, unknown>
  periodDate?: string
  action?: ImportAction
  errors: string[]
}

const maxImportFileBytes = 5 * 1024 * 1024
const maxImportRows = 500
const identitySeparator = '\u0000'

function getErrorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'statusMessage' in error) {
    const statusMessage = error.statusMessage

    if (typeof statusMessage === 'string' && statusMessage.trim()) {
      return statusMessage
    }
  }

  return error instanceof Error ? error.message : 'Baris tidak valid.'
}

function getCellText(value: unknown) {
  return value === null || value === undefined ? '' : String(value).trim()
}

function isEmptyRow(row: readonly unknown[]) {
  return row.every(cell => !getCellText(cell))
}

function getImportRows(file: ImportFile, options?: {
  readonly dataConfig: unknown
  readonly expectedPeriodDate: string
}) {
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
    workbook = XLSX.read(file.data, { type: 'array', raw: false })
  } catch {
    throw createError({
      statusCode: 400,
      statusMessage: 'File tidak dapat dibaca sebagai CSV atau XLSX yang valid.'
    })
  }

  const sheetName = extension === 'xlsx' && options
    ? resolveDatasetPeriodImportWorksheet(
      options.dataConfig,
      workbook,
      options.expectedPeriodDate
    ).sheetName
    : workbook.SheetNames[0]
  const worksheet = sheetName ? workbook.Sheets[sheetName] : null

  if (!worksheet) {
    throw createError({
      statusCode: 400,
      statusMessage: 'File tidak memiliki worksheet yang dapat diimpor.'
    })
  }

  const sheetRows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    defval: '',
    raw: false,
    blankrows: true
  })

  if (sheetRows.length < 2) {
    throw createError({
      statusCode: 400,
      statusMessage: 'File harus memiliki header dan setidaknya satu baris data.'
    })
  }

  const headers = (sheetRows[0] ?? []).map((header, index) => {
    const value = getCellText(header)

    return index === 0 ? value.replace(/^\uFEFF/, '') : value
  })

  if (headers.some((header, index) => header && headers.indexOf(header) !== index)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Header kolom tidak boleh duplikat.'
    })
  }

  const dataRows = sheetRows.slice(1)

  const nonEmptyRows = dataRows
    .map((row, index) => ({ row, rowNumber: index + 2 }))
    .filter(({ row }) => !isEmptyRow(row))

  if (nonEmptyRows.length > maxImportRows) {
    throw createError({
      statusCode: 400,
      statusMessage: `File maksimal berisi ${maxImportRows} baris data.`
    })
  }

  if (nonEmptyRows.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'File tidak memiliki baris data yang dapat diimpor.'
    })
  }

  return {
    headers,
    rows: nonEmptyRows
  }
}

function makeIdentity(regionId: string, periodDate: string) {
  return `${regionId}${identitySeparator}${periodDate}`
}

function comparableValue(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(comparableValue).join(',')}]`
  }

  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${comparableValue(item)}`)
      .join(',')}}`
  }

  return JSON.stringify(value)
}

function getPreviewRow(row: PreparedImportRow) {
  return {
    rowNumber: row.rowNumber,
    regionId: row.regionId,
    regionName: row.regionName,
    periodValue: row.periodValue,
    periodDate: row.periodDate ?? null,
    status: row.status,
    data: row.data,
    action: row.action ?? null,
    errors: row.errors
  }
}

export async function prepareDatasetRecordImport(user: ScopedUser, datasetId: string, file: ImportFile) {
  const normalizedDatasetId = datasetId.trim()

  if (!normalizedDatasetId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Dataset wajib dipilih.'
    })
  }

  const createContext = await assertDatasetPermissionForUser(user, {
    datasetId: normalizedDatasetId,
    action: 'create'
  })
  await assertDatasetPermissionForUser(user, {
    datasetId: normalizedDatasetId,
    action: 'update'
  })

  const dataset = createContext.dataset
  const { headers, rows: sourceRows } = getImportRows(file)
  const fields = getDatasetSchemaFields(dataset.dataSchema)
  const identityHeaders = getDatasetPeriodSpreadsheetIdentityHeaders(dataset.regionLevel)
  const requiredHeaders = [...identityHeaders, 'period']
  const missingHeaders = requiredHeaders.filter(header => !headers.includes(header))

  if (missingHeaders.length > 0) {
    throw createError({
      statusCode: 400,
      statusMessage: `Header wajib tidak ditemukan: ${missingHeaders.join(', ')}.`
    })
  }

  if (headers.includes('regionId')) {
    throw createError({ statusCode: 400, statusMessage: 'Header kolom tidak dikenal: regionId.' })
  }

  const allowedHeaders = new Set([
    ...identityHeaders,
    'period',
    'status',
    ...fields.flatMap(field => [field.key, field.label])
  ])
  const unsupportedHeader = headers.find(header => header && !allowedHeaders.has(header))

  if (unsupportedHeader) {
    throw createError({
      statusCode: 400,
      statusMessage: `Header kolom tidak dikenal: ${unsupportedHeader}.`
    })
  }

  const fieldHeaders = resolveDatasetPeriodSpreadsheetFieldHeaders(fields, headers)

  const rows: PreparedImportRow[] = sourceRows.map(({ row, rowNumber }) => {
    const values = Object.fromEntries(headers.map((header, index) => [header, getCellText(row[index])]))

    const errors = row.slice(headers.length).some(cell => getCellText(cell))
      ? ['Jumlah kolom pada baris tidak sesuai dengan header.']
      : []

    return {
      rowNumber,
      regionId: '',
      regionName: '',
      regionContext: {
        kabupaten: values.Kabupaten ?? '',
        kecamatan: values.Kecamatan ?? '',
        desa: values['Desa/Kelurahan'] ?? ''
      },
      periodValue: values.period ?? '',
      status: values.status ?? '',
      data: Object.fromEntries(fields.map(field => [
        field.key,
        values[fieldHeaders.get(field.key) ?? ''] ?? ''
      ])),
      errors
    }
  })

  const resolutions = await resolveDatasetPeriodSpreadsheetRegions(
    dataset.regionLevel,
    rows.map(row => row.regionContext)
  )

  for (const [index, row] of rows.entries()) {
    const resolution = resolutions[index]

    row.regionId = resolution?.regionId ?? ''
    row.regionName = resolution?.regionName ?? ''

    if (resolution?.error) {
      row.errors.push(resolution.error)
    }

    try {
      const payload = buildDatasetRecordPayload(dataset, {
        periodValue: row.periodValue,
        status: row.status,
        data: row.data
      })

      row.periodDate = payload.periodDate
      row.status = payload.status
      row.data = payload.data
    } catch (error) {
      row.errors.push(getErrorMessage(error))
    }
  }

  const rowsByIdentity = new Map<string, PreparedImportRow[]>()

  for (const row of rows) {
    if (row.errors.length > 0 || !row.periodDate) {
      continue
    }

    const identity = makeIdentity(row.regionId, row.periodDate)
    const matchingRows = rowsByIdentity.get(identity) ?? []
    matchingRows.push(row)
    rowsByIdentity.set(identity, matchingRows)
  }

  for (const matchingRows of rowsByIdentity.values()) {
    if (matchingRows.length > 1) {
      for (const row of matchingRows) {
        row.errors.push('Duplikat kombinasi wilayah dan periode di dalam file.')
      }
    }
  }

  const validRows = rows.filter(row => row.errors.length === 0 && !!row.periodDate)
  const existingRecords = validRows.length === 0
    ? []
    : await db.datasetRecord.findMany({
        where: {
          datasetId: normalizedDatasetId,
          OR: validRows.map(row => ({
            regionId: row.regionId,
            periodDate: new Date(`${row.periodDate}T00:00:00.000Z`)
          }))
        },
        select: {
          id: true,
          regionId: true,
          periodDate: true,
          data: true,
          status: true,
          createdBy: true,
          createdAt: true,
          updatedAt: true
        }
      })
  const existingByIdentity = new Map(
    existingRecords.map(record => [
      makeIdentity(record.regionId, record.periodDate.toISOString().slice(0, 10)),
      record
    ])
  )

  for (const row of validRows) {
    const existing = existingByIdentity.get(makeIdentity(row.regionId, row.periodDate!))

    row.action = !existing
      ? 'CREATE'
      : existing.status === row.status && comparableValue(existing.data) === comparableValue(row.data)
        ? 'UNCHANGED'
        : 'UPDATE'
  }

  const previewRows = rows.map(getPreviewRow)

  return {
    datasetId: normalizedDatasetId,
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

export async function commitDatasetRecordImport(user: ScopedUser, datasetId: string, file: ImportFile) {
  const prepared = await prepareDatasetRecordImport(user, datasetId, file)

  if (prepared.preview.invalidRows > 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Import memiliki baris tidak valid. Perbaiki file lalu lakukan pratinjau kembali.'
    })
  }

  const rowsToWrite = prepared.rows.filter(row => row.errors.length === 0 && !!row.periodDate)

  if (rowsToWrite.length === 0) {
    return {
      ...prepared.preview,
      created: 0,
      updated: 0,
      unchanged: prepared.preview.unchangedRows
    }
  }

  const result = await db.$transaction(async (tx) => {
    const existingRecords = await tx.datasetRecord.findMany({
      where: {
        datasetId: prepared.datasetId,
        OR: rowsToWrite.map(row => ({
          regionId: row.regionId,
          periodDate: new Date(`${row.periodDate}T00:00:00.000Z`)
        }))
      },
      select: {
        id: true,
        regionId: true,
        periodDate: true,
        data: true,
        status: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true
      }
    })
    const existingByIdentity = new Map(
      existingRecords.map(record => [
        makeIdentity(record.regionId, record.periodDate.toISOString().slice(0, 10)),
        record
      ])
    )
    let created = 0
    let updated = 0
    let unchanged = 0

    for (const row of rowsToWrite) {
      const existing = existingByIdentity.get(makeIdentity(row.regionId, row.periodDate!))

      if (!existing) {
        const record = await tx.datasetRecord.create({
          data: {
            datasetId: prepared.datasetId,
            regionId: row.regionId,
            periodDate: new Date(`${row.periodDate}T00:00:00.000Z`),
            status: row.status,
            data: row.data as never,
            createdBy: user.id,
            updatedBy: user.id
          }
        })

        await tx.auditLog.create({
          data: {
            actorId: user.id,
            action: 'dataset_record.create',
            entityType: 'dataset_record',
            entityId: record.id,
            metadata: {
              datasetId: record.datasetId,
              regionId: record.regionId,
              periodDate: row.periodDate,
              status: record.status,
              source: 'import'
            }
          }
        })
        created += 1
        continue
      }

      if (existing.status === row.status && comparableValue(existing.data) === comparableValue(row.data)) {
        unchanged += 1
        continue
      }

      const changedFields = [
        ...(existing.status === row.status ? [] : ['status']),
        ...(comparableValue(existing.data) === comparableValue(row.data) ? [] : ['data'])
      ]
      const history = await tx.datasetRecordHistory.create({
        data: {
          sourceRecordId: existing.id,
          datasetId: prepared.datasetId,
          regionId: existing.regionId,
          periodDate: existing.periodDate,
          data: existing.data as never,
          status: existing.status,
          createdBy: existing.createdBy,
          createdAt: existing.createdAt,
          updatedAt: existing.updatedAt,
          changeType: 'UPDATE',
          changedBy: user.id
        }
      })
      const record = await tx.datasetRecord.update({
        where: { id: existing.id },
        data: {
          status: row.status,
          data: row.data as never,
          updatedBy: user.id
        }
      })

      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: 'dataset_record.update',
          entityType: 'dataset_record',
          entityId: record.id,
          metadata: {
            datasetId: record.datasetId,
            regionId: record.regionId,
            periodDate: row.periodDate,
            changedFields,
            historyRecordId: history.id,
            source: 'import'
          }
        }
      })
      updated += 1
    }

    return { created, updated, unchanged }
  })

  return {
    ...prepared.preview,
    ...result
  }
}

type PreparedPeriodImportRow = {
  rowNumber: number
  regionId: string
  regionName: string
  regionContext: DatasetSpreadsheetRegionContext
  data: Record<string, unknown>
  meaningful: boolean
  action: ImportAction | null
  errors: string[]
}

function getPeriodPreviewRow(row: PreparedPeriodImportRow, periodDate: string) {
  return {
    rowNumber: row.rowNumber,
    regionId: row.regionId,
    regionName: row.regionName,
    periodValue: periodDate,
    periodDate,
    status: 'draft',
    data: row.data,
    action: row.action,
    errors: row.errors
  }
}

export async function prepareDatasetPeriodRecordImport(user: ScopedUser, options: {
  readonly datasetId: string
  readonly periodDate: string
  readonly file: ImportFile
}) {
  const datasetContext = await assertDatasetPermissionForUser(user, {
    datasetId: options.datasetId.trim(),
    action: 'read'
  })
  const dataset = datasetContext.dataset

  if (dataset.archivedAt) {
    throw createError({ statusCode: 409, statusMessage: 'Dataset is archived and read-only.' })
  }

  let periodDate: string

  try {
    periodDate = validateCanonicalDatasetPeriodDate(getDatasetPeriodicity(dataset.dataConfig), options.periodDate)
  } catch (error) {
    throw createError({ statusCode: 400, statusMessage: getErrorMessage(error) })
  }

  const periodRangeError = getDatasetRecordPeriodRangeError(dataset.dataConfig, periodDate)

  if (periodRangeError) {
    throw createError({ statusCode: 400, statusMessage: periodRangeError })
  }
  let spreadsheet: ReturnType<typeof getImportRows>

  try {
    spreadsheet = getImportRows(options.file, {
      dataConfig: dataset.dataConfig,
      expectedPeriodDate: periodDate
    })
  } catch (error) {
    throw createError({ statusCode: 400, statusMessage: getErrorMessage(error) })
  }

  const { headers, rows: sourceRows } = spreadsheet
  const fields = getDatasetSchemaFields(dataset.dataSchema)
  const identityHeaders = getDatasetPeriodSpreadsheetIdentityHeaders(dataset.regionLevel)
  const missingHeaders = identityHeaders.filter(header => !headers.includes(header))

  if (missingHeaders.length > 0) {
    throw createError({ statusCode: 400, statusMessage: `Header wajib tidak ditemukan: ${missingHeaders.join(', ')}.` })
  }

  if (headers.includes('regionId')) {
    throw createError({ statusCode: 400, statusMessage: 'Header kolom tidak dikenal: regionId.' })
  }

  const allowedHeaders = new Set([
    ...identityHeaders,
    ...fields.flatMap(field => [field.key, field.label])
  ])
  const unsupportedHeader = headers.find(header => header && !allowedHeaders.has(header))

  if (unsupportedHeader) {
    throw createError({ statusCode: 400, statusMessage: `Header kolom tidak dikenal: ${unsupportedHeader}.` })
  }

  const fieldHeaders = resolveDatasetPeriodSpreadsheetFieldHeaders(fields, headers)

  const rows: PreparedPeriodImportRow[] = sourceRows.map(({ row, rowNumber }) => {
    const values = Object.fromEntries(headers.map((header, index) => [header, getCellText(row[index])]))
    const data = Object.fromEntries(fields.map(field => [field.key, values[fieldHeaders.get(field.key) ?? ''] ?? '']))

    return {
      rowNumber,
      regionId: '',
      regionName: '',
      regionContext: {
        kabupaten: values.Kabupaten ?? '',
        kecamatan: values.Kecamatan ?? '',
        desa: values['Desa/Kelurahan'] ?? ''
      },
      data,
      meaningful: fields.some(field => getCellText(values[fieldHeaders.get(field.key) ?? '']) !== ''),
      action: null,
      errors: row.slice(headers.length).some(cell => getCellText(cell))
        ? ['Jumlah kolom pada baris tidak sesuai dengan header.']
        : []
    }
  })
  const resolutions = await resolveDatasetPeriodSpreadsheetRegions(
    dataset.regionLevel,
    rows.map(row => row.regionContext)
  )
  const duplicateRegionIds = new Set<string>()
  const seenRegionIds = new Set<string>()

  for (const [index, row] of rows.entries()) {
    const resolution = resolutions[index]

    row.regionId = resolution?.regionId ?? ''
    row.regionName = resolution?.regionName ?? ''

    if (resolution?.error) {
      row.errors.push(resolution.error)
      continue
    }

    if (row.regionId && seenRegionIds.has(row.regionId)) {
      duplicateRegionIds.add(row.regionId)
    }

    if (row.regionId) {
      seenRegionIds.add(row.regionId)
    }
  }

  for (const row of rows) {
    if (row.errors.length > 0) {
      continue
    }

    if (duplicateRegionIds.has(row.regionId)) {
      row.errors.push('Wilayah duplikat di dalam file.')
      continue
    }

    if (!row.meaningful) {
      row.action = 'SKIPPED'
      continue
    }

    try {
      const payload = buildDatasetRecordPayloadFromCanonicalPeriodDate(dataset, {
        periodDate,
        status: 'draft',
        data: row.data
      })
      row.data = payload.data
    } catch (error) {
      row.errors.push(getErrorMessage(error))
    }
  }

  const rowsForLookup = rows.filter(row => row.errors.length === 0 && row.meaningful)
  const existingRecords = rowsForLookup.length === 0
    ? []
    : await db.datasetRecord.findMany({
        where: {
          datasetId: dataset.id,
          regionId: { in: rowsForLookup.map(row => row.regionId) },
          periodDate: new Date(`${periodDate}T00:00:00.000Z`)
        },
        select: { regionId: true, data: true }
      })
  const existingByRegionId = new Map(existingRecords.map(record => [record.regionId, record]))

  for (const row of rowsForLookup) {
    const existing = existingByRegionId.get(row.regionId)

    row.action = !existing
      ? 'CREATE'
      : comparableValue(existing.data) === comparableValue(row.data)
        ? 'UNCHANGED'
        : 'UPDATE'
  }

  const previewRows = rows.map(row => getPeriodPreviewRow(row, periodDate))

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
      skippedRows: previewRows.filter(row => row.action === 'SKIPPED').length,
      rows: previewRows
    }
  }
}

export async function commitDatasetPeriodRecordImport(user: ScopedUser, options: {
  readonly datasetId: string
  readonly periodDate: string
  readonly file: ImportFile
}) {
  const prepared = await prepareDatasetPeriodRecordImport(user, options)

  if (prepared.preview.invalidRows > 0) {
    throw createError({ statusCode: 400, statusMessage: 'Import memiliki baris tidak valid. Perbaiki file lalu lakukan pratinjau kembali.' })
  }

  const rowsToWrite = prepared.rows
    .filter(row => row.meaningful && row.errors.length === 0)
    .map(row => ({ regionId: row.regionId, data: row.data }))

  if (rowsToWrite.length === 0) {
    return { ...prepared.preview, created: 0, updated: 0, unchanged: 0 }
  }

  const result = await commitDatasetPeriodRows(user, {
    datasetId: prepared.datasetId,
    periodDate: prepared.periodDate,
    rows: rowsToWrite,
    source: 'period_import'
  })

  return { ...prepared.preview, ...result }
}

function readDatasetWorkbookImport(file: ImportFile): WorkBook {
  const filename = file.filename?.trim() || ''

  if (!filename.toLowerCase().endsWith('.xlsx')) {
    throw createError({ statusCode: 400, statusMessage: 'Import banyak periode hanya mendukung file XLSX.' })
  }

  if (file.data.byteLength === 0 || file.data.byteLength > maxImportFileBytes) {
    throw createError({ statusCode: 400, statusMessage: 'Ukuran file harus lebih dari 0 dan maksimal 5 MB.' })
  }

  try {
    return XLSX.read(file.data, { type: 'array', raw: false })
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'File tidak dapat dibaca sebagai XLSX yang valid.' })
  }
}

function createDatasetWorkbookSheetFile(workbook: WorkBook, sheetName: string, filename: string): ImportFile {
  const worksheet = workbook.Sheets[sheetName]

  if (!worksheet) {
    throw createError({ statusCode: 400, statusMessage: `Worksheet ${sheetName} tidak ditemukan.` })
  }

  const periodWorkbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(periodWorkbook, worksheet, sheetName)

  return {
    filename,
    data: XLSX.write(periodWorkbook, { bookType: 'xlsx', type: 'buffer' }) as Buffer
  }
}

function countDatasetWorkbookSheetRows(workbook: WorkBook, sheetName: string) {
  const worksheet = workbook.Sheets[sheetName]

  if (!worksheet) {
    return 0
  }

  const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    defval: '',
    raw: false,
    blankrows: true
  })

  return rows.slice(1).filter(row => !isEmptyRow(row)).length
}

export async function prepareDatasetWorkbookRecordImport(user: ScopedUser, options: {
  readonly datasetId: string
  readonly file: ImportFile
}) {
  const datasetContext = await assertDatasetPermissionForUser(user, {
    datasetId: options.datasetId.trim(),
    action: 'read'
  })
  const dataset = datasetContext.dataset

  if (dataset.archivedAt) {
    throw createError({ statusCode: 409, statusMessage: 'Dataset is archived and read-only.' })
  }

  const workbook = readDatasetWorkbookImport(options.file)
  let resolvedSheets: ReturnType<typeof resolveDatasetImportWorkbookSheets>

  try {
    resolvedSheets = resolveDatasetImportWorkbookSheets(dataset.dataConfig, workbook)
  } catch (error) {
    throw createError({ statusCode: 400, statusMessage: getErrorMessage(error) })
  }

  const oversizedSheet = resolvedSheets.find(
    sheet => countDatasetWorkbookSheetRows(workbook, sheet.sheetName) > maxImportRows
  )

  if (oversizedSheet) {
    throw createError({
      statusCode: 400,
      statusMessage: `Worksheet ${oversizedSheet.sheetName} maksimal berisi ${maxImportRows} baris data.`
    })
  }

  const filename = options.file.filename?.trim() || 'dataset.xlsx'
  const sheets = [] as Array<{
    sheetName: string
    periodDate: string
    prepared: Awaited<ReturnType<typeof prepareDatasetPeriodRecordImport>>
  }>

  for (const sheet of resolvedSheets) {
    const prepared = await prepareDatasetPeriodRecordImport(user, {
      datasetId: dataset.id,
      periodDate: sheet.periodDate,
      file: createDatasetWorkbookSheetFile(workbook, sheet.sheetName, filename)
    })
    sheets.push({ ...sheet, prepared })
  }

  const previews = sheets.map(sheet => ({
    sheetName: sheet.sheetName,
    periodDate: sheet.periodDate,
    ...sheet.prepared.preview
  }))

  return {
    datasetId: dataset.id,
    sheets,
    preview: {
      totalRows: previews.reduce((total, preview) => total + preview.totalRows, 0),
      validRows: previews.reduce((total, preview) => total + preview.validRows, 0),
      invalidRows: previews.reduce((total, preview) => total + preview.invalidRows, 0),
      createRows: previews.reduce((total, preview) => total + preview.createRows, 0),
      updateRows: previews.reduce((total, preview) => total + preview.updateRows, 0),
      unchangedRows: previews.reduce((total, preview) => total + preview.unchangedRows, 0),
      skippedRows: previews.reduce((total, preview) => total + (preview.skippedRows ?? 0), 0),
      sheets: previews
    }
  }
}

export async function commitDatasetWorkbookRecordImport(user: ScopedUser, options: {
  readonly datasetId: string
  readonly file: ImportFile
}) {
  const prepared = await prepareDatasetWorkbookRecordImport(user, options)

  if (prepared.preview.invalidRows > 0) {
    throw createError({ statusCode: 400, statusMessage: 'Import memiliki baris tidak valid. Perbaiki file lalu lakukan pratinjau kembali.' })
  }

  try {
    const results = await db.$transaction(async (transaction) => {
      const committedSheets = [] as Array<{ sheetName: string, periodDate: string, created: number, updated: number, unchanged: number }>

      for (const sheet of prepared.sheets) {
        const rows = sheet.prepared.rows
          .filter(row => row.meaningful && row.errors.length === 0)
          .map(row => ({ regionId: row.regionId, data: row.data }))
        const result = rows.length === 0
          ? { created: 0, updated: 0, unchanged: 0 }
          : await commitDatasetPeriodRows(user, {
              datasetId: prepared.datasetId,
              periodDate: sheet.periodDate,
              rows,
              source: 'dataset_import',
              transaction
            })

        committedSheets.push({ ...sheet, ...result })
      }

      return committedSheets
    }, { isolationLevel: 'Serializable' })

    return {
      ...prepared.preview,
      created: results.reduce((total, result) => total + result.created, 0),
      updated: results.reduce((total, result) => total + result.updated, 0),
      unchanged: results.reduce((total, result) => total + result.unchanged, 0)
    }
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && (error.code === 'P2002' || error.code === 'P2034')) {
      throw createError({ statusCode: 409, statusMessage: 'Data Dataset berubah oleh pengguna lain. Muat ulang lalu coba lagi.' })
    }

    throw error
  }
}
