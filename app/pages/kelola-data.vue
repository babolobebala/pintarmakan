<script setup lang="ts">
import type {
  DataManagementOptionsResponse,
  DatasetRecordHistoryContext,
  DatasetRecordDatasetOption,
  DatasetRecordListItem,
  DeletedDatasetRecordListItem,
  RegionItem
} from '~/types'
import type { DropdownMenuItem, TableColumn } from '@nuxt/ui'

import AppPageIntro from '~/components/AppPageIntro.vue'
import { appPermissions } from '~~/auth/permissions'
import {
  getDatasetPeriodicity,
  getDatasetSchemaFields,
  getDefaultPeriodInput,
  getDatasetRegionLevel
} from '~~/shared/datasets'

definePageMeta({
  permission: appPermissions.businessDataRead
})

const toast = useToast()
const {
  data: optionsResponse,
  error: optionsError,
  refresh: refreshOptions,
  status: optionsStatus
} = await useFetch<DataManagementOptionsResponse>(
  '/api/data-management/options',
  {
    default: () => ({
      bidangs: [],
      datasetsByBidang: {}
    })
  }
)
const {
  data: regions,
  error: regionsError,
  refresh: refreshRegions,
  status: regionsStatus
} = await useFetch<RegionItem[]>('/api/regions', {
  default: () => []
})

const allBidangsValue = '__all_bidangs__'
const selectedBidangId = ref(allBidangsValue)
const selectedDatasetId = ref('')
const periodValue = ref('')
const selectedRegionFilter = ref('')
const selectedStatusFilter = ref('')
const search = ref('')
const dataView = ref<'active' | 'deleted'>('active')
const selectedRecord = ref<DatasetRecordListItem | null>(null)
const historyRecord = ref<DatasetRecordHistoryContext | null>(null)
const editModalOpen = ref(false)
const deleteModalOpen = ref(false)
const historyModalOpen = ref(false)
const deleting = ref(false)

const bidangs = computed(() => optionsResponse.value.bidangs)
const bidangSelectItems = computed(() => {
  return [
    { id: allBidangsValue, name: 'Semua Bidang' },
    ...bidangs.value.map(bidang => ({
      id: bidang.id,
      name: bidang.name,
      description: bidang.description ?? undefined
    }))
  ]
})
const allDatasets = computed(() => Object.values(optionsResponse.value.datasetsByBidang).flat())
const datasets = computed(() => {
  if (selectedBidangId.value === allBidangsValue) {
    return allDatasets.value
  }

  return optionsResponse.value.datasetsByBidang[selectedBidangId.value] ?? []
})
const selectedDataset = computed(() => {
  return datasets.value.find(dataset => dataset.id === selectedDatasetId.value) ?? null
})
const fields = computed(() => {
  return selectedDataset.value
    ? getDatasetSchemaFields(selectedDataset.value.dataSchema)
    : []
})
const visibleFields = computed(() => fields.value.slice(0, 4))
const hasMoreFields = computed(() => fields.value.length > visibleFields.value.length)
const isPending = computed(
  () => optionsStatus.value === 'pending' || regionsStatus.value === 'pending'
)
const hasOptionsError = computed(() => !!optionsError.value || !!regionsError.value)
const datasetCountLabel = computed(() => {
  return `${datasets.value.length} dataset${datasets.value.length === 1 ? '' : 's'}`
})
const selectedDatasetPermissions = computed(() => selectedDataset.value?.permissions ?? null)

const datasetColumns: TableColumn<DatasetRecordDatasetOption>[] = [
  {
    accessorKey: 'name',
    header: 'Nama',
    meta: {
      class: {
        th: 'w-full px-4 py-3 text-xs font-medium uppercase tracking-[0.16em] text-muted',
        td: 'min-w-0 px-4 py-3 align-middle'
      }
    }
  },
  {
    accessorKey: 'periodicity',
    header: 'Periodicity',
    meta: {
      class: {
        th: 'w-[140px] whitespace-nowrap px-4 py-3 text-xs font-medium uppercase tracking-[0.16em] text-muted',
        td: 'whitespace-nowrap px-4 py-3 align-middle'
      }
    }
  },
  {
    accessorKey: 'regionLevel',
    header: 'Region',
    meta: {
      class: {
        th: 'w-[160px] whitespace-nowrap px-4 py-3 text-xs font-medium uppercase tracking-[0.16em] text-muted',
        td: 'whitespace-nowrap px-4 py-3 align-middle'
      }
    }
  },
  {
    accessorKey: 'ownerBidangName',
    header: 'Owner',
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
    meta: {
      class: {
        th: 'w-[96px] px-4 py-3 text-right text-xs font-medium uppercase tracking-[0.16em] text-muted',
        td: 'w-[96px] px-4 py-3 align-middle'
      }
    }
  }
]

