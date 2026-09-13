<script setup lang="ts">
import type {
  DashboardCardDetailContext,
  DashboardConfiguredPayload,
  DashboardDatasetBundle
} from '~~/shared/dashboard'

import {
  dashboardCardDefinitions,
  dashboardFoodSecurityPriorityLegend,
  getDashboardAvailablePeriods,
  getDashboardDatasetField,
  readDashboardRecordNumber,
  readDashboardRecordText
} from '~~/shared/dashboard'
import { formatDatasetPeriod } from '~~/shared/datasets'

import DashboardCardDetailModal from '../DashboardCardDetailModal.vue'
import DashboardSkpgGrid from './DashboardSkpgGrid.vue'

const ALL_KECAMATAN = '__ALL__'

const props = defineProps<{
  payload: DashboardConfiguredPayload
  pending?: boolean
}>()

const ikpCard = dashboardCardDefinitions.find(card => card.key === 'ikp')
const statusCard = dashboardCardDefinitions.find(card => card.key === 'status-ketahanan-pangan')
const selectedYear = ref('')
const activeSubView = ref<'FSVA' | 'SKPG'>('FSVA')
const selectedKecamatan = ref(ALL_KECAMATAN)
const search = ref('')
const selectedFsvaRegionId = ref('')
const detailOpen = ref(false)
const selectedDetail = shallowRef<DashboardCardDetailContext | null>(null)

const ikpDataset = computed<DashboardDatasetBundle | null>(() => props.payload.cards.ikp ?? null)
const statusDataset = computed<DashboardDatasetBundle | null>(() => props.payload.cards['status-ketahanan-pangan'] ?? null)
const ikpField = computed(() => ikpDataset.value && ikpCard
  ? getDashboardDatasetField(ikpDataset.value.definition.dataSchema, ikpCard.fieldKey)
  : null)
const priorityField = computed(() => statusDataset.value && statusCard
  ? getDashboardDatasetField(statusDataset.value.definition.dataSchema, statusCard.fieldKey)
  : null)
const indeksKompositField = computed(() => statusDataset.value
  ? getDashboardDatasetField(statusDataset.value.definition.dataSchema, 'indeks_komposit')
  : null)
const peringkatField = computed(() => statusDataset.value
  ? getDashboardDatasetField(statusDataset.value.definition.dataSchema, 'peringkat')
  : null)
const fsvaIndicatorDefinitions = [
  { key: 'prioritas_lahan', label: 'Lahan pertanian' },
  { key: 'prioritas_sarana', label: 'Sarana dan prasarana' },
  { key: 'prioritas_kesejahteraan', label: 'Kesejahteraan' },
  { key: 'prioritas_akses_penghubung', label: 'Akses penghubung' },
  { key: 'prioritas_akses_air_bersih', label: 'Akses air bersih' },
  { key: 'prioritas_tenaga_kesehatan', label: 'Tenaga kesehatan' }
] as const
const fsvaIndicatorFields = computed(() => fsvaIndicatorDefinitions.map(indicator => ({
  ...indicator,
  field: statusDataset.value
    ? getDashboardDatasetField(statusDataset.value.definition.dataSchema, indicator.key)
    : null
})))
const availableYears = computed(() => {
  const periods = [
    ...(ikpDataset.value && ikpCard ? getDashboardAvailablePeriods(ikpDataset.value.definition.coverage, ikpCard) : []),
    ...(statusDataset.value && statusCard ? getDashboardAvailablePeriods(statusDataset.value.definition.coverage, statusCard) : [])
  ]

  return [...new Set(periods)].sort((left, right) => right.localeCompare(left))
})
const selectedYearLabel = computed(() => selectedYear.value
  ? formatDatasetPeriod('TAHUNAN', selectedYear.value)
  : null)
