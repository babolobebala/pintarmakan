<script setup lang="ts">
const toast = useToast()

const {
  busy,
  isReady,
  isSupported,
  state: notificationState,
  permission,
  isSubscribed,
  subscribe,
  unsubscribe,
  refreshSubscriptionState
} = usePushNotifications()

const state = computed(() => {
  if (!isReady.value) {
    return {
      badge: 'Checking',
      color: 'neutral' as const,
      detail: 'Checking browser notification support and current subscription state.'
    }
  }

  if (notificationState.value === 'unsupported') {
    return {
      badge: 'Unsupported',
      color: 'neutral' as const,
      detail: 'This browser does not support the Notification and Push APIs required for Web Push.',
      helper: 'Use a browser that supports Notifications, PushManager, and service workers for this app.',
      helperIcon: 'i-lucide-info',
      helperTitle: 'Push notifications unavailable'
    }
  }

  if (notificationState.value === 'service-worker-unavailable') {
    return {
      badge: 'Service worker unavailable',
      color: 'warning' as const,
      detail: 'A ready service worker is not available for push notifications in this browser context.',
      helper: 'Web Push requires HTTPS or localhost plus an active service worker registration for this app.',
      helperIcon: 'i-lucide-wifi-off',
      helperTitle: 'Service worker required'
    }
  }

  if (notificationState.value === 'config-error') {
    return {
      badge: 'Configuration error',
      color: 'error' as const,
      detail: 'This application is missing its public Web Push key at runtime.',
      helper: 'Set VAPID_PUBLIC_KEY for the running application so browsers can subscribe.',
      helperIcon: 'i-lucide-key-round',
      helperTitle: 'Web Push not configured'
    }
  }

  if (permission.value === 'denied') {
    return {
      badge: 'Blocked',
      color: 'warning' as const,
      detail: 'Notifications are blocked in your browser settings for this site.',
      helper: 'Allow notifications for this site in browser settings, then reload this page to subscribe again.',
      helperIcon: 'i-lucide-shield-alert',
      helperTitle: 'Notifications blocked by browser'
    }
  }

  if (isSubscribed.value) {
    return {
      badge: 'Enabled',
      color: 'success' as const,
      detail: 'This device is subscribed to receive push notifications.'
    }
  }

  return {
    badge: 'Disabled',
    color: 'neutral' as const,
    detail: permission.value === 'granted'
      ? 'Permission is granted, but this device is not currently subscribed.'
      : 'Turn this on to request browser permission and subscribe this device.'
  }
})

const canToggle = computed(() => {
  return notificationState.value === 'enabled' || notificationState.value === 'disabled'
})

const helperState = computed(() => {
  return 'helper' in state.value ? state.value : null
})

const switchDescription = computed(() => {
  if (!isReady.value) {
    return 'Checking notification support and current subscription status.'
  }

  if (isSubscribed.value) {
    return 'Receive important notifications on this device.'
  }

  if (!isSupported.value) {
    return 'This browser cannot use the required Notification or Push APIs.'
  }

  if (notificationState.value === 'service-worker-unavailable') {
    return 'Push notifications need a ready service worker in a secure browser context.'
  }

  if (notificationState.value === 'config-error') {
    return 'This application is missing its public Web Push configuration.'
  }

  if (permission.value === 'denied') {
    return 'Notification permission is blocked in browser settings.'
  }

  if (permission.value === 'granted') {
    return 'Permission is already granted. Turn this on to subscribe this browser.'
  }

  return 'Receive important updates from this application.'
})

async function enableNotifications() {
  try {
    const result = await subscribe()

    if (!result.ok) {
      if (result.reason === 'denied') {
        toast.add({
          title: 'Notifications blocked',
          description: 'Your browser denied notification permission for this site.',
          color: 'warning'
        })
        return
      }

      if (result.reason === 'default') {
        toast.add({
          title: 'Permission not granted',
          description: 'Notification permission was dismissed before subscribing.',
          color: 'neutral'
        })
        return
      }

      if (result.reason === 'service-worker') {
        toast.add({
          title: 'Service worker unavailable',
          description: 'Push notifications require a ready service worker in this browser context.',
          color: 'warning'
        })
        return
      }

      if (result.reason === 'config') {
        toast.add({
          title: 'Push misconfigured',
          description: 'The application is missing its public Web Push key.',
          color: 'error'
        })
        return
      }

      toast.add({
        title: 'Push unavailable',
        description: 'This browser cannot create a Web Push subscription for this app.',
        color: 'error'
      })
      return
    }

    toast.add({
      title: 'Notifications enabled',
      description: 'This browser has been subscribed to Web Push notifications.',
      color: 'success'
    })
  } catch (error) {
    const description = error instanceof Error ? error.message : 'Unable to enable notifications.'

    toast.add({
      title: 'Subscription failed',
      description,
      color: 'error'
    })
  } finally {
    await refreshSubscriptionState()
  }
}

async function disableNotifications() {
  try {
    await unsubscribe()

    toast.add({
      title: 'Notifications disabled',
      description: 'This browser subscription has been removed.',
      color: 'success'
    })
  } catch (error) {
    const description = error instanceof Error ? error.message : 'Unable to disable notifications.'

    toast.add({
      title: 'Unsubscribe failed',
      description,
      color: 'error'
    })
  } finally {
    await refreshSubscriptionState()
  }
}

async function toggleNotifications(nextValue: boolean | string) {
  if (busy.value || typeof nextValue !== 'boolean' || nextValue === isSubscribed.value) {
    return
  }

  if (nextValue) {
    await enableNotifications()
    return
  }

  await disableNotifications()
}
</script>

<template>
  <div class="space-y-4 text-sm">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="space-y-1">
        <p class="font-medium text-highlighted">
          Push Notifications
        </p>
        <p class="text-muted">
          Receive important notifications on this device.
        </p>
        <p class="text-muted">
          {{ state.detail }}
        </p>
      </div>

      <div class="flex items-center gap-3">
        <UBadge :color="state.color" variant="soft">
          {{ state.badge }}
        </UBadge>

        <USwitch
          :model-value="isSubscribed"
          :loading="busy"
          :disabled="!canToggle"
          unchecked-icon="i-lucide-bell-off"
          checked-icon="i-lucide-bell"
          :aria-label="switchDescription"
          @update:model-value="toggleNotifications"
        />
      </div>
    </div>

    <UAlert
      v-if="helperState"
      :icon="helperState.helperIcon"
      :title="helperState.helperTitle"
      :description="helperState.helper"
      :color="helperState.color"
      variant="subtle"
    />
  </div>
</template>
