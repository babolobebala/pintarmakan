type PwaInstallState = 'installable' | 'installed' | 'ios-manual' | 'unavailable'

const DISPLAY_MODE_QUERIES = [
  '(display-mode: standalone)',
  '(display-mode: minimal-ui)',
  '(display-mode: fullscreen)',
  '(display-mode: window-controls-overlay)'
] as const

type LegacyMediaQueryList = MediaQueryList & {
  addListener?: (callback: (event: MediaQueryListEvent) => void) => void
  removeListener?: (callback: (event: MediaQueryListEvent) => void) => void
}

function isIosDevice() {
  if (!import.meta.client) {
    return false
  }

  const { userAgent, platform, maxTouchPoints } = window.navigator

  return /iPad|iPhone|iPod/.test(userAgent) || (platform === 'MacIntel' && maxTouchPoints > 1)
}

function isStandaloneDisplayMode() {
  if (!import.meta.client) {
    return false
  }

  const legacyStandalone = 'standalone' in window.navigator && Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone)

  return DISPLAY_MODE_QUERIES.some(query => window.matchMedia(query).matches) || legacyStandalone
}

function addMediaQueryListener(mediaQuery: MediaQueryList, callback: (event: MediaQueryListEvent) => void) {
  if ('addEventListener' in mediaQuery) {
    mediaQuery.addEventListener('change', callback)
    return
  }

  ;(mediaQuery as LegacyMediaQueryList).addListener?.(callback)
}

function removeMediaQueryListener(mediaQuery: MediaQueryList, callback: (event: MediaQueryListEvent) => void) {
  if ('removeEventListener' in mediaQuery) {
    mediaQuery.removeEventListener('change', callback)
    return
  }

  ;(mediaQuery as LegacyMediaQueryList).removeListener?.(callback)
}

export function usePwaInstall() {
  const pwa = import.meta.client ? usePWA() : undefined
  const ready = ref(false)
  const standalone = ref(false)
  const ios = ref(false)
  const browserReportedInstalled = ref(false)
  const mediaQueries: MediaQueryList[] = []

  const onChange = () => syncClientState()
  const onAppInstalled = () => {
    browserReportedInstalled.value = true
    standalone.value = true
    ready.value = true
  }

  const syncClientState = () => {
    standalone.value = isStandaloneDisplayMode()
    ios.value = isIosDevice()
    browserReportedInstalled.value = Boolean(pwa?.isPWAInstalled) || standalone.value
    ready.value = true
  }

  onMounted(() => {
    syncClientState()

    for (const query of DISPLAY_MODE_QUERIES) {
      const mediaQuery = window.matchMedia(query)
      addMediaQueryListener(mediaQuery, onChange)
      mediaQueries.push(mediaQuery)
    }

    window.addEventListener('appinstalled', onAppInstalled)
  })

  onBeforeUnmount(() => {
    for (const mediaQuery of mediaQueries) {
      removeMediaQueryListener(mediaQuery, onChange)
    }

    mediaQueries.length = 0
    window.removeEventListener('appinstalled', onAppInstalled)
  })

  watch(() => pwa?.isPWAInstalled, () => {
    if (!import.meta.client) {
      return
    }

    syncClientState()
  })

  watch(() => pwa?.showInstallPrompt, () => {
    if (!import.meta.client || !ready.value) {
      return
    }

    syncClientState()
  })

  const isInstalled = computed(() => {
    return browserReportedInstalled.value || standalone.value
  })

  const isInstallable = computed(() => {
    return import.meta.client
      && ready.value
      && !isInstalled.value
      && Boolean(pwa?.showInstallPrompt)
  })

  const showIosHint = computed(() => {
    return import.meta.client
      && ios.value
      && !isInstalled.value
      && !isInstallable.value
  })

  const state = computed<PwaInstallState>(() => {
    if (isInstalled.value) {
      return 'installed'
    }

    if (isInstallable.value) {
      return 'installable'
    }

    if (showIosHint.value) {
      return 'ios-manual'
    }

    return 'unavailable'
  })

  async function install() {
    if (!import.meta.client || !pwa || !isInstallable.value) {
      return
    }

    return await pwa.install()
  }

  return {
    isReady: computed(() => ready.value),
    state,
    isInstallable,
    isInstalled,
    showIosHint,
    install
  }
}
