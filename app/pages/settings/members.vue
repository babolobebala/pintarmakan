<script setup lang="ts">
import type { Member } from '~/types'

import { appPermissions, hasAccessForRole } from '~~/auth/permissions'

definePageMeta({
  permission: appPermissions.membersRead
})

const { data: currentUser } = await useCurrentUser()
const { data: members, refresh } = await useFetch<Member[]>('/api/members', { default: () => [] })

const q = ref('')
const selectedMember = ref<Member | null>(null)
const passwordModalOpen = ref(false)
const toast = useToast()
const canCreateMembers = computed(() => hasAccessForRole(currentUser.value?.user.role, appPermissions.membersCreate))
const canManageStatus = computed(() => hasAccessForRole(currentUser.value?.user.role, appPermissions.membersBan))
const canManagePassword = computed(() => hasAccessForRole(currentUser.value?.user.role, appPermissions.membersSetPassword))

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function openPasswordModal(member: Member) {
  selectedMember.value = member
  passwordModalOpen.value = true
}

async function toggleMemberStatus(member: Member) {
  const activate = member.isBanned
  const actionLabel = activate ? 'activate' : 'deactivate'

  if (!import.meta.client || !window.confirm(`Are you sure you want to ${actionLabel} ${member.email}?`)) {
    return
  }

  try {
    await $fetch(`/api/members/${member.id}/status`, {
      method: 'POST',
      body: {
        active: activate
      }
    })

    toast.add({
      title: activate ? 'Member activated' : 'Member deactivated',
      description: activate
        ? `${member.email} can access the application again.`
        : `${member.email} can no longer access the application.`,
      color: 'success'
    })

    await refresh()
  } catch (error) {
    toast.add({
      title: `Unable to ${actionLabel} member`,
      description: error instanceof Error ? error.message : 'Please try again.',
      color: 'error'
    })
  }
}

const filteredMembers = computed(() => {
  const pattern = new RegExp(escapeRegExp(q.value), 'i')

  return members.value.filter((member) => {
    return pattern.test(member.name) || pattern.test(member.email)
  })
})
</script>

<template>
  <div>
    <UPageCard
      title="Members"
      description="Create approved internal users and assign their access roles."
      variant="naked"
      orientation="horizontal"
      class="mb-4"
    >
      <SettingsMembersCreateModal
        v-if="canCreateMembers"
        class="w-fit lg:ms-auto"
        @created="refresh()"
      />
    </UPageCard>

    <UPageCard variant="subtle" :ui="{ container: 'p-0 sm:p-0 gap-y-0', wrapper: 'items-stretch', header: 'p-4 mb-0 border-b border-default' }">
      <template #header>
        <UInput
          v-model="q"
          icon="i-lucide-search"
          placeholder="Search members"
          autofocus
          class="w-full"
        />
      </template>

      <SettingsMembersList
        :members="filteredMembers"
        :can-manage-status="canManageStatus"
        :can-manage-password="canManagePassword"
        @password="openPasswordModal"
        @status="toggleMemberStatus"
      />
    </UPageCard>

    <SettingsMembersPasswordModal
      v-if="canManagePassword"
      v-model:open="passwordModalOpen"
      :member="selectedMember"
      @updated="refresh()"
    />
  </div>
</template>
