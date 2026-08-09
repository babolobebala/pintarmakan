<script setup lang="ts">
import { appPermissions, hasAccessForRole } from '~~/auth/permissions'

const { data: currentUser } = await useCurrentUser()
const route = useRoute()

const links = computed(() => [{
  label: 'General',
  icon: 'i-lucide-user',
  to: '/settings'
}, {
  label: 'Members',
  icon: 'i-lucide-users',
  to: '/settings/members'
}].filter((item) => {
  const permissionByPath = {
    '/settings/members': appPermissions.membersRead
  }

  const permission = item.to && typeof item.to === 'string'
    ? permissionByPath[item.to as keyof typeof permissionByPath]
    : undefined

  return !permission || hasAccessForRole(currentUser.value?.user.role, permission)
}))
</script>

<template>
  <div class="space-y-6">
    <section class="rounded-[var(--radius-shell)] border border-[var(--app-border)] bg-[var(--app-surface)] px-5 py-5 shadow-sm sm:px-6">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div class="space-y-2">
          <p class="cobalt-kicker text-[var(--app-foreground-soft)]">
            Pengaturan aplikasi
          </p>
          <div class="space-y-1">
            <h1 class="text-2xl font-semibold tracking-tight text-[var(--app-foreground)]">
              Settings
            </h1>
            <p class="max-w-2xl text-sm leading-6 text-[var(--app-foreground-muted)]">
              Settings tetap berada pada route terpisah, tetapi navigasinya kini lokal di level halaman tanpa sidebar global.
            </p>
          </div>
        </div>

        <div class="flex flex-wrap gap-2">
          <NuxtLink
            v-for="item in links"
            :key="item.to"
            :to="item.to"
          >
            <UButton
              :label="item.label"
              :icon="item.icon"
              color="neutral"
              :variant="route.path === item.to ? 'solid' : 'outline'"
              size="sm"
            />
          </NuxtLink>
        </div>
      </div>
    </section>

    <div class="mx-auto flex w-full max-w-5xl flex-col gap-4 sm:gap-6 lg:gap-8">
      <NuxtPage />
    </div>
  </div>
</template>
