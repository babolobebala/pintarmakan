import { createError } from 'h3'
import webpush from 'web-push'

import { db } from '#server/utils/db'

export type PushNotificationPayload = {
  title: string
  body?: string
  url?: string
  icon?: string
}

const DEFAULT_TITLE = 'Smart Food KSB'
const DEFAULT_ICON = '/icons/icon-192x192.png'
const LOCAL_BASE_URL = 'http://localhost:3000'

let vapidConfigured = false

function getConfiguredBaseUrl() {
  return process.env.BETTER_AUTH_URL || process.env.NUXT_PUBLIC_SITE_URL || LOCAL_BASE_URL
}

function ensurePushConfig() {
  const config = useRuntimeConfig()
  const publicKey = config.public.vapidPublicKey.trim()
  const privateKey = config.vapidPrivateKey.trim()
  const subject = config.vapidSubject.trim()

  if (!publicKey || !privateKey || !subject) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Web Push is not configured.'
    })
  }

  if (!vapidConfigured) {
    webpush.setVapidDetails(subject, publicKey, privateKey)
    vapidConfigured = true
  }

  return {
    publicKey
  }
}

function normalizeInternalUrl(url?: string) {
  if (!url) {
    return '/'
  }

  try {
    const baseUrl = new URL(getConfiguredBaseUrl())
    const resolved = new URL(url, baseUrl)

    if (resolved.origin !== baseUrl.origin) {
      return '/'
    }

    return `${resolved.pathname}${resolved.search}${resolved.hash}` || '/'
  } catch {
    return '/'
  }
}

function normalizePayload(payload: PushNotificationPayload) {
  return {
    title: payload.title.trim() || DEFAULT_TITLE,
    body: payload.body?.trim() || undefined,
    icon: payload.icon?.trim() || DEFAULT_ICON,
    url: normalizeInternalUrl(payload.url)
  }
}

function getStatusCode(error: unknown) {
  if (!error || typeof error !== 'object') {
    return null
  }

  if ('statusCode' in error && typeof error.statusCode === 'number') {
    return error.statusCode
  }

  return null
}

export function getPublicVapidKey() {
  return ensurePushConfig().publicKey
}

export async function sendPushToUser(userId: string, payload: PushNotificationPayload) {
  ensurePushConfig()

  const subscriptions = await db.pushSubscription.findMany({
    where: {
      userId
    },
    select: {
      endpoint: true,
      p256dh: true,
      auth: true
    }
  })

  const message = JSON.stringify(normalizePayload(payload))
  let delivered = 0
  let removed = 0
  let failed = 0

  await Promise.all(subscriptions.map(async (subscription) => {
    try {
      await webpush.sendNotification({
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth
        }
      }, message)

      delivered += 1
    } catch (error) {
      const statusCode = getStatusCode(error)

      if (statusCode === 404 || statusCode === 410) {
        await db.pushSubscription.delete({
          where: {
            endpoint: subscription.endpoint
          }
        })

        removed += 1
        return
      }

      failed += 1
    }
  }))

  return {
    total: subscriptions.length,
    delivered,
    removed,
    failed
  }
}
