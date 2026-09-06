<script setup lang="ts">
import type { DashboardDatasetBundle, DashboardTabularMonthSeriesCardDefinition } from '~~/shared/dashboard'

import {
  getDashboardAvailablePeriods,
  getDashboardDatasetField,
  readDashboardRecordNumber
} from '~~/shared/dashboard'

type ChartPoint = Record<string, unknown> & {
  index: number
  value: number
  label: string
}

const props = defineProps<{
  card: DashboardTabularMonthSeriesCardDefinition
  dataset: DashboardDatasetBundle
}>()

const emit = defineEmits<{
  'open-detail': [periodDate: string | null]
}>()

const formatter = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 })
const selectedPeriod = ref('')
const availablePeriods = computed(() => getDashboardAvailablePeriods(props.dataset.definition.coverage, props.card))
const selectedRows = computed(() => props.dataset.tableRecords.filter(record => record.periodDate === selectedPeriod.value))
const monthTotals = computed(() => props.card.monthFieldKeys.map((fieldKey, index) => {
  const values = selectedRows.value
    .map(record => readDashboardRecordNumber(record, fieldKey))
    .filter((value): value is number => value !== null)
  const field = getDashboardDatasetField(props.dataset.definition.dataSchema, fieldKey)

  return {
    index,
    key: fieldKey,
    label: field?.label ?? fieldKey,
    value: values.length ? values.reduce((sum, value) => sum + value, 0) : null
  }
}))
const chartData = computed<ChartPoint[]>(() => monthTotals.value.map(item => ({
  index: item.index,
  label: item.label,
  value: item.value ?? Number.NaN
})))
const getIndex = (point: Record<string, unknown>) => Number(point.index)
const getValue = (point: Record<string, unknown>) => Number(point.value)
</script>

<template>
  <DashboardWidget
    interactive
    :activation-label="`Buka detail ${card.title}`"
    @activate="emit('open-detail', selectedPeriod || null)"
  >
    <template #header>
      <div class="flex w-full items-start justify-between gap-3">
        <div class="flex min-w-0 items-center gap-2">
          <UIcon name="i-lucide-chart-column" class="size-4 shrink-0 text-[var(--app-foreground-soft)]" />
          <h2 class="truncate text-sm font-semibold text-[var(--app-foreground)]">
            {{ card.title }}
          </h2>
        </div>
        <DashboardPeriodSelector v-model="selectedPeriod" :periodicity="card.periodicity" :periods="availablePeriods" />
      </div>
    </template>

    <div v-if="!dataset.available" class="text-sm text-[var(--app-foreground-muted)]">
      Dataset tidak tersedia untuk dashboard ini.
    </div>
    <div v-else-if="!selectedRows.length" class="text-sm text-[var(--app-foreground-muted)]">
      Data belum tersedia untuk periode ini.
    </div>
    <div v-else class="space-y-3">
      <ChartsBarChart
        :data="chartData"
        :x="getIndex"
        :y="getValue"
        :height="220"
        :x-tick-format="(tick) => monthTotals[Number(tick)]?.label ?? ''"
        :y-tick-format="(tick) => formatter.format(Number(tick))"
        aria-label="Total CPM Jagung per bulan"
      />
      <p class="text-xs text-[var(--app-foreground-muted)]">
        Nilai dijumlahkan dari baris bisnis yang memiliki nilai numerik; bulan tanpa nilai tetap ditampilkan sebagai data belum tersedia.
      </p>
    </div>

    <template #footer>
      <DashboardCardSource :source="dataset.definition.source" />
    </template>
  </DashboardWidget>
</template>
