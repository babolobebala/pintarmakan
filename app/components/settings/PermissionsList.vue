<script setup lang="ts">
import type { PermissionRecord } from '~/types'

defineProps<{
  groups: Array<{
    name: string
    permissions: PermissionRecord[]
  }>
  canEdit?: boolean
  canDelete?: boolean
}>()

defineEmits<{
  edit: [permission: PermissionRecord]
  delete: [permission: PermissionRecord]
}>()
</script>

<template>
  <div class="space-y-4 p-4 sm:p-6">
    <UPageCard
      v-for="group in groups"
      :key="group.name"
      :title="group.name"
      :description="`${group.permissions.length} permission${group.permissions.length === 1 ? '' : 's'} in this group.`"
      variant="ghost"
      :ui="{ container: 'p-0 sm:p-0', wrapper: 'gap-y-0', header: 'px-4 py-4 sm:px-5 border-b border-default', body: 'px-0 py-0' }"
    >
      <ul role="list" class="divide-y divide-default">
        <li
          v-for="permission in group.permissions"
          :key="permission.id"
          class="flex flex-col gap-4 px-4 py-4 sm:px-5"
        >
          <div class="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div class="min-w-0 space-y-2">
              <div class="flex flex-wrap items-center gap-2">
                <p class="font-medium text-highlighted">
                  {{ permission.label }}
                </p>

                <UBadge
                  color="neutral"
                  variant="outline"
                  :label="permission.key"
                />

                <UBadge
                  :color="permission.isSystem ? 'warning' : 'success'"
                  variant="subtle"
                  :label="permission.isSystem ? 'System permission' : 'Custom permission'"
                />

                <UBadge
                  color="neutral"
                  variant="subtle"
                  :label="`${permission.assignedRoleCount} role${permission.assignedRoleCount === 1 ? '' : 's'}`"
                />
              </div>

              <p class="text-sm text-muted">
                {{ permission.description || 'No description provided.' }}
              </p>

              <div class="flex flex-wrap items-center gap-2">
                <span class="text-xs uppercase tracking-[0.2em] text-muted">
                  Used by
                </span>

                <template v-if="permission.assignedRoles.length > 0">
                  <UBadge
                    v-for="role in permission.assignedRoles.slice(0, 4)"
                    :key="role.slug"
                    color="neutral"
                    variant="outline"
                    :label="role.name"
                  />

                  <UBadge
                    v-if="permission.assignedRoles.length > 4"
                    color="neutral"
                    variant="outline"
                    :label="`+${permission.assignedRoles.length - 4} more`"
                  />
                </template>

                <span v-else class="text-sm text-muted">
                  No roles yet
                </span>
              </div>
            </div>

            <div v-if="canEdit || canDelete" class="flex flex-wrap gap-2">
              <UButton
                v-if="permission.canEdit && canEdit"
                label="Edit"
                size="xs"
                color="neutral"
                variant="subtle"
                @click="$emit('edit', permission)"
              />
              <UButton
                v-if="permission.canDelete && canDelete"
                label="Delete"
                size="xs"
                color="error"
                variant="soft"
                @click="$emit('delete', permission)"
              />
            </div>
          </div>
        </li>
      </ul>
    </UPageCard>
  </div>
</template>
