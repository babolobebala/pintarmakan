<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

import { appPermissions, hasAccessForRole } from '~~/auth/permissions'

definePageMeta({
  permission: appPermissions.settingsRead
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
}]].map((group) => {
  return group.filter((item) => {
    const permissionByPath = {
      '/settings': appPermissions.settingsRead,
      '/settings/members': appPermissions.membersRead
    }

    const permission = item.to && typeof item.to === 'string'
      ? permissionByPath[item.to as keyof typeof permissionByPath]
      : undefined

    return !permission || hasAccessForRole(currentUser.value?.user.role, permission)
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
