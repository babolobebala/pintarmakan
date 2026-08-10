import { db } from '#server/utils/db'
import { appPermissions } from '~~/auth/permissions'
import { requirePermission } from '~~/server/utils/access'

export default defineEventHandler(async (event) => {
  await requirePermission(event, appPermissions.businessDataRead)

  return db.region.findMany({
    orderBy: [
      { level: 'asc' },
      { name: 'asc' },
      { id: 'asc' }
    ],
    select: {
      id: true,
      name: true,
      level: true,
      parentId: true
    }
  })
})
