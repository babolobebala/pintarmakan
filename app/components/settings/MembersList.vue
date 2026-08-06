<script setup lang="ts">
import type { Member } from '~/types'

import { formatRoleLabel } from '~~/auth/permissions'

defineProps<{
  members: Member[]
  canManagePassword?: boolean
  canManageStatus?: boolean
}>()

defineEmits<{
  password: [member: Member]
  status: [member: Member]
}>()
</script>

<template>
  <ul role="list" class="divide-y divide-default">
    <li
      v-for="(member, index) in members"
      :key="member.id || index"
      class="flex flex-col gap-4 py-4 px-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between"
    >
      <div class="flex items-center gap-3 min-w-0">
        <UAvatar
          v-bind="member.avatar"
          :alt="member.name"
          :text="member.name.slice(0, 1)"
          size="md"
        />

        <div class="text-sm min-w-0">
          <p class="text-highlighted font-medium truncate">
            {{ member.name }}
          </p>
          <p class="text-muted truncate">
            {{ member.email }}
          </p>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2 lg:justify-end">
        <UBadge
          :color="member.isBanned ? 'warning' : 'success'"
          variant="subtle"
          :label="member.isBanned ? 'Inactive' : 'Active'"
        />
        <UBadge
          :color="member.hasPassword ? 'primary' : 'neutral'"
          variant="subtle"
          :label="member.hasPassword ? 'Password ready' : 'Google-only for now'"
        />
        <UBadge
          v-for="role in member.roles"
          :key="role"
          color="neutral"
          variant="outline"
          class="capitalize"
          :label="formatRoleLabel(role)"
        />
        <UButton
          v-if="canManageStatus"
          size="xs"
          color="neutral"
          variant="subtle"
          :label="member.isBanned ? 'Activate' : 'Deactivate'"
          @click="$emit('status', member)"
        />
        <UButton
          v-if="canManagePassword"
          size="xs"
          color="neutral"
          variant="subtle"
          :label="member.hasPassword ? 'Reset password' : 'Set password'"
          @click="$emit('password', member)"
        />
      </div>
    </li>
  </ul>
</template>
