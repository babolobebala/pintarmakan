<script setup lang="ts">
definePageMeta({
  permission: 'dashboard.view'
})

const { data: currentUser } = await useCurrentUser()

const roleBadges = computed(() => currentUser.value?.user.roles ?? [])
const quickLinks = [{
  label: 'General settings',
  description: 'Review the current workspace and account setup.',
  to: '/settings',
  icon: 'i-lucide-settings'
}, {
  label: 'Manage members',
  description: 'Approve internal users and assign access roles.',
  to: '/settings/members',
  icon: 'i-lucide-users'
}]
</script>

<template>
  <UDashboardPanel id="home">
    <template #header>
      <UDashboardNavbar title="Dashboard">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <UPageCard
          title="Workspace overview"
          description="The template demo content has been removed. This is now your clean internal-app base."
          variant="subtle"
        >
          <div class="space-y-4 text-sm text-muted">
            <p>
              Signed in as <span class="font-medium text-highlighted">{{ currentUser?.user.name }}</span>
              with access to <span class="font-medium text-highlighted">{{ roleBadges.length }}</span>
              role<span v-if="roleBadges.length !== 1">s</span>.
            </p>

            <div class="flex flex-wrap gap-2">
              <UBadge
                v-for="role in roleBadges"
                :key="role"
                color="neutral"
                variant="outline"
                class="capitalize"
                :label="role"
              />
            </div>
          </div>
        </UPageCard>

        <UPageCard
          title="Account"
          description="Current authenticated user"
          variant="subtle"
        >
          <div class="space-y-3 text-sm">
            <div>
              <p class="text-muted">Name</p>
              <p class="font-medium text-highlighted">
                {{ currentUser?.user.name || '-' }}
              </p>
            </div>
            <div>
              <p class="text-muted">Email</p>
              <p class="font-medium text-highlighted">
                {{ currentUser?.user.email || '-' }}
              </p>
            </div>
          </div>
        </UPageCard>
      </div>

      <UPageCard
        title="Next steps"
        description="Replace these starter links with your actual business modules."
        variant="subtle"
      >
        <div class="grid gap-3 md:grid-cols-2">
          <NuxtLink
            v-for="link in quickLinks"
            :key="link.to"
            :to="link.to"
            class="rounded-xl border border-default p-4 transition hover:bg-elevated/50"
          >
            <div class="flex items-start gap-3">
              <div class="flex size-10 items-center justify-center rounded-lg bg-elevated">
                <UIcon :name="link.icon" class="size-5" />
              </div>

              <div class="min-w-0">
                <p class="font-medium text-highlighted">
                  {{ link.label }}
                </p>
                <p class="text-sm text-muted">
                  {{ link.description }}
                </p>
              </div>
            </div>
          </NuxtLink>
        </div>
      </UPageCard>
    </template>
  </UDashboardPanel>
</template>
