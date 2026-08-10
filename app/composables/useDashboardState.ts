import type { DashboardKey, DashboardPayload } from '~~/shared/dashboard'

import { dashboardOptions, isDashboardKey } from '~~/shared/dashboard'

function readQueryValue(value: unknown) {
  if (typeof value === 'string') {
    return value
  }

  if (Array.isArray(value) && typeof value[0] === 'string') {
    return value[0]
  }

  return undefined
}

export function useDashboardState() {
  const route = useRoute()
  const router = useRouter()
  const data = shallowRef<DashboardPayload | null>(null)
  const pending = ref(false)
  const error = shallowRef<Error | null>(null)
  const options = dashboardOptions
  const fallbackDashboard = options[0].key

  let requestId = 0

  const activeDashboard = computed<DashboardKey>(() => {
    const queryDashboard = readQueryValue(route.query.dashboard)

    return isDashboardKey(queryDashboard) ? queryDashboard : fallbackDashboard
  })

  async function loadDashboard(dashboard: DashboardKey) {
    const currentRequestId = ++requestId
    pending.value = true
    error.value = null

    try {
      const payload = await $fetch<DashboardPayload>(`/api/dashboard/${dashboard}`)

      if (currentRequestId !== requestId) {
        return
      }

      data.value = payload
    } catch (caughtError) {
      if (currentRequestId !== requestId) {
        return
      }

      error.value = caughtError instanceof Error ? caughtError : new Error('Unable to load dashboard data.')
    } finally {
      if (currentRequestId === requestId) {
        pending.value = false
      }
    }
  }

  async function selectDashboard(dashboard: DashboardKey) {
    if (dashboard === activeDashboard.value) {
      return
    }

    await router.replace({
      query: {
        ...route.query,
        dashboard
      }
    })
  }

  async function refreshDashboard() {
    await loadDashboard(activeDashboard.value)
  }

  watch(activeDashboard, async (dashboard) => {
    await loadDashboard(dashboard)
  }, { immediate: true })

  watch(() => route.query.dashboard, async (value) => {
    if (value === undefined) {
      return
    }

    if (!isDashboardKey(readQueryValue(value))) {
      await router.replace({
        query: {
          ...route.query,
          dashboard: fallbackDashboard
        }
      })
    }
  }, { immediate: true })

  return {
    activeDashboard,
    data,
    error,
    options,
    pending,
    refreshDashboard,
    selectDashboard
  }
}
