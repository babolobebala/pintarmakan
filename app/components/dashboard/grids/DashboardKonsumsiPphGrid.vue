<script setup lang="ts">
import type {
  DashboardCardDetailContext,
  DashboardConfiguredPayload,
  DashboardDatasetBundle
} from '~~/shared/dashboard'

import {
  dashboardCardDefinitions,
  getDashboardAvailablePeriods,
  getDashboardDatasetField,
  readDashboardRecordNumber
} from '~~/shared/dashboard'
import { formatDatasetPeriod } from '~~/shared/datasets'

import DashboardCardDetailModal from '../DashboardCardDetailModal.vue'

type RegionalPphRow = {
  regionId: string
  regionName: string
  parentRegionName: string | null
  value: number
}

const ALL_KECAMATAN = '__ALL__'
const pphMapColorMap = {
  'pph-0': '#ecfccb',
  'pph-1': '#d9f99d',
  'pph-2': '#a3e635',
  'pph-3': '#65a30d',
  'pph-4': '#3f6212'
}

const props = defineProps<{
  payload: DashboardConfiguredPayload
  pending?: boolean
}>()

const pphCard = dashboardCardDefinitions.find(card => card.key === 'pph')
const kecamatanCard = dashboardCardDefinitions.find(card => card.key === 'pph-kecamatan')
const desaCard = dashboardCardDefinitions.find(card => card.key === 'pph-desa')
const selectedYear = ref('')
const activeRegionalView = ref<'kecamatan' | 'desa'>('kecamatan')
const selectedDesaKecamatan = ref(ALL_KECAMATAN)
const kecamatanSearch = ref('')
const desaSearch = ref('')
const detailOpen = ref(false)
const selectedDetail = shallowRef<DashboardCardDetailContext | null>(null)

const kabupatenDataset = computed<DashboardDatasetBundle | null>(() => props.payload.cards.pph ?? null)
const kecamatanDataset = computed<DashboardDatasetBundle | null>(() => props.payload.cards['pph-kecamatan'] ?? null)
const desaDataset = computed<DashboardDatasetBundle | null>(() => props.payload.cards['pph-desa'] ?? null)
const kabupatenPeriods = computed(() => kabupatenDataset.value && pphCard
  ? getDashboardAvailablePeriods(kabupatenDataset.value.definition.coverage, pphCard)
  : [])
const availableYears = computed(() => [...new Set([
  ...kabupatenPeriods.value,
  ...(kecamatanDataset.value && kecamatanCard
    ? getDashboardAvailablePeriods(kecamatanDataset.value.definition.coverage, kecamatanCard)
    : []),
  ...(desaDataset.value && desaCard
    ? getDashboardAvailablePeriods(desaDataset.value.definition.coverage, desaCard)
    : [])
])].sort((left, right) => right.localeCompare(left)))
const selectedYearLabel = computed(() => selectedYear.value
  ? formatDatasetPeriod('TAHUNAN', selectedYear.value)
  : null)
const konsumsiField = computed(() => kabupatenDataset.value
  ? getDashboardDatasetField(kabupatenDataset.value.definition.dataSchema, 'pph_konsumsi')
  : null)
const ketersediaanField = computed(() => kabupatenDataset.value
  ? getDashboardDatasetField(kabupatenDataset.value.definition.dataSchema, 'pph_ketersediaan')
  : null)
const kecamatanField = computed(() => kecamatanDataset.value && kecamatanCard
  ? getDashboardDatasetField(kecamatanDataset.value.definition.dataSchema, kecamatanCard.fieldKey)
  : null)
const desaField = computed(() => desaDataset.value && desaCard
  ? getDashboardDatasetField(desaDataset.value.definition.dataSchema, desaCard.fieldKey)
  : null)
const kabupatenRecord = computed(() => kabupatenDataset.value?.records.find(record => record.periodDate === selectedYear.value))
const konsumsiValue = computed(() => readDashboardRecordNumber(kabupatenRecord.value, konsumsiField.value?.key ?? null))
const ketersediaanValue = computed(() => readDashboardRecordNumber(kabupatenRecord.value, ketersediaanField.value?.key ?? null))
const historyRows = computed(() => kabupatenPeriods.value
  .slice()
  .reverse()
  .map((periodDate) => {
    const record = kabupatenDataset.value?.records.find(item => item.periodDate === periodDate)

    return {
      periodDate,
      konsumsi: readDashboardRecordNumber(record, konsumsiField.value?.key ?? null),
      ketersediaan: readDashboardRecordNumber(record, ketersediaanField.value?.key ?? null)
    }
  }))
