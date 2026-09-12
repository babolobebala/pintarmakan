<script setup lang="ts">
import type { DashboardCardDetailContext, DashboardConfiguredPayload, DashboardDatasetBundle, DashboardProduksiCardKey } from '~~/shared/dashboard'
import { dashboardProduksiCardDefinitions, getDashboardAvailablePeriods, getDashboardNumericSchemaFields, sumDashboardRecordFields } from '~~/shared/dashboard'

import DashboardProyeksiNeracaSection from './DashboardProyeksiNeracaSection.vue'

type ProductionMetric = {
  key: DashboardProduksiCardKey
  label: string
  unit: string
  icon: string
  accentClass: string
  fields: (dataset: DashboardDatasetBundle) => string[]
}
type RegionalValue = { label: string, value: number }
type BreakdownCard = { key: string, title: string, icon: string, unit: string, rows: Array<{ key: string, label: string, value: number }>, source: string | null }

const props = defineProps<{ payload: DashboardConfiguredPayload, pending?: boolean }>()
const number = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 })
const activeView = ref<'production' | 'projection'>('production')
const selectedPeriod = ref('')
const selectedMetricKey = ref<DashboardProduksiCardKey>('produksi-padi')
const detailOpen = ref(false)
const selectedDetail = shallowRef<DashboardCardDetailContext | null>(null)

const metrics: readonly ProductionMetric[] = [{
  key: 'produksi-padi', label: 'Padi', unit: 'Ton', icon: 'i-lucide-wheat', accentClass: 'bg-success/10 text-success', fields: () => ['produksi']
}, {
  key: 'produksi-jagung', label: 'Jagung', unit: 'Ton', icon: 'i-lucide-sprout', accentClass: 'bg-warning/15 text-warning', fields: () => ['produksi']
}, {
  key: 'produksi-daging-hewan-ternak', label: 'Daging', unit: 'Kg', icon: 'i-lucide-beef', accentClass: 'bg-error/10 text-error', fields: dataset => getDashboardNumericSchemaFields(dataset.definition.dataSchema).map(field => field.key)
}, {
  key: 'produksi-telur-unggas', label: 'Telur', unit: 'Butir', icon: 'i-lucide-egg', accentClass: 'bg-warning/15 text-warning', fields: dataset => getDashboardNumericSchemaFields(dataset.definition.dataSchema).map(field => field.key)
}, {
  key: 'produksi-buah-buahan', label: 'Buah', unit: 'Kuintal', icon: 'i-lucide-apple', accentClass: 'bg-primary/10 text-primary', fields: dataset => getDashboardNumericSchemaFields(dataset.definition.dataSchema).map(field => field.key)
}, {
  key: 'produksi-sayur-sayuran', label: 'Sayur', unit: 'Kuintal', icon: 'i-lucide-leaf', accentClass: 'bg-success/10 text-success', fields: dataset => getDashboardNumericSchemaFields(dataset.definition.dataSchema).map(field => field.key)
}]

const metricByKey = new Map(metrics.map(metric => [metric.key, metric]))
const metricOptions = metrics.map(metric => ({ value: metric.key, label: metric.label }))
const datasetsByKey = computed(() => new Map(dashboardProduksiCardDefinitions.map(card => [card.key, props.payload.cards[card.key] ?? null])))
const selectedMetric = computed(() => metricByKey.get(selectedMetricKey.value) ?? metrics[0]!)
const availablePeriods = computed(() => [...new Set(dashboardProduksiCardDefinitions.flatMap((card) => {
  const dataset = datasetsByKey.value.get(card.key)
  return dataset ? getDashboardAvailablePeriods(dataset.definition.coverage, card) : []
}))].sort().reverse())

watch(availablePeriods, (periods) => {
  if (!periods.includes(selectedPeriod.value)) {
    selectedPeriod.value = periods[0] ?? ''
  }
}, { immediate: true })

