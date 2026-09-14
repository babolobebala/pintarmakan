import type { DashboardKey, DashboardPayload, KeamananPanganSection } from '~~/shared/dashboard'

import { dashboardOptions, isDashboardKey, isKeamananPanganSection } from '~~/shared/dashboard'

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
  const activeKeamananPanganSection = computed<KeamananPanganSection>(() => {
    const section = readQueryValue(route.query.keamananSection)

    return isKeamananPanganSection(section) ? section : 'PENDATAAN'
  })

  async function loadDashboard(dashboard: DashboardKey) {
    const currentRequestId = ++requestId
    pending.value = true
    error.value = null

    try {
      const payload = await $fetch<DashboardPayload>(`/api/dashboard/${dashboard}`, {
        query: dashboard === 'keamanan-pangan'
          ? { section: activeKeamananPanganSection.value }
          : undefined
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

  async function refreshDashboard() {
    await loadDashboard(activeDashboard.value)
  }

  async function selectKeamananPanganSection(section: KeamananPanganSection) {
    if (section === activeKeamananPanganSection.value) {
      return
    }

    await router.replace({
      query: {
        ...route.query,
        keamananSection: section
      }
    })
  }

  watch(activeDashboard, async (dashboard) => {
    await loadDashboard(dashboard)
  }, { immediate: true })

  watch(activeKeamananPanganSection, async () => {
    if (activeDashboard.value === 'keamanan-pangan') {
      await loadDashboard(activeDashboard.value)
    }
  })

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
    activeKeamananPanganSection,
    data,
    error,
    options,
    pending,
    refreshDashboard,
    selectKeamananPanganSection,
    selectDashboard
  }
}
