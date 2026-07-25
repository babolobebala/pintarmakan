import type { AuthSessionResponse } from '~/types'

export function useCurrentUser() {
  return useFetch<AuthSessionResponse>('/api/me', {
    key: 'auth:me',
    retry: 0,
    headers: import.meta.server ? useRequestHeaders(['cookie']) : undefined
  })
}
