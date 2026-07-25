<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const route = useRoute()
const toast = useToast()
const { data: currentUser } = await useCurrentUser()

const open = ref(false)
const pwaToastId = 'pwa-install'

const links = computed(() => {
  const permissionByPath: Record<string, string | undefined> = {
    '/': 'dashboard.view',
    '/inbox': 'inbox.view',
    '/customers': 'customers.view',
    '/settings': 'settings.view',
    '/settings/members': 'settings.members.view',
    '/settings/notifications': 'settings.notifications.view',
    '/settings/security': 'settings.security.view'
  }

  const items = [[{
  label: 'Home',
  icon: 'i-lucide-house',
  to: '/',
  onSelect: () => {
    open.value = false
  }
}, {
  label: 'Inbox',
  icon: 'i-lucide-inbox',
  to: '/inbox',
  badge: '4',
  onSelect: () => {
    open.value = false
  }
}, {
  label: 'Customers',
  icon: 'i-lucide-users',
  to: '/customers',
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
  }, {
    label: 'Notifications',
    to: '/settings/notifications',
    onSelect: () => {
      open.value = false
    }
  }, {
    label: 'Security',
    to: '/settings/security',
    onSelect: () => {
      open.value = false
    }
  }]
}], [{
  label: 'Feedback',
  icon: 'i-lucide-message-circle',
  to: 'https://github.com/nuxt-ui-templates/dashboard',
  target: '_blank'
}, {
  label: 'Help & Support',
  icon: 'i-lucide-info',
  to: 'https://github.com/nuxt-ui-templates/dashboard',
  target: '_blank'
}]] satisfies NavigationMenuItem[][]

  return items.map((group) => {
    return group.filter((item) => {
      const permission = item.to && typeof item.to === 'string'
        ? permissionByPath[item.to]
        : undefined

      return !permission || currentUser.value?.user.permissions.includes(permission)
    })
  })
})

const groups = computed(() => [{
  id: 'links',
  label: 'Go to',
  items: links.value.flat()
}, {
  id: 'code',
  label: 'Code',
  items: [{
    id: 'source',
    label: 'View page source',
    icon: 'i-simple-icons-github',
    to: `https://github.com/nuxt-ui-templates/dashboard/blob/main/app/pages${route.path === '/' ? '/index' : route.path}.vue`,
    target: '_blank'
  }]
}])

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
        <TeamsMenu :collapsed="collapsed" />
      </template>

      <template #default="{ collapsed }">
        <UDashboardSearchButton :collapsed="collapsed" class="bg-transparent ring-default" />

        <UNavigationMenu
          :collapsed="collapsed"
          :items="links[0]"
          orientation="vertical"
          tooltip
          popover
        />

        <UNavigationMenu
          :collapsed="collapsed"
          :items="links[1]"
          orientation="vertical"
          tooltip
          class="mt-auto"
        />
      </template>

      <template #footer="{ collapsed }">
        <UserMenu :collapsed="collapsed" />
      </template>
    </UDashboardSidebar>

    <UDashboardSearch :groups="groups" />

    <slot />

    <NotificationsSlideover />
  </UDashboardGroup>
</template>