const kecamatanRows = computed(() => regionalRows(kecamatanDataset.value, kecamatanField.value?.key ?? null))
const desaRows = computed(() => regionalRows(desaDataset.value, desaField.value?.key ?? null))
const desaKecamatanOptions = computed(() => {
  const names = [...new Set(desaRows.value
    .map(row => row.parentRegionName)
    .filter((name): name is string => Boolean(name)))]
    .sort((left, right) => left.localeCompare(right, 'id-ID'))

  return [
    { label: 'Semua Kecamatan', value: ALL_KECAMATAN },
    ...names.map(name => ({ label: name, value: name }))
  ]
})
const filteredKecamatanRows = computed(() => filterRows(kecamatanRows.value, kecamatanSearch.value))
const filteredDesaRows = computed(() => filterRows(
  selectedDesaKecamatan.value === ALL_KECAMATAN
    ? desaRows.value
    : desaRows.value.filter(row => row.parentRegionName === selectedDesaKecamatan.value),
  desaSearch.value
))
const kecamatanMapValues = computed(() => createKecamatanMapValues(kecamatanRows.value))
const desaMapValues = computed(() => createDesaMapValues(
  selectedDesaKecamatan.value === ALL_KECAMATAN
    ? desaRows.value
    : desaRows.value.filter(row => row.parentRegionName === selectedDesaKecamatan.value)
))
const kecamatanRankingMaximum = computed(() => kecamatanRows.value[0]?.value ?? 0)
const kabupatenSource = computed(() => kabupatenDataset.value?.definition.source ?? null)
const kecamatanSource = computed(() => kecamatanDataset.value?.definition.source ?? null)
const desaSource = computed(() => desaDataset.value?.definition.source ?? null)

watch(availableYears, (years) => {
  if (!years.includes(selectedYear.value)) {
    selectedYear.value = years[0] ?? ''
  }
}, { immediate: true })

watch(desaKecamatanOptions, (options) => {
  if (!options.some(option => option.value === selectedDesaKecamatan.value)) {
    selectedDesaKecamatan.value = ALL_KECAMATAN
  }
}, { immediate: true })

function regionalRows(dataset: DashboardDatasetBundle | null, fieldKey: string | null): RegionalPphRow[] {
  if (!dataset || !selectedYear.value) {
    return []
  }

  return dataset.records
    .filter(record => record.periodDate === selectedYear.value)
    .flatMap((record) => {
      const value = readDashboardRecordNumber(record, fieldKey)

      return value === null
        ? []
        : [{
            regionId: record.regionId,
            regionName: record.regionName,
            parentRegionName: record.parentRegionName,
            value
          }]
    })
    .sort((left, right) => right.value - left.value || left.regionName.localeCompare(right.regionName, 'id-ID'))
}

function filterRows(rows: RegionalPphRow[], search: string) {
  const query = search.trim().toLocaleLowerCase('id-ID')

  return query
    ? rows.filter(row => row.regionName.toLocaleLowerCase('id-ID').includes(query)
      || row.parentRegionName?.toLocaleLowerCase('id-ID').includes(query))
    : rows
}

function intensityKey(value: number, rows: RegionalPphRow[]) {
  const values = rows.map(row => row.value)
  const minimum = Math.min(...values)
  const maximum = Math.max(...values)
  const ratio = maximum === minimum ? 0.5 : (value - minimum) / (maximum - minimum)

  return `pph-${Math.min(4, Math.max(0, Math.round(ratio * 4)))}`
}

function createKecamatanMapValues(rows: RegionalPphRow[]) {
  return rows.map(row => ({
    regionName: row.regionName,
    valueKey: intensityKey(row.value, rows),
    valueLabel: `PPH: ${formatPph(row.value)}`
  }))
}

function createDesaMapValues(rows: RegionalPphRow[]) {
  return rows.map(row => ({
    regionId: row.regionId,
    label: row.regionName,
    parentLabel: row.parentRegionName,
    valueKey: intensityKey(row.value, rows),
    valueLabel: `PPH: ${formatPph(row.value)}`
  }))
}

