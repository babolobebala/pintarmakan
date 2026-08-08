type PwaInstallState = 'resolving' | 'installed' | 'installable' | 'manual' | 'unavailable'

const DISPLAY_MODE_QUERIES = [
  '(display-mode: standalone)',
  '(display-mode: minimal-ui)',
  '(display-mode: fullscreen)',
  '(display-mode: window-controls-overlay)'
] as const

const INSTALL_HINT_STORAGE_KEY = 'pwa-installed'
const PWA_MANIFEST_ID = '/'
const PWA_MANIFEST_URL = '/manifest.webmanifest'

type InstalledRelatedApp = {
  id?: string
  platform: string
  url?: string
}

type BrowserNavigator = Navigator & {
  standalone?: boolean
  getInstalledRelatedApps?: () => Promise<InstalledRelatedApp[]>
}

type LegacyMediaQueryList = MediaQueryList & {
  addListener?: (callback: (event: MediaQueryListEvent) => void) => void
  removeListener?: (callback: (event: MediaQueryListEvent) => void) => void
}

function getBrowserNavigator() {
  return window.navigator as BrowserNavigator
}

function isIosDevice() {
  if (!import.meta.client) {
    return false
  }

  const { userAgent, platform, maxTouchPoints } = getBrowserNavigator()

  return /iPad|iPhone|iPod/.test(userAgent) || (platform === 'MacIntel' && maxTouchPoints > 1)
}

function isStandaloneDisplayMode() {
  if (!import.meta.client) {
    return false
  }

  const legacyStandalone = Boolean(getBrowserNavigator().standalone)

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

function normalizeBrowserUrl(value: string) {
  return new URL(value, window.location.origin).href
}

function getManifestId() {
  return normalizeBrowserUrl(PWA_MANIFEST_ID)
}

function getManifestUrl() {
  return normalizeBrowserUrl(PWA_MANIFEST_URL)
}

function matchesCurrentWebApp(app: InstalledRelatedApp) {
  if (app.platform !== 'webapp') {
    return false
  }

  const entryId = app.id ? normalizeBrowserUrl(app.id) : null
  const entryUrl = app.url ? normalizeBrowserUrl(app.url) : null

  if (!entryId && !entryUrl) {
    return false
  }

  if (entryId && entryId !== getManifestId()) {
    return false
  }

  if (entryUrl && entryUrl !== getManifestUrl()) {
    return false
  }

  return true
}

function readInstallHint() {
  if (!import.meta.client) {
    return false
  }

  return window.localStorage.getItem(INSTALL_HINT_STORAGE_KEY) === '1'
}

function writeInstallHint(installed: boolean) {
  if (!import.meta.client) {
    return
  }

  if (installed) {
    window.localStorage.setItem(INSTALL_HINT_STORAGE_KEY, '1')
    return
  }

  window.localStorage.removeItem(INSTALL_HINT_STORAGE_KEY)
}

export function usePwaInstall() {
  const pwa = import.meta.client ? usePWA() : undefined
  const state = ref<PwaInstallState>('resolving')
  const standalone = ref(false)
  const ios = ref(false)
  const installHint = ref(false)
  const mediaQueries: MediaQueryList[] = []

  const promptAvailable = computed(() => {
    return Boolean(pwa?.showInstallPrompt)
  })

  async function detectInstalledRelatedApp() {
    if (!import.meta.client) {
      return {
        installed: false,
        supported: false
      }
    }

    const getInstalledRelatedApps = getBrowserNavigator().getInstalledRelatedApps

    if (typeof getInstalledRelatedApps !== 'function') {
      return {
        installed: false,
        supported: false
      }
    }

    try {
      const apps = await getInstalledRelatedApps.call(getBrowserNavigator())

      return {
        installed: apps.some(matchesCurrentWebApp),
        supported: true
      }
    } catch {
      return {
        installed: false,
        supported: true
      }
    }
  }

  async function resolveState() {
    if (!import.meta.client) {
      return
    }

    state.value = 'resolving'
    standalone.value = isStandaloneDisplayMode()
    ios.value = isIosDevice()
    installHint.value = readInstallHint()

    if (standalone.value || Boolean(pwa?.isPWAInstalled)) {
      writeInstallHint(true)
      installHint.value = true
      state.value = 'installed'
      return
    }

    const relatedAppState = await detectInstalledRelatedApp()

    if (relatedAppState.installed) {
      writeInstallHint(true)
      installHint.value = true
      state.value = 'installed'
      return
    }

    if (promptAvailable.value) {
      writeInstallHint(false)
      installHint.value = false
      state.value = 'installable'
      return
    }

    if (ios.value) {
      state.value = 'manual'
      return
    }

    if (!relatedAppState.supported && installHint.value) {
      state.value = 'installed'
      return
    }

    state.value = 'unavailable'
  }

  const onEnvironmentChange = () => {
    if (!import.meta.client) {
      return
    }

    void resolveState()
  }

  const onAppInstalled = () => {
    writeInstallHint(true)
    installHint.value = true
    standalone.value = isStandaloneDisplayMode()
    state.value = 'installed'
    void resolveState()
  }

  onMounted(() => {
    for (const query of DISPLAY_MODE_QUERIES) {
      const mediaQuery = window.matchMedia(query)
      addMediaQueryListener(mediaQuery, onEnvironmentChange)
      mediaQueries.push(mediaQuery)
    }

    window.addEventListener('appinstalled', onAppInstalled)
    window.addEventListener('focus', onEnvironmentChange)

    void resolveState()
  })

  onBeforeUnmount(() => {
    for (const mediaQuery of mediaQueries) {
      removeMediaQueryListener(mediaQuery, onEnvironmentChange)
    }

    mediaQueries.length = 0
    window.removeEventListener('appinstalled', onAppInstalled)
    window.removeEventListener('focus', onEnvironmentChange)
  })

  watch(() => Boolean(pwa?.showInstallPrompt), () => {
    if (!import.meta.client) {
      return
    }

    void resolveState()
  })

  watch(() => Boolean(pwa?.isPWAInstalled), () => {
    if (!import.meta.client) {
      return
    }

    void resolveState()
  })

  async function install() {
    if (!import.meta.client || !pwa || state.value !== 'installable') {
      return
    }

    return await pwa.install()
  }

  return {
    isReady: computed(() => state.value !== 'resolving'),
    state: computed(() => state.value),
    isInstallable: computed(() => state.value === 'installable'),
    isInstalled: computed(() => state.value === 'installed'),
    showIosHint: computed(() => state.value === 'manual'),
    install
  }
}
