<script setup lang="ts">
import type {
  DashboardCardDetailContext,
  DashboardDatasetRecord,
  DashboardDatasetTableRecord
} from '~~/shared/dashboard'

import {
  formatDashboardValue,
  getDashboardAvailablePeriods,
  getDashboardDetailFields
} from '~~/shared/dashboard'
import { formatDatasetPeriod } from '~~/shared/datasets'

const props = defineProps<{
  context: DashboardCardDetailContext | null
}>()

const open = defineModel<boolean>('open', { default: false })
const search = ref('')
const selectedPeriod = ref('')
const fields = computed(() => props.context
  ? getDashboardDetailFields(props.context.card, props.context.dataset.definition.dataSchema)
  : [])
const availablePeriods = computed(() => getDashboardAvailablePeriods(
  props.context?.dataset.definition.coverage ?? null
))
const periodLabel = computed(() => !selectedPeriod.value
  ? 'Periode belum tersedia'
  : formatDatasetPeriod(props.context?.card.periodicity ?? null, selectedPeriod.value))
const sourceLabel = computed(() => props.context?.dataset.definition.source ?? 'Sumber belum tersedia')
const isTabular = computed(() => props.context?.dataset.definition.mode === 'TABULAR')
const selectedRegionalRecords = computed(() => !selectedPeriod.value
  ? []
  : props.context?.dataset.records.filter(record => record.periodDate === selectedPeriod.value) ?? [])
const selectedTableRecords = computed(() => !selectedPeriod.value
  ? []
  : props.context?.dataset.tableRecords.filter(record => record.periodDate === selectedPeriod.value) ?? [])
const query = computed(() => search.value.trim().toLocaleLowerCase('id-ID'))
const searchableRows = computed(() => {
  const records: Array<DashboardDatasetRecord | DashboardDatasetTableRecord> = isTabular.value
    ? selectedTableRecords.value
    : selectedRegionalRecords.value

  return records.filter((record) => {
    const regionalRecord = 'regionName' in record ? record : null
    const values = fields.value.map(field => formatDashboardValue(record.data[field.key], field))
    const searchable = [
      regionalRecord?.parentRegionName,
      regionalRecord?.regionName,
      ...values
    ].filter(Boolean).join(' ').toLocaleLowerCase('id-ID')

    return !query.value || searchable.includes(query.value)
  })
})
const regionLevel = computed(() => props.context?.dataset.definition.regionLevel)
const hasSelectedRecords = computed(() => isTabular.value
  ? selectedTableRecords.value.length > 0
  : selectedRegionalRecords.value.length > 0)
const contextColumnCount = computed(() => regionLevel.value === 'DESA' ? 2 : 1)

function downloadCurrentPeriod() {
  if (!props.context || !selectedPeriod.value || !import.meta.client) {
    return
  }

  const query = new URLSearchParams({
    datasetId: props.context.dataset.definition.id,
    periodDate: selectedPeriod.value
  })

  window.open(`/api/dataset-period-export?${query.toString()}`, '_blank', 'noopener')
}

function downloadAllPeriods() {
  if (!props.context || !import.meta.client) {
    return
  }

  const query = new URLSearchParams({ datasetId: props.context.dataset.definition.id })
  window.open(`/api/dataset-dashboard-flat-export?${query.toString()}`, '_blank', 'noopener')
}

function regionRecord(row: DashboardDatasetRecord | DashboardDatasetTableRecord) {
  return 'regionName' in row ? row : null
}

function initializeSelectedPeriod() {
  const cardPeriod = props.context?.periodDate

  selectedPeriod.value = cardPeriod && availablePeriods.value.includes(cardPeriod)
    ? cardPeriod
    : availablePeriods.value[0] ?? ''
  search.value = ''
}

watch(open, (isOpen) => {
  if (isOpen) {
    initializeSelectedPeriod()
  }
})
</script>

