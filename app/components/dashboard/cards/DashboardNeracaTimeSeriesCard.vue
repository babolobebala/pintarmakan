<script setup lang="ts">
import type { DashboardDatasetBundle, DashboardNeracaTimeSeriesCardDefinition } from '~~/shared/dashboard'

import {
  getDashboardAvailablePeriods,
  getDashboardDatasetField,
  readDashboardRecordNumber
} from '~~/shared/dashboard'

type ChartPoint = Record<string, unknown> & {
  index: number
  availability: number
  need: number
  balance: number
}

const props = defineProps<{
  card: DashboardNeracaTimeSeriesCardDefinition
  dataset: DashboardDatasetBundle
}>()

const emit = defineEmits<{
  'open-detail': [periodDate: string | null]
}>()

const formatter = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 })
const selectedPeriod = ref('')
const availablePeriods = computed(() => getDashboardAvailablePeriods(props.dataset.definition.coverage, props.card))
const fields = computed(() => props.card.fieldKeys.map(fieldKey => ({
  key: fieldKey,
  field: getDashboardDatasetField(props.dataset.definition.dataSchema, fieldKey)
})))
const recordsByPeriod = computed(() => new Map(props.dataset.records.map(record => [record.periodDate, record])))
const selectedRecord = computed(() => recordsByPeriod.value.get(selectedPeriod.value))
const metrics = computed(() => fields.value.map(({ key, field }) => ({
  key,
  label: field?.label ?? key,
  unit: field?.unit,
  value: readDashboardRecordNumber(selectedRecord.value, key)
})))
const chartData = computed<ChartPoint[]>(() => availablePeriods.value
  .slice()
  .reverse()
  .map((periodDate, index) => {
    const record = recordsByPeriod.value.get(periodDate)

    return {
      index,
      availability: readDashboardRecordNumber(record, 'total_ketersediaan') ?? Number.NaN,
      need: readDashboardRecordNumber(record, 'total_kebutuhan') ?? Number.NaN,
      balance: readDashboardRecordNumber(record, 'neraca') ?? Number.NaN
    }
  }))
const getIndex = (point: Record<string, unknown>) => Number(point.index)
const getAvailability = (point: Record<string, unknown>) => Number(point.availability)
const getNeed = (point: Record<string, unknown>) => Number(point.need)
const getBalance = (point: Record<string, unknown>) => Number(point.balance)
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
          <UIcon name="i-lucide-chart-line" class="size-4 shrink-0 text-[var(--app-foreground-soft)]" />
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
    <div v-else class="space-y-4">
      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div v-for="metric in metrics" :key="metric.key" class="min-w-0">
          <p class="text-xs text-[var(--app-foreground-muted)]">
            {{ metric.label }}
          </p>
          <p class="mt-1 text-lg font-semibold tabular-nums text-[var(--app-foreground)]">
            {{ metric.value === null ? 'Data belum tersedia' : formatter.format(metric.value) }}
          </p>
          <p v-if="metric.unit" class="text-xs text-[var(--app-foreground-muted)]">
            {{ metric.unit }}
          </p>
        </div>
      </div>
      <ChartsLineChart
        :data="chartData"
        :x="getIndex"
        :series="[
          { key: 'availability', label: 'Total Ketersediaan', y: getAvailability, color: '#2563eb' },
          { key: 'need', label: 'Total Kebutuhan', y: getNeed, color: '#d97706' },
          { key: 'balance', label: 'Neraca', y: getBalance, color: '#16a34a' }
        ]"
        :height="220"
        :x-tick-format="(tick) => availablePeriods.slice().reverse()[Number(tick)] ?? ''"
        :y-tick-format="(tick) => formatter.format(Number(tick))"
        :aria-label="`Tren ${card.title}`"
      />
    </div>

    <template #footer>
      <DashboardCardSource :source="dataset.definition.source" />
    </template>
  </DashboardWidget>
</template>
