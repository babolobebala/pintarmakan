<script setup lang="ts">
import type { DashboardDatasetBundle, DashboardNeracaTimeSeriesCardDefinition } from '~~/shared/dashboard'

import {
  formatDashboardValue,
  getDashboardAvailablePeriods,
  getDashboardDatasetField,
  getDashboardNeracaStatus,
  readDashboardRecordNumber
} from '~~/shared/dashboard'

type ChartPoint = Record<string, unknown> & {
  index: number
  availability: number
  need: number
  periodLabel: string
}

const props = defineProps<{
  card: DashboardNeracaTimeSeriesCardDefinition
  dataset: DashboardDatasetBundle
}>()

const emit = defineEmits<{
  'open-detail': [periodDate: string | null]
}>()

const selectedPeriod = ref('')
const availablePeriods = computed(() => getDashboardAvailablePeriods(props.dataset.definition.coverage, props.card))
const recordsByPeriod = computed(() => new Map(props.dataset.records.map(record => [record.periodDate, record])))
const selectedRecord = computed(() => recordsByPeriod.value.get(selectedPeriod.value))

watch(availablePeriods, (periods) => {
  if (!periods.length) {
    selectedPeriod.value = ''
    return
  }

  if (!periods.includes(selectedPeriod.value)) {
    selectedPeriod.value = periods[0] ?? ''
  }
}, { immediate: true })

const metricConfigs = [{
  key: 'total_ketersediaan',
  label: 'Ketersediaan',
  unit: 'Ton'
}, {
  key: 'total_kebutuhan',
  label: 'Kebutuhan',
  unit: 'Ton'
}, {
  key: 'neraca',
  label: 'Neraca',
  unit: 'Ton'
}, {
  key: 'ketahanan_stok',
  label: 'Ketahanan Stok',
  unit: 'Hari'
}] as const

function readMetricValue(fieldKey: string) {
  return readDashboardRecordNumber(selectedRecord.value, fieldKey)
}

function formatShortMonth(periodDate: string) {
  if (!periodDate) {
    return ''
  }

  const [yearString = '', monthString = '1'] = periodDate.split('-')
  const year = Number(yearString)
  const month = Number(monthString)

  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    return periodDate
  }

  return new Intl.DateTimeFormat('id-ID', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(new Date(Date.UTC(year, month - 1, 1)))
}

const metrics = computed(() => metricConfigs.map((config) => {
  const field = getDashboardDatasetField(props.dataset.definition.dataSchema, config.key)
  const value = readMetricValue(config.key)
  const base = value === null ? null : formatDashboardValue(value, field)
  const display = value !== null && config.key === 'neraca' && value > 0 ? `+${base}` : base

  let status = null
  let statusColor: 'success' | 'error' | 'neutral' | null = null

  if (config.key === 'neraca') {
    status = getDashboardNeracaStatus(value)
    statusColor = status === 'Surplus' ? 'success' : status === 'Defisit' ? 'error' : status === 'Seimbang' ? 'neutral' : null
  }

  return {
    key: config.key,
    label: config.label,
    unit: config.unit,
    value,
    display,
    status,
    statusColor
  }
}))

/** Full chronological monthly projection horizon (not truncated by the selected month). */
const chartPeriods = computed(() => availablePeriods.value.slice().reverse())

const chartData = computed<ChartPoint[]>(() => chartPeriods.value.map((periodDate, index) => {
  const record = recordsByPeriod.value.get(periodDate)

  return {
    index,
    availability: readDashboardRecordNumber(record, 'total_ketersediaan') ?? Number.NaN,
    need: readDashboardRecordNumber(record, 'total_kebutuhan') ?? Number.NaN,
    periodLabel: formatShortMonth(periodDate)
  }
}))

const selectedChartIndex = computed(() => {
  if (!selectedPeriod.value) {
    return null
  }

  const index = chartPeriods.value.indexOf(selectedPeriod.value)
  return index >= 0 ? index : null
})
const selectedChartLabel = computed<string | undefined>(() => selectedPeriod.value
  ? formatShortMonth(selectedPeriod.value) || undefined
  : undefined)

const chartTickValues = computed(() => {
  const values: number[] = []

  chartPeriods.value.forEach((periodDate, index) => {
    const month = periodDate.slice(5, 7)

    if (month === '01' || month === '07') {
      values.push(index)
    }
  })

  const lastIndex = chartPeriods.value.length - 1

  if (lastIndex >= 0 && !values.includes(lastIndex)) {
    values.push(lastIndex)
  }

  return values
})

const getIndex = (point: Record<string, unknown>) => Number(point.index)
const getAvailability = (point: Record<string, unknown>) => Number(point.availability)
const getNeed = (point: Record<string, unknown>) => Number(point.need)
const chartSeries = computed(() => ([{
  key: 'availability',
  label: 'Ketersediaan',
  y: getAvailability,
  color: '#2563eb'
}, {
  key: 'need',
  label: 'Kebutuhan',
  y: getNeed,
  color: '#d97706'
}]))
const yTickFormatter = (tick: number | Date) => new Intl.NumberFormat('id-ID', {
  maximumFractionDigits: 2
}).format(typeof tick === 'number' ? tick : tick.getTime())

function formatChartTick(tick: number | Date) {
  const index = typeof tick === 'number' ? Math.round(tick) : Number.NaN
  const periodDate = Number.isFinite(index) ? chartPeriods.value[index] ?? '' : ''
  return formatShortMonth(periodDate)
}
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

          <p v-if="metric.value !== null" class="mt-1 text-lg font-semibold tabular-nums text-[var(--app-foreground)]">
            {{ metric.display }}
            <span class="ml-1 text-sm font-medium text-[var(--app-foreground-muted)]">
              {{ metric.unit }}
            </span>
          </p>
          <p v-else class="mt-1 text-sm text-[var(--app-foreground-muted)]">
            Data belum tersedia
          </p>

          <UBadge
            v-if="metric.status && metric.statusColor"
            :color="metric.statusColor"
            variant="subtle"
            class="mt-1"
          >
            {{ metric.status }}
          </UBadge>
        </div>
      </div>

      <ChartsLineChart
        :data="chartData"
        :x="getIndex"
        :series="chartSeries"
        :height="220"
        :x-tick-values="chartTickValues"
        :x-tick-format="formatChartTick"
        :y-tick-format="yTickFormatter"
        :vertical-line-value="selectedChartIndex"
        :vertical-line-label="selectedChartLabel"
        vertical-line-color="#94a3b8"
        aria-label="Grafik Ketersediaan dibanding Kebutuhan"
      />
    </div>

    <template #footer>
      <DashboardCardSource :source="dataset.definition.source" />
    </template>
  </DashboardWidget>
</template>
