/// <reference lib="webworker" />

import { clientsClaim } from 'workbox-core'
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{
    revision: string | null
    url: string
  }>
}

type PushPayload = {
  title?: string
  body?: string
  url?: string
  icon?: string
}

const FALLBACK_TITLE = 'Smart Food KSB'
const FALLBACK_BODY = 'You have a new notification.'
const FALLBACK_ICON = '/icons/icon-192x192.png'

self.skipWaiting()
clientsClaim()
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

function normalizeInternalUrl(input?: string) {
  if (!input) {
    return '/'
  }

  try {
    const url = new URL(input, self.location.origin)

    if (url.origin !== self.location.origin) {
      return '/'
    }

    return `${url.pathname}${url.search}${url.hash}` || '/'
  } catch {
    return '/'
  }
}

function parsePushPayload(event: PushEvent): PushPayload {
  if (!event.data) {
    return {}
  }

  try {
    return event.data.json() as PushPayload
  } catch {
    try {
      return JSON.parse(event.data.text()) as PushPayload
    } catch {
      return {}
    }
  }
}

self.addEventListener('push', (event) => {
  const payload = parsePushPayload(event)
  const title = payload.title?.trim() || FALLBACK_TITLE
  const body = payload.body?.trim() || FALLBACK_BODY
  const icon = payload.icon?.trim() || FALLBACK_ICON
  const url = normalizeInternalUrl(payload.url)

  event.waitUntil(self.registration.showNotification(title, {
    body,
    icon,
    badge: FALLBACK_ICON,
    data: {
      url
    }
  }))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const targetUrl = new URL(normalizeInternalUrl(event.notification.data?.url), self.location.origin).toString()

  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    })

    for (const client of clients) {
      if (!('focus' in client) || !client.url.startsWith(self.location.origin)) {
        continue
      }

      const windowClient = client as WindowClient

      if (windowClient.url === targetUrl) {
        await windowClient.focus()
        return
      }

      if ('navigate' in windowClient) {
        await windowClient.navigate(targetUrl)
      }

      await windowClient.focus()
      return
    }

    await self.clients.openWindow(targetUrl)
  })())
})
