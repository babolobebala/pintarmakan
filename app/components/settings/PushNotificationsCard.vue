<script setup lang="ts">
const toast = useToast()
const loadingTest = ref(false)

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
      title: 'Push notifications unavailable',
      description: 'This browser or environment does not support Web Push for this application.',
      color: 'neutral' as const
    }
  }

  if (permission.value === 'denied') {
    return {
      title: 'Notifications blocked by browser',
      description: 'Enable notifications for this site in your browser settings to subscribe again.',
      color: 'warning' as const
    }
  }

  if (isSubscribed.value) {
    return {
      title: 'Notifications enabled',
      description: 'This browser will receive signed-in Web Push notifications for your account.',
      color: 'success' as const
    }
  }

  return {
    title: 'Notifications disabled',
    description: 'Enable notifications on this browser to receive account-specific alerts.',
    color: 'neutral' as const
  }
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

async function sendTestNotification() {
  loadingTest.value = true

  try {
    await $fetch('/api/push/test', {
      method: 'POST'
    })

    toast.add({
      title: 'Test sent',
      description: 'If this browser is subscribed, a notification should appear shortly.',
      color: 'success'
    })
  } catch (error) {
    const description = error instanceof Error ? error.message : 'Unable to send a test notification.'

    toast.add({
      title: 'Test failed',
      description,
      color: 'error'
    })
  } finally {
    loadingTest.value = false
  }
}
</script>

<template>
  <UPageCard
    title="Push Notifications"
    description="Manage Web Push for this browser and send a signed-in test notification."
    variant="subtle"
  >
    <div class="space-y-5 text-sm">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="space-y-1">
          <p class="font-medium text-highlighted">
            {{ state.title }}
          </p>
          <p class="text-muted">
            {{ state.description }}
          </p>
        </div>

        <UBadge :color="state.color" variant="soft">
          {{ permission }}
        </UBadge>
      </div>

      <div class="flex flex-wrap gap-3">
        <UButton
          v-if="isSupported && !isSubscribed && permission !== 'denied'"
          :loading="busy"
          label="Enable notifications"
          icon="i-lucide-bell"
          @click="enableNotifications"
        />

        <UButton
          v-else-if="isSupported && isSubscribed"
          :loading="busy"
          color="neutral"
          variant="soft"
          label="Disable notifications"
          icon="i-lucide-bell-off"
          @click="disableNotifications"
        />

        <UButton
          v-if="isSupported"
          :loading="loadingTest"
          color="neutral"
          variant="outline"
          label="Send test notification"
          icon="i-lucide-send"
          @click="sendTestNotification"
        />
      </div>
    </div>
  </UPageCard>
</template>
