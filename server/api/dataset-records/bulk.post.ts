import { createError, readBody } from 'h3'
import { z } from 'zod'

import { appPermissions } from '~~/auth/permissions'
import {
  assertDatasetPermissionForUser,
  buildDatasetRecordPayload
} from '#server/utils/dataset-records'
import { db } from '#server/utils/db'
import { getSumbawaBaratRegionScopeWhere } from '#server/utils/region-scope'
import {
  getDatasetPeriodicity,
  getDatasetRecordPeriodRangeError,
  normalizeDatasetPeriodInput
} from '~~/shared/datasets'
import { requirePermission } from '~~/server/utils/access'

const bulkDatasetRecordSchema = z.object({
  datasetId: z.string().trim().min(1).max(191),
  periodDate: z.string().trim().min(1),
  rows: z.array(z.object({
    regionId: z.string().trim().min(1).max(191),
    intent: z.literal(true),
    data: z.unknown()
  })).min(1).max(500)
})

type PreparedBulkRow = {
  readonly regionId: string
  readonly data: Record<string, unknown>
}

function getErrorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'statusMessage' in error && typeof error.statusMessage === 'string') {
    return error.statusMessage
  }

  return error instanceof Error ? error.message : 'Data tidak valid.'
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

function isTransactionConflict(error: unknown) {
  return !!error
    && typeof error === 'object'
    && 'code' in error
    && (error.code === 'P2002' || error.code === 'P2034')
}

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, appPermissions.businessDataRead)
  const body = bulkDatasetRecordSchema.parse(await readBody(event))
  const datasetContext = await assertDatasetPermissionForUser(session.user, {
    datasetId: body.datasetId,
    action: 'read'
  })
  const dataset = datasetContext.dataset

  if (dataset.archivedAt) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Dataset is archived and read-only.'
    })
  }

  const periodicity = getDatasetPeriodicity(dataset.dataConfig)
  const periodDate = normalizeDatasetPeriodInput(periodicity, body.periodDate)
  const periodRangeError = getDatasetRecordPeriodRangeError(dataset.dataConfig, periodDate)

  if (periodRangeError) {
    throw createError({ statusCode: 400, statusMessage: periodRangeError })
  }

  const regionIds = Array.from(new Set(body.rows.map(row => row.regionId)))
  const regions = await db.region.findMany({
    where: {
      AND: [
        getSumbawaBaratRegionScopeWhere(dataset.regionLevel),
        { id: { in: regionIds } }
      ]
    },
    select: { id: true, name: true }
  })
  const regionsById = new Map(regions.map(region => [region.id, region]))
  const duplicateRegionIds = new Set<string>()
  const seenRegionIds = new Set<string>()

  for (const row of body.rows) {
    if (seenRegionIds.has(row.regionId)) {
      duplicateRegionIds.add(row.regionId)
    }

    seenRegionIds.add(row.regionId)
  }

  const rowErrors: Array<{ regionId: string, regionName: string, message: string }> = []
  const preparedRows: PreparedBulkRow[] = []

  for (const row of body.rows) {
    const region = regionsById.get(row.regionId)

    if (duplicateRegionIds.has(row.regionId)) {
      rowErrors.push({
        regionId: row.regionId,
        regionName: region?.name ?? row.regionId,
        message: 'Wilayah dikirim lebih dari sekali.'
      })
      continue
    }

    if (!region) {
      rowErrors.push({
        regionId: row.regionId,
        regionName: row.regionId,
        message: 'Wilayah berada di luar cakupan Kabupaten Sumbawa Barat.'
      })
      continue
    }

    try {
      const payload = buildDatasetRecordPayload(dataset, {
        periodValue: periodDate,
        status: 'draft',
        data: row.data
      })

      preparedRows.push({
        regionId: row.regionId,
        data: payload.data
      })
    } catch (error) {
      rowErrors.push({
        regionId: row.regionId,
        regionName: region.name,
        message: getErrorMessage(error)
      })
    }
  }

  if (rowErrors.length > 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Sebagian baris tidak valid.',
      data: { rowErrors }
    })
  }

  try {
    return await db.$transaction(async (tx) => {
      const existingRecords = await tx.datasetRecord.findMany({
        where: {
          datasetId: dataset.id,
          regionId: { in: preparedRows.map(row => row.regionId) },
          periodDate: new Date(`${periodDate}T00:00:00.000Z`)
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
      const existingByRegionId = new Map(existingRecords.map(record => [record.regionId, record]))
      const rowsToCreate = preparedRows.filter(row => !existingByRegionId.has(row.regionId))
      const rowsToUpdate = preparedRows.filter((row) => {
        const existing = existingByRegionId.get(row.regionId)

        return !!existing && comparableValue(existing.data) !== comparableValue(row.data)
      })

      if (rowsToCreate.length > 0) {
        await assertDatasetPermissionForUser(session.user, { datasetId: dataset.id, action: 'create' })
      }

      if (rowsToUpdate.length > 0) {
        await assertDatasetPermissionForUser(session.user, { datasetId: dataset.id, action: 'update' })
      }

      let created = 0
      let updated = 0
      let unchanged = 0

      for (const row of preparedRows) {
        const existing = existingByRegionId.get(row.regionId)

        if (!existing) {
          const record = await tx.datasetRecord.create({
            data: {
              datasetId: dataset.id,
              regionId: row.regionId,
              periodDate: new Date(`${periodDate}T00:00:00.000Z`),
              status: 'draft',
              data: row.data as never,
              createdBy: session.user.id,
              updatedBy: session.user.id
            }
          })

          await tx.auditLog.create({
            data: {
              actorId: session.user.id,
              action: 'dataset_record.create',
              entityType: 'dataset_record',
              entityId: record.id,
              metadata: {
                datasetId: record.datasetId,
                regionId: record.regionId,
                periodDate,
                status: record.status,
                source: 'bulk_entry'
              }
            }
          })
          created += 1
          continue
        }

        if (comparableValue(existing.data) === comparableValue(row.data)) {
          unchanged += 1
          continue
        }

        const history = await tx.datasetRecordHistory.create({
          data: {
            sourceRecordId: existing.id,
            datasetId: dataset.id,
            regionId: existing.regionId,
            periodDate: existing.periodDate,
            data: existing.data as never,
            status: existing.status,
            createdBy: existing.createdBy,
            createdAt: existing.createdAt,
            updatedAt: existing.updatedAt,
            changeType: 'UPDATE',
            changedBy: session.user.id
          }
        })
        const record = await tx.datasetRecord.update({
          where: { id: existing.id },
          data: {
            data: row.data as never,
            updatedBy: session.user.id
          }
        })

        await tx.auditLog.create({
          data: {
            actorId: session.user.id,
            action: 'dataset_record.update',
            entityType: 'dataset_record',
            entityId: record.id,
            metadata: {
              datasetId: record.datasetId,
              regionId: record.regionId,
              periodDate,
              changedFields: ['data'],
              historyRecordId: history.id,
              source: 'bulk_entry'
            }
          }
        })
        updated += 1
      }

      return { created, updated, unchanged }
    }, { isolationLevel: 'Serializable' })
  } catch (error) {
    if (isTransactionConflict(error)) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Data periode berubah oleh pengguna lain. Muat ulang matriks lalu coba kembali.'
      })
    }

    throw error
  }
})
