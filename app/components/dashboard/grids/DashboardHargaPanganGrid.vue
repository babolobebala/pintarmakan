<script setup lang="ts">
import type { DashboardCardDetailContext, DashboardConfiguredPayload, DashboardDatasetBundle } from '~~/shared/dashboard'

import {
  dashboardHargaPanganCardDefinitions,
  getDashboardAvailablePeriods,
  getDashboardNumericSchemaFields
} from '~~/shared/dashboard'

import DashboardCardDetailModal from '../DashboardCardDetailModal.vue'
import DashboardCommodityPriceCard from '../widgets/harga/DashboardCommodityPriceCard.vue'

const props = defineProps<{
  payload: DashboardConfiguredPayload
  pending?: boolean
}>()

const hargaCard = dashboardHargaPanganCardDefinitions[0] ?? null
const dataset = computed<DashboardDatasetBundle | null>(() => props.payload.cards['harga-pangan'] ?? null)
const commodityFields = computed(() => dataset.value ? getDashboardNumericSchemaFields(dataset.value.definition.dataSchema) : [])
const availableDays = computed(() => dataset.value && hargaCard
  ? getDashboardAvailablePeriods(dataset.value.definition.coverage, hargaCard)
  : [])
const availableMonths = computed(() => [...new Set(availableDays.value.map(periodDate => `${periodDate.slice(0, 7)}-01`))])
const selectedMonth = ref('')
const search = ref('')

const detailOpen = ref(false)
const selectedDetail = shallowRef<DashboardCardDetailContext | null>(null)

watch(availableMonths, (months) => {
  if (!months.includes(selectedMonth.value)) {
    selectedMonth.value = months[0] ?? ''
  }
}, { immediate: true })

const selectedMonthDays = computed(() => availableDays.value.filter(periodDate => periodDate.startsWith(selectedMonth.value.slice(0, 7))))
const filteredCommodityFields = computed(() => {
  const query = search.value.trim().toLocaleLowerCase('id-ID')

  return query
    ? commodityFields.value.filter(field => field.label.toLocaleLowerCase('id-ID').includes(query))
    : commodityFields.value
})
const source = computed(() => dataset.value?.definition.source ?? null)

function openDetail(periodDate: string | null) {
  if (!hargaCard || !dataset.value) {
    return
  }

  selectedDetail.value = {
    card: hargaCard,
    dataset: dataset.value,
    periodDate
  }
  detailOpen.value = true
}
</script>

<template>
  <div
    class="space-y-3"
    :class="pending ? 'opacity-75 transition-opacity' : ''"
  >
    <header class="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
      <div class="min-w-0">
        <div class="flex items-center gap-2">
          <span class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-success/10 text-success">
            <UIcon name="i-lucide-chart-no-axes-combined" class="size-4" />
          </span>
          <div class="min-w-0">
            <h2 class="text-xl leading-7 font-semibold tracking-tight text-[var(--app-foreground)]">
              Harga Pangan
            </h2>
            <p class="mt-0.5 text-sm font-medium text-[var(--app-foreground-muted)]">
              Monitoring harga pangan harian Kabupaten Sumbawa Barat
            </p>
          </div>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <UInput
          v-model="search"
          icon="i-lucide-search"
          placeholder="Cari komoditas..."
          size="sm"
          class="w-full sm:w-52"
        />
        <DashboardPeriodSelector v-model="selectedMonth" periodicity="BULANAN" :periods="availableMonths" />
      </div>
    </header>

    <div v-if="!dataset || !dataset.available" class="text-sm text-[var(--app-foreground-muted)]">
      Dataset tidak tersedia untuk dashboard ini.
    </div>
    <div v-else-if="!commodityFields.length" class="text-sm text-[var(--app-foreground-muted)]">
      Komoditas harga belum tersedia pada Dataset.
    </div>
    <template v-else>
      <p class="text-sm font-medium text-[var(--app-foreground-muted)]">
        {{ filteredCommodityFields.length }} komoditas
      </p>
      <section v-if="selectedMonthDays.length" class="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
        <DashboardCommodityPriceCard
          v-for="field in filteredCommodityFields"
          :key="field.key"
          :field="field"
          :dataset="dataset"
          :days="selectedMonthDays"
          :month="selectedMonth"
          @open-detail="openDetail"
        />
      </section>
      <p v-else class="rounded-[var(--radius-panel)] border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-8 text-sm text-[var(--app-foreground-muted)]">
        Tidak ada hari dalam cakupan Dataset untuk bulan yang dipilih.
      </p>
      <p v-if="!filteredCommodityFields.length" class="text-sm text-[var(--app-foreground-muted)]">
        Komoditas tidak ditemukan.
      </p>
      <DashboardCardSource :source="source" />
    </template>

    <DashboardCardDetailModal
      v-model:open="detailOpen"
      :context="selectedDetail"
    />
  </div>
</template>
