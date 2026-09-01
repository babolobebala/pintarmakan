import { createError } from 'h3'
import { createRequire } from 'node:module'
import type { WorkBook } from 'xlsx'

import { getDatasetRegionLevel, getDatasetSchemaFields } from '~~/shared/datasets'
import { db } from '#server/utils/db'
import {
  assertDatasetPermissionForUser,
  buildDatasetRecordPayload
} from '#server/utils/dataset-records'

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

type PreparedImportRow = {
  rowNumber: number
  regionId: string
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

function getImportRows(file: ImportFile) {
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

  if (dataRows.length > maxImportRows) {
    throw createError({
      statusCode: 400,
      statusMessage: `File maksimal berisi ${maxImportRows} baris data.`
    })
  }

  const nonEmptyRows = dataRows
    .map((row, index) => ({ row, rowNumber: index + 2 }))
    .filter(({ row }) => !isEmptyRow(row))

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
  const requiredHeaders = ['regionId', 'period', ...fields.map(field => field.key)]
  const missingHeaders = requiredHeaders.filter(header => !headers.includes(header))

  if (missingHeaders.length > 0) {
    throw createError({
      statusCode: 400,
      statusMessage: `Header wajib tidak ditemukan: ${missingHeaders.join(', ')}.`
    })
  }

  const rows: PreparedImportRow[] = sourceRows.map(({ row, rowNumber }) => {
    const values = Object.fromEntries(headers.map((header, index) => [header, getCellText(row[index])]))

    const errors = row.slice(headers.length).some(cell => getCellText(cell))
      ? ['Jumlah kolom pada baris tidak sesuai dengan header.']
      : []

    return {
      rowNumber,
      regionId: values.regionId ?? '',
      periodValue: values.period ?? '',
      status: values.status ?? '',
      data: Object.fromEntries(fields.map(field => [field.key, values[field.key] ?? ''])),
      errors
    }
  })

  const requestedRegionIds = Array.from(new Set(rows.map(row => row.regionId).filter(Boolean)))
  const regions = requestedRegionIds.length > 0
    ? await db.region.findMany({
        where: { id: { in: requestedRegionIds } },
        select: { id: true, level: true }
      })
    : []
  const regionsById = new Map(regions.map(region => [region.id, region]))
  const expectedRegionLevel = getDatasetRegionLevel(dataset.dataConfig)

  for (const row of rows) {
    if (!row.regionId) {
      row.errors.push('regionId wajib diisi.')
    } else {
      const region = regionsById.get(row.regionId)

      if (!region) {
        row.errors.push('Wilayah tidak ditemukan.')
      } else if (expectedRegionLevel && region.level.toUpperCase() !== expectedRegionLevel) {
        row.errors.push(`Wilayah harus memiliki level ${expectedRegionLevel}.`)
      }
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
