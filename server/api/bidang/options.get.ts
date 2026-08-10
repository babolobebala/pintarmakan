import { appPermissions } from '~~/auth/permissions'
import { listBidangOptions } from '#server/utils/bidang'
import { requireAnyPermission } from '~~/server/utils/access'

export default defineEventHandler(async (event) => {
  await requireAnyPermission(event, [
    appPermissions.membersCreate,
    appPermissions.membersUpdate,
    appPermissions.datasetsCreate,
    appPermissions.datasetsUpdate
  ])

  return listBidangOptions()
})
