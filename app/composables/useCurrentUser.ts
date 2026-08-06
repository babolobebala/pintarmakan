import type { AuthSessionResponse } from '~/types'

import { getEffectiveRoles } from '~~/auth/permissions'
import { authClient } from '~~/lib/auth-client'

export function useCurrentUser() {
  return authClient.useSession(useFetch).then(({ data: session, error }) => {
    const data = computed<AuthSessionResponse | null>(() => {
      if (!session.value?.user || !session.value.session) {
        return null
      }

      return {
        user: {
          id: session.value.user.id,
          name: session.value.user.name,
          email: session.value.user.email,
          image: session.value.user.image,
          role: session.value.user.role ?? null,
          roles: getEffectiveRoles(session.value.user.role)
        },
        session: {
          id: session.value.session.id,
          expiresAt: session.value.session.expiresAt
        }
      }
    })

    return {
      data,
      error
    }
  })
}
