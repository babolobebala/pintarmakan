import { createError } from 'h3'

import type { DatasetSchemaField } from '~~/shared/datasets'

const reservedSpreadsheetHeader = 'recordId'

function getFieldLabels(fields: readonly DatasetSchemaField[]) {
  const labels = fields.map(field => field.label.trim())
  const duplicateLabel = labels.find((label, index) => labels.indexOf(label) !== index)

  if (duplicateLabel) {
    throw createError({
      statusCode: 400,
      statusMessage: `Konfigurasi Dataset tidak valid: label field spreadsheet duplikat (${duplicateLabel}).`
    })
  }

  const reservedLabel = labels.find(label => label === reservedSpreadsheetHeader)

  if (reservedLabel) {
    throw createError({
      statusCode: 400,
      statusMessage: `Konfigurasi Dataset tidak valid: label field spreadsheet tidak boleh menggunakan header teknis "${reservedSpreadsheetHeader}".`
    })
  }

  return labels
}

export function getDatasetTablePeriodSpreadsheetFieldLabels(fields: readonly DatasetSchemaField[]) {
  return getFieldLabels(fields)
}

export function resolveDatasetTablePeriodSpreadsheetHeaders(
  fields: readonly DatasetSchemaField[],
  headers: readonly string[]
) {
  const labels = getFieldLabels(fields)
  const recognizedHeaders = [reservedSpreadsheetHeader, ...labels]
  const nonBlankHeaders = headers.filter(header => header !== '')

  for (const [index, header] of nonBlankHeaders.entries()) {
    if (nonBlankHeaders.indexOf(header) !== index) {
      throw createError({
        statusCode: 400,
        statusMessage: `Header kolom tidak boleh duplikat (${header}).`
      })
    }
  }

  const unknownHeader = nonBlankHeaders.find(header => !recognizedHeaders.includes(header))

  if (unknownHeader) {
    throw createError({
      statusCode: 400,
      statusMessage: `Header kolom tidak dikenal: ${unknownHeader}.`
    })
  }

  const missingHeaders = labels.filter(label => !headers.includes(label))

  if (missingHeaders.length > 0) {
    throw createError({
      statusCode: 400,
      statusMessage: `Header wajib tidak ditemukan: ${missingHeaders.join(', ')}.`
    })
  }

  const recordIdIndex = headers.findIndex(header => header === reservedSpreadsheetHeader)

  if (recordIdIndex === -1) {
    throw createError({
      statusCode: 400,
      statusMessage: `Header wajib tidak ditemukan: ${reservedSpreadsheetHeader}.`
    })
  }

  const columnIndexByKey = new Map<string, number>()
  const recognizedColumnIndexes = new Set<number>([recordIdIndex])

  for (const field of fields) {
    const labelIndex = headers.findIndex(header => header === field.label)

    columnIndexByKey.set(field.key, labelIndex)
    recognizedColumnIndexes.add(labelIndex)
  }

  return {
    recordIdIndex,
    columnIndexByKey,
    recognizedColumnIndexes
  }
}
