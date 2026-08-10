<script setup lang="ts">
const toast = useToast()
const installing = ref(false)

const {
  isReady: isPwaStateReady,
  state: pwaInstallState,
  isInstallable,
  isInstalled,
  install
} = usePwaInstall()

const installStatus = computed(() => {
  if (!isPwaStateReady.value) {
    return {
      badge: 'Mengecek',
      color: 'neutral' as const,
      description:
        'Mengecek Apakah Aplikasi ini Sudah Terinstall atau Belum di Perangkat Ini'
    }
  }

  if (pwaInstallState.value === 'installed') {
    return {
      badge: 'Terinstall',
      color: 'success' as const,
      description: 'Aplikasi ini Sudah Terinstall di Perangkat Ini'
    }
  }

  if (pwaInstallState.value === 'installable') {
    return {
      badge: 'Tersedia',
      color: 'primary' as const,
      description: 'Install Aplikasi Ini di Perangkat Ini.'
    }
  }

  if (pwaInstallState.value === 'manual') {
    return {
      badge: 'Install Manual',
      color: 'neutral' as const,
      description: 'Install Melalui Menu Share -> Add to Home Screen.'
    }
  }

  return {
    badge: 'Tidak Tersedia',
    color: 'neutral' as const,
    description: 'Aplikasi Ini Tidak Bisa Terinstall di Perangkat Ini'
  }
})

async function installApplication() {
  installing.value = true

  try {
    const result = await install()

    if (!result) {
      toast.add({
        title: 'Install unavailable',
        description:
          'The browser did not expose an install prompt for this application.',
        color: 'neutral'
      })
      return
    }

    if (result.outcome === 'accepted') {
      toast.add({
        title: 'Install started',
        description:
          'Follow the browser prompt to finish installing this application.',
        color: 'success'
      })
      return
    }

    toast.add({
      title: 'Install dismissed',
      description: 'The application was not installed on this device.',
      color: 'neutral'
    })
  } catch (error) {
    const description
      = error instanceof Error
        ? error.message
        : 'Unable to start the install prompt.'

    toast.add({
      title: 'Install failed',
      description,
      color: 'error'
    })
  } finally {
    installing.value = false
  }
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="space-y-1">
        <p class="font-medium text-highlighted">
          Install Application
        </p>
        <p class="text-muted">
          {{ installStatus.description }}
        </p>
      </div>

      <UBadge :color="installStatus.color" variant="soft">
        {{ installStatus.badge }}
      </UBadge>
    </div>

    <div class="flex flex-wrap gap-3">
      <UButton
        v-if="isInstallable"
        :loading="installing"
        label="Install App"
        icon="i-lucide-download"
        @click="installApplication"
      />

      <UButton
        v-else-if="isInstalled"
        disabled
        color="success"
        variant="soft"
        label="Installed"
        icon="i-lucide-badge-check"
      />
    </div>
  </div>
</template>