watch(
  bidangs,
  (items) => {
    if (
      selectedBidangId.value !== allBidangsValue
      && !items.some(item => item.id === selectedBidangId.value)
    ) {
      selectedBidangId.value = allBidangsValue
    }
  },
  { immediate: true }
)

watch(selectedBidangId, () => {
  selectedDatasetId.value = ''
  selectedRecord.value = null
  historyRecord.value = null
  editModalOpen.value = false
  deleteModalOpen.value = false
  historyModalOpen.value = false
  periodValue.value = ''
  selectedRegionFilter.value = ''
  selectedStatusFilter.value = ''
  search.value = ''
})

watch(
  datasets,
  (items) => {
    if (!items.some(item => item.id === selectedDatasetId.value)) {
      selectedDatasetId.value = ''
    }
  },
  { immediate: true }
)

watch(
  selectedDataset,
  (dataset) => {
    selectedRecord.value = null
    historyRecord.value = null
    editModalOpen.value = false
    deleteModalOpen.value = false
    historyModalOpen.value = false
    selectedRegionFilter.value = ''
    selectedStatusFilter.value = ''
    search.value = ''

    if (!dataset) {
      periodValue.value = ''
      return
    }

    periodValue.value = getDefaultPeriodInput(
      getDatasetPeriodicity(dataset.dataConfig)
    )
  }
)

const {
  data: records,
  error: recordsError,
  refresh: refreshRecords,
  status: recordsStatus
} = await useAsyncData<DatasetRecordListItem[]>(
  'dataset-records',
  async () => {
    if (!selectedDataset.value || !periodValue.value.trim()) {
      return []
    }

    return $fetch('/api/dataset-records', {
      query: {
        datasetId: selectedDataset.value.id,
        periodValue: periodValue.value.trim()
      }
    })
  },
  {
    default: () => [],
    watch: [selectedDatasetId, periodValue]
  }
)
const {
  data: deletedRecords,
  error: deletedRecordsError,
  refresh: refreshDeletedRecords,
  status: deletedRecordsStatus
} = await useAsyncData<DeletedDatasetRecordListItem[]>(
  'deleted-dataset-records',
  async () => {
    if (
      dataView.value !== 'deleted'
      || !selectedDataset.value
      || !periodValue.value.trim()
    ) {
      return []
    }

    return $fetch('/api/dataset-records/deleted', {
      query: {
        datasetId: selectedDataset.value.id,
        periodValue: periodValue.value.trim()
      }
    })
  },
  {
    default: () => [],
    watch: [dataView, selectedDatasetId, periodValue]
  }
)

const dateTimeFormatter = new Intl.DateTimeFormat('id-ID', {
  dateStyle: 'medium',
  timeStyle: 'short'
})

const regionsById = computed(() => {
  return new Map(regions.value.map(region => [region.id, region]))
})

function buildRegionLabel(region: RegionItem) {
  const names: string[] = [region.name]
  let parentId = region.parentId

  while (parentId) {
    const parent = regionsById.value.get(parentId)

    if (!parent) {
      break
    }

    names.unshift(parent.name)
    parentId = parent.parentId
  }

  return `${names.join(' / ')} · ${region.level}`
}

function formatPeriodicityLabel(value: string | null) {
  switch (value) {
    case 'HARIAN':
      return 'Harian'
    case 'MINGGUAN':
      return 'Mingguan'
    case 'BULANAN':
      return 'Bulanan'
    case 'TRIWULANAN':
      return 'Triwulanan'
    case 'TAHUNAN':
      return 'Tahunan'
    default:
      return 'Tanpa periode'
  }
}

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

