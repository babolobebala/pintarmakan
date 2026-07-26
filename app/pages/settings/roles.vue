<script setup lang="ts">
import type { RoleRecord } from '~/types'

definePageMeta({
  permission: 'roles.view'
})

const toast = useToast()
const { data: currentUser } = await useCurrentUser()
const { data: roles, refresh } = await useFetch<RoleRecord[]>('/api/roles', {
  default: () => []
})

const q = ref('')
const editorOpen = ref(false)
const selectedRole = ref<RoleRecord | null>(null)
const canManage = computed(() => currentUser.value?.user.permissions.includes('roles.manage') ?? false)

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const filteredRoles = computed(() => {
  const pattern = new RegExp(escapeRegExp(q.value), 'i')

  return roles.value.filter((role) => {
    return pattern.test(role.name) || pattern.test(role.slug) || pattern.test(role.description || '')
  })
})

function openCreateModal() {
  selectedRole.value = null
  editorOpen.value = true
}

function openEditModal(role: RoleRecord) {
  selectedRole.value = role
  editorOpen.value = true
}

async function deleteRole(role: RoleRecord) {
  if (!import.meta.client || !window.confirm(`Delete the role "${role.name}"?`)) {
    return
  }

  try {
    await $fetch(`/api/roles/${role.id}`, {
      method: 'DELETE'
    })

    toast.add({
      title: 'Role deleted',
      description: `${role.name} has been removed.`,
      color: 'success'
    })

    await refresh()
  } catch (error) {
    toast.add({
      title: 'Unable to delete role',
      description: error instanceof Error ? error.message : 'Please try again.',
      color: 'error'
    })
  }
}
</script>

<template>
  <div>
    <UPageCard
      title="Roles"
      description="Manage reusable role definitions and the permissions assigned to each role."
      variant="naked"
      orientation="horizontal"
      class="mb-4"
    >
      <UButton
        v-if="canManage"
        label="Create role"
        icon="i-lucide-shield-plus"
        class="w-fit lg:ms-auto"
        @click="openCreateModal"
      />
    </UPageCard>

    <UPageCard variant="subtle" :ui="{ container: 'p-0 sm:p-0 gap-y-0', wrapper: 'items-stretch', header: 'p-4 mb-0 border-b border-default' }">
      <template #header>
        <UInput
          v-model="q"
          icon="i-lucide-search"
          placeholder="Search roles"
          class="w-full"
        />
      </template>

      <SettingsRolesList
        :roles="filteredRoles"
        :can-manage="canManage"
        @edit="openEditModal"
        @delete="deleteRole"
      />
    </UPageCard>

    <SettingsRoleEditorModal
      v-if="canManage"
      v-model:open="editorOpen"
      :role="selectedRole"
      @saved="refresh()"
    />
  </div>
</template>
