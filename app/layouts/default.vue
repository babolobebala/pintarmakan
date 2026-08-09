<script setup lang="ts">
const toast = useToast()
const pwaToastId = 'pwa-install'

onMounted(() => {
  const pwa = usePWA()
  if (!pwa) {
    return
  }

  const showInstallToast = () => {
    if (!pwa.showInstallPrompt || pwa.isPWAInstalled) {
      toast.remove(pwaToastId)
      return
    }

    toast.add({
      id: pwaToastId,
      title: 'Install this app',
      description: 'Add this dashboard to your device for faster access and a more app-like experience.',
      color: 'primary',
      duration: 0,
      actions: [{
        label: 'Install',
        onClick: async () => {
          await pwa.install()
          toast.remove(pwaToastId)
        }
      }, {
        label: 'Later',
        color: 'neutral',
        variant: 'subtle',
        onClick: () => {
          toast.remove(pwaToastId)
        }
      }, {
        label: 'Don\'t show again',
        color: 'neutral',
        variant: 'ghost',
        onClick: () => {
          pwa.cancelInstall()
          toast.remove(pwaToastId)
        }
      }]
    })
  }

  watch(() => pwa.showInstallPrompt, (show) => {
    if (show) {
      showInstallToast()
      return
    }

    toast.remove(pwaToastId)
  }, { immediate: true })

  watch(() => pwa.isPWAInstalled, (installed) => {
    if (installed) {
      toast.remove(pwaToastId)
    }
  })
})
</script>

<template>
  <div class="min-h-screen bg-[var(--app-background)]">
    <AppTopHeader />

    <main class="px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <div class="mx-auto w-full max-w-[1800px]">
        <slot />
      </div>
    </main>
  </div>
</template>
