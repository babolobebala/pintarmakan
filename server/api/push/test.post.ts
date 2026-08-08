import { requireAuthSession } from '#server/utils/auth'
import { sendPushToUser } from '#server/utils/push'

export default defineEventHandler(async (event) => {
  const session = await requireAuthSession(event)
  const result = await sendPushToUser(session.user.id, {
    title: 'Test notification',
    body: 'Web Push is configured for this browser session.',
    url: '/settings',
    icon: '/icons/icon-192x192.png'
  })

  return {
    ok: true,
    ...result
  }
})
