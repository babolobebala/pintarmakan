<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type {
  DataManagementOptionsResponse,
  DatasetManagementItem
} from '~/types'

import AppPageIntro from '~/components/AppPageIntro.vue'
import {
  getDatasetModeColor,
  getDatasetOwnerColor,
  getDatasetPeriodicityColor,
  getDatasetRegionLevelColor
} from '~/utils/dataset-table'
import { appPermissions } from '~~/auth/permissions'

definePageMeta({ permission: appPermissions.businessDataRead })

const {
  data: optionsResponse,
  error: optionsError,
  refresh: refreshOptions,
  status: optionsStatus
} = await useFetch<DataManagementOptionsResponse>(
  '/api/data-management/options',
  {
    default: () => ({ bidangs: [], datasetsByBidang: {} })
  }
)

const allBidangsValue = '__all_bidangs__'
const selectedBidangId = ref(allBidangsValue)
const bidangs = computed(() => optionsResponse.value.bidangs)
const bidangSelectItems = computed(() => [
  { id: allBidangsValue, name: 'Semua Bidang' },
  ...bidangs.value.map(bidang => ({
    id: bidang.id,
    name: bidang.name,
    description: bidang.description ?? undefined
  }))
])
const allDatasets = computed(() =>
  Object.values(optionsResponse.value.datasetsByBidang).flat()
)
const datasets = computed(() => {
  return selectedBidangId.value === allBidangsValue
    ? allDatasets.value
    : (optionsResponse.value.datasetsByBidang[selectedBidangId.value] ?? [])
})
const UButton = resolveComponent('UButton')
const datasetCountLabel = computed(
  () =>
    `${datasets.value.length} dataset${datasets.value.length === 1 ? '' : 's'}`
)

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
    header: 'Aksi',
    enableSorting: false,
    meta: {
      class: {
        th: 'w-[96px] px-4 py-3 text-right text-xs font-medium uppercase tracking-[0.16em] text-muted',
        td: 'w-[96px] px-4 py-3 align-middle'
      }
    }
  }
]

function reloadOptions() {
  void refreshOptions()
}

function formatPeriodicityLabel(value: string | null) {
  switch (value) {
    case 'HARIAN':
      return 'Harian'
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
      return 'Wilayah tidak diketahui'
  }
}
</script>

<template>
  <div
    class="mx-auto flex w-full max-w-[1800px] flex-col gap-4 sm:gap-6 lg:gap-8"
  >
    <AppPageIntro
      kicker="Data operasional"
      title="Kelola Data"
      description="Pilih Dataset untuk melihat cakupan dan mengelola data berdasarkan periode."
    />

    <section
      class="overflow-hidden rounded-2xl border border-default bg-default"
    >
      <div
        class="flex flex-col gap-4 border-b border-default px-4 py-4 lg:flex-row lg:items-end lg:justify-between"
      >
        <div class="flex flex-wrap items-center gap-2">
          <h2 class="text-lg font-semibold text-highlighted">
            Dataset
          </h2>
          <UBadge color="neutral" variant="subtle" size="sm">
            {{ datasetCountLabel }}
          </UBadge>
        </div>
        <USelectMenu
          v-if="
            optionsStatus !== 'pending' && !optionsError && bidangs.length > 0
          "
          v-model="selectedBidangId"
          :items="bidangSelectItems"
          value-key="id"
          label-key="name"
          placeholder="Filter bidang"
          class="w-full lg:w-56"
        />
      </div>

      <div v-if="optionsStatus === 'pending'" class="space-y-3 px-4 py-6">
        <div v-for="row in 4" :key="row" class="h-10 rounded bg-elevated" />
      </div>
      <div v-else-if="optionsError" class="px-4 py-10">
        <UEmpty
          icon="i-lucide-folder-search"
          title="Konteks operasional tidak dapat dimuat"
          description="Muat ulang pilihan bidang dan Dataset untuk melanjutkan."
          :actions="[
            {
              label: 'Muat ulang',
              icon: 'i-lucide-refresh-cw',
              color: 'neutral',
              variant: 'subtle',
              onClick: reloadOptions
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
          title="Belum ada Dataset yang bisa dikelola"
          description="Tambahkan Dataset dengan owner bidang yang sesuai untuk mulai mengelola data."
        />
      </div>
      <div v-else class="overflow-x-auto">
        <UTable
          :data="datasets"
          :columns="columns"
          :initial-state="{ sorting: [{ id: 'name', desc: false }] }"
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
              {{ formatPeriodicityLabel(row.original.periodicity) }}
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

          <template #actions-cell="{ row }">
            <div class="flex justify-end">
              <NuxtLink
                :to="`/kelola-data/${row.original.id}`"
                target="_blank"
                rel="noopener"
                class="inline-flex items-center gap-1.5 rounded-md border border-default px-2.5 py-1.5 text-sm font-medium text-highlighted hover:bg-elevated focus-visible:outline-2 focus-visible:outline-offset-2"
              ><UIcon name="i-lucide-arrow-up-right" class="size-4" /><span>Buka</span></NuxtLink>
            </div>
          </template>
        </UTable>
      </div>
    </section>
  </div>
</template>
