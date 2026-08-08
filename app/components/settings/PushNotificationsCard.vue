<script setup lang="ts">
const toast = useToast()

const {
  busy,
  isSupported,
  permission,
  isSubscribed,
  subscribe,
  unsubscribe,
  refreshSubscriptionState
} = usePushNotifications()

const state = computed(() => {
  if (!isSupported.value) {
    return {
      badge: 'Unsupported',
      color: 'neutral' as const,
      description: 'Web Push is not available in this browser or environment.',
      helper: 'Notifications require browser support for service workers and push messaging.',
      helperIcon: 'i-lucide-info',
      helperTitle: 'Push notifications unavailable'
    }
  }

  if (permission.value === 'denied') {
    return {
      badge: 'Blocked',
      color: 'warning' as const,
      description: 'Notifications are blocked in your browser settings for this site.',
      helper: 'Allow notifications in the browser, then reload this page to subscribe again.',
      helperIcon: 'i-lucide-shield-alert',
      helperTitle: 'Notifications blocked by browser'
    }
  }

  if (isSubscribed.value) {
    return {
      badge: 'Enabled',
      color: 'success' as const,
      description: 'This browser is subscribed to receive account-specific push notifications.'
    }
  }

  if (permission.value === 'granted') {
    return {
      badge: 'Permission granted',
      color: 'info' as const,
      description: 'Notification permission is granted, but this browser is not currently subscribed.'
    }
  }

  return {
    badge: 'Not enabled',
    color: 'neutral' as const,
    description: 'Turn this on to request browser permission and subscribe this device.'
  }
})

const canToggle = computed(() => {
  return isSupported.value && permission.value !== 'denied'
})

const helperState = computed(() => {
  return 'helper' in state.value ? state.value : null
})

const switchDescription = computed(() => {
  if (isSubscribed.value) {
    return 'Receive important updates from this application on this device.'
  }

  if (!isSupported.value) {
    return 'This browser cannot create a Web Push subscription.'
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
          Notifications
        </p>
        <p class="text-muted">
          {{ state.description }}
        </p>
      </div>

      <UBadge :color="state.color" variant="soft">
        {{ state.badge }}
      </UBadge>
    </div>

    <USwitch
      :model-value="isSubscribed"
      :loading="busy"
      :disabled="!canToggle"
      unchecked-icon="i-lucide-bell-off"
      checked-icon="i-lucide-bell"
      label="Enable notifications"
      :description="switchDescription"
      @update:model-value="toggleNotifications"
    />

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