function getPermissionBadges(dataset: DatasetRecordDatasetOption) {
  const badges: Array<{ label: string, color: 'neutral' | 'success' | 'info' | 'warning' }> = []

  if (dataset.permissions.canRead) {
    badges.push({ label: 'Read', color: 'neutral' })
  }

  if (dataset.permissions.canCreate) {
    badges.push({ label: 'Create', color: 'success' })
  }

  if (dataset.permissions.canUpdate) {
    badges.push({ label: 'Update', color: 'info' })
  }

  if (dataset.permissions.canDelete) {
    badges.push({ label: 'Delete', color: 'warning' })
  }

  return badges
}

const regionFilterOptions = computed(() => {
  const regionLevel = selectedDataset.value
    ? getDatasetRegionLevel(selectedDataset.value.dataConfig)
    : null

  return regions.value
    .filter((region) => {
      return !regionLevel || region.level.toUpperCase() === regionLevel
    })
    .map(region => ({
      id: region.id,
      label: buildRegionLabel(region)
    }))
})

const statusOptions = computed(() => {
  const tableRecords = dataView.value === 'deleted' ? deletedRecords.value : records.value

  return Array.from(new Set(tableRecords.map(record => record.status)))
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right))
})

const filteredRecords = computed(() => {
  const regionFilter = selectedRegionFilter.value.trim()
  const statusFilter = selectedStatusFilter.value.trim()
  const q = search.value.trim().toLowerCase()

  return records.value.filter((record) => {
    if (regionFilter && record.regionId !== regionFilter) {
      return false
    }

    if (statusFilter && record.status !== statusFilter) {
      return false
    }

    if (!q) {
      return true
    }

    const dynamicValues = visibleFields.value.map((field) => {
      const value = record.data[field.key]
      return value === undefined || value === null ? '' : String(value)
    })

    return [
      record.regionName,
      record.status,
      record.periodLabel,
      ...dynamicValues
    ]
      .join(' ')
      .toLowerCase()
      .includes(q)
  })
})

const filteredDeletedRecords = computed(() => {
  const regionFilter = selectedRegionFilter.value.trim()
  const statusFilter = selectedStatusFilter.value.trim()
  const q = search.value.trim().toLowerCase()

  return deletedRecords.value.filter((record) => {
    if (regionFilter && record.regionId !== regionFilter) {
      return false
    }

    if (statusFilter && record.status !== statusFilter) {
      return false
    }

    if (!q) {
      return true
    }

    const dynamicValues = visibleFields.value.map((field) => {
      const value = record.data[field.key]
      return value === undefined || value === null ? '' : String(value)
    })

    return [
      record.regionName,
      record.status,
      record.periodLabel,
      ...dynamicValues
    ]
      .join(' ')
      .toLowerCase()
      .includes(q)
  })
})

const canCreate = computed(
  () => selectedDatasetPermissions.value?.canCreate ?? false
)

function selectDataset(datasetId: string) {
  selectedDatasetId.value = datasetId
}

function clearSelectedDataset() {
  selectedDatasetId.value = ''
}

function formatDateTime(value: string) {
  return dateTimeFormatter.format(new Date(value))
}

function formatFieldValue(record: { data: Record<string, unknown> }, fieldKey: string) {
  const value = record.data[fieldKey]

  if (typeof value === 'boolean') {
    return value ? 'Ya' : 'Tidak'
  }

  return value === undefined || value === null || value === ''
    ? '—'
    : String(value)
}

function openEditModal(record: DatasetRecordListItem) {
  selectedRecord.value = record
  editModalOpen.value = true
}

function openDeleteModal(record: DatasetRecordListItem) {
  selectedRecord.value = record
  deleteModalOpen.value = true
}

function openHistoryModal(record: DatasetRecordHistoryContext) {
  historyRecord.value = record
  historyModalOpen.value = true
}

async function refreshAllData() {
  await Promise.all([refreshOptions(), refreshRegions(), refreshRecords(), refreshDeletedRecords()])
}

