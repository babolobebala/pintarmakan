<script setup lang="ts">
import type { DropdownMenuItem, TableColumn } from '@nuxt/ui'
import type { DatasetManagementItem } from '~/types'

import AppPageIntro from '~/components/AppPageIntro.vue'
import { appPermissions, hasAccessForRole } from '~~/auth/permissions'

definePageMeta({
  permission: appPermissions.datasetsRead
})

const { data: currentUser } = await useCurrentUser()
const {
  data: datasets,
  error,
  refresh,
  status
} = await useFetch<DatasetManagementItem[]>('/api/datasets', {
  default: () => []
})

const q = ref('')
const selectedDataset = ref<DatasetManagementItem | null>(null)
const deleteModalOpen = ref(false)
const editModalOpen = ref(false)
const deleting = ref(false)
const toast = useToast()

const canCreateDatasets = computed(() =>
  hasAccessForRole(currentUser.value?.user.role, appPermissions.datasetsCreate)
)
const canUpdateDatasets = computed(() =>
  hasAccessForRole(currentUser.value?.user.role, appPermissions.datasetsUpdate)
)
const canDeleteDatasets = computed(() =>
  hasAccessForRole(currentUser.value?.user.role, appPermissions.datasetsDelete)
)
const hasRowActions = computed(
  () => canUpdateDatasets.value || canDeleteDatasets.value
)
const isPending = computed(() => status.value === 'pending')
const isSearching = computed(() => q.value.trim().length > 0)
const totalDatasetsLabel = computed(
  () => `${datasets.value.length} dataset${datasets.value.length === 1 ? '' : 's'}`
)

const dateTimeFormatter = new Intl.DateTimeFormat('id-ID', {
  dateStyle: 'medium',
  timeStyle: 'short'
})

