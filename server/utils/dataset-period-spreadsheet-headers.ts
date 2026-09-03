import { createError } from 'h3'

import type { DatasetSchemaField } from '~~/shared/datasets'

const reservedSpreadsheetHeaders = [
  'regionId',
  'Kabupaten',
  'Kecamatan',
  'Desa/Kelurahan'
] as const

function getFieldLabels(fields: readonly DatasetSchemaField[]) {
  const labels = fields.map(field => field.label.trim())
  const duplicateLabel = labels.find((label, index) => labels.indexOf(label) !== index)

  if (duplicateLabel) {
    throw createError({
      statusCode: 400,
      statusMessage: `Konfigurasi Dataset tidak valid: label field spreadsheet duplikat (${duplicateLabel}).`
    })
  }

  const reservedLabel = labels.find(label => reservedSpreadsheetHeaders.includes(label as typeof reservedSpreadsheetHeaders[number]))

  if (reservedLabel) {
    throw createError({
      statusCode: 400,
      statusMessage: `Konfigurasi Dataset tidak valid: label field spreadsheet tidak boleh menggunakan header identitas (${reservedLabel}).`
    })
  }

  return labels
}

export function getDatasetPeriodSpreadsheetFieldLabels(fields: readonly DatasetSchemaField[]) {
  return getFieldLabels(fields)
}

export function resolveDatasetPeriodSpreadsheetFieldHeaders(fields: readonly DatasetSchemaField[], headers: readonly string[]) {
  getFieldLabels(fields)

  return new Map(fields.map((field) => {
    const hasLabel = headers.includes(field.label)
    const hasKey = headers.includes(field.key)

    if (field.label !== field.key && hasLabel && hasKey) {
      throw createError({
        statusCode: 400,
        statusMessage: `Header label dan key untuk field ${field.label} tidak boleh digunakan bersamaan.`
      })
    }

    if (hasLabel) {
      return [field.key, field.label]
    }

    if (hasKey) {
      return [field.key, field.key]
    }

    throw createError({
      statusCode: 400,
      statusMessage: `Header wajib tidak ditemukan: ${field.label}.`
    })
  }))
}
