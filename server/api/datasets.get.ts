import { db } from '#server/utils/db'
import { serializeDataset } from '#server/utils/datasets'
import { appPermissions } from '~~/auth/permissions'
import { requirePermission } from '~~/server/utils/access'

export default defineEventHandler(async (event) => {
  await requirePermission(event, appPermissions.datasetsRead)

  const datasets = await db.dataset.findMany({
    orderBy: [
      { updatedAt: 'desc' },
      { id: 'asc' }
    ],
    include: {
      ownerBidang: {
        select: {
          name: true
        }
      },
      _count: {
        select: {
          records: true,
          recordHistory: true,
          tableRecords: true,
          tableRecordHistory: true
        }
      }
    }
  })

  return datasets.map(dataset => serializeDataset({
    ...dataset,
    canChangeMode: dataset._count.records === 0
      && dataset._count.recordHistory === 0
      && dataset._count.tableRecords === 0
      && dataset._count.tableRecordHistory === 0
  }))
})
