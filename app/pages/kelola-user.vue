<script setup lang="ts">
import type { DropdownMenuItem, TableColumn } from '@nuxt/ui'
import type { Member } from '~/types'

import {
  appPermissions,
  formatRoleLabel,
  hasAccessForRole
} from '~~/auth/permissions'

definePageMeta({
  permission: appPermissions.membersRead
})

const { data: currentUser } = await useCurrentUser()
const {
  data: members,
  error,
  refresh,
  status
} = await useFetch<Member[]>('/api/members', { default: () => [] })

const q = ref('')
const selectedMember = ref<Member | null>(null)
const deleteModalOpen = ref(false)
const editModalOpen = ref(false)
const deleting = ref(false)
const passwordModalOpen = ref(false)
const toast = useToast()
const canCreateMembers = computed(() =>
  hasAccessForRole(currentUser.value?.user.role, appPermissions.membersCreate)
)
const canDeleteMembers = computed(() =>
  hasAccessForRole(currentUser.value?.user.role, appPermissions.membersDelete)
)
const canUpdateMembers = computed(() =>
  hasAccessForRole(currentUser.value?.user.role, appPermissions.membersUpdate)
)
const canManageStatus = computed(() =>
  hasAccessForRole(currentUser.value?.user.role, appPermissions.membersBan)
)
const canManagePassword = computed(() =>
  hasAccessForRole(
    currentUser.value?.user.role,
    appPermissions.membersSetPassword
  )
)
const hasRowActions = computed(
  () => canUpdateMembers.value || canDeleteMembers.value
)
const isPending = computed(() => status.value === 'pending')
const isSearching = computed(() => q.value.trim().length > 0)
const totalMembersLabel = computed(
  () =>
    `${members.value.length} member${members.value.length === 1 ? '' : 's'}`
)

function openPasswordModal(member: Member) {
  selectedMember.value = member
  passwordModalOpen.value = true
}

function openEditModal(member: Member) {
  selectedMember.value = member
  editModalOpen.value = true
}

function openDeleteModal(member: Member) {
  selectedMember.value = member
  deleteModalOpen.value = true
}

async function toggleMemberStatus(member: Member) {
  const activate = member.isBanned
  const actionLabel = activate ? 'activate' : 'deactivate'

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

async function deleteMember() {
  if (!selectedMember.value) {
    return
  }

  deleting.value = true

  try {
    await $fetch(`/api/members/${selectedMember.value.id}`, {
      method: 'DELETE'
    })

    toast.add({
      title: 'Member deleted',
      description: `${selectedMember.value.email} has been removed.`,
      color: 'success'
    })

    deleteModalOpen.value = false
    editModalOpen.value = false
    passwordModalOpen.value = false
    selectedMember.value = null
    await refresh()
  } catch (error) {
    toast.add({
      title: 'Unable to delete member',
      description: error instanceof Error ? error.message : 'Please try again.',
      color: 'error'
    })
  } finally {
    deleting.value = false
  }
}

function getMemberSearchValue(member: Member) {
  return `${member.name} ${member.email}`.toLowerCase()
}

const filteredMembers = computed(() => {
  const search = q.value.trim().toLowerCase()

  if (!search) {
    return members.value
  }

  return members.value.filter((member) => {
    return getMemberSearchValue(member).includes(search)
  })
})

const columns: TableColumn<Member>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    meta: {
      class: {
        th: 'px-4 py-3 text-xs font-medium uppercase tracking-[0.16em] text-muted',
        td: 'px-4 py-3 align-middle'
      }
    }
  },
  {
    accessorKey: 'email',
    header: 'Email',
    meta: {
      class: {
        th: 'px-4 py-3 text-xs font-medium uppercase tracking-[0.16em] text-muted',
        td: 'px-4 py-3 align-middle'
      }
    }
  },
  {
    accessorKey: 'roles',
    header: 'Role',
    meta: {
      class: {
        th: 'px-4 py-3 text-xs font-medium uppercase tracking-[0.16em] text-muted',
        td: 'px-4 py-3 align-middle'
      }
    }
  },
  {
    id: 'actions',
    header: 'Actions',
    meta: {
      class: {
        th: 'px-4 py-3 text-right text-xs font-medium uppercase tracking-[0.16em] text-muted',
        td: 'px-4 py-3 align-middle'
      }
    }
  }
]

