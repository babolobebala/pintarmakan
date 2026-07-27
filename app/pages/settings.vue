<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

definePageMeta({
  permission: 'settings.read'
})

const { data: currentUser } = await useCurrentUser()

const links = computed(() => [[{
  label: 'General',
  icon: 'i-lucide-user',
  to: '/settings',
  exact: true
}, {
  label: 'Members',
  icon: 'i-lucide-users',
  to: '/settings/members'
}, {
  label: 'Roles',
  icon: 'i-lucide-shield-check',
  to: '/settings/roles'
}, {
  label: 'Permissions',
  icon: 'i-lucide-key',
  to: '/settings/permissions'
}]].map((group) => {
  return group.filter((item) => {
    const permissionByPath: Record<string, string | undefined> = {
      '/settings': 'settings.read',
      '/settings/members': 'users.read',
      '/settings/roles': 'roles.read',
      '/settings/permissions': 'permissions.read'
    }

    const permission = item.to && typeof item.to === 'string'
      ? permissionByPath[item.to]
      : undefined

    return !permission || currentUser.value?.user.permissions.includes(permission)
  })
}) satisfies NavigationMenuItem[][])
</script>

<template>
  <UDashboardPanel id="settings" :ui="{ body: 'lg:py-12' }">
    <template #header>
      <UDashboardNavbar title="Settings">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <UNavigationMenu :items="links" highlight class="-mx-1 flex-1" />
      </UDashboardToolbar>
    </template>

    <template #body>
      <div class="flex w-full flex-col gap-4 sm:gap-6 lg:mx-auto lg:max-w-5xl lg:gap-12">
        <NuxtPage />
      </div>
    </template>
  </UDashboardPanel>
</template>
