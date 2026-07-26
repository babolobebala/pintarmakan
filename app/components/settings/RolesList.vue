<script setup lang="ts">
import type { RoleRecord } from '~/types'

defineProps<{
  roles: RoleRecord[]
  canManage?: boolean
}>()

defineEmits<{
  edit: [role: RoleRecord]
  delete: [role: RoleRecord]
}>()
</script>

<template>
  <ul role="list" class="divide-y divide-default">
    <li
      v-for="role in roles"
      :key="role.id"
      class="flex flex-col gap-4 px-4 py-4 sm:px-6"
    >
      <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div class="min-w-0 space-y-2">
          <div class="flex flex-wrap items-center gap-2">
            <p class="font-medium text-highlighted">
              {{ role.name }}
            </p>

            <UBadge
              color="neutral"
              variant="outline"
              :label="role.slug"
            />

            <UBadge
              :color="role.isSystem ? 'warning' : 'success'"
              variant="subtle"
              :label="role.isSystem ? 'System role' : 'Custom role'"
            />

            <UBadge
              color="neutral"
              variant="subtle"
              :label="`${role.assignedUserCount} member${role.assignedUserCount === 1 ? '' : 's'}`"
            />
          </div>

          <p class="text-sm text-muted">
            {{ role.description || 'No description provided.' }}
          </p>
        </div>

        <div v-if="canManage" class="flex flex-wrap gap-2">
          <UButton
            v-if="role.canEdit"
            label="Edit"
            size="xs"
            color="neutral"
            variant="subtle"
            @click="$emit('edit', role)"
          />
          <UButton
            v-if="role.canDelete"
            label="Delete"
            size="xs"
            color="error"
            variant="soft"
            @click="$emit('delete', role)"
          />
        </div>
      </div>

      <div class="flex flex-wrap gap-2">
        <UBadge
          v-for="permission in role.permissions"
          :key="permission"
          color="neutral"
          variant="outline"
          :label="permission"
        />
      </div>
    </li>
  </ul>
</template>
