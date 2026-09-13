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

type Commodity = { key: DashboardCpmCardKey, label: string, icon: string }
type MonthSummary = { key: string, label: string, total: number | null, stockedUnits: number }
type KecamatanMatrixRow = { key: string, label: string, values: Array<number | null> }

const props = defineProps<{ payload: DashboardConfiguredPayload, pending?: boolean }>()
const number = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 })
const selectedCommodityKey = ref<DashboardCpmCardKey>('cpm-gabah')
const selectedPeriod = ref('')
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
const availablePeriods = computed(() => activeDataset.value ? getDashboardAvailablePeriods(activeDataset.value.definition.coverage, activeCard.value) : [])
const schemaFields = computed(() => getDatasetSchemaFields(activeDataset.value?.definition.dataSchema))
const monthFields = computed(() => activeCard.value.monthFieldKeys.flatMap((key) => {
  const field = schemaFields.value.find(item => item.key === key)
  return field ? [{ key: field.key, label: field.label.replace(/\s*\([^)]*\)\s*$/, '') }] : []
}))
const selectedRows = computed(() => !activeDataset.value || !selectedPeriod.value ? [] : activeDataset.value.tableRecords.filter(record => record.periodDate === selectedPeriod.value))

function fieldKeyForLabel(label: string) {
  return schemaFields.value.find(field => field.label.trim().toLocaleLowerCase('id-ID') === label.toLocaleLowerCase('id-ID'))?.key ?? null
}

const kecamatanFieldKey = computed(() => fieldKeyForLabel('Kecamatan'))
const kecamatanLabel = computed(() => schemaFields.value.find(field => field.key === kecamatanFieldKey.value)?.label ?? 'Kecamatan')

watch(availablePeriods, (periods) => {
  if (!periods.includes(selectedPeriod.value)) {
    selectedPeriod.value = periods[0] ?? ''
  }
}, { immediate: true })

function normalizeIdentity(value: string) {
  return value.trim().toLocaleUpperCase('id-ID')
}

function canonicalKecamatanName(value: string | null) {
  if (!value) return null

  return activeDataset.value?.canonicalKecamatanNames.find(name => normalizeIdentity(name) === normalizeIdentity(value)) ?? null
}

function readMonthValue(row: DashboardDatasetTableRecord, monthKey: string) {
  return readDashboardRecordNumber(row, monthKey)
}

const monthlySummaries = computed<MonthSummary[]>(() => monthFields.value.map((field) => {
  const values = selectedRows.value.map(row => readMonthValue(row, field.key)).filter((value): value is number => value !== null)
  return {
    key: field.key,
    label: field.label,
    total: values.length ? values.reduce((sum, value) => sum + value, 0) : null,
    stockedUnits: values.filter(value => value > 0).length
  }
}))
const maximumMonthlyTotal = computed(() => Math.max(0, ...monthlySummaries.value.flatMap(month => month.total === null ? [] : [month.total])))

const matrixRows = computed<KecamatanMatrixRow[]>(() => {
  const grouped = new Map<string, KecamatanMatrixRow>()

  for (const row of selectedRows.value) {
    const rawKecamatan = readDashboardRecordText(row, kecamatanFieldKey.value)
    if (!rawKecamatan) continue

    const label = canonicalKecamatanName(rawKecamatan) ?? rawKecamatan
    const key = normalizeIdentity(label)
    const matrixRow = grouped.get(key) ?? { key, label, values: monthFields.value.map(() => null) }

    for (const [index, month] of monthFields.value.entries()) {
      const value = readMonthValue(row, month.key)
      if (value !== null) matrixRow.values[index] = (matrixRow.values[index] ?? 0) + value
    }

    grouped.set(key, matrixRow)
  }

  const canonicalOrder = new Map((activeDataset.value?.canonicalKecamatanNames ?? []).map((name, index) => [normalizeIdentity(name), index]))
  return [...grouped.values()].sort((left, right) => {
    const leftOrder = canonicalOrder.get(left.key)
    const rightOrder = canonicalOrder.get(right.key)
    if (leftOrder !== undefined || rightOrder !== undefined) return (leftOrder ?? Number.MAX_SAFE_INTEGER) - (rightOrder ?? Number.MAX_SAFE_INTEGER)
    return left.label.localeCompare(right.label, 'id-ID')
  })
})
const matrixValues = computed(() => matrixRows.value.flatMap(row => row.values.filter((value): value is number => value !== null)))
const matrixMinimum = computed(() => matrixValues.value.length ? Math.min(...matrixValues.value) : 0)
const matrixMaximum = computed(() => matrixValues.value.length ? Math.max(...matrixValues.value) : 0)
const source = computed(() => activeDataset.value?.definition.source ?? null)

