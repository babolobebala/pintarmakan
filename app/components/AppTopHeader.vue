<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

import { appPermissions, formatRoleLabel, hasAccessForRole } from '~~/auth/permissions'

const appConfig = useAppConfig()
const route = useRoute()
const { data: currentUser } = await useCurrentUser()

const brand = computed(() => ({
  title: appConfig.appName || 'SmartFood KSB',
  subtitle: currentUser.value?.user.roles.map(formatRoleLabel).join(', ') || 'Monitoring workspace'
}))

const navigation = computed(() => {
  const items = [{
    label: 'Dashboard',
    to: '/',
    icon: 'i-lucide-layout-dashboard',
    permission: appPermissions.dashboardRead,
    active: route.path === '/' && route.query.indicator !== 'produksi-pangan'
  }, {
    label: 'Produksi Pangan',
    to: {
      path: '/',
      query: {
        indicator: 'produksi-pangan'
      }
    },
    icon: 'i-lucide-chart-column-big',
    permission: appPermissions.dashboardRead,
    active: route.path === '/' && route.query.indicator === 'produksi-pangan'
  }, {
    label: 'Settings',
    to: '/settings',
    icon: 'i-lucide-settings-2',
    active: route.path === '/settings' || route.path.startsWith('/settings/')
  }]

  return items.filter(item => !item.permission || hasAccessForRole(currentUser.value?.user.role, item.permission))
})

const mobileItems = computed<DropdownMenuItem[][]>(() => ([navigation.value.map(item => ({
  label: item.label,
  icon: item.icon,
  to: item.to
}))]))
</script>

<template>
  <header class="sticky top-0 z-40 border-b border-[var(--app-border)] bg-[var(--app-surface)] backdrop-blur">
    <div class="mx-auto flex w-full max-w-[1800px] items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
      <NuxtLink to="/" class="flex min-w-0 items-center gap-3">
        <div class="flex size-11 shrink-0 items-center justify-center rounded-[calc(var(--radius-panel)+0.2rem)] bg-[var(--app-foreground)] text-[var(--app-surface)] shadow-sm">
          <UIcon name="i-lucide-wheat" class="size-5" />
        </div>

        <div class="hidden min-w-0 sm:block">
          <p class="truncate text-sm font-semibold text-[var(--app-foreground)]">
            {{ brand.title }}
          </p>
          <p class="truncate text-xs text-[var(--app-foreground-soft)]">
            {{ brand.subtitle }}
          </p>
        </div>
      </NuxtLink>

      <nav class="hidden items-center gap-1 md:flex">
        <NuxtLink
          v-for="item in navigation"
          :key="item.label"
          :to="item.to"
        >
          <UButton
            :label="item.label"
            :icon="item.icon"
            color="neutral"
            :variant="item.active ? 'solid' : 'ghost'"
            size="sm"
          />
        </NuxtLink>
      </nav>

      <div class="ml-auto flex items-center gap-2">
        <UDropdownMenu
          class="md:hidden"
          :items="mobileItems"
          :content="{ align: 'end', sideOffset: 10 }"
          :ui="{ content: 'w-60 rounded-[var(--radius-panel)]' }"
        >
          <UButton
            color="neutral"
            variant="outline"
            icon="i-lucide-menu"
            square
          />
        </UDropdownMenu>

        <UserMenu />
      </div>
    </div>
  </header>
</template>
