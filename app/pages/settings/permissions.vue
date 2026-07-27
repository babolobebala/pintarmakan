<script setup lang="ts">
import type { PermissionRecord } from '~/types'

definePageMeta({
  permission: 'permissions.read'
})

const toast = useToast()
const { data: currentUser } = await useCurrentUser()
const { data: permissions, refresh } = await useFetch<PermissionRecord[]>('/api/permissions', {
  default: () => []
})

const q = ref('')
const scope = ref<'all' | 'system' | 'custom'>('all')
const activeGroup = ref('all')
const editorOpen = ref(false)
const selectedPermission = ref<PermissionRecord | null>(null)
const canCreate = computed(() => currentUser.value?.user.permissions.includes('permissions.create') ?? false)
const canUpdate = computed(() => currentUser.value?.user.permissions.includes('permissions.update') ?? false)
const canDelete = computed(() => currentUser.value?.user.permissions.includes('permissions.delete') ?? false)

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const availableGroups = computed(() => {
  return Array.from(new Set(permissions.value.map(permission => permission.group))).sort((a, b) => a.localeCompare(b))
})

const metrics = computed(() => {
  const total = permissions.value.length
  const system = permissions.value.filter(permission => permission.isSystem).length
  const custom = total - system
  const assigned = permissions.value.filter(permission => permission.assignedRoleCount > 0).length

  return [
    {
      label: 'Total permissions',
      value: total,
      tone: 'text-primary'
    },
    {
      label: 'Custom permissions',
      value: custom,
      tone: 'text-success'
    },
    {
      label: 'System permissions',
      value: system,
      tone: 'text-warning'
    },
    {
      label: 'Assigned to roles',
      value: assigned,
      tone: 'text-info'
    }
  ]
})

const filteredPermissions = computed(() => {
  const pattern = new RegExp(escapeRegExp(q.value), 'i')

  return permissions.value.filter((permission) => {
    if (scope.value === 'system' && !permission.isSystem) {
      return false
    }

    if (scope.value === 'custom' && permission.isSystem) {
      return false
    }

    if (activeGroup.value !== 'all' && permission.group !== activeGroup.value) {
      return false
    }

    const roleMatches = permission.assignedRoles.some((role) => {
      return pattern.test(role.name) || pattern.test(role.slug)
    })

    return pattern.test(permission.label)
      || pattern.test(permission.key)
      || pattern.test(permission.group)
      || pattern.test(permission.description || '')
      || roleMatches
  })
})

const groupedPermissions = computed(() => {
  const groups = new Map<string, PermissionRecord[]>()

  for (const permission of filteredPermissions.value) {
    const items = groups.get(permission.group) ?? []
    items.push(permission)
    groups.set(permission.group, items)
  }

  return Array.from(groups.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([name, items]) => {
      return {
        name,
        permissions: items.sort((a, b) => a.label.localeCompare(b.label))
      }
    })
})

function openCreateModal() {
  if (!canCreate.value) {
    return
  }

  selectedPermission.value = null
  editorOpen.value = true
}

function openEditModal(permission: PermissionRecord) {
  if (!canUpdate.value) {
    return
  }

  selectedPermission.value = permission
  editorOpen.value = true
}

async function deletePermission(permission: PermissionRecord) {
  if (!canDelete.value) {
    return
  }

  if (!import.meta.client || !window.confirm(`Delete the permission "${permission.label}"?`)) {
    return
  }

  try {
    await $fetch(`/api/permissions/${permission.id}`, {
      method: 'DELETE'
    })

    toast.add({
      title: 'Permission deleted',
      description: `${permission.label} has been removed.`,
      color: 'success'
    })

    await refresh()
  } catch (error) {
    toast.add({
      title: 'Unable to delete permission',
      description: error instanceof Error ? error.message : 'Please try again.',
      color: 'error'
    })
  }
}
</script>

<template>
  <div class="space-y-6">
    <UPageCard
      title="Permissions"
      description="Manage the action definitions that power your RBAC model and make custom capabilities assignable to roles."
      variant="naked"
      orientation="horizontal"
      class="mb-2"
    >
      <UButton
        v-if="canCreate"
        label="Create permission"
        icon="i-lucide-key-round"
        class="w-fit lg:ms-auto"
        @click="openCreateModal"
      />
    </UPageCard>

    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <UPageCard
        v-for="metric in metrics"
        :key="metric.label"
        :title="metric.label"
        variant="subtle"
      >
        <div class="space-y-1">
          <p class="text-3xl font-semibold text-highlighted">
            {{ metric.value }}
          </p>
          <p class="text-sm text-muted">
            <span :class="metric.tone">{{ metric.label }}</span>
          </p>
        </div>
      </UPageCard>
    </div>

    <UPageCard
      title="Permission registry"
      description="System permissions come from code and stay read-only here. Custom permissions can be created for business-specific workflows."
      variant="subtle"
      :ui="{ container: 'p-0 sm:p-0 gap-y-0', wrapper: 'items-stretch', header: 'p-4 sm:p-6 mb-0 border-b border-default', body: 'p-0' }"
    >
      <template #header>
        <div class="space-y-4">
          <UInput
            v-model="q"
            icon="i-lucide-search"
            placeholder="Search permissions, groups, or roles"
            class="w-full"
          />

          <div class="flex flex-wrap gap-2">
            <UButton
              :variant="scope === 'all' ? 'solid' : 'subtle'"
              color="neutral"
              size="xs"
              label="All"
              @click="scope = 'all'"
            />
            <UButton
              :variant="scope === 'system' ? 'solid' : 'subtle'"
              color="neutral"
              size="xs"
              label="System"
              @click="scope = 'system'"
            />
            <UButton
              :variant="scope === 'custom' ? 'solid' : 'subtle'"
              color="neutral"
              size="xs"
              label="Custom"
              @click="scope = 'custom'"
            />
          </div>

          <div class="flex flex-wrap gap-2">
            <UButton
              :variant="activeGroup === 'all' ? 'solid' : 'outline'"
              color="neutral"
              size="xs"
              label="All groups"
              @click="activeGroup = 'all'"
            />
            <UButton
              v-for="group in availableGroups"
              :key="group"
              :variant="activeGroup === group ? 'solid' : 'outline'"
              color="neutral"
              size="xs"
              :label="group"
              @click="activeGroup = group"
            />
          </div>
        </div>
      </template>

      <template v-if="groupedPermissions.length > 0">
        <SettingsPermissionsList
          :groups="groupedPermissions"
          :can-edit="canUpdate"
          :can-delete="canDelete"
          @edit="openEditModal"
          @delete="deletePermission"
        />
      </template>

      <template v-else>
        <div class="p-6 text-sm text-muted">
          No permissions match the current filters.
        </div>
      </template>
    </UPageCard>

    <SettingsPermissionEditorModal
      v-if="canCreate || canUpdate"
      v-model:open="editorOpen"
      :permission="selectedPermission"
      @saved="refresh()"
    />
  </div>
</template>
