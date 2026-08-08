import { readBody } from 'h3'
import { z } from 'zod'

import { db } from '#server/utils/db'
import { requireAuthSession } from '#server/utils/auth'

const unsubscribeSchema = z.object({
  endpoint: z.string().trim().url().max(512)
})

export default defineEventHandler(async (event) => {
  const session = await requireAuthSession(event)
  const body = unsubscribeSchema.parse(await readBody(event))
  const subscription = await db.pushSubscription.findFirst({
    where: {
      endpoint: body.endpoint,
      userId: session.user.id
    },
    select: {
      id: true
    }
  })

  if (!subscription) {
    return {
      ok: true,
      removed: false
    }
  }

  await db.pushSubscription.delete({
    where: {
      endpoint: body.endpoint
    }
  })

  await db.auditLog.create({
    data: {
      actorId: session.user.id,
      action: 'push.subscription.removed',
      entityType: 'push_subscription',
      entityId: subscription.id
    }
  })

  return {
    ok: true,
    removed: true
  }
})
