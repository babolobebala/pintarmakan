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
      badge: 'Memeriksa',
      color: 'neutral' as const,
      detail:
        'Memeriksa dukungan notifikasi browser dan status subscription saat ini.'
    }
  }

  if (notificationState.value === 'unsupported') {
    return {
      badge: 'Tidak Didukung',
      color: 'neutral' as const,
      detail:
        'Browser ini tidak mendukung API Notification dan Push yang diperlukan untuk Web Push.',
      helper:
        'Gunakan browser yang mendukung Notifications, PushManager, dan service worker untuk aplikasi ini.',
      helperIcon: 'i-lucide-info',
      helperTitle: 'Notifikasi push tidak tersedia'
    }
  }

  if (notificationState.value === 'service-worker-unavailable') {
    return {
      badge: 'Service worker tidak tersedia',
      color: 'warning' as const,
      detail:
        'Service worker tidak tersedia untuk notifikasi push dalam konteks browser ini.',
      helper:
        'Web Push memerlukan HTTPS atau localhost serta registrasi service worker yang aktif untuk aplikasi ini.',
      helperIcon: 'i-lucide-wifi-off',
      helperTitle: 'Service worker diperlukan'
    }
  }

  if (notificationState.value === 'config-error') {
    return {
      badge: 'Konfigurasi error',
      color: 'error' as const,
      detail:
        'Aplikasi ini tidak memiliki kunci Web Push publik saat dijalankan.',
      helper:
        'Tetapkan VAPID_PUBLIC_KEY untuk aplikasi yang sedang berjalan agar browser dapat melakukan subscribe.',
      helperIcon: 'i-lucide-key-round',
      helperTitle: 'Web Push belum dikonfigurasi'
    }
  }

  if (permission.value === 'denied') {
    return {
      badge: 'Terblok',
      color: 'warning' as const,
      detail: 'Notifikasi diblokir di pengaturan browser Anda untuk situs ini.',
      helper:
        'Izinkan notifikasi untuk situs ini di pengaturan browser, lalu muat ulang halaman ini untuk subscription kembali.',
      helperIcon: 'i-lucide-shield-alert',
      helperTitle: 'Notifikasi diblokir oleh browser'
    }
  }

  if (isSubscribed.value) {
    return {
      badge: 'Aktif',
      color: 'success' as const,
      detail:
        'Perangkat ini telah Subscription untuk menerima notifikasi push.'
    }
  }

  return {
    badge: 'Tidak Aktif',
    color: 'neutral' as const,
    detail:
      permission.value === 'granted'
        ? 'Izin diberikan, namun perangkat ini saat ini tidak memiliki subscription.'
        : 'Aktifkan ini untuk meminta izin browser dan mendaftarkan perangkat ini.'
  }
})

const canToggle = computed(() => {
  return (
    notificationState.value === 'enabled'
    || notificationState.value === 'disabled'
  )
})

const switchDescription = computed(() => {
  if (!isReady.value) {
    return 'Memeriksa dukungan notifikasi dan status subscription saat ini.'
  }

  if (isSubscribed.value) {
    return 'Terima notifikasi penting di perangkat ini.'
  }

  if (!isSupported.value) {
    return 'Browser ini tidak dapat menggunakan API Notifikasi atau Push yang diperlukan.'
  }

  if (notificationState.value === 'service-worker-unavailable') {
    return 'Notifikasi push memerlukan service worker yang siap beroperasi dalam konteks browser yang aman.'
  }

  if (notificationState.value === 'config-error') {
    return 'Aplikasi ini tidak memiliki konfigurasi Web Push publik.'
  }

  if (permission.value === 'denied') {
    return 'Izin notifikasi diblokir di pengaturan browser.'
  }

  if (permission.value === 'granted') {
    return 'Izin telah diberikan. Aktifkan ini untuk subscription di browser ini.'
  }

  return 'Terima pembaruan penting dari aplikasi ini.'
})

async function enableNotifications() {
  try {
    const result = await subscribe()

    if (!result.ok) {
      if (result.reason === 'denied') {
        toast.add({
          title: 'Notifikasi diblokir',
          description: 'Browser Anda menolak izin notifikasi untuk situs ini.',
          color: 'warning'
        })
        return
      }

      if (result.reason === 'default') {
        toast.add({
          title: 'Izin tidak diberikan',
          description:
            'Izin notifikasi ditolak sebelum melakukan subscription.',
          color: 'neutral'
        })
        return
      }

      if (result.reason === 'service-worker') {
        toast.add({
          title: 'Service worker tidak tersedia',
          description:
            'Notifikasi push memerlukan *service worker* yang siap dalam konteks browser ini.',
          color: 'warning'
        })
        return
      }

      if (result.reason === 'config') {
        toast.add({
          title: 'Konfigurasi push salah',
          description:
            'Aplikasi tersebut tidak memiliki kunci Web Push publiknya.',
          color: 'error'
        })
        return
      }

      toast.add({
        title: 'Push tidak tersedia',
        description:
          'Browser ini tidak dapat membuat subscription Web Push untuk aplikasi ini.',
        color: 'error'
      })
      return
    }

    toast.add({
      title: 'Notifikasi diaktifkan',
      description: 'Browser ini telah subscription notifikasi Web Push.',
      color: 'success'
    })
  } catch (error) {
    const description
      = error instanceof Error
        ? error.message
        : 'Tidak dapat mengaktifkan notifikasi.'

    toast.add({
      title: 'subscription gagal',
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
      title: 'Notifikasi dinonaktifkan',
      description: 'subscription browser ini telah dihapus.',
      color: 'success'
    })
  } catch (error) {
    const description
      = error instanceof Error
        ? error.message
        : 'Tidak dapat menonaktifkan notifikasi.'

    toast.add({
      title: 'Gagal Unsubscribe',
      description,
      color: 'error'
    })
  } finally {
    await refreshSubscriptionState()
  }
}

async function toggleNotifications(nextValue: boolean | string) {
  if (
    busy.value
    || typeof nextValue !== 'boolean'
    || nextValue === isSubscribed.value
  ) {
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
          Tampilkan Notifikasi
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
  </div>
</template>
