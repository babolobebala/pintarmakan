<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { DropdownMenuItem, TableColumn } from '@nuxt/ui'
import type { DatasetManagementItem } from '~/types'

import AppPageIntro from '~/components/AppPageIntro.vue'
import {
  getDatasetModeColor,
  getDatasetOwnerColor,
  getDatasetPeriodicityColor,
  getDatasetRegionLevelColor
} from '~/utils/dataset-table'
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
const archiving = ref(false)
const toast = useToast()
const UButton = resolveComponent('UButton')

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
  () =>
    `${datasets.value.length} dataset${datasets.value.length === 1 ? '' : 's'}`
)

type SortableColumn = {
  getIsSorted: () => false | 'asc' | 'desc'
  toggleSorting: (desc?: boolean, isMulti?: boolean) => void
}

function renderSortableHeader(column: SortableColumn, label: string) {
  const isSorted = column.getIsSorted()

  return h(UButton, {
    color: 'neutral',
    variant: 'ghost',
    label,
    icon: isSorted
      ? isSorted === 'asc'
        ? 'i-lucide-arrow-up-narrow-wide'
        : 'i-lucide-arrow-down-wide-narrow'
      : 'i-lucide-arrow-up-down',
    class: '-mx-2.5',
    onClick: () => column.toggleSorting(column.getIsSorted() === 'asc')
  })
}

const columns: TableColumn<DatasetManagementItem>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => renderSortableHeader(column, 'Nama'),
    meta: {
      class: {
        th: 'w-full px-4 py-3 text-xs font-medium uppercase tracking-[0.16em] text-muted',
        td: 'min-w-0 px-4 py-3 align-middle'
      }
    }
  },
  {
    accessorKey: 'mode',
    header: ({ column }) => renderSortableHeader(column, 'Mode'),
    meta: {
      class: {
        th: 'w-[112px] whitespace-nowrap px-4 py-3 text-xs font-medium uppercase tracking-[0.16em] text-muted',
        td: 'whitespace-nowrap px-4 py-3 align-middle'
      }
    }
  },
  {
    accessorKey: 'periodicity',
    header: ({ column }) => renderSortableHeader(column, 'Periode'),
    meta: {
      class: {
        th: 'w-[140px] whitespace-nowrap px-4 py-3 text-xs font-medium uppercase tracking-[0.16em] text-muted',
        td: 'whitespace-nowrap px-4 py-3 align-middle'
      }
    }
  },
  {
    accessorKey: 'regionLevel',
    header: ({ column }) => renderSortableHeader(column, 'Wilayah'),
    meta: {
      class: {
        th: 'w-[160px] whitespace-nowrap px-4 py-3 text-xs font-medium uppercase tracking-[0.16em] text-muted',
        td: 'whitespace-nowrap px-4 py-3 align-middle'
      }
    }
  },
  {
    accessorKey: 'ownerBidangName',
    header: ({ column }) => renderSortableHeader(column, 'Owner'),
    meta: {
      class: {
        th: 'w-[220px] px-4 py-3 text-xs font-medium uppercase tracking-[0.16em] text-muted',
        td: 'max-w-[220px] px-4 py-3 align-middle'
      }
    }
  },
  {
    id: 'actions',
    header: 'Actions',
    enableSorting: false,
    meta: {
      class: {
        th: 'w-[72px] px-4 py-3 text-right text-xs font-medium uppercase tracking-[0.16em] text-muted',
        td: 'w-[72px] px-4 py-3 align-middle'
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
      dataset.ownerBidangName,
      dataset.description ?? '',
      dataset.periodicity ?? '',
      dataset.regionLevel ?? ''
    ]
      .join(' ')
      .toLowerCase()
      .includes(search)
  })
})

function formatRegionLevelLabel(value: string | null) {
  switch (value) {
    case 'KABUPATEN':
      return 'Kabupaten'
    case 'KECAMATAN':
      return 'Kecamatan'
    case 'DESA':
      return 'Desa/Kelurahan'
    default:
      return 'Semua wilayah'
  }
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
      description:
        error instanceof Error ? error.message : 'Silakan coba lagi.',
      color: 'error'
    })
  } finally {
    deleting.value = false
  }
}

async function setDatasetArchived(
  dataset: DatasetManagementItem,
  archived: boolean
) {
  archiving.value = true

  try {
    await $fetch(`/api/datasets/${dataset.id}/archive`, {
      method: 'PATCH',
      body: { archived }
    })

    toast.add({
      title: archived ? 'Dataset diarsipkan' : 'Dataset diaktifkan kembali',
      description: `${dataset.id} ${archived ? 'tidak lagi dapat diubah melalui kelola data.' : 'kembali tersedia untuk dikelola.'}`,
      color: 'success'
    })

    await refresh()
  } catch (error) {
    toast.add({
      title: archived
        ? 'Gagal mengarsipkan dataset'
        : 'Gagal mengaktifkan dataset',
      description:
        error instanceof Error ? error.message : 'Silakan coba lagi.',
      color: 'error'
    })
  } finally {
    archiving.value = false
  }
}

function getRowActions(dataset: DatasetManagementItem): DropdownMenuItem[][] {
  return [
    [
      {
        label: 'Edit',
        icon: 'i-lucide-pencil-line',
        class: 'cursor-pointer',
        disabled: !canUpdateDatasets.value,
        onSelect: () => openEditModal(dataset)
      },
      {
        label: dataset.archivedAt ? 'Aktifkan kembali' : 'Arsipkan',
        icon: dataset.archivedAt
          ? 'i-lucide-archive-restore'
          : 'i-lucide-archive',
        class: 'cursor-pointer',
        disabled: !canUpdateDatasets.value || archiving.value,
        onSelect: () => setDatasetArchived(dataset, !dataset.archivedAt)
      },
      {
        label: 'Delete',
        icon: 'i-lucide-trash-2',
        class: 'cursor-pointer',
        color: 'error',
        disabled: !canDeleteDatasets.value,
        onSelect: () => openDeleteModal(dataset)
      }
    ]
  ]
}
</script>

