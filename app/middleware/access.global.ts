export default defineNuxtRouteMiddleware(async (to) => {
  if (to.meta.public) {
    return
  }

  const { data, error } = await useCurrentUser()

  if (error.value || !data.value?.user) {
    return navigateTo({
      path: '/login',
      query: {
        redirect: to.fullPath
      }
    })
  }

  const requiredPermissions = to.meta.permission
  if (!requiredPermissions) {
    return
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
