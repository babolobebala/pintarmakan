<script setup lang="ts">
const appConfig = useAppConfig()
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
    <div class="px-4 pt-2.5 sm:px-6 sm:pt-3 lg:px-8">
      <div class="mx-auto flex w-full max-w-[1800px] items-center justify-between gap-2.5 rounded-full border border-[var(--app-border)] bg-[color-mix(in_oklch,var(--app-surface)_92%,transparent)] px-2.5 py-1.5 shadow-sm backdrop-blur">
        <NuxtLink to="/" class="flex min-w-0 items-center gap-2.5 rounded-full pr-2 transition-[transform] duration-200 ease-[var(--ease-out)] hover:translate-x-[1px] motion-reduce:transition-none">
          <div class="flex size-9 shrink-0 items-center justify-center rounded-full border border-[color-mix(in_oklch,var(--app-accent)_10%,var(--app-border))] bg-[color-mix(in_oklch,var(--app-surface)_86%,white)] text-[var(--app-foreground)] shadow-[0_10px_24px_-20px_color-mix(in_oklch,var(--app-accent)_18%,transparent)]">
            <UIcon name="i-lucide-house" class="size-4" />
          </div>
          <img
            src="/icons/logo_name.png"
            :alt="appConfig.appName || 'SmartFood KSB'"
            class="ml-3 h-8 w-auto shrink-0 object-contain sm:h-9"
          >
        </NuxtLink>

        <div class="shrink-0">
          <UserMenu />
        </div>
      </div>
    </div>

    <main class="px-4 pb-4 pt-3 sm:px-6 sm:pb-6 sm:pt-4 lg:px-8 lg:pb-8 lg:pt-4">
      <div class="mx-auto w-full max-w-[1800px]">
        <slot />
      </div>
    </main>
  </div>
</template>
