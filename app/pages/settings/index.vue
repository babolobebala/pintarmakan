<script setup lang="ts">
import { appPermissions, formatRoleLabel } from '~~/auth/permissions'

definePageMeta({
  permission: appPermissions.settingsRead
})

const toast = useToast()
const { data: currentUser } = await useCurrentUser()
const installing = ref(false)

const {
  state: pwaInstallState,
  isInstallable,
  isInstalled,
  showIosHint,
  install
} = usePwaInstall()

const installStatus = computed(() => {
  if (pwaInstallState.value === 'installed') {
    return {
      badge: 'Installed',
      color: 'success' as const,
      description: 'This application is already installed on this device.'
    }
  }

  if (pwaInstallState.value === 'installable') {
    return {
      badge: 'Install available',
      color: 'primary' as const,
      description: 'Install this dashboard as an app on this device.'
    }
  }

  if (pwaInstallState.value === 'ios-manual') {
    return {
      badge: 'Manual install',
      color: 'neutral' as const,
      description: 'Install this app from Safari using the Share menu.'
    }
  }

  return {
    badge: 'Unavailable',
    color: 'neutral' as const,
    description: 'The install prompt is not available in this browser right now.'
  }
})

async function installApplication() {
  installing.value = true

  try {
    const result = await install()

    if (!result) {
      toast.add({
        title: 'Install unavailable',
        description: 'The browser did not expose an install prompt for this application.',
        color: 'neutral'
      })
      return
    }

    if (result.outcome === 'accepted') {
      toast.add({
        title: 'Install started',
        description: 'Follow the browser prompt to finish installing this application.',
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
    const description = error instanceof Error ? error.message : 'Unable to start the install prompt.'

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
  <div class="space-y-6">
    <UPageCard
      title="Account"
      description="Details about the currently signed-in account."
      variant="subtle"
    >
      <div class="space-y-6 text-sm">
        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <p class="text-muted">
              Signed-in name
            </p>
            <p class="font-medium text-highlighted">
              {{ currentUser?.user.name || '-' }}
            </p>
          </div>

          <div>
            <p class="text-muted">
              Email
            </p>
            <p class="font-medium text-highlighted">
              {{ currentUser?.user.email || '-' }}
            </p>
          </div>
        </div>

        <USeparator />

        <div>
          <p class="mb-2 text-muted">
            Assigned roles
          </p>
          <div class="flex flex-wrap gap-2">
            <UBadge
              v-for="role in currentUser?.user.roles || []"
              :key="role"
              color="neutral"
              variant="outline"
              class="capitalize"
              :label="formatRoleLabel(role)"
            />
          </div>
        </div>
      </div>
    </UPageCard>

    <UPageCard
      title="Application"
      description="Preferences for this browser and device."
      variant="subtle"
    >
      <div class="space-y-6 text-sm">
        <PushNotificationsCard />

        <USeparator />

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
              color="neutral"
              variant="soft"
              label="Installed"
              icon="i-lucide-check"
            />
          </div>

          <UAlert
            v-if="showIosHint"
            icon="i-lucide-smartphone"
            title="Install from Safari"
            description="Add this app to your Home Screen from the browser Share menu."
            color="neutral"
            variant="subtle"
          />

          <UAlert
            v-else-if="pwaInstallState === 'unavailable'"
            icon="i-lucide-info"
            title="Install prompt unavailable"
            description="This browser has not exposed an install prompt for this application."
            color="neutral"
            variant="subtle"
          />
        </div>
      </div>
    </UPageCard>
  </div>
</template>