function getDataset(key: DashboardProduksiCardKey) {
  return datasetsByKey.value.get(key) ?? null
}
function openDetail(key: DashboardProduksiCardKey) {
  const card = dashboardProduksiCardDefinitions.find(card => card.key === key)
  const dataset = getDataset(key)

  if (!card || !dataset) {
    return
  }

  selectedDetail.value = {
    card,
    dataset,
    periodDate: selectedPeriod.value || null
  }
  detailOpen.value = true
}
function recordsForPeriod(dataset: DashboardDatasetBundle | null) {
  return dataset && selectedPeriod.value ? dataset.records.filter(record => record.periodDate === selectedPeriod.value) : []
}
function metricFields(metric: ProductionMetric, dataset: DashboardDatasetBundle | null) {
  return dataset ? metric.fields(dataset) : []
}
function metricTotal(metric: ProductionMetric) {
  const dataset = getDataset(metric.key)
  return sumDashboardRecordFields(recordsForPeriod(dataset), metricFields(metric, dataset))
}
function regionalValues(metric: ProductionMetric): RegionalValue[] {
  const dataset = getDataset(metric.key)
  const fields = metricFields(metric, dataset)
  const values = new Map<string, number>()
  for (const record of recordsForPeriod(dataset)) {
    const value = sumDashboardRecordFields([record], fields)
    if (value !== null) {
      values.set(record.regionName, (values.get(record.regionName) ?? 0) + value)
    }
  }
  return [...values.entries()].map(([label, value]) => ({ label, value })).sort((left, right) => right.value - left.value || left.label.localeCompare(right.label, 'id-ID'))
}
function sumField(dataset: DashboardDatasetBundle | null, fieldKey: string) {
  return sumDashboardRecordFields(recordsForPeriod(dataset), [fieldKey])
}
function sourceFor(keys: readonly DashboardProduksiCardKey[]) {
  return [...new Set(keys.map(key => getDataset(key)?.definition.source).filter((source): source is string => Boolean(source)))].join(' · ') || null
}
function breakdownRows(key: DashboardProduksiCardKey, limit?: number) {
  const dataset = getDataset(key)
  if (!dataset) {
    return []
  }
  const rows = getDashboardNumericSchemaFields(dataset.definition.dataSchema)
    .map(field => ({ key: field.key, label: field.label, value: sumField(dataset, field.key) }))
    .filter((row): row is { key: string, label: string, value: number } => row.value !== null)
    .sort((left, right) => right.value - left.value || left.label.localeCompare(right.label, 'id-ID'))
  return limit ? rows.slice(0, limit) : rows
}
function formatValue(value: number | null) {
  return value === null ? '—' : number.format(value)
}
function getChartIndex(datum: Record<string, unknown>) {
  return Number(datum.index)
}
function getChartValue(datum: Record<string, unknown>) {
  return Number(datum.value)
}
function makeChartRows(rows: RegionalValue[]) {
  return rows.map((row, index) => ({ ...row, index }))
}

const kpis = computed(() => metrics.map(metric => ({ ...metric, value: metricTotal(metric) })))
const padiDataset = computed(() => getDataset('produksi-padi'))
const jagungDataset = computed(() => getDataset('produksi-jagung'))
const padiRows = computed(() => regionalValues(metrics[0]!))
const jagungRows = computed(() => regionalValues(metrics[1]!))
const selectedRegionalValues = computed(() => regionalValues(selectedMetric.value))
const padiProductionTotal = computed(() => sumField(padiDataset.value, 'produksi'))
const padiAreaTotal = computed(() => sumField(padiDataset.value, 'luas_panen'))
const jagungProductionTotal = computed(() => sumField(jagungDataset.value, 'produksi'))
const jagungAreaTotal = computed(() => sumField(jagungDataset.value, 'luas_panen'))
const rankingMaximum = computed(() => selectedRegionalValues.value[0]?.value ?? 0)
const mapColorMap = { zero: '#dcfce7', low: '#bbf7d0', medium: '#86efac', high: '#4ade80', highest: '#16a34a' }
const mapValues = computed(() => selectedRegionalValues.value.map((row) => {
  const ratio = rankingMaximum.value > 0 ? row.value / rankingMaximum.value : 0
  const valueKey = row.value === 0 ? 'zero' : ratio <= 0.25 ? 'low' : ratio <= 0.5 ? 'medium' : ratio <= 0.75 ? 'high' : 'highest'
  return { regionName: row.label, valueKey, valueLabel: `Produksi ${selectedMetric.value.label}: ${number.format(row.value)} ${selectedMetric.value.unit}` }
}))
const breakdownCards = computed<BreakdownCard[]>(() => [{
  key: 'daging', title: 'Komposisi Produksi Daging', icon: 'i-lucide-beef', unit: 'Kg', rows: breakdownRows('produksi-daging-hewan-ternak'), source: sourceFor(['produksi-daging-hewan-ternak'])
}, {
  key: 'telur', title: 'Produksi Telur Unggas', icon: 'i-lucide-egg', unit: 'Butir', rows: breakdownRows('produksi-telur-unggas'), source: sourceFor(['produksi-telur-unggas'])
}, {
  key: 'buah', title: 'Komoditas Buah Terbesar', icon: 'i-lucide-apple', unit: 'Kuintal', rows: breakdownRows('produksi-buah-buahan', 5), source: sourceFor(['produksi-buah-buahan'])
}, {
  key: 'sayur', title: 'Komoditas Sayur Terbesar', icon: 'i-lucide-leaf', unit: 'Kuintal', rows: breakdownRows('produksi-sayur-sayuran', 5), source: sourceFor(['produksi-sayur-sayuran'])
}])
</script>

