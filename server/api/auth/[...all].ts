import { toWebRequest } from 'h3'

import { auth } from '#server/utils/auth-instance'

export default defineEventHandler((event) => {
  return auth.handler(toWebRequest(event))
})
