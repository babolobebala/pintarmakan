type SubscribeResult
  = | { ok: true }
    | { ok: false, reason: 'unsupported' | 'default' | 'denied' }

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replaceAll('-', '+').replaceAll('_', '/')
  const rawData = atob(base64)

  return Uint8Array.from(rawData, character => character.charCodeAt(0))
}

export function usePushNotifications() {
  const runtimeConfig = useRuntimeConfig()
  const publicKey = runtimeConfig.public.vapidPublicKey?.trim() || ''
  const isSubscribed = ref(false)
  const permission = ref<NotificationPermission>('default')
  const subscription = shallowRef<PushSubscription | null>(null)
  const busy = ref(false)

  const isSupported = computed(() => {
    return import.meta.client
      && !!publicKey
      && 'Notification' in window
      && 'serviceWorker' in navigator
      && 'PushManager' in window
  })

  async function refreshSubscriptionState() {
    if (!import.meta.client) {
      return false
    }

    permission.value = 'Notification' in window ? Notification.permission : 'default'

    if (!isSupported.value) {
      subscription.value = null
      isSubscribed.value = false
      return false
    }

    const registration = await navigator.serviceWorker.ready
    const currentSubscription = await registration.pushManager.getSubscription()

    subscription.value = currentSubscription
    isSubscribed.value = !!currentSubscription

    return isSubscribed.value
  }

  async function subscribe(): Promise<SubscribeResult> {
    if (!isSupported.value) {
      return {
        ok: false,
        reason: 'unsupported'
      }
    }

    busy.value = true

    try {
      const nextPermission = await Notification.requestPermission()
      permission.value = nextPermission

      if (nextPermission !== 'granted') {
        await refreshSubscriptionState()

        return {
          ok: false,
          reason: nextPermission
        }
      }

      const registration = await navigator.serviceWorker.ready
      const currentSubscription = await registration.pushManager.getSubscription()
      const activeSubscription = currentSubscription ?? await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
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
    if (!isSupported.value) {
      return {
        ok: false as const,
        removed: false
      }
    }

    busy.value = true

    try {
      const currentSubscription = subscription.value ?? await navigator.serviceWorker.ready.then(registration => registration.pushManager.getSubscription())

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
  })

  return {
    busy: readonly(busy),
    isSupported,
    permission: readonly(permission),
    isSubscribed: readonly(isSubscribed),
    subscribe,
    unsubscribe,
    refreshSubscriptionState
  }
}
