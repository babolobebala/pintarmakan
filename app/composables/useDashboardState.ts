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

function normalizeYearQuery(value: unknown) {
  const year = readQueryValue(value)

  return year && /^\d{4}$/.test(year.trim())
    ? year.trim()
    : undefined
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

  const requestedYear = computed(() => normalizeYearQuery(route.query.year))

  const activeOption = computed(() => {
    return options.find(option => option.key === activeDashboard.value) ?? options[0]
  })

  async function loadDashboard(dashboard: DashboardKey, year?: string) {
    const currentRequestId = ++requestId
    pending.value = true
    error.value = null

    try {
      const payload = await $fetch<DashboardPayload>(`/api/dashboard/${dashboard}`, {
        query: year ? { year } : undefined
      })

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

  async function selectYear(year: string | null) {
    const normalized = year?.trim()

    await router.replace({
      query: {
        ...route.query,
        year: normalized && /^\d{4}$/.test(normalized) ? normalized : undefined
      }
    })
  }

  async function refreshDashboard() {
    await loadDashboard(activeDashboard.value, requestedYear.value)
  }

  watch([activeDashboard, requestedYear], async ([dashboard, year]) => {
    await loadDashboard(dashboard, year)
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
    activeOption,
    data,
    error,
    options,
    pending,
    requestedYear,
    refreshDashboard,
    selectDashboard,
    selectYear
  }
}
