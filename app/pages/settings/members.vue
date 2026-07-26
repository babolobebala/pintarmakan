<script setup lang="ts">
import type { Member } from '~/types'

definePageMeta({
  permission: 'settings.members.view'
})

const { data: currentUser } = await useCurrentUser()
const { data: members, refresh } = await useFetch<Member[]>('/api/members', { default: () => [] })

const q = ref('')
const selectedMember = ref<Member | null>(null)
const passwordModalOpen = ref(false)
const canCreateMembers = computed(() => currentUser.value?.user.permissions.includes('users.create') ?? false)
const canUpdateMembers = computed(() => currentUser.value?.user.permissions.includes('users.update') ?? false)

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function openPasswordModal(member: Member) {
  selectedMember.value = member
  passwordModalOpen.value = true
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
      description="Create approved internal users and assign their RBAC roles."
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
        :can-manage-password="canUpdateMembers"
        @password="openPasswordModal"
      />
    </UPageCard>

    <SettingsMembersPasswordModal
      v-if="canUpdateMembers"
      v-model:open="passwordModalOpen"
      :member="selectedMember"
      @updated="refresh()"
    />
  </div>
</template>
