import { getHeader, readBody } from 'h3'
import { z } from 'zod'

import { db } from '#server/utils/db'
import { requireAuthSession } from '#server/utils/auth'

const subscribeSchema = z.object({
  endpoint: z.url().max(512),
  expirationTime: z.number().int().nonnegative().nullable().optional(),
  keys: z.object({
    p256dh: z.string().trim().min(1).max(191),
    auth: z.string().trim().min(1).max(191)
  })
})

function normalizeExpirationTime(expirationTime?: number | null) {
  if (expirationTime == null) {
    return null
  }

  const date = new Date(expirationTime)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  return date
}

export default defineEventHandler(async (event) => {
  const session = await requireAuthSession(event)
  const body = subscribeSchema.parse(await readBody(event))
  const userAgent = getHeader(event, 'user-agent')?.trim() || null
  const existingSubscription = await db.pushSubscription.findUnique({
    where: {
      endpoint: body.endpoint
    },
    select: {
      id: true,
      userId: true
    }
  })

  const subscription = await db.pushSubscription.upsert({
    where: {
      endpoint: body.endpoint
    },
    create: {
      userId: session.user.id,
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
      expirationTime: normalizeExpirationTime(body.expirationTime),
      userAgent
    },
    update: {
      userId: session.user.id,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
      expirationTime: normalizeExpirationTime(body.expirationTime),
      userAgent
    }
  })

  if (!existingSubscription || existingSubscription.userId !== session.user.id) {
    await db.auditLog.create({
      data: {
        actorId: session.user.id,
        action: 'push.subscription.created',
        entityType: 'push_subscription',
        entityId: subscription.id,
        metadata: {
          endpoint: subscription.endpoint
        }
      }
    })
  }

  return {
    ok: true
  }
})