<template>
  <section class="space-y-3">
    <nav class="inline-flex w-full rounded-[var(--radius-control)] border border-[var(--app-border)] bg-[var(--app-surface-muted)] p-1 sm:w-auto" aria-label="Tampilan produksi dan ketersediaan">
      <UButton
        size="sm"
        :color="activeView === 'production' ? 'primary' : 'neutral'"
        :variant="activeView === 'production' ? 'solid' : 'ghost'"
        :aria-pressed="activeView === 'production'"
        class="flex-1 sm:flex-none cursor-pointer"
        @click="activeView = 'production'"
      >
        Produksi Aktual
      </UButton>
      <UButton
        size="sm"
        :color="activeView === 'projection' ? 'primary' : 'neutral'"
        :variant="activeView === 'projection' ? 'solid' : 'ghost'"
        :aria-pressed="activeView === 'projection'"
        class="flex-1 sm:flex-none cursor-pointer"
        @click="activeView = 'projection'"
      >
        Proyeksi Neraca
      </UButton>
    </nav>

    <section v-show="activeView === 'production'" class="space-y-3" :class="pending ? 'opacity-75 transition-opacity' : ''">
      <header class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div class="min-w-0">
          <h1 class="text-xl leading-7 font-semibold tracking-tight text-[var(--app-foreground)]">
            Produksi Aktual
          </h1><p class="mt-1 text-sm text-[var(--app-foreground-muted)]">
            Gambaran produksi pangan Kabupaten Sumbawa Barat
          </p>
        </div>
        <DashboardPeriodSelector v-model="selectedPeriod" periodicity="TAHUNAN" :periods="availablePeriods" />
      </header>

      <div v-if="!selectedPeriod" class="rounded-[var(--radius-panel)] border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-8 text-sm text-[var(--app-foreground-muted)]">
        Belum ada periode produksi yang tersedia.
      </div>
      <template v-else>
        <section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Ringkasan produksi pangan">
          <article v-for="metric in kpis" :key="metric.key" class="min-w-0 rounded-[var(--radius-panel)] border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2.5 shadow-sm">
            <div class="flex min-w-0 items-center gap-2.5">
              <span :class="['flex size-9 shrink-0 items-center justify-center rounded-lg', metric.accentClass]"><UIcon :name="metric.icon" class="size-4" /></span><div class="min-w-0">
                <p class="text-xs font-medium text-[var(--app-foreground-muted)]">
                  {{ metric.label }}
                </p><p class="mt-0.5 break-words text-lg font-semibold tracking-tight tabular-nums text-[var(--app-foreground)]">
                  {{ formatValue(metric.value) }} <span class="ml-1 text-xs font-medium text-[var(--app-foreground-muted)]">{{ metric.unit }}</span>
                </p>
              </div>
            </div>
            <UButton
              size="xs"
              color="neutral"
              variant="ghost"
              trailing-icon="i-lucide-arrow-right"
              class="mt-1.5 -ml-1"
              :disabled="!getDataset(metric.key)"
              @click="openDetail(metric.key)"
            >
              Lihat detail
            </UButton>
          </article>
        </section>

        <section class="grid gap-3 xl:grid-cols-2">
          <DashboardWidget compact>
            <template #header>
              <div class="flex min-w-0 items-center gap-2">
                <UIcon name="i-lucide-wheat" class="size-4 text-success" /><h2 class="text-sm font-semibold text-[var(--app-foreground)]">
                  Produksi Padi
                </h2>
              </div>
            </template>
            <div v-if="!padiDataset?.available || !padiRows.length" class="text-sm text-[var(--app-foreground-muted)]">
              Data padi belum tersedia untuk tahun ini.
            </div>
            <template v-else>
              <div class="grid gap-2 sm:grid-cols-2">
                <div class="rounded-lg bg-[var(--app-surface-muted)] px-3 py-2">
                  <p class="text-[0.68rem] font-medium text-[var(--app-foreground-muted)]">
                    Produksi
                  </p><p class="mt-0.5 break-words text-base font-semibold tabular-nums text-[var(--app-foreground)]">
                    {{ formatValue(padiProductionTotal) }} <span class="text-xs font-medium text-[var(--app-foreground-muted)]">Ton</span>
                  </p>
                </div><div class="rounded-lg bg-[var(--app-surface-muted)] px-3 py-2">
                  <p class="text-[0.68rem] font-medium text-[var(--app-foreground-muted)]">
                    Luas Panen
                  </p><p class="mt-0.5 break-words text-base font-semibold tabular-nums text-[var(--app-foreground)]">
                    {{ formatValue(padiAreaTotal) }} <span class="text-xs font-medium text-[var(--app-foreground-muted)]">Ha</span>
                  </p>
                </div>
              </div>
              <p class="mt-3 text-xs font-semibold text-[var(--app-foreground)]">
                Produksi Padi per Kecamatan (Ton)
              </p><ChartsBarChart
                class="mt-1"
                :data="makeChartRows(padiRows)"
                :x="getChartIndex"
                :y="getChartValue"
                :height="160"
                color="#16a34a"
                show-all-x-axis-labels
                :x-tick-format="(tick) => padiRows[Number(tick)]?.label ?? ''"
                :y-tick-format="(tick) => number.format(Number(tick))"
                aria-label="Grafik produksi padi per Kecamatan"
              />
            </template>
            <template #footer>
              <DashboardCardSource :source="sourceFor(['produksi-padi'])" />
            </template>
          </DashboardWidget>
          <DashboardWidget compact>
            <template #header>
              <div class="flex min-w-0 items-center gap-2">
                <UIcon name="i-lucide-sprout" class="size-4 text-warning" /><h2 class="text-sm font-semibold text-[var(--app-foreground)]">
                  Produksi Jagung
                </h2>
              </div>
            </template>
            <div v-if="!jagungDataset?.available || !jagungRows.length" class="text-sm text-[var(--app-foreground-muted)]">
              Data jagung belum tersedia untuk tahun ini.
            </div>
            <template v-else>
              <div class="grid gap-2 sm:grid-cols-2">
                <div class="rounded-lg bg-[var(--app-surface-muted)] px-3 py-2">
                  <p class="text-[0.68rem] font-medium text-[var(--app-foreground-muted)]">
                    Produksi
                  </p><p class="mt-0.5 break-words text-base font-semibold tabular-nums text-[var(--app-foreground)]">
                    {{ formatValue(jagungProductionTotal) }} <span class="text-xs font-medium text-[var(--app-foreground-muted)]">Ton</span>
                  </p>
                </div><div class="rounded-lg bg-[var(--app-surface-muted)] px-3 py-2">
                  <p class="text-[0.68rem] font-medium text-[var(--app-foreground-muted)]">
                    Luas Panen
                  </p><p class="mt-0.5 break-words text-base font-semibold tabular-nums text-[var(--app-foreground)]">
                    {{ formatValue(jagungAreaTotal) }} <span class="text-xs font-medium text-[var(--app-foreground-muted)]">Ha</span>
                  </p>
                </div>
              </div>
              <p class="mt-3 text-xs font-semibold text-[var(--app-foreground)]">
                Produksi Jagung per Kecamatan (Ton)
              </p><ChartsBarChart
                class="mt-1"
                :data="makeChartRows(jagungRows)"
                :x="getChartIndex"
                :y="getChartValue"
                :height="160"
                color="#d97706"
                show-all-x-axis-labels
                :x-tick-format="(tick) => jagungRows[Number(tick)]?.label ?? ''"
                :y-tick-format="(tick) => number.format(Number(tick))"
                aria-label="Grafik produksi jagung per Kecamatan"
              />
            </template>
            <template #footer>
              <DashboardCardSource :source="sourceFor(['produksi-jagung'])" />
            </template>
          </DashboardWidget>
        </section>

        <DashboardWidget compact>
          <template #header>
            <div class="flex w-full flex-wrap items-center justify-between gap-3">
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <UIcon name="i-lucide-map-pinned" class="size-4 text-success" /><h2 class="text-sm font-semibold text-[var(--app-foreground)]">
                    Produksi Menurut Kecamatan
                  </h2>
                </div><p class="mt-0.5 text-xs text-[var(--app-foreground-muted)]">
                  Peringkat dan sebaran produksi {{ selectedMetric.label.toLowerCase() }}.
                </p>
              </div><USelectMenu
                v-model="selectedMetricKey"
                :items="metricOptions"
                value-key="value"
                label-key="label"
                size="xs"
                color="neutral"
                variant="ghost"
                class="w-36"
                aria-label="Pilih metrik produksi"
              />
            </div>
          </template>
          <div v-if="!selectedRegionalValues.length" class="text-sm text-[var(--app-foreground-muted)]">
            Data {{ selectedMetric.label.toLowerCase() }} menurut Kecamatan belum tersedia untuk tahun ini.
          </div>
          <div v-else class="grid gap-3 xl:grid-cols-[minmax(0,0.82fr)_minmax(360px,1fr)] xl:items-center">
            <div class="space-y-2.5">
              <div v-for="row in selectedRegionalValues" :key="row.label" class="grid grid-cols-[minmax(5.5rem,0.7fr)_minmax(0,1.45fr)_auto] items-center gap-2 text-xs">
                <span class="min-w-0 truncate font-medium text-[var(--app-foreground)]">{{ row.label }}</span><span class="h-4 overflow-hidden rounded-sm bg-[var(--app-surface-muted)]"><span class="block h-full rounded-sm bg-success" :style="{ width: `${rankingMaximum ? (row.value / rankingMaximum) * 100 : 0}%` }" /></span><span class="whitespace-nowrap text-right tabular-nums text-[var(--app-foreground-muted)]">{{ number.format(row.value) }} {{ selectedMetric.unit }}</span>
              </div>
            </div>
            <div class="space-y-2">
              <MapAdministrativeBoundaryMap
                map-height="clamp(220px, 23vw, 280px)"
                :kecamatan-values="mapValues"
                :value-color-map="mapColorMap"
                :popup-year="selectedPeriod.slice(0, 4)"
                :show-desa-layer="false"
                frozen
                stop-interaction-propagation
                no-data-color="#e2e8f0"
                no-data-label="Data belum tersedia"
              /><div class="flex flex-wrap gap-x-3 gap-y-1 text-[0.68rem] text-[var(--app-foreground-muted)]">
                <span class="inline-flex items-center gap-1.5"><span class="size-2 rounded-sm" :style="{ backgroundColor: mapColorMap.zero }" />Nol</span><span class="inline-flex items-center gap-1.5"><span class="size-2 rounded-sm" :style="{ backgroundColor: mapColorMap.highest }" />Lebih tinggi</span><span class="inline-flex items-center gap-1.5"><span class="size-2 rounded-sm border border-dashed border-[var(--app-border-strong)] bg-[var(--app-surface-muted)]" />Tidak ada data</span>
              </div>
            </div>
          </div>
          <template #footer>
            <DashboardCardSource :source="sourceFor([selectedMetric.key])" />
          </template>
        </DashboardWidget>

        <section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <DashboardWidget v-for="card in breakdownCards" :key="card.key" compact>
            <template #header>
              <div class="flex min-w-0 items-center gap-2">
                <UIcon :name="card.icon" class="size-4 text-success" /><h2 class="min-w-0 text-sm font-semibold text-[var(--app-foreground)]">
                  {{ card.title }}
                </h2>
              </div>
            </template>
            <div v-if="!card.rows.length" class="text-sm text-[var(--app-foreground-muted)]">
              Data belum tersedia.
            </div>
            <div v-else class="space-y-2">
              <div v-for="row in card.rows" :key="row.key" class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 text-xs">
                <div class="min-w-0">
                  <p class="truncate font-medium text-[var(--app-foreground-muted)]">
                    {{ row.label }}
                  </p><span class="mt-1 block h-2 overflow-hidden rounded-sm bg-[var(--app-surface-muted)]"><span class="block h-full rounded-sm bg-success" :style="{ width: `${card.rows[0]?.value ? (row.value / card.rows[0].value) * 100 : 0}%` }" /></span>
                </div><span class="whitespace-nowrap tabular-nums text-[var(--app-foreground)]">{{ number.format(row.value) }} {{ card.unit }}</span>
              </div>
            </div>
            <template #footer>
              <DashboardCardSource :source="card.source" />
            </template>
          </DashboardWidget>
        </section>
      </template>
    </section>
    <DashboardProyeksiNeracaSection v-show="activeView === 'projection'" :payload="payload" :pending="pending" />
    <DashboardCardDetailModal v-model:open="detailOpen" :context="selectedDetail" />
  </section>
</template>