function formatPph(value: number | null) {
  return value === null
    ? '—'
    : new Intl.NumberFormat('id-ID', { maximumFractionDigits: 4 }).format(value)
}

function openDetail(card: DashboardCardDetailContext['card'] | undefined, dataset: DashboardDatasetBundle | null) {
  if (!card || !dataset) {
    return
  }

  selectedDetail.value = { card, dataset, periodDate: selectedYear.value || null }
  detailOpen.value = true
}
</script>

<template>
  <section class="space-y-3" :class="pending ? 'opacity-75 transition-opacity' : ''">
    <header class="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
      <div class="min-w-0">
        <div class="flex items-center gap-2">
          <span class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-warning/15 text-warning">
            <UIcon name="i-lucide-utensils" class="size-4" />
          </span>
          <div class="min-w-0">
            <h2 class="text-xl leading-7 font-semibold tracking-tight text-[var(--app-foreground)]">
              Konsumsi dan PPH
            </h2>
            <p class="mt-0.5 text-sm font-medium text-[var(--app-foreground-muted)]">
              Pemantauan Pola Pangan Harapan Kabupaten Sumbawa Barat.
            </p>
          </div>
        </div>
      </div>

      <DashboardPeriodSelector v-model="selectedYear" periodicity="TAHUNAN" :periods="availableYears" />
    </header>

    <div v-if="!selectedYear" class="rounded-[var(--radius-panel)] border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-8 text-sm text-[var(--app-foreground-muted)]">
      Belum ada tahun yang tersedia untuk Dataset PPH.
    </div>

    <template v-else>
      <section class="grid items-start gap-3 xl:grid-cols-12">
        <DashboardWidget compact class="xl:col-span-7">
          <template #header>
            <div>
              <h3 class="text-sm font-semibold text-[var(--app-foreground)]">
                PPH Kabupaten
              </h3>
              <p class="mt-0.5 text-xs text-[var(--app-foreground-muted)]">
                Nilai PPH Kabupaten Sumbawa Barat pada {{ selectedYearLabel }}.
              </p>
            </div>
          </template>

          <div class="grid gap-3 sm:grid-cols-2">
            <article class="min-w-0 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-muted)] px-3 py-3">
              <div class="flex items-center gap-2.5">
                <span class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-warning/15 text-warning"><UIcon name="i-lucide-utensils" class="size-4" /></span>
                <div class="min-w-0">
                  <p class="text-xs font-medium text-[var(--app-foreground-muted)]">
                    PPH Konsumsi
                  </p>
                  <p class="mt-0.5 text-xl font-semibold tracking-tight tabular-nums text-[var(--app-foreground)]">
                    {{ formatPph(konsumsiValue) }}
                  </p>
                  <p v-if="konsumsiValue === null" class="mt-0.5 text-xs text-[var(--app-foreground-muted)]">
                    Data belum tersedia
                  </p>
                </div>
              </div>
            </article>
            <article class="min-w-0 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-muted)] px-3 py-3">
              <div class="flex items-center gap-2.5">
                <span class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-success/10 text-success"><UIcon name="i-lucide-clipboard-check" class="size-4" /></span>
                <div class="min-w-0">
                  <p class="text-xs font-medium text-[var(--app-foreground-muted)]">
                    PPH Ketersediaan
                  </p>
                  <p class="mt-0.5 text-xl font-semibold tracking-tight tabular-nums text-[var(--app-foreground)]">
                    {{ formatPph(ketersediaanValue) }}
                  </p>
                  <p v-if="ketersediaanValue === null" class="mt-0.5 text-xs text-[var(--app-foreground-muted)]">
                    Data belum tersedia
                  </p>
                </div>
              </div>
            </article>
          </div>

          <template #footer>
            <DashboardCardSource :source="kabupatenSource" />
          </template>
        </DashboardWidget>

        <DashboardWidget compact class="xl:col-span-5">
          <template #header>
            <div class="flex w-full flex-wrap items-start justify-between gap-2">
              <div>
                <h3 class="text-sm font-semibold text-[var(--app-foreground)]">
                  Riwayat PPH Kabupaten
                </h3>
                <p class="mt-0.5 text-xs text-[var(--app-foreground-muted)]">
                  Perkembangan nilai PPH pada cakupan Dataset.
                </p>
              </div>
              <UButton
                size="xs"
                color="neutral"
                variant="ghost"
                trailing-icon="i-lucide-arrow-right"
                class="cursor-pointer whitespace-nowrap"
                @click="openDetail(pphCard, kabupatenDataset)"
              >
                Lihat seluruh data
              </UButton>
            </div>
          </template>

          <div class="overflow-x-auto">
            <table class="w-full min-w-[440px] text-xs">
              <thead class="border-y border-[var(--app-border)] bg-[var(--app-surface-muted)] text-left font-medium text-[var(--app-foreground-muted)]">
                <tr>
                  <th class="px-3 py-2">
                    Tahun
                  </th><th class="px-3 py-2 text-right">
                    PPH Konsumsi
                  </th><th class="px-3 py-2 text-right">
                    PPH Ketersediaan
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[var(--app-border)]">
                <tr v-for="row in historyRows" :key="row.periodDate" :class="row.periodDate === selectedYear ? 'bg-primary/5' : ''">
                  <td class="px-3 py-2 font-medium text-[var(--app-foreground)]">
                    {{ row.periodDate.slice(0, 4) }}
                  </td>
                  <td class="px-3 py-2 text-right tabular-nums text-[var(--app-foreground)]">
                    {{ formatPph(row.konsumsi) }}
                  </td>
                  <td class="px-3 py-2 text-right tabular-nums text-[var(--app-foreground)]">
                    {{ formatPph(row.ketersediaan) }}
                  </td>
                </tr>
                <tr v-if="!historyRows.length">
                  <td colspan="3" class="px-3 py-6 text-center text-sm text-[var(--app-foreground-muted)]">
                    Riwayat PPH belum tersedia.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </DashboardWidget>
      </section>

      <section class="space-y-3">
        <div>
          <h3 class="text-base font-semibold text-[var(--app-foreground)]">
            PPH Wilayah
          </h3>
          <p class="mt-0.5 text-sm text-[var(--app-foreground-muted)]">
            Lihat distribusi dan sebaran nilai PPH berdasarkan wilayah.
          </p>
        </div>
        <nav class="inline-flex w-full rounded-[var(--radius-control)] border border-[var(--app-border)] bg-[var(--app-surface-muted)] p-1 sm:w-auto" aria-label="Tingkat wilayah PPH">
          <UButton
            size="sm"
            :color="activeRegionalView === 'kecamatan' ? 'primary' : 'neutral'"
            :variant="activeRegionalView === 'kecamatan' ? 'solid' : 'ghost'"
            :aria-pressed="activeRegionalView === 'kecamatan'"
            class="flex-1 cursor-pointer sm:flex-none"
            @click="activeRegionalView = 'kecamatan'"
          >
            Kecamatan
          </UButton>
          <UButton
            size="sm"
            :color="activeRegionalView === 'desa' ? 'primary' : 'neutral'"
            :variant="activeRegionalView === 'desa' ? 'solid' : 'ghost'"
            :aria-pressed="activeRegionalView === 'desa'"
            class="flex-1 cursor-pointer sm:flex-none"
            @click="activeRegionalView = 'desa'"
          >
            Desa
          </UButton>
        </nav>

        <template v-if="activeRegionalView === 'kecamatan'">
          <section class="grid items-start gap-3 xl:grid-cols-12">
            <DashboardWidget compact class="xl:col-span-7">
              <template #header>
                <div>
                  <h4 class="text-sm font-semibold text-[var(--app-foreground)]">
                    Peta PPH Kecamatan
                  </h4>
                  <p class="mt-0.5 text-xs text-[var(--app-foreground-muted)]">
                    Intensitas warna hanya menunjukkan perbandingan nilai PPH pada tahun terpilih.
                  </p>
                </div>
              </template>
              <p v-if="!kecamatanRows.length" class="text-sm text-[var(--app-foreground-muted)]">
                Data PPH Kecamatan untuk {{ selectedYearLabel }} belum tersedia.
              </p>
              <MapAdministrativeBoundaryMap
                v-else
                map-height="clamp(300px, 31vw, 410px)"
                :kecamatan-values="kecamatanMapValues"
                :value-color-map="pphMapColorMap"
                :popup-year="selectedYearLabel"
                :show-desa-layer="false"
                stop-interaction-propagation
                no-data-color="#e2e8f0"
                no-data-label="Data PPH belum tersedia"
              />
              <template #footer>
                <DashboardCardSource :source="kecamatanSource" />
              </template>
            </DashboardWidget>

            <DashboardWidget compact class="xl:col-span-5">
              <template #header>
                <h4 class="text-sm font-semibold text-[var(--app-foreground)]">
                  Ranking PPH Kecamatan
                </h4>
              </template>
              <div v-if="kecamatanRows.length" class="space-y-2.5">
                <div v-for="(row, index) in kecamatanRows" :key="row.regionId" class="grid grid-cols-[1.5rem_minmax(0,1fr)_minmax(5rem,0.7fr)] items-center gap-2 text-xs">
                  <span class="tabular-nums text-[var(--app-foreground-muted)]">{{ index + 1 }}</span>
                  <span class="truncate font-medium text-[var(--app-foreground)]">{{ row.regionName }}</span>
                  <span class="flex items-center justify-end gap-2"><span class="h-3 min-w-0 flex-1 overflow-hidden rounded-sm bg-[var(--app-surface-muted)]"><span class="block h-full rounded-sm bg-success" :style="{ width: `${kecamatanRankingMaximum ? (row.value / kecamatanRankingMaximum) * 100 : 0}%` }" /></span><span class="w-14 text-right tabular-nums text-[var(--app-foreground-muted)]">{{ formatPph(row.value) }}</span></span>
                </div>
              </div>
              <p v-else class="text-sm text-[var(--app-foreground-muted)]">
                Data PPH Kecamatan untuk {{ selectedYearLabel }} belum tersedia.
              </p>
              <template #footer>
                <UButton
                  size="xs"
                  color="neutral"
                  variant="ghost"
                  trailing-icon="i-lucide-arrow-right"
                  class="cursor-pointer"
                  @click="openDetail(kecamatanCard, kecamatanDataset)"
                >
                  Lihat seluruh data
                </UButton>
              </template>
            </DashboardWidget>
          </section>

          <DashboardWidget compact>
            <template #header>
              <div class="flex w-full flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h4 class="text-sm font-semibold text-[var(--app-foreground)]">
                    Daftar Kecamatan
                  </h4><p class="mt-0.5 text-xs text-[var(--app-foreground-muted)]">
                    Nilai PPH Kecamatan pada {{ selectedYearLabel }}.
                  </p>
                </div><UInput
                  v-model="kecamatanSearch"
                  icon="i-lucide-search"
                  placeholder="Cari kecamatan..."
                  size="xs"
                  class="w-full sm:w-56"
                />
              </div>
            </template>
            <div class="overflow-x-auto">
              <table class="w-full min-w-[500px] text-sm">
                <thead class="border-y border-[var(--app-border)] bg-[var(--app-surface-muted)] text-left text-[0.68rem] font-medium tracking-[0.1em] text-[var(--app-foreground-muted)] uppercase">
                  <tr>
                    <th class="w-12 px-3 py-2.5">
                      No
                    </th><th class="px-3 py-2.5">
                      Kecamatan
                    </th><th class="px-3 py-2.5 text-right">
                      PPH
                    </th>
                  </tr>
                </thead><tbody class="divide-y divide-[var(--app-border)]">
                  <tr v-for="(row, index) in filteredKecamatanRows" :key="row.regionId">
                    <td class="px-3 py-2.5 tabular-nums text-[var(--app-foreground-muted)]">
                      {{ index + 1 }}
                    </td><td class="px-3 py-2.5 font-medium text-[var(--app-foreground)]">
                      {{ row.regionName }}
                    </td><td class="px-3 py-2.5 text-right tabular-nums text-[var(--app-foreground)]">
                      {{ formatPph(row.value) }}
                    </td>
                  </tr><tr v-if="!filteredKecamatanRows.length">
                    <td colspan="3" class="px-3 py-6 text-center text-sm text-[var(--app-foreground-muted)]">
                      Tidak ada data Kecamatan yang sesuai.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <template #footer>
              <DashboardCardSource :source="kecamatanSource" />
            </template>
          </DashboardWidget>
        </template>

        <template v-else>
          <section class="grid items-start gap-3 xl:grid-cols-12">
            <DashboardWidget compact class="xl:col-span-7">
              <template #header>
                <div class="flex w-full flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h4 class="text-sm font-semibold text-[var(--app-foreground)]">
                      Peta PPH Desa
                    </h4><p class="mt-0.5 text-xs text-[var(--app-foreground-muted)]">
                      Intensitas warna hanya menunjukkan perbandingan nilai PPH pada tahun terpilih.
                    </p>
                  </div><USelectMenu
                    v-model="selectedDesaKecamatan"
                    :items="desaKecamatanOptions"
                    value-key="value"
                    label-key="label"
                    size="xs"
                    color="neutral"
                    variant="outline"
                    class="w-48"
                    aria-label="Pilih kecamatan"
                  />
                </div>
              </template>
              <p v-if="!desaRows.length" class="text-sm text-[var(--app-foreground-muted)]">
                Data PPH Desa untuk {{ selectedYearLabel }} belum tersedia.
              </p>
              <MapAdministrativeBoundaryMap
                v-else
                map-height="clamp(300px, 31vw, 410px)"
                :desa-values="desaMapValues"
                :value-color-map="pphMapColorMap"
                :selected-kecamatan="selectedDesaKecamatan === ALL_KECAMATAN ? null : selectedDesaKecamatan"
                :popup-year="selectedYearLabel"
                show-desa-tooltips
                stop-interaction-propagation
                no-data-color="#e2e8f0"
                no-data-label="Data PPH belum tersedia"
              />
              <template #footer>
                <DashboardCardSource :source="desaSource" />
              </template>
            </DashboardWidget>

            <DashboardWidget compact class="xl:col-span-5">
              <template #header>
                <div class="flex w-full flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h4 class="text-sm font-semibold text-[var(--app-foreground)]">
                      Daftar PPH Desa
                    </h4><p class="mt-0.5 text-xs text-[var(--app-foreground-muted)]">
                      Urutan nilai PPH tertinggi pada wilayah terpilih.
                    </p>
                  </div><UInput
                    v-model="desaSearch"
                    icon="i-lucide-search"
                    placeholder="Cari desa atau kecamatan..."
                    size="xs"
                    class="w-full sm:w-60"
                  />
                </div>
              </template>
              <div class="max-h-[410px] overflow-auto">
                <table class="w-full min-w-[460px] text-xs">
                  <thead class="sticky top-0 border-y border-[var(--app-border)] bg-[var(--app-surface-muted)] text-left font-medium text-[var(--app-foreground-muted)]">
                    <tr>
                      <th class="w-10 px-3 py-2">
                        No
                      </th><th class="px-3 py-2">
                        Desa
                      </th><th class="px-3 py-2">
                        Kecamatan
                      </th><th class="px-3 py-2 text-right">
                        PPH
                      </th>
                    </tr>
                  </thead><tbody class="divide-y divide-[var(--app-border)]">
                    <tr v-for="(row, index) in filteredDesaRows" :key="row.regionId">
                      <td class="px-3 py-2 tabular-nums text-[var(--app-foreground-muted)]">
                        {{ index + 1 }}
                      </td><td class="px-3 py-2 font-medium text-[var(--app-foreground)]">
                        {{ row.regionName }}
                      </td><td class="px-3 py-2 text-[var(--app-foreground-muted)]">
                        {{ row.parentRegionName ?? '—' }}
                      </td><td class="px-3 py-2 text-right tabular-nums text-[var(--app-foreground)]">
                        {{ formatPph(row.value) }}
                      </td>
                    </tr><tr v-if="!filteredDesaRows.length">
                      <td colspan="4" class="px-3 py-6 text-center text-sm text-[var(--app-foreground-muted)]">
                        Tidak ada data Desa yang sesuai.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <template #footer>
                <UButton
                  size="xs"
                  color="neutral"
                  variant="ghost"
                  trailing-icon="i-lucide-arrow-right"
                  class="cursor-pointer"
                  @click="openDetail(desaCard, desaDataset)"
                >
                  Lihat seluruh data
                </UButton>
              </template>
            </DashboardWidget>
          </section>
        </template>
      </section>
    </template>

    <DashboardCardDetailModal v-model:open="detailOpen" :context="selectedDetail" />
  </section>
</template>