const columns: TableColumn<DatasetManagementItem>[] = [
  {
    accessorKey: 'id',
    header: 'ID',
    meta: {
      class: {
        th: 'px-4 py-3 text-xs font-medium uppercase tracking-[0.16em] text-muted',
        td: 'px-4 py-3 align-middle'
      }
    }
  },
  {
    accessorKey: 'name',
    header: 'Nama',
    meta: {
      class: {
        th: 'px-4 py-3 text-xs font-medium uppercase tracking-[0.16em] text-muted',
        td: 'px-4 py-3 align-middle'
      }
    }
  },
  {
    accessorKey: 'description',
    header: 'Deskripsi',
    meta: {
      class: {
        th: 'px-4 py-3 text-xs font-medium uppercase tracking-[0.16em] text-muted',
        td: 'px-4 py-3 align-middle'
      }
    }
  },
  {
    accessorKey: 'periodicity',
    header: 'Periodicity',
    meta: {
      class: {
        th: 'px-4 py-3 text-xs font-medium uppercase tracking-[0.16em] text-muted',
        td: 'px-4 py-3 align-middle'
      }
    }
  },
  {
    accessorKey: 'createdAt',
    header: 'Dibuat',
    meta: {
      class: {
        th: 'px-4 py-3 text-xs font-medium uppercase tracking-[0.16em] text-muted',
        td: 'px-4 py-3 align-middle'
      }
    }
  },
  {
    accessorKey: 'updatedAt',
    header: 'Diperbarui',
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

const filteredDatasets = computed(() => {
  const search = q.value.trim().toLowerCase()

  if (!search) {
    return datasets.value
  }

  return datasets.value.filter((dataset) => {
    return [
      dataset.id,
      dataset.name,
      dataset.description ?? '',
      dataset.periodicity ?? ''
    ]
      .join(' ')
      .toLowerCase()
      .includes(search)
  })
})

function formatDateTime(value: string) {
  return dateTimeFormatter.format(new Date(value))
}

function openEditModal(dataset: DatasetManagementItem) {
  selectedDataset.value = dataset
  editModalOpen.value = true
}

function openDeleteModal(dataset: DatasetManagementItem) {
  selectedDataset.value = dataset
  deleteModalOpen.value = true
}

async function deleteDataset() {
  if (!selectedDataset.value) {
    return
  }

  deleting.value = true

  try {
    await $fetch(`/api/datasets/${selectedDataset.value.id}`, {
      method: 'DELETE'
    })

    toast.add({
      title: 'Dataset dihapus',
      description: `${selectedDataset.value.id} berhasil dihapus.`,
      color: 'success'
    })

    deleteModalOpen.value = false
    editModalOpen.value = false
    selectedDataset.value = null
    await refresh()
  } catch (error) {
    toast.add({
      title: 'Gagal menghapus dataset',
      description: error instanceof Error ? error.message : 'Silakan coba lagi.',
      color: 'error'
    })
  } finally {
    deleting.value = false
  }
}

function getRowActions(dataset: DatasetManagementItem): DropdownMenuItem[][] {
  return [[
    {
      label: 'Edit',
      icon: 'i-lucide-pencil-line',
      disabled: !canUpdateDatasets.value,
      onSelect: () => openEditModal(dataset)
    },
    {
      label: 'Delete',
      icon: 'i-lucide-trash-2',
      color: 'error',
      disabled: !canDeleteDatasets.value,
      onSelect: () => openDeleteModal(dataset)
    }
  ]]
}
</script>

<template>
  <div class="mx-auto flex w-full max-w-[1800px] flex-col gap-4 sm:gap-6 lg:gap-8">
    <AppPageIntro
      kicker="Struktur data"
      title="Kelola Dataset"
      description="Kelola definisi dataset global, ID teknis, schema JSON, dan config JSON untuk monitoring dashboard."
    />

    <div class="space-y-4">
      <section class="overflow-hidden rounded-2xl border border-default bg-default">
        <div
          class="flex flex-col gap-4 border-b border-default px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div class="space-y-1">
            <div class="flex flex-wrap items-center gap-2">
              <h2 class="text-lg font-semibold text-highlighted">
                Dataset
              </h2>
              <UBadge color="neutral" variant="subtle" size="sm">
                {{ totalDatasetsLabel }}
              </UBadge>
            </div>
            <p class="text-sm text-muted">
              Hanya Super Admin yang dapat membuat, mengubah, dan menghapus definisi dataset.
            </p>
          </div>

          <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
            <UInput
              v-model="q"
              icon="i-lucide-search"
              placeholder="Cari ID, nama, deskripsi, atau periodicity..."
              class="w-full sm:w-72"
            />
            <DatasetsFormModal
              v-if="canCreateDatasets"
              @created="refresh()"
            />
          </div>
        </div>

        <div v-if="isPending && !datasets.length" class="px-4 py-3">
          <div class="min-w-[960px] divide-y divide-default">
            <div
              class="grid grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)_minmax(0,1.7fr)_120px_180px_180px_96px] gap-4 px-4 py-3"
            >
              <div class="h-3 w-20 rounded bg-elevated" />
              <div class="h-3 w-24 rounded bg-elevated" />
              <div class="h-3 w-28 rounded bg-elevated/80" />
              <div class="h-3 w-20 rounded bg-elevated" />
              <div class="h-3 w-24 rounded bg-elevated/80" />
              <div class="h-3 w-24 rounded bg-elevated" />
              <div class="ms-auto h-3 w-16 rounded bg-elevated" />
            </div>
            <div
              v-for="row in 5"
              :key="row"
              class="grid min-w-[960px] grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)_minmax(0,1.7fr)_120px_180px_180px_96px] gap-4 px-4 py-4"
            >
              <div class="h-6 w-40 rounded-full bg-elevated/80" />
              <div class="space-y-2">
                <div class="h-3 w-40 rounded bg-elevated" />
                <div class="h-3 w-28 rounded bg-elevated/80" />
              </div>
              <div class="space-y-2">
                <div class="h-3 w-full rounded bg-elevated" />
                <div class="h-3 w-3/4 rounded bg-elevated/80" />
              </div>
              <div class="h-6 w-20 rounded-full bg-elevated/80" />
              <div class="h-3 w-28 self-center rounded bg-elevated" />
              <div class="h-3 w-28 self-center rounded bg-elevated/80" />
              <div class="ms-auto h-8 w-8 rounded-lg bg-elevated" />
            </div>
          </div>
        </div>

        <div v-else-if="error" class="px-4 py-10">
          <UEmpty
            icon="i-lucide-database-zap"
            title="Unable to load datasets"
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
            :data="filteredDatasets"
            :columns="columns"
            :loading="isPending && datasets.length > 0"
            :ui="{
              root: 'min-w-[1120px]',
              thead: 'bg-elevated/35',
              tr: 'border-b border-default last:border-b-0',
              td: 'border-b-0',
              th: 'border-b border-default'
            }"
            :get-row-id="(row) => row.id"
          >
            <template #id-cell="{ row }">
              <UBadge color="neutral" variant="subtle" size="sm">
                {{ row.original.id }}
              </UBadge>
            </template>

            <template #name-cell="{ row }">
              <div class="min-w-0">
                <p class="truncate text-sm font-medium text-highlighted">
                  {{ row.original.name }}
                </p>
              </div>
            </template>

            <template #description-cell="{ row }">
              <p class="max-w-md text-sm text-muted">
                {{ row.original.description || '—' }}
              </p>
            </template>

            <template #periodicity-cell="{ row }">
              <UBadge
                v-if="row.original.periodicity"
                color="neutral"
                variant="subtle"
                size="sm"
              >
                {{ row.original.periodicity }}
              </UBadge>
              <span v-else class="text-sm text-muted">—</span>
            </template>

            <template #createdAt-cell="{ row }">
              <span class="text-sm text-muted">
                {{ formatDateTime(row.original.createdAt) }}
              </span>
            </template>

            <template #updatedAt-cell="{ row }">
              <span class="text-sm text-muted">
                {{ formatDateTime(row.original.updatedAt) }}
              </span>
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
                  icon="i-lucide-database"
                  :title="
                    isSearching
                      ? 'No datasets match your search.'
                      : 'No datasets found.'
                  "
                  :description="
                    isSearching
                      ? 'Try a different ID or dataset name.'
                      : 'Create a dataset to start managing technical definitions.'
                  "
                  variant="naked"
                />
              </div>
            </template>
          </UTable>
        </div>
      </section>

      <DatasetsFormModal
        v-if="canUpdateDatasets"
        v-model:open="editModalOpen"
        :dataset="selectedDataset"
        :show-trigger="false"
        @updated="refresh()"
      />

      <UModal
        v-model:open="deleteModalOpen"
        title="Hapus dataset?"
        :description="
          selectedDataset
            ? `Dataset ${selectedDataset.id} akan dihapus permanen jika belum dipakai oleh record atau permission apa pun.`
            : ''
        "
        :dismissible="!deleting"
      >
        <template #body>
          <div class="space-y-4">
            <p class="text-sm text-muted">
              Tindakan ini tidak dapat dibatalkan.
            </p>

            <div class="flex justify-end gap-2">
              <UButton
                label="Batal"
                color="neutral"
                variant="subtle"
                :disabled="deleting"
                @click="deleteModalOpen = false"
              />
              <UButton
                label="Hapus"
                color="error"
                :loading="deleting"
                @click="deleteDataset"
              />
            </div>
          </div>
        </template>
      </UModal>
    </div>
  </div>
</template>
