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
      }
    }
  })

  return datasets.map(serializeDataset)
})