function getRowActions(member: Member): DropdownMenuItem[][] {
  return [
    [
      {
        label: 'Edit',
        icon: 'i-lucide-pencil-line',
        disabled: !canUpdateMembers.value,
        onSelect: () => openEditModal(member)
      },
      {
        label: 'Delete',
        icon: 'i-lucide-trash-2',
        color: 'error',
        disabled:
          !canDeleteMembers.value || member.id === currentUser.value?.user.id,
        onSelect: () => openDeleteModal(member)
      }
    ]
  ]
}
</script>

<template>
  <div class="mx-auto flex w-full max-w-[1800px] flex-col gap-4 sm:gap-6 lg:gap-8">
    <section class="rounded-[var(--radius-shell)] border border-[var(--app-border)] bg-[var(--app-surface)] px-5 py-5 shadow-sm sm:px-6">
      <div class="space-y-2">
        <p class="cobalt-kicker text-[var(--app-foreground-soft)]">
          Kontrol akses
        </p>
        <div class="space-y-1">
          <h1 class="text-2xl font-semibold tracking-tight text-[var(--app-foreground)]">
            Kelola User
          </h1>
          <p class="text-sm leading-6 text-[var(--app-foreground-muted)]">
            Kelola akun internal dan peran Better Auth tanpa navigasi tab di bagian atas halaman.
          </p>
        </div>
      </div>
    </section>

    <div class="space-y-4">
      <section
        class="overflow-hidden rounded-2xl border border-default bg-default"
      >
        <div
          class="flex flex-col gap-4 border-b border-default px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div class="space-y-1">
            <div class="flex flex-wrap items-center gap-2">
              <h2 class="text-lg font-semibold text-highlighted">
                Members
              </h2>
              <UBadge color="neutral" variant="subtle" size="sm">
                {{ totalMembersLabel }}
              </UBadge>
            </div>
            <p class="text-sm text-muted">
              Manage internal users and assign their Better Auth roles.
            </p>
          </div>

          <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
            <UInput
              v-model="q"
              icon="i-lucide-search"
              placeholder="Search members..."
              class="w-full sm:w-72"
            />
            <SettingsMembersCreateModal
              v-if="canCreateMembers"
              @created="refresh()"
            />
          </div>
        </div>

        <div v-if="isPending && !members.length" class="px-4 py-3">
          <div class="min-w-[720px] divide-y divide-default">
            <div
              class="grid grid-cols-[minmax(0,2fr)_minmax(0,1.6fr)_minmax(0,1.4fr)_96px] gap-4 px-4 py-3"
            >
              <div class="h-3 w-20 rounded bg-elevated" />
              <div class="h-3 w-20 rounded bg-elevated" />
              <div class="h-3 w-16 rounded bg-elevated" />
              <div class="ms-auto h-3 w-16 rounded bg-elevated" />
            </div>
            <div
              v-for="row in 5"
              :key="row"
              class="grid min-w-[720px] grid-cols-[minmax(0,2fr)_minmax(0,1.6fr)_minmax(0,1.4fr)_96px] gap-4 px-4 py-4"
            >
              <div class="flex items-center gap-3">
                <div class="size-9 rounded-full bg-elevated" />
                <div class="space-y-2">
                  <div class="h-3 w-32 rounded bg-elevated" />
                  <div class="h-3 w-24 rounded bg-elevated/80" />
                </div>
              </div>
              <div class="h-3 w-40 self-center rounded bg-elevated" />
              <div class="flex flex-wrap gap-2">
                <div class="h-6 w-20 rounded-full bg-elevated" />
                <div class="h-6 w-16 rounded-full bg-elevated/80" />
              </div>
              <div class="ms-auto h-8 w-8 rounded-lg bg-elevated" />
            </div>
          </div>
        </div>

        <div v-else-if="error" class="px-4 py-10">
          <UEmpty
            icon="i-lucide-user-round-search"
            title="Unable to load members"
            description="Please refresh the list and try again."
            :actions="[
              {
                label: 'Retry',
                icon: 'i-lucide-refresh-cw',
                color: 'neutral',
                variant: 'subtle',
                onClick: () => refresh()
              }
            ]"
          />
        </div>

        <div v-else class="overflow-x-auto">
          <UTable
            :data="filteredMembers"
            :columns="columns"
            :loading="isPending && members.length > 0"
            :ui="{
              root: 'min-w-[720px]',
              thead: 'bg-elevated/35',
              tr: 'border-b border-default last:border-b-0',
              td: 'border-b-0',
              th: 'border-b border-default'
            }"
            :get-row-id="(row) => row.id"
          >
            <template #name-cell="{ row }">
              <div class="flex min-w-0 items-center gap-3">
                <UAvatar
                  v-bind="row.original.avatar"
                  :alt="row.original.name"
                  :text="row.original.name.slice(0, 1)"
                  size="md"
                />
                <div class="min-w-0">
                  <p class="truncate text-sm font-medium text-highlighted">
                    {{ row.original.name }}
                  </p>
                  <p class="text-xs text-muted">
                    {{
                      row.original.isBanned
                        ? "Access deactivated"
                        : "Active member"
                    }}
                  </p>
                </div>
              </div>
            </template>

            <template #email-cell="{ row }">
              <p class="max-w-xs truncate text-sm text-muted sm:max-w-sm">
                {{ row.original.email }}
              </p>
            </template>

            <template #roles-cell="{ row }">
              <div class="flex flex-wrap gap-2">
                <UBadge
                  v-for="role in row.original.roles"
                  :key="role"
                  color="neutral"
                  variant="soft"
                  size="sm"
                >
                  {{ formatRoleLabel(role) }}
                </UBadge>
              </div>
            </template>

            <template #actions-cell="{ row }">
              <div class="flex justify-end">
                <UDropdownMenu
                  v-if="hasRowActions"
                  :items="getRowActions(row.original)"
                  :content="{ align: 'end', sideOffset: 8 }"
                  :ui="{ content: 'w-36' }"
                >
                  <UButton
                    icon="i-lucide-ellipsis"
                    color="neutral"
                    variant="ghost"
                    size="sm"
                    square
                  />
                </UDropdownMenu>
                <span v-else class="text-sm text-muted">-</span>
              </div>
            </template>

            <template #empty>
              <div class="px-4 py-12">
                <UEmpty
                  icon="i-lucide-users"
                  :title="
                    isSearching
                      ? 'No members match your search.'
                      : 'No members found.'
                  "
                  :description="
                    isSearching
                      ? 'Try a different name or email.'
                      : 'Add a member to start managing user access.'
                  "
                  variant="naked"
                />
              </div>
            </template>
          </UTable>
        </div>
      </section>

      <SettingsMembersCreateModal
        v-if="canUpdateMembers"
        v-model:open="editModalOpen"
        :member="selectedMember"
        :show-trigger="false"
        :can-manage-password="canManagePassword"
        :can-manage-status="canManageStatus"
        @updated="refresh()"
        @password="
          (member) => {
            editModalOpen = false;
            openPasswordModal(member);
          }
        "
        @status="
          (member) => {
            editModalOpen = false;
            toggleMemberStatus(member);
          }
        "
      />

      <UModal
        v-model:open="deleteModalOpen"
        title="Delete member?"
        :description="
          selectedMember
            ? `This will permanently remove ${selectedMember.name} (${selectedMember.email}).`
            : ''
        "
        :dismissible="!deleting"
      >
        <template #body>
          <div class="space-y-4">
            <p class="text-sm text-muted">
              This action cannot be undone.
            </p>

            <div class="flex justify-end gap-2">
              <UButton
                label="Cancel"
                color="neutral"
                variant="subtle"
                :disabled="deleting"
                @click="deleteModalOpen = false"
              />
              <UButton
                label="Delete"
                color="error"
                :loading="deleting"
                @click="deleteMember"
              />
            </div>
          </div>
        </template>
      </UModal>

      <SettingsMembersPasswordModal
        v-if="canManagePassword"
        v-model:open="passwordModalOpen"
        :member="selectedMember"
        @updated="refresh()"
      />
    </div>
  </div>
</template>