<template>
  <UModal
    v-model:open="open"
    :title="context?.card.title ?? 'Detail data dashboard'"
    :description="periodLabel"
    :ui="{ content: 'sm:max-w-5xl' }"
  >
    <template #body>
      <div class="space-y-4">
        <div class="flex flex-col gap-3 rounded-xl border border-default bg-elevated/20 px-3 py-3 lg:flex-row lg:items-center lg:justify-between">
          <DashboardPeriodSelector
            v-model="selectedPeriod"
            :periodicity="context?.card.periodicity ?? null"
            :periods="availablePeriods"
          />

          <div class="flex flex-wrap items-center gap-2">
            <UInput
              v-model="search"
              icon="i-lucide-search"
              placeholder="Cari data..."
              size="sm"
              class="w-full sm:w-52"
            />
            <UButton
              label="Unduh Data"
              icon="i-lucide-download"
              color="neutral"
              variant="outline"
              size="sm"
              :disabled="!selectedPeriod"
              @click="downloadCurrentPeriod"
            />
            <UButton
              label="Unduh Seluruh Data"
              icon="i-lucide-files"
              color="neutral"
              variant="outline"
              size="sm"
              :disabled="!context"
              @click="downloadAllPeriods"
            />
          </div>
        </div>

        <UAlert
          v-if="!context?.dataset.available"
          icon="i-lucide-database-zap"
          title="Dataset tidak tersedia"
          description="Definisi Dataset tidak tersedia atau tidak mendukung konfigurasi kartu dashboard ini."
          color="warning"
          variant="subtle"
        />

        <UEmpty
          v-else-if="!selectedPeriod || !hasSelectedRecords"
          icon="i-lucide-database-search"
          title="Data belum tersedia untuk periode ini"
          description="Belum ada data yang dapat ditampilkan untuk periode kartu yang dipilih."
          variant="naked"
        />

        <div v-else class="overflow-x-auto rounded-xl border border-default">
          <table class="w-full min-w-[520px] divide-y divide-default text-sm">
            <thead class="bg-elevated/35">
              <tr>
                <template v-if="!isTabular">
                  <th
                    v-if="regionLevel === 'DESA'"
                    class="px-4 py-3 text-left text-xs font-medium tracking-[0.16em] text-muted uppercase"
                  >
                    Kecamatan
                  </th>
                  <th class="px-4 py-3 text-left text-xs font-medium tracking-[0.16em] text-muted uppercase">
                    {{ regionLevel === 'DESA' ? 'Desa/Kelurahan' : regionLevel === 'KECAMATAN' ? 'Kecamatan' : 'Wilayah' }}
                  </th>
                </template>
                <th
                  v-for="field in fields"
                  :key="field.key"
                  class="px-4 py-3 text-right text-xs font-medium tracking-[0.16em] text-muted uppercase"
                >
                  {{ field.label }}
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-default">
              <tr v-for="(row, index) in searchableRows" :key="`${row.periodDate}-${index}`">
                <template v-if="!isTabular">
                  <td v-if="regionLevel === 'DESA'" class="px-4 py-3 text-muted">
                    {{ regionRecord(row)?.parentRegionName ?? '—' }}
                  </td>
                  <td class="px-4 py-3 font-medium text-highlighted">
                    {{ regionRecord(row)?.regionName ?? '—' }}
                  </td>
                </template>
                <td
                  v-for="field in fields"
                  :key="field.key"
                  class="px-4 py-3 text-right text-highlighted tabular-nums"
                >
                  {{ formatDashboardValue(row.data[field.key], field) }}
                </td>
              </tr>
              <tr v-if="!searchableRows.length">
                <td :colspan="(isTabular ? 0 : contextColumnCount) + fields.length" class="px-4 py-10">
                  <UEmpty
                    icon="i-lucide-search-x"
                    title="Data tidak ditemukan"
                    description="Ubah kata kunci pencarian untuk melihat data lain."
                    variant="naked"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex w-full flex-wrap items-center justify-between gap-2 text-xs text-muted">
        <span>Sumber: {{ sourceLabel }}</span>
        <UButton
          label="Tutup"
          color="neutral"
          variant="ghost"
          size="sm"
          @click="open = false"
        />
      </div>
    </template>
  </UModal>
</template>
