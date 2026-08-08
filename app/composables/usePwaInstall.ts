type PwaInstallState = 'installable' | 'installed' | 'ios-manual' | 'unavailable'

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

  const standalone = window.matchMedia('(display-mode: standalone)').matches
  const minimalUi = window.matchMedia('(display-mode: minimal-ui)').matches
  const legacyStandalone = 'standalone' in window.navigator && Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone)

  return standalone || minimalUi || legacyStandalone
}

export function usePwaInstall() {
  const pwa = import.meta.client ? usePWA() : undefined
  const standalone = ref(false)
  const ios = ref(false)
  let standaloneMedia: MediaQueryList | undefined
  let minimalUiMedia: MediaQueryList | undefined

  const onChange = () => syncClientState()

  const syncClientState = () => {
    standalone.value = isStandaloneDisplayMode()
    ios.value = isIosDevice()
  }

  onMounted(() => {
    syncClientState()

    standaloneMedia = window.matchMedia('(display-mode: standalone)')
    minimalUiMedia = window.matchMedia('(display-mode: minimal-ui)')

    standaloneMedia.addEventListener('change', onChange)
    minimalUiMedia.addEventListener('change', onChange)
  })

  onBeforeUnmount(() => {
    standaloneMedia?.removeEventListener('change', onChange)
    minimalUiMedia?.removeEventListener('change', onChange)
  })

  const isInstalled = computed(() => {
    return standalone.value || Boolean(pwa?.isPWAInstalled)
  })

  const isInstallable = computed(() => {
    return import.meta.client
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
    state,
    isInstallable,
    isInstalled,
    showIosHint,
    install
  }
}
