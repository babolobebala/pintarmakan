<script setup lang="ts">
import type { DashboardDatasetBundle } from '~~/shared/dashboard'
import type { DatasetSchemaField } from '~~/shared/datasets'

import { readDashboardRecordNumber } from '~~/shared/dashboard'
import { formatDatasetPeriod } from '~~/shared/datasets'

import {
  formatRupiah,
  parseCommodityField
} from './commodityPrice'

type ChartPoint = Record<string, unknown> & {
  periodDate: string
  day: number
  dateLabel: string
  value: number | null
}

const props = defineProps<{
  field: DatasetSchemaField
  dataset: DashboardDatasetBundle
  /** Exact HARIAN coverage days in the selected month, newest first. */
  days: readonly string[]
  /** First canonical day of the selected calendar month. */
  month: string
}>()

const emit = defineEmits<{
  'open-detail': [periodDate: string | null]
}>()

const recordsByDate = computed(() => new Map(props.dataset.records.map(record => [record.periodDate, record])))
const chartData = computed<ChartPoint[]>(() => props.days
  .slice()
  .sort((left, right) => left.localeCompare(right))
  .map(periodDate => ({
    periodDate,
    day: Number(periodDate.slice(8, 10)),
    dateLabel: formatDatasetPeriod('HARIAN', periodDate),
    value: readDashboardRecordNumber(recordsByDate.value.get(periodDate), props.field.key)
  })))
const latestObservation = computed(() => chartData.value
  .filter((point): point is ChartPoint & { value: number } => point.value !== null)
  .at(-1) ?? null)
const parsed = computed(() => parseCommodityField(props.field))
const priceText = computed(() => latestObservation.value === null ? null : formatRupiah(latestObservation.value.value))
const monthLabel = computed(() => formatDatasetPeriod('BULANAN', props.month))
const xTickValues = computed(() => {
  const lastIndex = chartData.value.length - 1

  return [...new Set([0, 0.2, 0.4, 0.6, 0.8, 1]
    .map(ratio => Math.round(lastIndex * ratio))
    .flatMap(index => chartData.value[index] ? [chartData.value[index].day] : []))]
})

function chartValue(point: Record<string, unknown>) {
  const value = point.value
  return typeof value === 'number' ? value : Number.NaN
}

function chartDay(point: Record<string, unknown>) {
  return Number(point.day)
}

function formatPrice(value: number) {
  return parsed.value.unitLabel ? `Rp${formatRupiah(value)}` : formatRupiah(value)
}

function tooltipTemplate(point: Record<string, unknown>) {
  const dateLabel = typeof point.dateLabel === 'string' ? point.dateLabel : ''
  const value = point.value

  return typeof value === 'number'
    ? `${dateLabel}: ${formatPrice(value)}${parsed.value.unitLabel ? ` ${parsed.value.unitLabel}` : ''}`
    : `${dateLabel}: Data belum tersedia`
}

function activate() {
  emit('open-detail', latestObservation.value?.periodDate ?? null)
}
</script>

<template>
  <DashboardWidget compact>
    <template #header>
      <div class="flex min-w-0 items-center gap-2">
        <UIcon name="i-lucide-tag" class="size-4 shrink-0 text-[var(--app-foreground-soft)]" />
        <h3 class="min-w-0 text-sm font-semibold text-[var(--app-foreground)]">
          {{ parsed.name }}
        </h3>
      </div>
    </template>

    <template v-if="latestObservation && priceText !== null">
      <p class="text-xl font-semibold tabular-nums text-[var(--app-foreground)]">
        {{ formatPrice(latestObservation.value) }}
        <span v-if="parsed.unitLabel" class="ml-1 text-xs font-medium text-[var(--app-foreground-muted)]">
          {{ parsed.unitLabel }}
        </span>
      </p>
      <p class="mt-0.5 text-xs text-[var(--app-foreground-muted)]">
        Terakhir: {{ latestObservation.dateLabel }}
      </p>
      <ChartsLineChart
        :data="chartData"
        :x="chartDay"
        :series="[{ key: 'value', label: parsed.name, y: chartValue, color: '#16a34a' }]"
        :height="168"
        :show-legend="false"
        :x-tick-values="xTickValues"
        :x-tick-format="(tick) => String(tick)"
        :y-tick-format="(tick) => formatRupiah(Number(tick))"
        :tooltip-template="tooltipTemplate"
        :aria-label="`Grafik harga ${parsed.name} pada ${monthLabel}`"
      />
    </template>
    <div v-else class="flex min-h-44 flex-col justify-center">
      <p class="text-sm font-medium text-[var(--app-foreground-muted)]">
        Belum ada data
      </p>
      <p class="mt-0.5 text-xs text-[var(--app-foreground-soft)]">
        untuk {{ monthLabel }}
      </p>
    </div>

    <template #footer>
      <UButton
        size="xs"
        color="neutral"
        variant="ghost"
        trailing-icon="i-lucide-arrow-right"
        class="-ml-1 cursor-pointer"
        @click="activate"
      >
        Lihat detail
      </UButton>
    </template>
  </DashboardWidget>
</template>

