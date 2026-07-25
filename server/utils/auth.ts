import type { H3Event } from 'h3'

import { createError } from 'h3'

import { auth } from '~~/lib/auth'

export async function getAuthSession(event: H3Event) {
  return auth.api.getSession({
    headers: event.headers
  })
}

export async function requireAuthSession(event: H3Event) {
  const session = await getAuthSession(event)

  if (!session?.user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  return session
}
