import { authClient } from '~~/lib/auth-client'
import type { AppAccessRequest } from '~~/auth/permissions'
import { hasAccessForRole } from '~~/auth/permissions'

export default defineNuxtRouteMiddleware(async (to) => {
  if (to.meta.public) {
    return
  }

  const { data: session } = await authClient.useSession(useFetch)

  if (!session.value?.user) {
    const redirectCookie = useCookie<string | null>('auth_redirect', {
      sameSite: 'lax',
      path: '/'
    })

    redirectCookie.value = to.fullPath

    return navigateTo('/login')
  }

  const requiredPermissions = to.meta.permission
  if (!requiredPermissions) {
    return
  }

  const { data, error } = await useCurrentUser()

  if (error.value || !data.value?.user) {
    return abortNavigation(createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    }))
  }

  if (!hasAccessForRole(data.value.user.role, requiredPermissions as AppAccessRequest)) {
    return abortNavigation(createError({
      statusCode: 403,
      statusMessage: 'Forbidden'
    }))
  }
})
