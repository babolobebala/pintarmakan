<script setup lang="ts">
import type {
  DashboardCardDetailContext,
  DashboardConfiguredPayload,
  DashboardCpmCardKey,
  DashboardDatasetBundle,
  DashboardDatasetTableRecord
} from '~~/shared/dashboard'

import {
  dashboardCpmCardDefinitions,
  getDashboardAvailablePeriods,
  readDashboardRecordNumber,
  readDashboardRecordText
} from '~~/shared/dashboard'
import { getDatasetSchemaFields } from '~~/shared/datasets'

type Commodity = {
  key: DashboardCpmCardKey
  label: string
  icon: string
}

type KecamatanSummary = {
  key: string
  label: string
  canonicalLabel: string | null
  value: number | null
  totalUnits: number
  stockedUnits: number
}

type UnitStockRow = {
  index: number
  unit: string | null
  owner: string | null
  desa: string | null
  kecamatan: string | null
  value: number
}

const props = defineProps<{ payload: DashboardConfiguredPayload, pending?: boolean }>()
const number = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 })
const selectedCommodityKey = ref<DashboardCpmCardKey>('cpm-gabah')
const selectedPeriod = ref('')
const selectedMonthKey = ref('')
const detailOpen = ref(false)
const selectedDetail = shallowRef<DashboardCardDetailContext | null>(null)

const commodities: readonly Commodity[] = [
  { key: 'cpm-gabah', label: 'CPM Gabah', icon: 'i-lucide-wheat' },
  { key: 'cpm-jagung', label: 'CPM Jagung', icon: 'i-lucide-sprout' }
]

const cardsByKey = new Map(dashboardCpmCardDefinitions.map(card => [card.key, card]))
const commodity = computed(() => commodities.find(item => item.key === selectedCommodityKey.value) ?? commodities[0]!)
const activeCard = computed(() => cardsByKey.get(selectedCommodityKey.value) ?? dashboardCpmCardDefinitions[0]!)
const activeDataset = computed<DashboardDatasetBundle | null>(() => props.payload.cards[selectedCommodityKey.value] ?? null)
const availablePeriods = computed(() => activeDataset.value
  ? getDashboardAvailablePeriods(activeDataset.value.definition.coverage, activeCard.value)
  : [])
const schemaFields = computed(() => getDatasetSchemaFields(activeDataset.value?.definition.dataSchema))
const monthFields = computed(() => activeCard.value.monthFieldKeys.flatMap((key) => {
  const field = schemaFields.value.find(item => item.key === key)
  return field ? [{ key: field.key, label: field.label.replace(/\s*\([^)]*\)\s*$/, '') }] : []
}))
const monthOptions = computed(() => monthFields.value.map(field => ({ value: field.key, label: field.label })))
const selectedRows = computed(() => !activeDataset.value || !selectedPeriod.value
  ? []
  : activeDataset.value.tableRecords.filter(record => record.periodDate === selectedPeriod.value))
const selectedMonth = computed(() => monthFields.value.find(field => field.key === selectedMonthKey.value) ?? null)

function fieldKeyForLabel(label: string) {
  return schemaFields.value.find(field => field.label.trim().toLocaleLowerCase('id-ID') === label.toLocaleLowerCase('id-ID'))?.key ?? null
}

const fieldKeys = computed(() => ({
  kecamatan: fieldKeyForLabel('Kecamatan'),
  desa: fieldKeyForLabel('Desa'),
  unit: fieldKeyForLabel('Nama Perusahaan'),
  owner: fieldKeyForLabel('Nama Pemilik')
}))

function rowValue(row: DashboardDatasetTableRecord) {
  return readDashboardRecordNumber(row, selectedMonth.value?.key ?? null)
}

function hasMeaningfulMonth(periodDate: string, monthKey: string) {
  const dataset = activeDataset.value
  return Boolean(dataset?.tableRecords.some(record => record.periodDate === periodDate && readDashboardRecordNumber(record, monthKey) !== null))
}

function latestMeaningfulMonth(periodDate: string) {
  return [...monthFields.value].reverse().find(field => hasMeaningfulMonth(periodDate, field.key))?.key ?? ''
}

watch(availablePeriods, (periods) => {
  if (!periods.includes(selectedPeriod.value)) {
    selectedPeriod.value = periods[0] ?? ''
  }
}, { immediate: true })

