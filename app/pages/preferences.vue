<script setup lang="ts">
import { formatRoleLabel } from '~~/auth/permissions'

const { data: currentUser } = await useCurrentUser()
</script>

<template>
  <UDashboardPanel id="preferences" :ui="{ body: 'lg:py-12' }">
    <template #header>
      <UDashboardNavbar title="Preferences">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex w-full flex-col gap-4 sm:gap-6 lg:mx-auto lg:max-w-5xl lg:gap-12">
        <UPageCard
          title="My Preferences"
          description="Manage your personal account preferences for this workspace."
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

            <USeparator />

            <PushNotificationsCard />
          </div>
        </UPageCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
