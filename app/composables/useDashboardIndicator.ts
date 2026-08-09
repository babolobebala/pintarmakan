import type { DashboardIndicatorKey, DashboardIndicatorPayload } from '~~/shared/dashboard'

import { dashboardIndicatorOptions, isDashboardIndicatorKey } from '~~/shared/dashboard'

function readIndicatorQuery(value: unknown) {
  if (typeof value === 'string') {
    return value
  }

  if (Array.isArray(value) && typeof value[0] === 'string') {
    return value[0]
  }

  return undefined
}

export function useDashboardIndicator() {
  const route = useRoute()
  const router = useRouter()
  const indicatorOptions = dashboardIndicatorOptions
  const fallbackIndicator = indicatorOptions[0].key
  const data = shallowRef<DashboardIndicatorPayload | null>(null)
  const pending = ref(false)
  const error = shallowRef<Error | null>(null)

  let requestId = 0

  const activeIndicator = computed<DashboardIndicatorKey>(() => {
    const queryIndicator = readIndicatorQuery(route.query.indicator)

    return isDashboardIndicatorKey(queryIndicator) ? queryIndicator : fallbackIndicator
  })

  const activeOption = computed(() => {
    return indicatorOptions.find(option => option.key === activeIndicator.value) ?? indicatorOptions[0]
  })

  async function loadIndicator(indicator: DashboardIndicatorKey) {
    const currentRequestId = ++requestId
    pending.value = true
    error.value = null

    try {
      const payload = await $fetch<DashboardIndicatorPayload>(`/api/dashboard/${indicator}`)

      if (currentRequestId !== requestId) {
        return
      }

      data.value = payload
    } catch (caughtError) {
      if (currentRequestId !== requestId) {
        return
      }

      error.value = caughtError instanceof Error ? caughtError : new Error('Unable to load indicator data.')
    } finally {
      if (currentRequestId === requestId) {
        pending.value = false
      }
    }
  }

  async function selectIndicator(indicator: DashboardIndicatorKey) {
    if (indicator === activeIndicator.value) {
      return
    }

    const query = {
      ...route.query,
      indicator
    }

    await router.replace({ query })
  }

  async function refreshIndicator() {
    await loadIndicator(activeIndicator.value)
  }

  watch(activeIndicator, async (indicator) => {
    await loadIndicator(indicator)
  }, { immediate: true })

  watch(() => route.query.indicator, async (value) => {
    if (value === undefined) {
      return
    }

    if (!isDashboardIndicatorKey(readIndicatorQuery(value))) {
      await router.replace({
        query: {
          ...route.query,
          indicator: fallbackIndicator
        }
      })
    }
  }, { immediate: true })

  return {
    activeIndicator,
    activeOption,
    data,
    error,
    indicatorOptions,
    pending,
    refreshIndicator,
    selectIndicator
  }
}