const ikpRecord = computed(() => ikpDataset.value?.records.find(record => record.periodDate === selectedYear.value))
const ikpValue = computed(() => readDashboardRecordNumber(ikpRecord.value, ikpField.value?.key ?? null))
const statusRecords = computed(() => statusDataset.value?.records.filter(record => record.periodDate === selectedYear.value) ?? [])
const validStatusRecords = computed(() => statusRecords.value.flatMap((record) => {
  const priorityKey = readDashboardRecordText(record, priorityField.value?.key ?? null)
  const priority = dashboardFoodSecurityPriorityLegend.find(item => item.valueKey === priorityKey)

  return priority ? [{ record, priority }] : []
}))
const fsvaRecordOptions = computed(() => validStatusRecords.value
  .map(({ record }) => ({
    label: [record.regionName, record.parentRegionName].filter(Boolean).join(' · '),
    value: record.regionId
  }))
  .sort((left, right) => left.label.localeCompare(right.label, 'id-ID')))
const selectedFsvaRecord = computed(() => validStatusRecords.value.find(
  ({ record }) => record.regionId === selectedFsvaRegionId.value
)?.record ?? null)
const selectedFsvaPriority = computed(() => {
  const priorityKey = readDashboardRecordText(selectedFsvaRecord.value ?? undefined, priorityField.value?.key ?? null)
  return dashboardFoodSecurityPriorityLegend.find(item => item.valueKey === priorityKey) ?? null
})
const selectedFsvaIndex = computed(() => readDashboardRecordNumber(
  selectedFsvaRecord.value ?? undefined,
  indeksKompositField.value?.key ?? null
))
const selectedFsvaRank = computed(() => readDashboardRecordNumber(
  selectedFsvaRecord.value ?? undefined,
  peringkatField.value?.key ?? null
))
const selectedFsvaIndicators = computed(() => fsvaIndicatorFields.value.map(({ field, label }) => {
  const priorityKey = readDashboardRecordText(selectedFsvaRecord.value ?? undefined, field?.key ?? null)
  const priority = dashboardFoodSecurityPriorityLegend.find(item => item.valueKey === priorityKey) ?? null

  return {
    label: field?.label ?? label,
    priority
  }
}))
const kecamatanOptions = computed(() => {
  const names = [...new Set(statusRecords.value
    .map(record => record.parentRegionName)
    .filter((name): name is string => Boolean(name)))]
    .sort((left, right) => left.localeCompare(right, 'id-ID'))

  return [
    { label: 'Semua Kecamatan', value: ALL_KECAMATAN },
    ...names.map(name => ({ label: name, value: name }))
  ]
})
const filteredStatusRecords = computed(() => selectedKecamatan.value === ALL_KECAMATAN
  ? validStatusRecords.value
  : validStatusRecords.value.filter(({ record }) => record.parentRegionName === selectedKecamatan.value))