function exportRecords() {
  if (!selectedDataset.value || filteredRecords.value.length === 0) {
    return
  }

  const headers = [
    'Periode',
    'Wilayah',
    'Status',
    ...fields.value.map(field => field.label)
  ]
  const rows = filteredRecords.value.map((record) => {
    return [
      record.periodLabel,
      record.regionName,
      record.status,
      ...fields.value.map((field) => {
        const value = record.data[field.key]

        if (typeof value === 'boolean') {
          return value ? 'Ya' : 'Tidak'
        }

        return value === undefined || value === null ? '' : String(value)
      })
    ]
  })

  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replaceAll('"', '""')}"`).join(','))
    .join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = `${selectedDataset.value.ownerBidangId}_${selectedDataset.value.id}_${periodValue.value || 'export'}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)

  toast.add({
    title: 'Export selesai',
    description: `${filteredRecords.value.length} baris berhasil diekspor.`,
    color: 'success'
  })
}

async function deleteRecord() {
  if (!selectedRecord.value) {
    return
  }

  deleting.value = true

  try {
    await $fetch(`/api/dataset-records/${selectedRecord.value.id}`, {
      method: 'DELETE'
    })

    toast.add({
      title: 'Data dihapus',
      description: 'Snapshot data berhasil dihapus.',
      color: 'success'
    })

    deleteModalOpen.value = false
    editModalOpen.value = false
    selectedRecord.value = null
    await refreshRecords()
  } catch (error) {
    toast.add({
      title: 'Gagal menghapus data',
      description: error instanceof Error ? error.message : 'Silakan coba lagi.',
      color: 'error'
    })
  } finally {
    deleting.value = false
  }
}

function getRowActions(record: DatasetRecordListItem): DropdownMenuItem[][] {
  const actions: DropdownMenuItem[] = [{
    label: 'Lihat Riwayat',
    icon: 'i-lucide-history',
    onSelect: () => openHistoryModal(record)
  }]

  if (record.permissions.canUpdate) {
    actions.push({
      label: 'Edit',
      icon: 'i-lucide-pencil-line',
      onSelect: () => openEditModal(record)
    })
  }

  if (record.permissions.canDelete) {
    actions.push({
      label: 'Delete',
      icon: 'i-lucide-trash-2',
      color: 'error',
      onSelect: () => openDeleteModal(record)
    })
  }

  return actions.length > 0 ? [actions] : []
}

function getDeletedRowActions(record: DeletedDatasetRecordListItem): DropdownMenuItem[][] {
  return [[{
    label: 'Lihat Riwayat',
    icon: 'i-lucide-history',
    onSelect: () => openHistoryModal(record)
  }]]
}
</script>

<template>
  <div class="mx-auto flex w-full max-w-[1800px] flex-col gap-4 sm:gap-6 lg:gap-8">
    <AppPageIntro
      kicker="Data operasional"
      title="Kelola Data"
      description="Kelola data operasional melalui Dataset yang tersedia dalam scope Anda."
    />

    <section class="overflow-hidden rounded-2xl border border-default bg-default">
      <div class="flex flex-col gap-4 border-b border-default px-4 py-4 lg:flex-row lg:items-end lg:justify-between">
        <div class="flex flex-wrap items-center gap-2">
          <h2 class="text-lg font-semibold text-highlighted">
            Dataset
          </h2>
          <UBadge color="neutral" variant="subtle" size="sm">
            {{ datasetCountLabel }}
          </UBadge>
        </div>

        <div v-if="!isPending && !hasOptionsError && bidangs.length > 0" class="w-full lg:w-56">
          <USelectMenu
            v-model="selectedBidangId"
            :items="bidangSelectItems"
            value-key="id"
            label-key="name"
            placeholder="Filter bidang"
            class="w-full"
          />
        </div>
      </div>

      <div v-if="isPending" class="overflow-x-auto px-4 py-3">
        <div class="min-w-[680px] divide-y divide-default">
          <div class="grid grid-cols-[minmax(0,1fr)_140px_160px_minmax(0,220px)_96px] gap-4 px-4 py-3">
            <div class="h-3 w-20 rounded bg-elevated" />
            <div class="h-3 w-24 rounded bg-elevated" />
            <div class="h-3 w-28 rounded bg-elevated/80" />
            <div class="h-3 w-24 rounded bg-elevated" />
            <div class="ms-auto h-3 w-16 rounded bg-elevated" />
          </div>
          <div
            v-for="row in 5"
            :key="row"
            class="grid min-w-[680px] grid-cols-[minmax(0,1fr)_140px_160px_minmax(0,220px)_96px] gap-4 px-4 py-4"
          >
            <div class="space-y-2">
              <div class="h-3 w-48 rounded bg-elevated" />
              <div class="h-3 w-32 rounded bg-elevated/80" />
            </div>
            <div class="h-6 w-24 rounded-full bg-elevated/80" />
            <div class="h-6 w-20 rounded-full bg-elevated/80" />
            <div class="h-3 w-36 self-center rounded bg-elevated" />
            <div class="ms-auto h-8 w-8 rounded-lg bg-elevated" />
          </div>
        </div>
      </div>

      <div v-else-if="hasOptionsError" class="px-4 py-10">
        <UEmpty
          icon="i-lucide-folder-search"
          title="Unable to load operational context"
          description="Refresh the bidang options or region master and try again."
          :actions="[
            {
              label: 'Retry',
              icon: 'i-lucide-refresh-cw',
              color: 'neutral',
              variant: 'subtle',
              onClick: refreshAllData
            }
          ]"
        />
      </div>

      <div v-else-if="bidangs.length === 0" class="px-4 py-10">
        <UEmpty
          icon="i-lucide-briefcase-business"
          title="Belum ada bidang yang bisa digunakan"
          description="Anda belum memiliki penugasan bidang untuk mengelola data."
        />
      </div>

      <div v-else-if="datasets.length === 0" class="px-4 py-10">
        <UEmpty
          icon="i-lucide-folder-lock"
          title="Belum ada dataset yang bisa dikelola."
          description="Tambahkan dataset baru dengan owner bidang yang sesuai di Kelola Dataset untuk mulai mengelola record."
        />
      </div>

      <div v-else class="overflow-x-auto">
        <UTable
          :data="datasets"
          :columns="datasetColumns"
          :ui="{
            root: 'min-w-[680px]',
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

          <template #periodicity-cell="{ row }">
            <UBadge color="neutral" variant="subtle" size="sm">
              {{ formatPeriodicityLabel(row.original.periodicity) }}
            </UBadge>
          </template>

          <template #regionLevel-cell="{ row }">
            <UBadge color="neutral" variant="outline" size="sm">
              {{ formatRegionLevelLabel(row.original.regionLevel) }}
            </UBadge>
          </template>

          <template #ownerBidangName-cell="{ row }">
            <p class="truncate text-sm text-highlighted">
              {{ row.original.ownerBidangName }}
            </p>
          </template>

          <template #actions-cell="{ row }">
            <div class="flex justify-end">
              <UButton
                label="Buka"
                icon="i-lucide-arrow-up-right"
                color="neutral"
                variant="outline"
                size="sm"
                @click="selectDataset(row.original.id)"
              />
            </div>
          </template>
        </UTable>
      </div>
    </section>

    <section
      v-if="selectedDataset"
      class="overflow-hidden rounded-2xl border border-default bg-default"
    >
      <div class="flex flex-col gap-4 border-b border-default px-4 py-4">
        <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div class="space-y-3">
            <div class="grid gap-4 md:grid-cols-2">
              <div class="rounded-2xl border border-default/70 bg-elevated/20 p-4">
                <p class="text-xs font-medium tracking-[0.16em] text-muted uppercase">
                  Bidang
                </p>
                <p class="mt-2 text-lg font-semibold text-highlighted">
                  {{ selectedDataset.ownerBidangName }}
                </p>
                <p class="mt-1 text-xs text-muted">
                  {{ selectedDataset.ownerBidangId }}
                </p>
              </div>

              <div class="rounded-2xl border border-default/70 bg-elevated/20 p-4">
                <p class="text-xs font-medium tracking-[0.16em] text-muted uppercase">
                  Dataset
                </p>
                <p class="mt-2 text-lg font-semibold text-highlighted">
                  {{ selectedDataset.name }}
                </p>
                <p class="mt-1 text-xs text-muted">
                  {{ selectedDataset.id }}
                </p>
              </div>
            </div>

            <div class="flex flex-wrap gap-2">
              <UBadge color="neutral" variant="subtle" size="sm">
                {{ formatPeriodicityLabel(selectedDataset.periodicity) }}
              </UBadge>
              <UBadge color="neutral" variant="outline" size="sm">
                {{ formatRegionLevelLabel(selectedDataset.regionLevel) }}
              </UBadge>
              <UBadge
                v-for="badge in getPermissionBadges(selectedDataset)"
                :key="`active:${badge.label}`"
                :color="badge.color"
                variant="subtle"
                size="sm"
              >
                {{ badge.label }}
              </UBadge>
            </div>
          </div>

          <div class="flex flex-wrap gap-2">
            <div class="flex rounded-lg border border-default p-1">
              <UButton
                label="Data Aktif"
                size="sm"
                :color="dataView === 'active' ? 'primary' : 'neutral'"
                :variant="dataView === 'active' ? 'solid' : 'ghost'"
                @click="dataView = 'active'"
              />
              <UButton
                label="Data Terhapus"
                size="sm"
                :color="dataView === 'deleted' ? 'primary' : 'neutral'"
                :variant="dataView === 'deleted' ? 'solid' : 'ghost'"
                @click="dataView = 'deleted'"
              />
            </div>
            <UButton
              label="Ganti Dataset"
              icon="i-lucide-layout-grid"
              color="neutral"
              variant="outline"
              @click="clearSelectedDataset"
            />
            <DataRecordsFormModal
              v-if="dataView === 'active' && canCreate"
              :dataset="selectedDataset"
              :regions="regions"
              @created="refreshRecords()"
            />
            <DataRecordsImportModal
              v-if="dataView === 'active' && selectedDataset.permissions.canCreate && selectedDataset.permissions.canUpdate"
              :dataset="selectedDataset"
              @imported="refreshRecords()"
            />
            <UButton
              v-if="dataView === 'active'"
              label="Export CSV"
              icon="i-lucide-download"
              color="neutral"
              variant="outline"
              :disabled="filteredRecords.length === 0"
              @click="exportRecords"
            />
          </div>
        </div>

        <div class="grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
          <UInput
            v-if="getDatasetPeriodicity(selectedDataset.dataConfig) === 'HARIAN'"
            v-model="periodValue"
            type="date"
            class="w-full"
          />
          <UInput
            v-else-if="getDatasetPeriodicity(selectedDataset.dataConfig) === 'BULANAN'"
            v-model="periodValue"
            type="month"
            class="w-full"
          />
          <UInput
            v-else-if="getDatasetPeriodicity(selectedDataset.dataConfig) === 'TAHUNAN'"
            v-model="periodValue"
            placeholder="2026"
            class="w-full"
          />
          <UInput
            v-else
            v-model="periodValue"
            :placeholder="getDatasetPeriodicity(selectedDataset.dataConfig) === 'TRIWULANAN' ? '2026-Q3' : '2026-W32'"
            class="w-full"
          />

          <USelectMenu
            v-model="selectedRegionFilter"
            :items="regionFilterOptions"
            value-key="id"
            label-key="label"
            placeholder="Filter wilayah"
            class="w-full"
            :search-input="{ placeholder: 'Cari wilayah...' }"
          />

          <USelectMenu
            v-model="selectedStatusFilter"
            :items="statusOptions"
            placeholder="Filter status"
            class="w-full"
          />

          <UInput
            v-model="search"
            icon="i-lucide-search"
            placeholder="Cari wilayah, status, atau nilai data..."
            class="w-full"
          />
        </div>
      </div>

      <div v-if="dataView === 'active' && recordsError" class="px-4 py-10">
        <UEmpty
          icon="i-lucide-folder-search"
          title="Unable to load dataset records"
          description="Refresh the current dataset context and try again."
          :actions="[
            {
              label: 'Retry',
              icon: 'i-lucide-refresh-cw',
              color: 'neutral',
              variant: 'subtle',
              onClick: () => {
                refreshRecords()
              }
            }
          ]"
        />
      </div>

      <div v-else-if="dataView === 'deleted' && deletedRecordsError" class="px-4 py-10">
        <UEmpty
          icon="i-lucide-folder-search"
          title="Data terhapus tidak dapat dimuat"
          description="Refresh konteks dataset saat ini dan coba lagi."
          :actions="[
            {
              label: 'Retry',
              icon: 'i-lucide-refresh-cw',
              color: 'neutral',
              variant: 'subtle',
              onClick: () => {
                refreshDeletedRecords()
              }
            }
          ]"
        />
      </div>

      <div v-else-if="dataView === 'active'" class="overflow-x-auto">
        <table class="w-full min-w-[1180px] divide-y divide-default text-sm">
          <thead class="bg-elevated/35">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium tracking-[0.16em] text-muted uppercase">
                Period
              </th>
              <th class="px-4 py-3 text-left text-xs font-medium tracking-[0.16em] text-muted uppercase">
                Region
              </th>
              <th
                v-for="field in visibleFields"
                :key="field.key"
                class="px-4 py-3 text-left text-xs font-medium tracking-[0.16em] text-muted uppercase"
              >
                {{ field.label }}
              </th>
              <th class="px-4 py-3 text-left text-xs font-medium tracking-[0.16em] text-muted uppercase">
                Status
              </th>
              <th class="px-4 py-3 text-left text-xs font-medium tracking-[0.16em] text-muted uppercase">
                Updated
              </th>
              <th class="px-4 py-3 text-right text-xs font-medium tracking-[0.16em] text-muted uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-default bg-default">
            <tr v-if="recordsStatus === 'pending'">
              <td :colspan="visibleFields.length + 5" class="px-4 py-10">
                <div class="space-y-3">
                  <div class="h-3 w-1/3 rounded bg-elevated" />
                  <div class="h-3 w-2/3 rounded bg-elevated/80" />
                </div>
              </td>
            </tr>

            <tr v-else-if="filteredRecords.length === 0">
              <td :colspan="visibleFields.length + 5" class="px-4 py-10">
                <UEmpty
                  icon="i-lucide-database-backup"
                  :title="
                    search || selectedRegionFilter || selectedStatusFilter
                      ? 'Tidak ada record yang cocok dengan filter aktif.'
                      : 'Belum ada data untuk dataset dan periode yang sedang dipilih.'
                  "
                  :description="
                    search || selectedRegionFilter || selectedStatusFilter
                      ? 'Ubah filter wilayah, status, atau pencarian untuk melihat hasil lain.'
                      : 'Tambahkan snapshot data baru untuk dataset ini pada periode yang sedang dipilih.'
                  "
                  variant="naked"
                />
              </td>
            </tr>

            <tr
              v-for="record in filteredRecords"
              :key="record.id"
              class="border-b border-default last:border-b-0"
            >
              <td class="px-4 py-3 align-top text-muted">
                {{ record.periodLabel }}
              </td>
              <td class="px-4 py-3 align-top">
                <div class="space-y-1">
                  <p class="font-medium text-highlighted">
                    {{ record.regionName }}
                  </p>
                  <p class="text-xs text-muted">
                    {{ record.regionLevel }}
                  </p>
                </div>
              </td>
              <td
                v-for="field in visibleFields"
                :key="`${record.id}:${field.key}`"
                class="px-4 py-3 align-top text-muted"
              >
                {{ formatFieldValue(record, field.key) }}
              </td>
              <td class="px-4 py-3 align-top">
                <div class="space-y-1">
                  <UBadge color="neutral" variant="subtle" size="sm">
                    {{ record.status }}
                  </UBadge>
                  <span v-if="hasMoreFields" class="block text-xs text-muted">
                    +{{ fields.length - visibleFields.length }} field lain tersedia di form detail
                  </span>
                </div>
              </td>
              <td class="px-4 py-3 align-top text-muted">
                <div class="space-y-1">
                  <p>{{ formatDateTime(record.updatedAt) }}</p>
                  <p class="text-xs">
                    oleh {{ record.createdByName }}
                  </p>
                </div>
              </td>
              <td class="px-4 py-3 align-top">
                <div class="flex justify-end">
                  <UDropdownMenu
                    v-if="getRowActions(record).length > 0"
                    :items="getRowActions(record)"
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
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full min-w-[1180px] divide-y divide-default text-sm">
          <thead class="bg-elevated/35">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium tracking-[0.16em] text-muted uppercase">
                Period
              </th>
              <th class="px-4 py-3 text-left text-xs font-medium tracking-[0.16em] text-muted uppercase">
                Region
              </th>
              <th
                v-for="field in visibleFields"
                :key="field.key"
                class="px-4 py-3 text-left text-xs font-medium tracking-[0.16em] text-muted uppercase"
              >
                {{ field.label }}
              </th>
              <th class="px-4 py-3 text-left text-xs font-medium tracking-[0.16em] text-muted uppercase">
                Status
              </th>
              <th class="px-4 py-3 text-left text-xs font-medium tracking-[0.16em] text-muted uppercase">
                Dihapus
              </th>
              <th class="px-4 py-3 text-right text-xs font-medium tracking-[0.16em] text-muted uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-default bg-default">
            <tr v-if="deletedRecordsStatus === 'pending'">
              <td :colspan="visibleFields.length + 5" class="px-4 py-10">
                <div class="space-y-3">
                  <div class="h-3 w-1/3 rounded bg-elevated" />
                  <div class="h-3 w-2/3 rounded bg-elevated/80" />
                </div>
              </td>
            </tr>

            <tr v-else-if="filteredDeletedRecords.length === 0">
              <td :colspan="visibleFields.length + 5" class="px-4 py-10">
                <UEmpty
                  icon="i-lucide-database-backup"
                  :title="
                    search || selectedRegionFilter || selectedStatusFilter
                      ? 'Tidak ada data terhapus yang cocok dengan filter aktif.'
                      : 'Belum ada data yang dihapus.'
                  "
                  :description="
                    search || selectedRegionFilter || selectedStatusFilter
                      ? 'Ubah filter wilayah, status, atau pencarian untuk melihat hasil lain.'
                      : 'Data yang dihapus akan tetap tersedia di sini sebagai riwayat baca-saja.'
                  "
                  variant="naked"
                />
              </td>
            </tr>

            <tr
              v-for="record in filteredDeletedRecords"
              :key="record.id"
              class="border-b border-default last:border-b-0"
            >
              <td class="px-4 py-3 align-top text-muted">
                {{ record.periodLabel }}
              </td>
              <td class="px-4 py-3 align-top">
                <div class="space-y-1">
                  <p class="font-medium text-highlighted">
                    {{ record.regionName }}
                  </p>
                  <p class="text-xs text-muted">
                    {{ record.regionLevel }}
                  </p>
                </div>
              </td>
              <td
                v-for="field in visibleFields"
                :key="`${record.id}:${field.key}`"
                class="px-4 py-3 align-top text-muted"
              >
                {{ formatFieldValue(record, field.key) }}
              </td>
              <td class="px-4 py-3 align-top">
                <div class="space-y-1">
                  <UBadge color="neutral" variant="subtle" size="sm">
                    {{ record.status }}
                  </UBadge>
                  <UBadge color="warning" variant="subtle" size="sm">
                    Dihapus
                  </UBadge>
                </div>
              </td>
              <td class="px-4 py-3 align-top text-muted">
                <div class="space-y-1">
                  <p>{{ formatDateTime(record.deletedAt) }}</p>
                  <p class="text-xs">
                    oleh {{ record.deletedByName ?? 'Pengguna tidak tersedia' }}
                  </p>
                </div>
              </td>
              <td class="px-4 py-3 align-top">
                <div class="flex justify-end">
                  <UDropdownMenu
                    :items="getDeletedRowActions(record)"
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
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <DataRecordsFormModal
      v-if="selectedDataset"
      v-model:open="editModalOpen"
      :dataset="selectedDataset"
      :regions="regions"
      :record="selectedRecord"
      :show-trigger="false"
      @updated="refreshRecords()"
    />

    <DataRecordsHistoryModal
      v-if="historyRecord && selectedDataset"
      v-model:open="historyModalOpen"
      :record="historyRecord"
      :data-schema="selectedDataset.dataSchema"
      @update:open="(isOpen) => { if (!isOpen) historyRecord = null }"
    />

    <UModal
      v-model:open="deleteModalOpen"
      title="Hapus data?"
      :description="
        selectedRecord
          ? `Snapshot ${selectedRecord.regionName} pada ${selectedRecord.periodLabel} akan dihapus permanen.`
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
              @click="deleteRecord"
            />
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