watch(selectedPeriod, (periodDate) => {
  if (!periodDate) {
    selectedMonthKey.value = ''
    return
  }

  if (!hasMeaningfulMonth(periodDate, selectedMonthKey.value)) {
    selectedMonthKey.value = latestMeaningfulMonth(periodDate)
  }
}, { immediate: true })

function normalizeIdentity(value: string) {
  return value.trim().toLocaleUpperCase('id-ID')
}

function canonicalKecamatanName(value: string | null) {
  if (!value) {
    return null
  }

  return activeDataset.value?.canonicalKecamatanNames.find(name => normalizeIdentity(name) === normalizeIdentity(value)) ?? null
}

function kecamatanIdentity(value: string | null) {
  if (!value) {
    return null
  }

  return normalizeIdentity(canonicalKecamatanName(value) ?? value)
}

const observations = computed(() => selectedRows.value
  .map(row => ({ row, value: rowValue(row) }))
  .filter((item): item is { row: DashboardDatasetTableRecord, value: number } => item.value !== null))
const hasMonthData = computed(() => observations.value.length > 0)
const totalStock = computed(() => hasMonthData.value
  ? observations.value.reduce((sum, item) => sum + item.value, 0)
  : null)
const stockedObservations = computed(() => observations.value.filter(item => item.value > 0))
const stockedUnitCount = computed(() => stockedObservations.value.length)
const stockedKecamatanCount = computed(() => new Set(stockedObservations.value
  .map(({ row }) => kecamatanIdentity(readDashboardRecordText(row, fieldKeys.value.kecamatan)))
  .filter((identity): identity is string => Boolean(identity))).size)
const stockedDesaCount = computed(() => new Set(stockedObservations.value.flatMap(({ row }) => {
  const kecamatan = kecamatanIdentity(readDashboardRecordText(row, fieldKeys.value.kecamatan))
  const desa = readDashboardRecordText(row, fieldKeys.value.desa)
  return kecamatan && desa ? [`${kecamatan}::${normalizeIdentity(desa)}`] : []
})).size)

const kecamatanSummaries = computed<KecamatanSummary[]>(() => {
  const grouped = new Map<string, KecamatanSummary>()

  for (const row of selectedRows.value) {
    const rawKecamatan = readDashboardRecordText(row, fieldKeys.value.kecamatan)
    if (!rawKecamatan) {
      continue
    }

    const canonicalLabel = canonicalKecamatanName(rawKecamatan)
    const label = canonicalLabel ?? rawKecamatan
    const key = normalizeIdentity(label)
    const summary = grouped.get(key) ?? {
      key,
      label,
      canonicalLabel,
      value: null,
      totalUnits: 0,
      stockedUnits: 0
    }
    const value = rowValue(row)

    summary.totalUnits += 1
    if (value !== null) {
      summary.value = (summary.value ?? 0) + value
      if (value > 0) {
        summary.stockedUnits += 1
      }
    }
    grouped.set(key, summary)
  }

  return [...grouped.values()].sort((left, right) => (right.value ?? -Infinity) - (left.value ?? -Infinity) || left.label.localeCompare(right.label, 'id-ID'))
})
const rankingMaximum = computed(() => Math.max(0, ...kecamatanSummaries.value.flatMap(row => row.value === null ? [] : [row.value])))
const mapColorMap = { zero: '#dcfce7', low: '#bbf7d0', medium: '#86efac', high: '#4ade80', highest: '#16a34a' }
const mapValues = computed(() => kecamatanSummaries.value.flatMap((row) => {
  if (!row.canonicalLabel || row.value === null) {
    return []
  }

  const ratio = rankingMaximum.value > 0 ? row.value / rankingMaximum.value : 0
  const valueKey = row.value === 0 ? 'zero' : ratio <= 0.25 ? 'low' : ratio <= 0.5 ? 'medium' : ratio <= 0.75 ? 'high' : 'highest'
  const periodLabel = `${selectedMonth.value?.label ?? 'Bulan'} ${selectedPeriod.value.slice(0, 4)}`

  return [{
    regionName: row.canonicalLabel,
    valueKey,
    valueLabel: `${commodity.value.label}<br><strong>${number.format(row.value)} Ton</strong><br>${periodLabel}`
  }]
}))
const topUnits = computed<UnitStockRow[]>(() => stockedObservations.value
  .map(({ row, value }) => ({
    unit: readDashboardRecordText(row, fieldKeys.value.unit),
    owner: readDashboardRecordText(row, fieldKeys.value.owner),
    desa: readDashboardRecordText(row, fieldKeys.value.desa),
    kecamatan: readDashboardRecordText(row, fieldKeys.value.kecamatan),
    value
  }))
  .sort((left, right) => right.value - left.value || (left.unit ?? '').localeCompare(right.unit ?? '', 'id-ID'))
  .slice(0, 5)
  .map((row, index) => ({ ...row, index: index + 1 })))