const countsByPriority = computed(() => dashboardFoodSecurityPriorityLegend.map(priority => ({
  ...priority,
  count: filteredStatusRecords.value.filter(item => item.priority.valueKey === priority.valueKey).length
})))
const totalDesa = computed(() => validStatusRecords.value.length)
const p1Count = computed(() => validStatusRecords.value.filter(item => item.priority.valueKey === '1').length)
const p2Count = computed(() => validStatusRecords.value.filter(item => item.priority.valueKey === '2').length)
const resilientCount = computed(() => validStatusRecords.value.filter(item => ['5', '6'].includes(item.priority.valueKey)).length)
const desaValues = computed(() => filteredStatusRecords.value.map(({ record, priority }) => ({
  regionId: record.regionId,
  label: record.regionName,
  parentLabel: record.parentRegionName,
  valueKey: priority.valueKey,
  valueLabel: `${priority.code} · ${priority.category}`,
  detailLines: [
    ...(readDashboardRecordNumber(record, indeksKompositField.value?.key ?? null) === null
      ? []
      : [{ label: 'Indeks Komposit', value: formatFsvaNumber(readDashboardRecordNumber(record, indeksKompositField.value?.key ?? null)) }]),
    ...(readDashboardRecordNumber(record, peringkatField.value?.key ?? null) === null
      ? []
      : [{ label: 'Peringkat', value: formatFsvaNumber(readDashboardRecordNumber(record, peringkatField.value?.key ?? null), 0) }])
  ]
})))
const valueColorMap = Object.fromEntries(dashboardFoodSecurityPriorityLegend.map(item => [item.valueKey, item.color]))
const kecamatanRows = computed(() => {
  const rows = new Map<string, number[]>()

  for (const { record, priority } of filteredStatusRecords.value) {
    if (!record.parentRegionName) {
      continue
    }

    const counts = rows.get(record.parentRegionName) ?? [0, 0, 0, 0, 0, 0]
    const priorityIndex = Number(priority.valueKey) - 1
    counts[priorityIndex] = (counts[priorityIndex] ?? 0) + 1
    rows.set(record.parentRegionName, counts)
  }

  return [...rows.entries()]
    .map(([name, counts]) => ({ name, counts, total: counts.reduce((total, count) => total + count, 0) }))
    .sort((left, right) => right.total - left.total || left.name.localeCompare(right.name, 'id-ID'))
})
const priorityRows = computed(() => {
  const query = search.value.trim().toLocaleLowerCase('id-ID')

  return filteredStatusRecords.value
    .filter(({ record }) => !query
      || record.regionName.toLocaleLowerCase('id-ID').includes(query)
      || record.parentRegionName?.toLocaleLowerCase('id-ID').includes(query))
    .slice()
    .sort((left, right) => Number(left.priority.valueKey) - Number(right.priority.valueKey)
      || left.record.parentRegionName?.localeCompare(right.record.parentRegionName ?? '', 'id-ID') || 0
      || left.record.regionName.localeCompare(right.record.regionName, 'id-ID'))
})
const ikpSource = computed(() => ikpDataset.value?.definition.source ?? null)
const statusSource = computed(() => statusDataset.value?.definition.source ?? null)

watch(availableYears, (years) => {
  if (!years.includes(selectedYear.value)) {
    selectedYear.value = years[0] ?? ''
  }
}, { immediate: true })

watch(kecamatanOptions, (options) => {
  if (!options.some(option => option.value === selectedKecamatan.value)) {
    selectedKecamatan.value = ALL_KECAMATAN
  }
}, { immediate: true })

watch(fsvaRecordOptions, (options) => {
  if (!options.some(option => option.value === selectedFsvaRegionId.value)) {
    selectedFsvaRegionId.value = options[0]?.value ?? ''
  }
}, { immediate: true })

function percentage(value: number, total: number) {
  return total > 0 ? `${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format((value / total) * 100)}%` : '—'
}

function formatFsvaNumber(value: number | null, maximumFractionDigits = 2) {
  return value === null ? '—' : new Intl.NumberFormat('id-ID', { maximumFractionDigits }).format(value)
}

function openDetail(card: typeof ikpCard | typeof statusCard, dataset: DashboardDatasetBundle | null) {
  if (!card || !dataset) {
    return
  }

  selectedDetail.value = { card, dataset, periodDate: selectedYear.value || null }
  detailOpen.value = true
}

function statusLabel(priorityKey: string) {
  const priority = dashboardFoodSecurityPriorityLegend.find(item => item.valueKey === priorityKey)
  return priority ? `${priority.code} · ${priority.category}` : 'Data belum tersedia'
}
</script>

