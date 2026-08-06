<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

import { appPermissions, formatRoleLabel, hasAccessForRole } from '~~/auth/permissions'

const toast = useToast()
const appConfig = useAppConfig()
const { data: currentUser } = await useCurrentUser()

const open = ref(false)
const pwaToastId = 'pwa-install'

const links = computed(() => {
  const permissionByPath = {
    '/': appPermissions.dashboardRead,
    '/produksi-pangan': appPermissions.dashboardRead,
    '/settings': appPermissions.settingsRead,
    '/settings/members': appPermissions.membersRead
  }

  const items = [[{
    label: 'Executive Dashboard',
    icon: 'i-lucide-layout-dashboard',
    to: '/',
    onSelect: () => {
      open.value = false
    }
  }, {
    label: 'Produksi Pangan',
    icon: 'i-lucide-map',
    to: '/produksi-pangan',
    onSelect: () => {
      open.value = false
    }
  }, {
    label: 'Settings',
    to: '/settings',
    icon: 'i-lucide-settings',
    defaultOpen: true,
    type: 'trigger',
    children: [{
      label: 'General',
      to: '/settings',
      exact: true,
      onSelect: () => {
        open.value = false
      }
    }, {
      label: 'Members',
      to: '/settings/members',
      onSelect: () => {
        open.value = false
      }
    }]
  }]] satisfies NavigationMenuItem[][]

  return items
    .map((group) => {
      return group.filter((item) => {
        const permission = item.to && typeof item.to === 'string'
          ? permissionByPath[item.to as keyof typeof permissionByPath]
          : undefined

        return !permission || hasAccessForRole(currentUser.value?.user.role, permission)
      })
    })
    .filter(group => group.length > 0)
})

const brand = computed(() => ({
  title: appConfig.appName || 'Internal Dashboard',
  subtitle: currentUser.value?.user.roles.map(formatRoleLabel).join(', ') || 'Workspace'
}))

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
  <UDashboardGroup unit="rem">
    <UDashboardSidebar
      id="default"
      v-model:open="open"
      collapsible
      resizable
      class="bg-elevated/25"
      :ui="{ footer: 'lg:border-t lg:border-default' }"
    >
      <template #header="{ collapsed }">
        <div
          class="flex min-w-0 items-center gap-3 px-1"
          :class="collapsed ? 'justify-center' : ''"
        >
          <div class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-inverted">
            <UIcon name="i-lucide-layout-dashboard" class="size-4" />
          </div>

          <div v-if="!collapsed" class="min-w-0">
            <p class="truncate text-sm font-semibold text-highlighted">
              {{ brand.title }}
            </p>
            <p class="truncate text-xs text-muted capitalize">
              {{ brand.subtitle }}
            </p>
          </div>
        </div>
      </template>

      <template #default="{ collapsed }">
        <UNavigationMenu
          :collapsed="collapsed"
          :items="links[0]"
          orientation="vertical"
          tooltip
          popover
        />
      </template>

      <template #footer="{ collapsed }">
        <UserMenu :collapsed="collapsed" />
      </template>
    </UDashboardSidebar>

    <slot />
  </UDashboardGroup>
</template>
