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

const ALL_KECAMATAN = '__ALL__'

const props = defineProps<{
  payload: DashboardConfiguredPayload
  pending?: boolean
}>()

const ikpCard = dashboardCardDefinitions.find(card => card.key === 'ikp')
const statusCard = dashboardCardDefinitions.find(card => card.key === 'status-ketahanan-pangan')
const selectedYear = ref('')
const selectedKecamatan = ref(ALL_KECAMATAN)
const search = ref('')
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
  valueLabel: `${priority.code} · ${priority.category}`
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

function percentage(value: number, total: number) {
  return total > 0 ? `${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format((value / total) * 100)}%` : '—'
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

      <DashboardPeriodSelector v-model="selectedYear" periodicity="TAHUNAN" :periods="availableYears" />
    </header>

    <div v-if="!selectedYear" class="rounded-[var(--radius-panel)] border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-8 text-sm text-[var(--app-foreground-muted)]">
      Belum ada tahun yang tersedia untuk indikator kerawanan pangan.
    </div>

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
                  Peta Status Ketahanan Pangan Desa
                </h3>
                <p class="mt-0.5 text-xs text-[var(--app-foreground-muted)]">
                  Pilih wilayah untuk memusatkan peta dan daftar desa.
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
                  Distribusi Desa menurut Status
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
          <div class="flex w-full flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 class="text-sm font-semibold text-[var(--app-foreground)]">
                Daftar Desa Prioritas
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
          <table class="w-full min-w-[620px] text-sm">
            <thead class="border-y border-[var(--app-border)] bg-[var(--app-surface-muted)] text-left text-[0.68rem] font-medium tracking-[0.1em] text-[var(--app-foreground-muted)] uppercase">
              <tr>
                <th class="w-12 px-3 py-2.5">
                  No
                </th><th class="px-3 py-2.5">
                  Desa
                </th><th class="px-3 py-2.5">
                  Kecamatan
                </th><th class="px-3 py-2.5">
                  Status
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
                <td class="px-3 py-2.5">
                  <span class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium" :style="{ backgroundColor: `${priority.color}22`, color: priority.color }">{{ statusLabel(priority.valueKey) }}</span>
                </td>
              </tr>
              <tr v-if="!priorityRows.some(item => ['1', '2'].includes(item.priority.valueKey))">
                <td colspan="4" class="px-3 py-6 text-center text-sm text-[var(--app-foreground-muted)]">
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