<template>
  <section class="space-y-3" :class="pending ? 'opacity-75 transition-opacity' : ''">
    <header class="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
      <div class="min-w-0">
        <div class="flex items-center gap-2">
          <span class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-success/10 text-success">
            <UIcon name="i-lucide-shield-check" class="size-4" />
          </span>
          <div class="min-w-0">
            <h2 class="text-xl leading-7 font-semibold tracking-tight text-[var(--app-foreground)]">
              Kerawanan Pangan
            </h2>
            <p class="mt-0.5 text-sm font-medium text-[var(--app-foreground-muted)]">
              Pemantauan kondisi ketahanan dan kerawanan pangan wilayah Kabupaten Sumbawa Barat.
            </p>
          </div>
        </div>
      </div>

      <DashboardPeriodSelector
        v-if="activeSubView === 'FSVA'"
        v-model="selectedYear"
        periodicity="TAHUNAN"
        :periods="availableYears"
      />
    </header>

    <div class="inline-flex max-w-full items-stretch rounded-[var(--radius-control)] border border-[var(--app-border)] bg-[var(--app-surface-muted)] p-1" role="tablist" aria-label="Pilih tampilan Kerawanan Pangan">
      <UButton
        color="neutral"
        :variant="activeSubView === 'FSVA' ? 'soft' : 'ghost'"
        class="h-auto min-w-0 cursor-pointer px-3 py-1.5 text-left"
        :class="activeSubView === 'FSVA' ? 'bg-[var(--app-surface)] text-[var(--app-foreground)] shadow-xs' : 'text-[var(--app-foreground-muted)]'"
        role="tab"
        :aria-selected="activeSubView === 'FSVA'"
        @click="activeSubView = 'FSVA'"
      >
        <span class="flex flex-col items-start leading-tight"><span class="text-xs font-semibold">FSVA</span><span class="mt-0.5 text-[0.68rem] font-normal">Analisis tahunan per desa</span></span>
      </UButton>
      <UButton
        color="neutral"
        :variant="activeSubView === 'SKPG' ? 'soft' : 'ghost'"
        class="h-auto min-w-0 cursor-pointer px-3 py-1.5 text-left"
        :class="activeSubView === 'SKPG' ? 'bg-success/10 text-success shadow-xs' : 'text-[var(--app-foreground-muted)]'"
        role="tab"
        :aria-selected="activeSubView === 'SKPG'"
        @click="activeSubView = 'SKPG'"
      >
        <span class="flex flex-col items-start leading-tight"><span class="text-xs font-semibold">SKPG</span><span class="mt-0.5 text-[0.68rem] font-normal">Pemantauan bulanan per kecamatan</span></span>
      </UButton>
    </div>

    <DashboardSkpgGrid v-if="activeSubView === 'SKPG'" :payload="payload" :pending="pending" />

    <template v-else-if="!selectedYear">
      <div class="rounded-[var(--radius-panel)] border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-8 text-sm text-[var(--app-foreground-muted)]">
        Belum ada tahun yang tersedia untuk indikator kerawanan pangan.
      </div>
    </template>

    <template v-else>
      <section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Ringkasan kerawanan pangan">
        <article class="min-w-0 rounded-[var(--radius-panel)] border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2.5 shadow-sm">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="text-xs font-medium text-[var(--app-foreground-muted)]">
                IKP Kabupaten
              </p>
              <p class="mt-0.5 text-xl font-semibold tracking-tight tabular-nums text-[var(--app-foreground)]">
                {{ ikpValue === null ? '—' : new Intl.NumberFormat('id-ID', { maximumFractionDigits: ikpField?.validation?.decimalPlaces ?? 2 }).format(ikpValue) }}
              </p>
              <p class="mt-0.5 text-xs text-[var(--app-foreground-muted)]">
                {{ ikpValue === null ? `Data ${selectedYearLabel} belum tersedia` : ikpField?.label ?? 'Indeks Ketahanan Pangan' }}
              </p>
            </div>
            <UButton
              icon="i-lucide-arrow-up-right"
              color="neutral"
              variant="ghost"
              size="xs"
              class="cursor-pointer"
              aria-label="Lihat detail IKP"
              @click="openDetail(ikpCard, ikpDataset)"
            />
          </div>
        </article>

        <article class="min-w-0 rounded-[var(--radius-panel)] border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2.5 shadow-sm">
          <p class="text-xs font-medium text-[var(--app-foreground-muted)]">
            Desa Sangat Rentan
          </p>
          <p class="mt-0.5 text-xl font-semibold tracking-tight tabular-nums text-[var(--app-foreground)]">
            {{ p1Count }} desa
          </p>
          <p class="mt-0.5 text-xs text-[var(--app-foreground-muted)]">
            P1 · {{ percentage(p1Count, totalDesa) }} dari {{ totalDesa }} desa
          </p>
        </article>

        <article class="min-w-0 rounded-[var(--radius-panel)] border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2.5 shadow-sm">
          <p class="text-xs font-medium text-[var(--app-foreground-muted)]">
            Desa Rentan
          </p>
          <p class="mt-0.5 text-xl font-semibold tracking-tight tabular-nums text-[var(--app-foreground)]">
            {{ p2Count }} desa
          </p>
          <p class="mt-0.5 text-xs text-[var(--app-foreground-muted)]">
            P2 · {{ percentage(p2Count, totalDesa) }} dari {{ totalDesa }} desa
          </p>
        </article>

        <article class="min-w-0 rounded-[var(--radius-panel)] border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2.5 shadow-sm">
          <p class="text-xs font-medium text-[var(--app-foreground-muted)]">
            Desa Tahan / Sangat Tahan
          </p>
          <p class="mt-0.5 text-xl font-semibold tracking-tight tabular-nums text-[var(--app-foreground)]">
            {{ resilientCount }} desa
          </p>
          <p class="mt-0.5 text-xs text-[var(--app-foreground-muted)]">
            P5 + P6 · {{ percentage(resilientCount, totalDesa) }} dari {{ totalDesa }} desa
          </p>
        </article>
      </section>

      <section class="grid items-start gap-3 xl:grid-cols-12">
        <DashboardWidget compact class="xl:col-span-7">
          <template #header>
            <div class="flex w-full flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 class="text-sm font-semibold text-[var(--app-foreground)]">
                  Peta FSVA Desa
                </h3>
                <p class="mt-0.5 text-xs text-[var(--app-foreground-muted)]">
                  Prioritas FSVA per desa; pilih wilayah untuk memusatkan peta dan daftar.
                </p>
              </div>
              <USelectMenu
                v-model="selectedKecamatan"
                :items="kecamatanOptions"
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

          <MapAdministrativeBoundaryMap
            map-height="clamp(300px, 31vw, 410px)"
            :desa-values="desaValues"
            :value-color-map="valueColorMap"
            :selected-kecamatan="selectedKecamatan === ALL_KECAMATAN ? null : selectedKecamatan"
            :popup-year="selectedYearLabel"
            show-desa-tooltips
            stop-interaction-propagation
            frozen
            no-data-color="#e2e8f0"
            no-data-label="Data belum tersedia"
          />

          <template #footer>
            <div class="flex items-center justify-between gap-3">
              <DashboardCardSource :source="statusSource" />
              <UButton
                size="xs"
                color="neutral"
                variant="ghost"
                trailing-icon="i-lucide-arrow-right"
                class="cursor-pointer"
                @click="openDetail(statusCard, statusDataset)"
              >
                Lihat detail
              </UButton>
            </div>
          </template>
        </DashboardWidget>

        <div class="grid gap-3 xl:col-span-5">
          <DashboardWidget compact>
            <template #header>
              <div>
                <h3 class="text-sm font-semibold text-[var(--app-foreground)]">
                  Distribusi Prioritas FSVA
                </h3>
                <p class="mt-0.5 text-xs text-[var(--app-foreground-muted)]">
                  {{ selectedKecamatan === ALL_KECAMATAN ? 'Seluruh Kabupaten Sumbawa Barat' : selectedKecamatan }}
                </p>
              </div>
            </template>

            <div v-if="filteredStatusRecords.length" class="space-y-2.5">
              <div class="flex h-3 overflow-hidden rounded-full bg-[var(--app-surface-muted)]" aria-label="Komposisi status ketahanan pangan">
                <span v-for="item in countsByPriority" :key="item.valueKey" :style="{ width: `${(item.count / filteredStatusRecords.length) * 100}%`, backgroundColor: item.color }" />
              </div>
              <div class="grid grid-cols-2 gap-x-3 gap-y-2 text-xs sm:grid-cols-3">
                <div v-for="item in countsByPriority" :key="item.valueKey" class="flex min-w-0 items-center justify-between gap-2">
                  <span class="inline-flex min-w-0 items-center gap-1.5 text-[var(--app-foreground-muted)]"><span class="size-2 shrink-0 rounded-full" :style="{ backgroundColor: item.color }" />{{ item.code }}</span>
                  <span class="font-medium tabular-nums text-[var(--app-foreground)]">{{ item.count }}</span>
                </div>
              </div>
            </div>
            <p v-else class="text-sm text-[var(--app-foreground-muted)]">
              Data status untuk {{ selectedYearLabel }} belum tersedia.
            </p>
          </DashboardWidget>

          <DashboardWidget compact>
            <template #header>
              <h3 class="text-sm font-semibold text-[var(--app-foreground)]">
                Komposisi Desa per Kecamatan
              </h3>
            </template>

            <div v-if="kecamatanRows.length" class="space-y-2.5">
              <div v-for="row in kecamatanRows" :key="row.name" class="grid grid-cols-[minmax(0,8rem)_1fr_auto] items-center gap-2 text-xs">
                <span class="truncate text-[var(--app-foreground-muted)]">{{ row.name }}</span>
                <div class="flex h-3 overflow-hidden rounded-full bg-[var(--app-surface-muted)]">
                  <span v-for="(count, index) in row.counts" :key="index" :style="{ width: `${(count / row.total) * 100}%`, backgroundColor: dashboardFoodSecurityPriorityLegend[index]?.color }" />
                </div>
                <span class="font-medium tabular-nums text-[var(--app-foreground)]">{{ row.total }}</span>
              </div>
            </div>
            <p v-else class="text-sm text-[var(--app-foreground-muted)]">
              Belum ada komposisi desa untuk ditampilkan.
            </p>
          </DashboardWidget>
        </div>
      </section>

      <DashboardWidget compact>
        <template #header>
          <div class="flex w-full flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 class="text-sm font-semibold text-[var(--app-foreground)]">
                Profil FSVA Desa
              </h3>
              <p class="mt-0.5 text-xs text-[var(--app-foreground-muted)]">
                Rincian indikator untuk desa yang dipilih.
              </p>
            </div>
            <USelectMenu
              v-model="selectedFsvaRegionId"
              :items="fsvaRecordOptions"
              value-key="value"
              label-key="label"
              size="xs"
              color="neutral"
              variant="outline"
              class="w-full sm:w-64"
              aria-label="Pilih desa untuk profil FSVA"
            />
          </div>
        </template>

        <div v-if="selectedFsvaRecord" class="space-y-4">
          <div class="grid gap-2 sm:grid-cols-3">
            <div class="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-muted)] px-3 py-2">
              <p class="text-xs text-[var(--app-foreground-muted)]">
                Prioritas
              </p>
              <p class="mt-1 text-sm font-semibold text-[var(--app-foreground)]">
                <span v-if="selectedFsvaPriority" class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium" :style="{ backgroundColor: `${selectedFsvaPriority.color}22`, color: selectedFsvaPriority.color }">{{ selectedFsvaPriority.code }} · {{ selectedFsvaPriority.category }}</span>
                <span v-else>—</span>
              </p>
            </div>
            <div class="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-muted)] px-3 py-2">
              <p class="text-xs text-[var(--app-foreground-muted)]">
                Indeks Komposit
              </p>
              <p class="mt-1 text-lg font-semibold tabular-nums text-[var(--app-foreground)]">
                {{ formatFsvaNumber(selectedFsvaIndex) }}
              </p>
            </div>
            <div class="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-muted)] px-3 py-2">
              <p class="text-xs text-[var(--app-foreground-muted)]">
                Peringkat
              </p>
              <p class="mt-1 text-lg font-semibold tabular-nums text-[var(--app-foreground)]">
                {{ formatFsvaNumber(selectedFsvaRank, 0) }}
              </p>
            </div>
          </div>

          <div class="grid gap-x-5 gap-y-3 sm:grid-cols-2">
            <div v-for="indicator in selectedFsvaIndicators" :key="indicator.label" class="space-y-1">
              <div class="flex items-center justify-between gap-3 text-xs">
                <span class="text-[var(--app-foreground-muted)]">{{ indicator.label }}</span>
                <span class="font-medium text-[var(--app-foreground)]">{{ indicator.priority?.code ?? '—' }}</span>
              </div>
              <div class="h-2 overflow-hidden rounded-full bg-[var(--app-surface-muted)]">
                <span
                  class="block h-full rounded-full"
                  :style="indicator.priority ? { width: `${(Number(indicator.priority.valueKey) / 6) * 100}%`, backgroundColor: indicator.priority.color } : { width: '0%' }"
                />
              </div>
            </div>
          </div>
        </div>
        <p v-else class="text-sm text-[var(--app-foreground-muted)]">
          Data FSVA untuk desa yang dipilih belum tersedia.
        </p>

        <template #footer>
          <div class="flex items-center justify-between gap-3">
            <DashboardCardSource :source="statusSource" />
            <UButton
              size="xs"
              color="neutral"
              variant="ghost"
              trailing-icon="i-lucide-arrow-right"
              class="cursor-pointer"
              @click="openDetail(statusCard, statusDataset)"
            >
              Lihat detail
            </UButton>
          </div>
        </template>
      </DashboardWidget>

      <DashboardWidget compact>
        <template #header>
          <div class="flex w-full flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 class="text-sm font-semibold text-[var(--app-foreground)]">
                Daftar Desa Prioritas FSVA
              </h3>
              <p class="mt-0.5 text-xs text-[var(--app-foreground-muted)]">
                Desa dengan status P1 (Sangat rentan) dan P2 (Rentan).
              </p>
            </div>
            <UInput
              v-model="search"
              icon="i-lucide-search"
              placeholder="Cari desa atau kecamatan..."
              size="xs"
              class="w-full sm:w-60"
            />
          </div>
        </template>

        <div class="overflow-x-auto">
          <table class="w-full min-w-[820px] text-sm">
            <thead class="border-y border-[var(--app-border)] bg-[var(--app-surface-muted)] text-left text-[0.68rem] font-medium tracking-[0.1em] text-[var(--app-foreground-muted)] uppercase">
              <tr>
                <th class="w-12 px-3 py-2.5">
                  No
                </th><th class="px-3 py-2.5">
                  Desa
                </th><th class="px-3 py-2.5">
                  Kecamatan
                </th><th class="px-3 py-2.5">
                  Indeks Komposit
                </th><th class="px-3 py-2.5">
                  Peringkat
                </th><th class="px-3 py-2.5">
                  Prioritas
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[var(--app-border)]">
              <tr v-for="({ record, priority }, index) in priorityRows.filter(item => ['1', '2'].includes(item.priority.valueKey))" :key="`${record.regionId}-${priority.valueKey}`">
                <td class="px-3 py-2.5 tabular-nums text-[var(--app-foreground-muted)]">
                  {{ index + 1 }}
                </td>
                <td class="px-3 py-2.5 font-medium text-[var(--app-foreground)]">
                  {{ record.regionName }}
                </td>
                <td class="px-3 py-2.5 text-[var(--app-foreground-muted)]">
                  {{ record.parentRegionName ?? '—' }}
                </td>
                <td class="px-3 py-2.5 font-medium tabular-nums text-[var(--app-foreground)]">
                  {{ formatFsvaNumber(readDashboardRecordNumber(record, indeksKompositField?.key ?? null)) }}
                </td>
                <td class="px-3 py-2.5 tabular-nums text-[var(--app-foreground-muted)]">
                  {{ formatFsvaNumber(readDashboardRecordNumber(record, peringkatField?.key ?? null), 0) }}
                </td>
                <td class="px-3 py-2.5">
                  <span class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium" :style="{ backgroundColor: `${priority.color}22`, color: priority.color }">{{ statusLabel(priority.valueKey) }}</span>
                </td>
              </tr>
              <tr v-if="!priorityRows.some(item => ['1', '2'].includes(item.priority.valueKey))">
                <td colspan="6" class="px-3 py-6 text-center text-sm text-[var(--app-foreground-muted)]">
                  Tidak ada desa prioritas yang sesuai.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <template #footer>
          <DashboardCardSource :source="statusSource" />
        </template>
      </DashboardWidget>

      <DashboardCardSource :source="ikpSource" />
    </template>

    <DashboardCardDetailModal v-model:open="detailOpen" :context="selectedDetail" />
  </section>
</template>
