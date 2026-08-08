<script setup lang="ts">
import { appPermissions, formatRoleLabel } from '~~/auth/permissions'

definePageMeta({
  permission: appPermissions.settingsRead
})

const { data: currentUser } = await useCurrentUser()
</script>

<template>
  <UPageCard
    title="Workspace"
    description="Starter settings overview for your internal application."
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

      <USeparator />

      <p class="text-muted">
        Replace this overview with your real profile, workspace, or organization settings once the business modules are ready.
      </p>
    </div>
  </UPageCard>
</template>