function formatValue(value: number | null) {
  return value === null ? '—' : number.format(value)
}

function monthCardClass(month: MonthSummary) {
  if (month.total === null) return 'border-[var(--app-border)] bg-[var(--app-surface-muted)]'
  if (month.total === 0) return 'border-success/15 bg-success/5'

  const ratio = maximumMonthlyTotal.value > 0 ? month.total / maximumMonthlyTotal.value : 0
  return ratio > 0.75 ? 'border-success/25 bg-success/15' : ratio > 0.4 ? 'border-success/20 bg-success/10' : 'border-success/15 bg-success/5'
}

function matrixCellClass(value: number | null) {
  if (value === null) return 'bg-[var(--app-surface-muted)] text-[var(--app-foreground-soft)]'
  if (value === 0) return 'bg-success/5 text-[var(--app-foreground-muted)]'
  if (matrixMaximum.value === matrixMinimum.value) return 'bg-success/18 text-[var(--app-foreground)]'

  const ratio = (value - matrixMinimum.value) / (matrixMaximum.value - matrixMinimum.value)
  if (ratio > 0.75) return 'bg-success/30 text-[var(--app-foreground)]'
  if (ratio > 0.5) return 'bg-success/22 text-[var(--app-foreground)]'
  if (ratio > 0.25) return 'bg-success/14 text-[var(--app-foreground)]'
  return 'bg-success/8 text-[var(--app-foreground)]'
}

function openDetail() {
  if (!activeDataset.value) return

  selectedDetail.value = { card: activeCard.value, dataset: activeDataset.value, periodDate: selectedPeriod.value || null }
  detailOpen.value = true
}
</script>

