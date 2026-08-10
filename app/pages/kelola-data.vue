<script setup lang="ts">
import type {
  DatasetRecordDatasetOption,
  DatasetRecordListItem,
  RegionItem
} from '~/types'
import type { DropdownMenuItem } from '@nuxt/ui'

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
} = await useFetch<{ datasets: DatasetRecordDatasetOption[] }>(
  '/api/data-management/options',
  {
    default: () => ({
      datasets: []
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

const selectedDatasetId = ref('')
const periodValue = ref('')
const selectedRegionFilter = ref('')
const selectedStatusFilter = ref('')
const search = ref('')
const selectedRecord = ref<DatasetRecordListItem | null>(null)
const editModalOpen = ref(false)
const deleteModalOpen = ref(false)
const deleting = ref(false)

const datasets = computed(() => optionsResponse.value.datasets)
const datasetSelectItems = computed(() => {
  return datasets.value.map(dataset => ({
    id: dataset.id,
    name: dataset.name,
    description: dataset.description ?? undefined
  }))
})
const selectedDataset = computed(() => {
  return (
    datasets.value.find(dataset => dataset.id === selectedDatasetId.value)
    ?? null
  )
})
const fields = computed(() => {
  return selectedDataset.value
    ? getDatasetSchemaFields(selectedDataset.value.dataSchema)
    : []
})
const visibleFields = computed(() => fields.value.slice(0, 4))
const hasMoreFields = computed(
  () => fields.value.length > visibleFields.value.length
)
const isPending = computed(
  () => optionsStatus.value === 'pending' || regionsStatus.value === 'pending'
)
const hasError = computed(() => !!optionsError.value || !!regionsError.value)
const totalDatasetLabel = computed(() => {
  return `${datasets.value.length} dataset${datasets.value.length === 1 ? '' : 's'}`
})

watch(
  datasets,
  (items) => {
    if (!items.some(item => item.id === selectedDatasetId.value)) {
      selectedDatasetId.value = items[0]?.id ?? ''
    }
  },
  { immediate: true }
)

watch(
  selectedDataset,
  (dataset) => {
    if (!dataset) {
      periodValue.value = ''
      selectedRegionFilter.value = ''
      selectedStatusFilter.value = ''
      return
    }

    periodValue.value = getDefaultPeriodInput(
      getDatasetPeriodicity(dataset.dataConfig)
    )

    if (selectedRegionFilter.value) {
      const regionLevel = getDatasetRegionLevel(dataset.dataConfig)
      const region = regions.value.find(
        item => item.id === selectedRegionFilter.value
      )

      if (
        !region
        || (regionLevel && region.level.toUpperCase() !== regionLevel)
      ) {
        selectedRegionFilter.value = ''
      }
    }
  },
  { immediate: true }
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
  return Array.from(new Set(records.value.map(record => record.status)))
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
      record.ownerBidangName,
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
  () => selectedDataset.value?.permissions.canCreate ?? false
)
const canImport = computed(
  () => selectedDataset.value?.permissions.canImport ?? false
)
const canExport = computed(
  () => selectedDataset.value?.permissions.canExport ?? false
)
function formatDateTime(value: string) {
  return dateTimeFormatter.format(new Date(value))
}

function formatFieldValue(record: DatasetRecordListItem, fieldKey: string) {
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

function showImportUnavailable() {
  toast.add({
    title: 'Import belum tersedia',
    description:
      'Belum ada infrastruktur CSV/Excel reusable di project ini, jadi aksi import belum diaktifkan.',
    color: 'neutral'
  })
}

async function refreshAllData() {
  await Promise.all([refreshOptions(), refreshRegions(), refreshRecords()])
}

function exportRecords() {
  if (!selectedDataset.value || filteredRecords.value.length === 0) {
    return
  }

  const headers = [
    'Periode',
    'Wilayah',
    'Owner Bidang',
    'Status',
    ...fields.value.map(field => field.label)
  ]
  const rows = filteredRecords.value.map((record) => {
    return [
      record.periodLabel,
      record.regionName,
      record.ownerBidangName,
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
    .map(row =>
      row.map(cell => `"${String(cell).replaceAll('"', '""')}"`).join(',')
    )
    .join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = `${selectedDataset.value.id}_${periodValue.value || 'export'}.csv`
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
      description:
        error instanceof Error ? error.message : 'Silakan coba lagi.',
      color: 'error'
    })
  } finally {
    deleting.value = false
  }
}

function getRowActions(record: DatasetRecordListItem): DropdownMenuItem[][] {
  const actions: DropdownMenuItem[] = []

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
</script>

<template>
  <div
    class="mx-auto flex w-full max-w-[1800px] flex-col gap-4 sm:gap-6 lg:gap-8"
  >
    <AppPageIntro
      kicker="Data operasional"
      title="Kelola Data"
      description="Input, perbarui, dan hapus snapshot data operasional berdasarkan dataset, wilayah, periode, dan owner bidang yang berwenang."
    />

    <section
      class="overflow-hidden rounded-2xl border border-default bg-default"
    >
      <div class="flex flex-col gap-4 border-b border-default px-4 py-4">
        <div
          class="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between"
        >
          <div class="space-y-1">
            <div class="flex flex-wrap items-center gap-2">
              <h2 class="text-lg font-semibold text-highlighted">
                Data operasional
              </h2>
              <UBadge color="neutral" variant="subtle" size="sm">
                {{ totalDatasetLabel }}
              </UBadge>
            </div>
            <p class="text-sm text-muted">
              Operator, admin, dan super-admin hanya melihat dataset serta aksi
              yang diizinkan oleh kombinasi role dan permission bidang.
            </p>
          </div>

          <div class="flex flex-wrap gap-2">
            <DataRecordsFormModal
              v-if="selectedDataset && canCreate"
              :dataset="selectedDataset"
              :regions="regions"
              @created="refreshRecords()"
            />
            <UButton
              v-if="selectedDataset && canImport"
              label="Import"
              icon="i-lucide-upload"
              color="neutral"
              variant="outline"
              @click="showImportUnavailable"
            />
            <UButton
              v-if="selectedDataset && canExport"
              label="Export CSV"
              icon="i-lucide-download"
              color="neutral"
              variant="outline"
              :disabled="filteredRecords.length === 0"
              @click="exportRecords"
            />
          </div>
        </div>

        <div class="grid gap-3 lg:grid-cols-2 xl:grid-cols-5">
          <USelectMenu
            v-model="selectedDatasetId"
            :items="datasetSelectItems"
            value-key="id"
            label-key="name"
            placeholder="Pilih dataset"
            class="w-full"
          />

          <UInput
            v-if="
              getDatasetPeriodicity(selectedDataset?.dataConfig) === 'DAILY'
            "
            v-model="periodValue"
            type="date"
            class="w-full"
          />
          <UInput
            v-else-if="
              getDatasetPeriodicity(selectedDataset?.dataConfig) === 'MONTHLY'
            "
            v-model="periodValue"
            type="month"
            class="w-full"
          />
          <UInput
            v-else-if="
              getDatasetPeriodicity(selectedDataset?.dataConfig) === 'YEARLY'
            "
            v-model="periodValue"
            placeholder="2026"
            class="w-full"
          />
          <UInput
            v-else
            v-model="periodValue"
            :placeholder="
              getDatasetPeriodicity(selectedDataset?.dataConfig) === 'QUARTERLY'
                ? '2026-Q3'
                : '2026-W32'
            "
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

      <div v-if="isPending" class="px-4 py-10">
        <div class="space-y-3">
          <div class="h-10 w-full rounded-xl bg-elevated/80" />
          <div class="h-48 w-full rounded-2xl bg-elevated/50" />
        </div>
      </div>

      <div v-else-if="hasError || recordsError" class="px-4 py-10">
        <UEmpty
          icon="i-lucide-folder-search"
          title="Unable to load operational data"
          description="Refresh the dataset options, region master, or record list and try again."
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

      <div v-else-if="datasets.length === 0" class="px-4 py-10">
        <UEmpty
          icon="i-lucide-folder-lock"
          title="Tidak ada dataset yang dapat diakses"
          description="Belum ada dataset dengan permission bidang yang memberi akses baca untuk akun ini."
        />
      </div>

      <div v-else-if="!selectedDataset" class="px-4 py-10">
        <UEmpty
          icon="i-lucide-database"
          title="Pilih dataset terlebih dahulu"
          description="Daftar record akan dimuat setelah dataset operasional dipilih."
        />
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full min-w-[1180px] divide-y divide-default text-sm">
          <thead class="bg-elevated/35">
            <tr>
              <th
                class="px-4 py-3 text-left text-xs font-medium tracking-[0.16em] text-muted uppercase"
              >
                Period
              </th>
              <th
                class="px-4 py-3 text-left text-xs font-medium tracking-[0.16em] text-muted uppercase"
              >
                Region
              </th>
              <th
                v-for="field in visibleFields"
                :key="field.key"
                class="px-4 py-3 text-left text-xs font-medium tracking-[0.16em] text-muted uppercase"
              >
                {{ field.label }}
              </th>
              <th
                class="px-4 py-3 text-left text-xs font-medium tracking-[0.16em] text-muted uppercase"
              >
                Owner Bidang
              </th>
              <th
                class="px-4 py-3 text-left text-xs font-medium tracking-[0.16em] text-muted uppercase"
              >
                Status
              </th>
              <th
                class="px-4 py-3 text-left text-xs font-medium tracking-[0.16em] text-muted uppercase"
              >
                Updated
              </th>
              <th
                class="px-4 py-3 text-right text-xs font-medium tracking-[0.16em] text-muted uppercase"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-default bg-default">
            <tr v-if="recordsStatus === 'pending'">
              <td :colspan="visibleFields.length + 6" class="px-4 py-10">
                <div class="space-y-3">
                  <div class="h-3 w-1/3 rounded bg-elevated" />
                  <div class="h-3 w-2/3 rounded bg-elevated/80" />
                </div>
              </td>
            </tr>

            <tr v-else-if="filteredRecords.length === 0">
              <td :colspan="visibleFields.length + 6" class="px-4 py-10">
                <UEmpty
                  icon="i-lucide-database-backup"
                  :title="
                    search || selectedRegionFilter || selectedStatusFilter
                      ? 'Tidak ada record yang cocok dengan filter aktif.'
                      : 'Belum ada data untuk periode yang sedang dipilih.'
                  "
                  :description="
                    search || selectedRegionFilter || selectedStatusFilter
                      ? 'Ubah filter wilayah, status, atau pencarian untuk melihat hasil lain.'
                      : 'Tambahkan snapshot data baru untuk periode yang sedang dipilih.'
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
              <td class="px-4 py-3 align-top text-muted">
                {{ record.ownerBidangName }}
                <span v-if="hasMoreFields" class="block text-xs text-muted">
                  +{{ fields.length - visibleFields.length }} field lain
                  tersedia di form detail
                </span>
              </td>
              <td class="px-4 py-3 align-top">
                <UBadge color="neutral" variant="subtle" size="sm">
                  {{ record.status }}
                </UBadge>
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
                    v-if="
                      record.permissions.canUpdate
                        || record.permissions.canDelete
                    "
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