<template>
  <div
    class="mx-auto flex w-full max-w-[1800px] flex-col gap-4 sm:gap-6 lg:gap-8"
  >
    <AppPageIntro
      kicker="Struktur data"
      title="Kelola Dataset"
      description="Kelola definisi dataset global, bidang pemilik, ID teknis, schema JSON, dan config JSON untuk monitoring dashboard."
    />

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
                Dataset
              </h2>
              <UBadge color="neutral" variant="subtle" size="sm">
                {{ totalDatasetsLabel }}
              </UBadge>
            </div>
            <p class="text-sm text-muted">
              Hanya Super Admin yang dapat membuat, mengubah, dan menghapus
              definisi dataset.
            </p>
          </div>

          <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
            <UInput
              v-model="q"
              icon="i-lucide-search"
              placeholder="Cari nama atau owner bidang..."
              class="w-full cursor-pointer sm:w-72"
            />
            <DatasetsFormModal v-if="canCreateDatasets" @created="refresh()" />
          </div>
        </div>

        <div v-if="isPending && !datasets.length" class="px-4 py-3">
          <div class="min-w-[800px] divide-y divide-default">
            <div
              class="grid grid-cols-[minmax(0,1fr)_112px_140px_160px_minmax(0,220px)_72px] gap-4 px-4 py-3"
            >
              <div class="h-3 w-20 rounded bg-elevated" />
              <div class="h-3 w-20 rounded bg-elevated" />
              <div class="h-3 w-24 rounded bg-elevated" />
              <div class="h-3 w-28 rounded bg-elevated/80" />
              <div class="h-3 w-24 rounded bg-elevated" />
              <div class="ms-auto h-3 w-16 rounded bg-elevated" />
            </div>
            <div
              v-for="row in 5"
              :key="row"
              class="grid min-w-[800px] grid-cols-[minmax(0,1fr)_112px_140px_160px_minmax(0,220px)_72px] gap-4 px-4 py-4"
            >
              <div class="space-y-2">
                <div class="h-3 w-48 rounded bg-elevated" />
                <div class="h-3 w-32 rounded bg-elevated/80" />
              </div>
              <div class="h-6 w-20 rounded-full bg-elevated/80" />
              <div class="h-6 w-24 rounded-full bg-elevated/80" />
              <div class="h-6 w-20 rounded-full bg-elevated/80" />
              <div class="h-3 w-36 self-center rounded bg-elevated" />
              <div class="ms-auto h-8 w-8 rounded-lg bg-elevated" />
            </div>
          </div>
        </div>

        <div v-else-if="error" class="px-4 py-10">
          <UEmpty
            icon="i-lucide-database-zap"
            class="cursor-pointer"
            title="Unable to load datasets"
            description="Please refresh the list and try again."
            :actions="[
              {
                label: 'Retry',
                icon: 'i-lucide-refresh-cw',
                class: 'cursor-pointer',
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
            :initial-state="{ sorting: [{ id: 'name', desc: false }] }"
            :loading="isPending && datasets.length > 0"
            :ui="{
              root: 'min-w-[800px]',
              thead: 'bg-elevated/35',
              tr: 'border-b border-default last:border-b-0',
              td: 'border-b-0',
              th: 'border-b border-default'
            }"
            :get-row-id="(row) => row.id"
          >
            <template #name-cell="{ row }">
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <p class="truncate text-sm font-medium text-highlighted">
                    {{ row.original.name }}
                  </p>
                  <UBadge
                    v-if="row.original.archivedAt"
                    color="warning"
                    variant="subtle"
                    size="sm"
                  >
                    Diarsipkan
                  </UBadge>
                </div>
              </div>
            </template>

            <template #ownerBidangName-cell="{ row }">
              <UBadge
                :color="getDatasetOwnerColor(row.original.ownerBidangName)"
                variant="subtle"
                size="sm"
                class="max-w-[220px] truncate"
              >
                {{ row.original.ownerBidangName }}
              </UBadge>
            </template>

            <template #mode-cell="{ row }">
              <UBadge
                v-if="row.original.mode"
                :color="getDatasetModeColor(row.original.mode)"
                variant="subtle"
                size="sm"
              >
                {{ row.original.mode }}
              </UBadge>
              <span v-else class="text-sm text-muted">—</span>
            </template>

            <template #periodicity-cell="{ row }">
              <UBadge
                v-if="row.original.periodicity"
                :color="getDatasetPeriodicityColor(row.original.periodicity)"
                variant="subtle"
                size="sm"
              >
                {{ row.original.periodicity }}
              </UBadge>
              <span v-else class="text-sm text-muted">—</span>
            </template>

            <template #regionLevel-cell="{ row }">
              <UBadge
                v-if="row.original.regionLevel"
                :color="getDatasetRegionLevelColor(row.original.regionLevel)"
                variant="outline"
                size="sm"
              >
                {{ formatRegionLevelLabel(row.original.regionLevel) }}
              </UBadge>
              <span v-else class="text-sm text-muted">—</span>
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
                    class="cursor-pointer"
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
                  class="cursor-pointer"
                  :title="
                    isSearching
                      ? 'No datasets match your search.'
                      : 'No datasets found.'
                  "
                  :description="
                    isSearching
                      ? 'Try a different dataset name or owner bidang.'
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
