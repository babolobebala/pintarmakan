type SubscribeResult
  = | { ok: true }
    | { ok: false, reason: 'unsupported' | 'default' | 'denied' | 'service-worker' | 'config' }

export type PushNotificationState
  = | 'resolving'
    | 'enabled'
    | 'disabled'
    | 'blocked'
    | 'service-worker-unavailable'
    | 'config-error'
    | 'unsupported'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replaceAll('-', '+').replaceAll('_', '/')
  const rawData = atob(base64)

  return Uint8Array.from(rawData, character => character.charCodeAt(0))
}

export function usePushNotifications() {
  const runtimeConfig = useRuntimeConfig()
  const publicKey = computed(() => runtimeConfig.public.vapidPublicKey?.trim() || '')
  const ready = ref(false)
  const isSubscribed = ref(false)
  const permission = ref<NotificationPermission>('default')
  const subscription = shallowRef<PushSubscription | null>(null)
  const busy = ref(false)
  const serviceWorkerReady = ref(false)

  const capabilities = computed(() => {
    if (!import.meta.client) {
      return {
        secureContext: false,
        notification: false,
        serviceWorker: false,
        pushManager: false,
        publicKey: !!publicKey.value
      }
    }

    return {
      secureContext: window.isSecureContext,
      notification: 'Notification' in window,
      serviceWorker: 'serviceWorker' in navigator,
      pushManager: 'PushManager' in window,
      publicKey: !!publicKey.value
    }
  })

  const isSupported = computed(() => {
    return import.meta.client
      && capabilities.value.notification
      && capabilities.value.pushManager
  })

  const supportState = computed<PushNotificationState>(() => {
    if (!ready.value) {
      return 'resolving'
    }

    if (!isSupported.value) {
      return 'unsupported'
    }

    if (!capabilities.value.secureContext || !capabilities.value.serviceWorker) {
      return 'service-worker-unavailable'
    }

    if (!capabilities.value.publicKey) {
      return 'config-error'
    }

    if (!serviceWorkerReady.value) {
      return 'service-worker-unavailable'
    }

    if (permission.value === 'denied') {
      return 'blocked'
    }

    return isSubscribed.value ? 'enabled' : 'disabled'
  })

  async function resolveRegistration() {
    if (!import.meta.client || !capabilities.value.serviceWorker || !capabilities.value.secureContext) {
      return null
    }

    let registration = await navigator.serviceWorker.getRegistration()

    if (!registration) {
      await new Promise(resolve => window.setTimeout(resolve, 250))
      registration = await navigator.serviceWorker.getRegistration()
    }

    if (!registration) {
      return null
    }

    if (registration.active) {
      return registration
    }

    try {
      return await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<null>(resolve => window.setTimeout(() => resolve(null), 5000))
      ])
    } catch {
      return null
    }
  }

  async function refreshSubscriptionState() {
    if (!import.meta.client) {
      return false
    }

    try {
      permission.value = 'Notification' in window ? Notification.permission : 'default'
      serviceWorkerReady.value = false

      if (!isSupported.value || !capabilities.value.secureContext || !capabilities.value.serviceWorker || !capabilities.value.publicKey) {
        subscription.value = null
        isSubscribed.value = false
        return false
      }

      const registration = await resolveRegistration()

      if (!registration) {
        subscription.value = null
        isSubscribed.value = false
        return false
      }

      serviceWorkerReady.value = true
      const currentSubscription = await registration.pushManager.getSubscription()

      subscription.value = currentSubscription
      isSubscribed.value = !!currentSubscription

      return isSubscribed.value
    } finally {
      ready.value = true
    }
  }

  async function subscribe(): Promise<SubscribeResult> {
    if (!isSupported.value) {
      return {
        ok: false,
        reason: 'unsupported'
      }
    }

    if (!capabilities.value.secureContext || !capabilities.value.serviceWorker) {
      return {
        ok: false,
        reason: 'service-worker'
      }
    }

    if (!capabilities.value.publicKey) {
      return {
        ok: false,
        reason: 'config'
      }
    }

    busy.value = true

    try {
      const nextPermission = permission.value === 'denied'
        ? 'denied'
        : permission.value === 'granted'
          ? 'granted'
          : await Notification.requestPermission()

      permission.value = nextPermission

      if (nextPermission !== 'granted') {
        await refreshSubscriptionState()

        return {
          ok: false,
          reason: nextPermission
        }
      }

      const registration = await resolveRegistration()

      if (!registration) {
        return {
          ok: false,
          reason: 'service-worker'
        }
      }

      serviceWorkerReady.value = true
      const currentSubscription = await registration.pushManager.getSubscription()
      const activeSubscription = currentSubscription ?? await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey.value)
      })

      await $fetch('/api/push/subscribe', {
        method: 'POST',
        body: activeSubscription.toJSON()
      })

      subscription.value = activeSubscription
      isSubscribed.value = true

      return {
        ok: true
      }
    } finally {
      busy.value = false
    }
  }

  async function unsubscribe() {
    if (!isSupported.value || !capabilities.value.secureContext || !capabilities.value.serviceWorker) {
      return {
        ok: false as const,
        removed: false
      }
    }

    busy.value = true

    try {
      const registration = await resolveRegistration()

      if (!registration) {
        serviceWorkerReady.value = false
        return {
          ok: false as const,
          removed: false
        }
      }

      serviceWorkerReady.value = true
      const currentSubscription = subscription.value ?? await registration.pushManager.getSubscription()

      if (!currentSubscription) {
        isSubscribed.value = false

        return {
          ok: true as const,
          removed: false
        }
      }

      await $fetch('/api/push/subscribe', {
        method: 'DELETE',
        body: {
          endpoint: currentSubscription.endpoint
        }
      })

      await currentSubscription.unsubscribe()
      subscription.value = null
      isSubscribed.value = false

      return {
        ok: true as const,
        removed: true
      }
    } finally {
      busy.value = false
    }
  }

  onMounted(async () => {
    await refreshSubscriptionState()
    window.addEventListener('focus', refreshSubscriptionState)
  })

  onBeforeUnmount(() => {
    if (!import.meta.client) {
      return
    }

    window.removeEventListener('focus', refreshSubscriptionState)
  })

  return {
    busy: readonly(busy),
    isReady: readonly(ready),
    isSupported,
    state: supportState,
    capabilities: readonly(capabilities),
    permission: readonly(permission),
    isSubscribed: readonly(isSubscribed),
    subscribe,
    unsubscribe,
    refreshSubscriptionState
  }
}
