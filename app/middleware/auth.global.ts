import { authClient } from '~~/lib/auth-client'

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

  const userPermissions = new Set(data.value.user.permissions)
  const permissions = Array.isArray(requiredPermissions)
    ? requiredPermissions
    : [requiredPermissions]

  const isAuthorized = permissions.every((permission) => {
    return typeof permission === 'string' && userPermissions.has(permission)
  })

  if (!isAuthorized) {
    return abortNavigation(createError({
      statusCode: 403,
      statusMessage: 'Forbidden'
    }))
  }
})