<template>
  <section class="space-y-3" :class="pending ? 'opacity-75 transition-opacity' : ''">
    <header class="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
      <div class="min-w-0">
        <div class="flex items-center gap-2">
          <span class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-success/10 text-success">
            <UIcon name="i-lucide-package-open" class="size-4" />
          </span>
          <div class="min-w-0">
            <h2 class="text-xl leading-7 font-semibold tracking-tight text-[var(--app-foreground)]">
              Stok Pangan
            </h2>
            <p class="mt-0.5 text-sm font-medium text-[var(--app-foreground-muted)]">
              Cadangan Pangan Masyarakat Kabupaten Sumbawa Barat
            </p>
            <p class="mt-0.5 text-xs text-[var(--app-foreground-soft)]">
              Informasi stok gabah dan jagung menurut waktu, wilayah, dan pelaku usaha.
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
            class="cursor-pointer whitespace-nowrap"
            @click="selectedCommodityKey = item.key"
          >
            {{ item.label }}
          </UButton>
        </div>

        <DashboardPeriodSelector v-model="selectedPeriod" periodicity="TAHUNAN" :periods="availablePeriods" />

        <UButton
          size="sm"
          color="neutral"
          variant="outline"
          trailing-icon="i-lucide-arrow-right"
          class="cursor-pointer whitespace-nowrap"
          :disabled="!activeDataset"
          @click="openDetail"
        >
          Lihat seluruh data
        </UButton>
      </div>
    </header>

    <div v-if="!selectedPeriod" class="rounded-[var(--radius-panel)] border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-8 text-sm text-[var(--app-foreground-muted)]">
      Belum ada periode CPM yang tersedia.
    </div>

    <template v-else>
      <DashboardWidget compact>
        <template #header>
          <div class="flex w-full flex-wrap items-start justify-between gap-2">
            <div>
              <h3 class="text-sm font-semibold text-[var(--app-foreground)]">
                Ringkasan Stok Bulanan
              </h3>
              <p class="mt-0.5 text-xs text-[var(--app-foreground-muted)]">
                Total stok dan jumlah unit berstok pada setiap bulan di tahun {{ selectedPeriod.slice(0, 4) }}.
              </p>
            </div>
            <div class="flex flex-wrap gap-x-3 gap-y-1 text-[0.68rem] text-[var(--app-foreground-muted)]">
              <span class="inline-flex items-center gap-1.5"><span class="size-2 rounded-full bg-success" />Ada stok</span>
              <span class="inline-flex items-center gap-1.5"><span class="size-2 rounded-full border border-success/40 bg-success/5" />Nol</span>
              <span class="inline-flex items-center gap-1.5">— Belum tersedia</span>
            </div>
          </div>
        </template>

        <div class="grid gap-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
          <article v-for="month in monthlySummaries" :key="month.key" :class="['min-w-0 rounded-lg border px-3 py-2.5', monthCardClass(month)]">
            <p class="text-xs font-semibold text-[var(--app-foreground)]">
              {{ month.label }}
            </p>
            <template v-if="month.total !== null">
              <p class="mt-1 text-lg font-semibold tracking-tight tabular-nums text-[var(--app-foreground)]">
                {{ formatValue(month.total) }} <span class="text-xs font-medium text-[var(--app-foreground-muted)]">Ton</span>
              </p>
              <p class="mt-0.5 text-xs text-[var(--app-foreground-muted)]">
                {{ month.stockedUnits }} unit
              </p>
            </template>
            <template v-else>
              <p class="mt-1 text-lg font-semibold text-[var(--app-foreground-soft)]">
                —
              </p>
              <p class="mt-0.5 text-xs text-[var(--app-foreground-muted)]">
                Belum tersedia
              </p>
            </template>
          </article>
        </div>

        <template #footer>
          <DashboardCardSource :source="source" />
        </template>
      </DashboardWidget>

      <DashboardWidget compact>
        <template #header>
          <div class="flex w-full flex-wrap items-start justify-between gap-2">
            <div>
              <h3 class="text-sm font-semibold text-[var(--app-foreground)]">
                Stok Menurut Kecamatan
              </h3>
              <p class="mt-0.5 text-xs text-[var(--app-foreground-muted)]">
                Stok {{ commodity.label.toLowerCase() }} per Kecamatan pada setiap bulan di tahun {{ selectedPeriod.slice(0, 4) }}.
              </p>
            </div>
            <div class="flex flex-wrap gap-x-3 gap-y-1 text-[0.68rem] text-[var(--app-foreground-muted)]">
              <span class="inline-flex items-center gap-1.5"><span class="size-2 rounded-sm bg-success/30" />Lebih tinggi</span>
              <span class="inline-flex items-center gap-1.5"><span class="size-2 rounded-sm border border-success/40 bg-success/5" />Nol</span>
              <span class="inline-flex items-center gap-1.5"><span class="size-2 rounded-sm bg-[var(--app-surface-muted)]" />Tidak ada data</span>
            </div>
          </div>
        </template>

        <p v-if="!matrixRows.length" class="text-sm text-[var(--app-foreground-muted)]">
          Data Kecamatan belum tersedia untuk periode ini.
        </p>
        <div v-else class="overflow-x-auto">
          <table class="w-full min-w-[780px] border-separate border-spacing-px text-center text-xs">
            <thead class="text-[0.68rem] font-medium text-[var(--app-foreground-muted)]">
              <tr>
                <th class="sticky left-0 z-10 min-w-32 bg-[var(--app-surface)] px-2 py-2 text-left">
                  {{ kecamatanLabel }}
                </th>
                <th v-for="month in monthFields" :key="month.key" class="min-w-12 bg-[var(--app-surface-muted)] px-1 py-2">
                  {{ month.label }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in matrixRows" :key="row.key">
                <th class="sticky left-0 z-10 bg-[var(--app-surface)] px-2 py-2 text-left font-medium text-[var(--app-foreground)]">
                  {{ row.label }}
                </th>
                <td
                  v-for="(value, index) in row.values"
                  :key="monthFields[index]?.key"
                  :class="['px-1 py-2 font-medium tabular-nums', matrixCellClass(value)]"
                >
                  {{ value === null ? '—' : formatValue(value) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <template #footer>
          <DashboardCardSource :source="source" />
        </template>
      </DashboardWidget>
    </template>

    <DashboardCardDetailModal v-model:open="detailOpen" :context="selectedDetail" />
  </section>
</template>