const unitSummaries = computed(() => [...kecamatanSummaries.value].sort((left, right) => right.stockedUnits - left.stockedUnits || (right.value ?? -Infinity) - (left.value ?? -Infinity) || left.label.localeCompare(right.label, 'id-ID')))
const source = computed(() => activeDataset.value?.definition.source ?? null)

function formatValue(value: number | null) {
  return value === null ? '—' : number.format(value)
}

function stockPercentage(row: KecamatanSummary) {
  return row.totalUnits > 0 ? (row.stockedUnits / row.totalUnits) * 100 : 0
}

function openDetail() {
  if (!activeDataset.value) {
    return
  }

  selectedDetail.value = {
    card: activeCard.value,
    dataset: activeDataset.value,
    periodDate: selectedPeriod.value || null
  }
  detailOpen.value = true
}
</script>

<template>
  <section class="space-y-3" :class="pending ? 'opacity-75 transition-opacity' : ''">
    <header class="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
      <div class="min-w-0">
        <div class="flex items-center gap-2">
          <span class="flex size-8 items-center justify-center rounded-lg bg-success/10 text-success"><UIcon name="i-lucide-package-open" class="size-4" /></span>
          <div>
            <h2 class="text-xl leading-7 font-semibold tracking-tight text-[var(--app-foreground)]">
              Stok Pangan
            </h2>
            <p class="mt-0.5 text-sm text-[var(--app-foreground-muted)]">
              Cadangan Pangan Masyarakat Kabupaten Sumbawa Barat
            </p>
          </div>
        </div>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <div class="inline-flex rounded-[var(--radius-control)] border border-[var(--app-border)] bg-[var(--app-surface-muted)] p-1" aria-label="Pilih komoditas CPM">
          <UButton
            v-for="item in commodities"
            :key="item.key"
            size="sm"
            :color="selectedCommodityKey === item.key ? 'primary' : 'neutral'"
            :variant="selectedCommodityKey === item.key ? 'solid' : 'ghost'"
            :aria-pressed="selectedCommodityKey === item.key"
            class="cursor-pointer"
            @click="selectedCommodityKey = item.key"
          >
            {{ item.label }}
          </UButton>
        </div>
        <div class="flex items-center gap-1.5 rounded-[var(--radius-control)] border border-[var(--app-border)] bg-[var(--app-surface)] px-2 py-1">
          <span class="text-xs font-medium text-[var(--app-foreground-muted)]">Tahun</span>
          <DashboardPeriodSelector v-model="selectedPeriod" periodicity="TAHUNAN" :periods="availablePeriods" />
        </div>
        <div class="flex items-center gap-1.5 rounded-[var(--radius-control)] border border-[var(--app-border)] bg-[var(--app-surface)] px-2 py-1">
          <span class="text-xs font-medium text-[var(--app-foreground-muted)]">Bulan</span>
          <USelectMenu
            v-model="selectedMonthKey"
            :items="monthOptions"
            value-key="value"
            label-key="label"
            size="sm"
            color="neutral"
            variant="ghost"
            class="min-w-28"
            :disabled="!monthOptions.length"
            aria-label="Pilih bulan stok"
            :ui="{ base: 'cursor-pointer', item: 'cursor-pointer' }"
          />
        </div>
        <UButton
          size="sm"
          color="neutral"
          variant="outline"
          trailing-icon="i-lucide-arrow-right"
          class="cursor-pointer"
          :disabled="!activeDataset"
          @click="openDetail"
        >
          Lihat detail
        </UButton>
      </div>
    </header>

    <div v-if="!selectedPeriod" class="rounded-[var(--radius-panel)] border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-8 text-sm text-[var(--app-foreground-muted)]">
      Belum ada periode CPM yang tersedia.
    </div>
    <template v-else>
      <section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Ringkasan stok pangan masyarakat">
        <article
          v-for="metric in [
            { label: 'Total Stok', value: totalStock === null ? 'Data belum tersedia' : `${formatValue(totalStock)} Ton`, icon: 'i-lucide-package' },
            { label: 'Unit Berstok', value: hasMonthData ? `${stockedUnitCount} Unit` : 'Data belum tersedia', icon: 'i-lucide-building-2' },
            { label: 'Kecamatan Berstok', value: hasMonthData ? `${stockedKecamatanCount} Kecamatan` : 'Data belum tersedia', icon: 'i-lucide-map-pinned' },
            { label: 'Desa Berstok', value: hasMonthData ? `${stockedDesaCount} Desa` : 'Data belum tersedia', icon: 'i-lucide-landmark' }
          ]"
          :key="metric.label"
          class="min-w-0 rounded-[var(--radius-panel)] border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2.5 shadow-sm"
        >
          <div class="flex items-center gap-2.5">
            <span class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-success/10 text-success"><UIcon :name="metric.icon" class="size-4" /></span>
            <div class="min-w-0">
              <p class="text-xs font-medium text-[var(--app-foreground-muted)]">
                {{ metric.label }}
              </p>
              <p class="mt-0.5 truncate text-lg font-semibold tracking-tight tabular-nums text-[var(--app-foreground)]">
                {{ metric.value }}
              </p>
              <p class="mt-0.5 text-[0.68rem] text-[var(--app-foreground-soft)]">
                {{ selectedMonth?.label ?? 'Bulan' }} {{ selectedPeriod.slice(0, 4) }}
              </p>
            </div>
          </div>
        </article>
      </section>

      <section class="grid gap-3 xl:grid-cols-2">
        <DashboardWidget compact>
          <template #header>
            <div class="flex min-w-0 items-center gap-2">
              <UIcon name="i-lucide-chart-no-axes-column-increasing" class="size-4 text-success" />
              <div>
                <h3 class="text-sm font-semibold text-[var(--app-foreground)]">
                  Stok Menurut Kecamatan
                </h3><p class="text-xs text-[var(--app-foreground-muted)]">
                  {{ commodity.label }} · {{ selectedMonth?.label }} {{ selectedPeriod.slice(0, 4) }}
                </p>
              </div>
            </div>
          </template>
          <p v-if="!kecamatanSummaries.length" class="text-sm text-[var(--app-foreground-muted)]">
            Data Kecamatan belum tersedia untuk periode ini.
          </p>
          <div v-else class="space-y-2.5">
            <div v-for="row in kecamatanSummaries" :key="row.key" class="grid grid-cols-[minmax(6rem,0.75fr)_minmax(0,1.5fr)_auto] items-center gap-2 text-xs">
              <span class="min-w-0 truncate font-medium text-[var(--app-foreground)]">{{ row.label }}</span>
              <span class="h-4 overflow-hidden rounded-sm bg-[var(--app-surface-muted)]"><span v-if="row.value !== null" class="block h-full rounded-sm bg-success" :style="{ width: `${rankingMaximum ? (row.value / rankingMaximum) * 100 : 0}%` }" /></span>
              <span class="whitespace-nowrap text-right tabular-nums text-[var(--app-foreground-muted)]">{{ row.value === null ? '—' : `${formatValue(row.value)} Ton` }}</span>
            </div>
          </div>
          <template #footer>
            <DashboardCardSource :source="source" />
          </template>
        </DashboardWidget>

        <DashboardWidget compact>
          <template #header>
            <div class="flex min-w-0 items-center gap-2">
              <UIcon name="i-lucide-map" class="size-4 text-success" /><div>
                <h3 class="text-sm font-semibold text-[var(--app-foreground)]">
                  Peta Sebaran Stok
                </h3><p class="text-xs text-[var(--app-foreground-muted)]">
                  Warna lebih gelap menunjukkan stok lebih tinggi.
                </p>
              </div>
            </div>
          </template>
          <MapAdministrativeBoundaryMap
            map-height="clamp(220px, 23vw, 280px)"
            :kecamatan-values="mapValues"
            :value-color-map="mapColorMap"
            :show-desa-layer="false"
            frozen
            stop-interaction-propagation
            no-data-color="#e2e8f0"
            no-data-label="Data belum tersedia"
          />
          <div class="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[0.68rem] text-[var(--app-foreground-muted)]">
            <span class="inline-flex items-center gap-1.5"><span class="size-2 rounded-sm" :style="{ backgroundColor: mapColorMap.zero }" />Nol</span>
            <span class="inline-flex items-center gap-1.5"><span class="size-2 rounded-sm" :style="{ backgroundColor: mapColorMap.highest }" />Lebih tinggi</span>
            <span class="inline-flex items-center gap-1.5"><span class="size-2 rounded-sm border border-dashed border-[var(--app-border-strong)] bg-[var(--app-surface-muted)]" />Tidak ada data</span>
          </div>
          <template #footer>
            <DashboardCardSource :source="source" />
          </template>
        </DashboardWidget>
      </section>

      <section class="grid gap-3 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <DashboardWidget compact>
          <template #header>
            <div class="flex min-w-0 items-center gap-2">
              <UIcon name="i-lucide-trophy" class="size-4 text-success" /><div>
                <h3 class="text-sm font-semibold text-[var(--app-foreground)]">
                  Unit/Pemilik dengan Stok Terbesar
                </h3><p class="text-xs text-[var(--app-foreground-muted)]">
                  Lima observasi unit dengan stok aktif tertinggi.
                </p>
              </div>
            </div>
          </template>
          <p v-if="!topUnits.length" class="text-sm text-[var(--app-foreground-muted)]">
            Belum ada unit dengan stok pada bulan yang dipilih.
          </p>
          <div v-else class="overflow-x-auto">
            <table class="w-full min-w-[560px] text-left text-xs">
              <thead class="border-b border-[var(--app-border)] text-[0.68rem] font-medium tracking-[0.12em] text-[var(--app-foreground-muted)] uppercase">
                <tr>
                  <th class="pb-2 pr-2">
                    #
                  </th><th class="pb-2 pr-3">
                    Nama Perusahaan
                  </th><th class="pb-2 pr-3">
                    Nama Pemilik
                  </th><th class="pb-2 pr-3">
                    Desa / Kecamatan
                  </th><th class="pb-2 text-right">
                    Stok
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[var(--app-border)]">
                <tr v-for="row in topUnits" :key="`${row.index}-${row.unit}-${row.owner}`">
                  <td class="py-2 pr-2 font-medium text-[var(--app-foreground-muted)]">
                    {{ row.index }}
                  </td><td class="max-w-36 py-2 pr-3 font-medium text-[var(--app-foreground)]">
                    {{ row.unit ?? '—' }}
                  </td><td class="max-w-36 py-2 pr-3 text-[var(--app-foreground-muted)]">
                    {{ row.owner ?? '—' }}
                  </td><td class="py-2 pr-3 text-[var(--app-foreground-muted)]">
                    {{ [row.desa, row.kecamatan].filter(Boolean).join(' / ') || '—' }}
                  </td><td class="py-2 text-right font-semibold tabular-nums text-[var(--app-foreground)]">
                    {{ formatValue(row.value) }} Ton
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <template #footer>
            <DashboardCardSource :source="source" />
          </template>
        </DashboardWidget>

        <DashboardWidget compact>
          <template #header>
            <div class="flex min-w-0 items-center gap-2">
              <UIcon name="i-lucide-building-2" class="size-4 text-success" /><div>
                <h3 class="text-sm font-semibold text-[var(--app-foreground)]">
                  Sebaran Unit Menurut Kecamatan
                </h3><p class="text-xs text-[var(--app-foreground-muted)]">
                  Unit berstok dibanding seluruh observasi unit.
                </p>
              </div>
            </div>
          </template>
          <p v-if="!unitSummaries.length" class="text-sm text-[var(--app-foreground-muted)]">
            Data unit per Kecamatan belum tersedia.
          </p>
          <div v-else class="space-y-2.5">
            <div v-for="row in unitSummaries" :key="row.key" class="grid grid-cols-[minmax(6rem,1fr)_auto] gap-x-2 text-xs">
              <div class="min-w-0">
                <div class="flex justify-between gap-2">
                  <span class="truncate font-medium text-[var(--app-foreground)]">{{ row.label }}</span><span class="whitespace-nowrap tabular-nums text-[var(--app-foreground-muted)]">{{ row.stockedUnits }} / {{ row.totalUnits }} Unit</span>
                </div><span class="mt-1 block h-1.5 overflow-hidden rounded-sm bg-[var(--app-surface-muted)]"><span class="block h-full rounded-sm bg-success" :style="{ width: `${stockPercentage(row)}%` }" /></span>
              </div><span class="self-center font-medium tabular-nums text-[var(--app-foreground)]">{{ number.format(stockPercentage(row)) }}%</span>
            </div>
          </div>
          <template #footer>
            <DashboardCardSource :source="source" />
          </template>
        </DashboardWidget>
      </section>
    </template>
    <DashboardCardDetailModal v-model:open="detailOpen" :context="selectedDetail" />
  </section>
</template>
