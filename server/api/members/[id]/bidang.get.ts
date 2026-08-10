import { createError, getRouterParam } from 'h3'

import { appPermissions } from '~~/auth/permissions'
import { getAssignedBidangIdsForUser } from '#server/utils/bidang'
import { db } from '#server/utils/db'
import { requirePermission } from '~~/server/utils/access'

export default defineEventHandler(async (event) => {
  await requirePermission(event, appPermissions.membersUpdate)

  const userId = getRouterParam(event, 'id')

  if (!userId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing member id.'
    })
  }

  const user = await db.user.findUnique({
    where: {
      id: userId
    },
    select: {
      id: true
    }
  })

  if (!user) {
    throw createError({
      statusCode: 404,
      statusMessage: 'User not found.'
    })
  }

  return {
    bidangIds: await getAssignedBidangIdsForUser(userId)
  }
})
