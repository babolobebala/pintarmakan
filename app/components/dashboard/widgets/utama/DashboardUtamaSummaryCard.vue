<script setup lang="ts">
import type {
  DashboardCardDefinition,
  DashboardDatasetBundle,
  DashboardUtamaSummaryCardDescriptor
} from '~~/shared/dashboard'

import {
  formatDashboardValue,
  getDashboardAvailablePeriods,
  getDashboardDatasetField,
  getDashboardPreviousPeriod,
  readDashboardRecordNumber
} from '~~/shared/dashboard'
import { formatDatasetPeriod } from '~~/shared/datasets'

import DashboardCardSource from '../../DashboardCardSource.vue'
import DashboardPeriodSelector from '../../DashboardPeriodSelector.vue'
import DashboardWidget from '../../DashboardWidget.vue'

const props = defineProps<{
  descriptor: DashboardUtamaSummaryCardDescriptor
  card: DashboardCardDefinition
  dataset: DashboardDatasetBundle
}>()

const emit = defineEmits<{
  'open-detail': [periodDate: string | null]
}>()

const availablePeriods = computed(() => getDashboardAvailablePeriods(props.dataset.definition.coverage, props.card))
const field = computed(() => getDashboardDatasetField(props.dataset.definition.dataSchema, props.descriptor.fieldKey))
const showTrend = computed(() => props.descriptor.showTrend !== false)
const selectedPeriod = ref('')

watch(availablePeriods, (periods) => {
  if (!periods.length) {
    selectedPeriod.value = ''
    return
  }

  if (!periods.includes(selectedPeriod.value)) {
    selectedPeriod.value = periods[0] ?? ''
  }
}, { immediate: true })

const selectedPeriodLabel = computed(() => selectedPeriod.value
  ? formatDatasetPeriod(props.card.periodicity, selectedPeriod.value)
  : null)

function findRecord(periodDate: string | null) {
  if (!periodDate) {
    return undefined
  }

  return props.dataset.records.find(record => record.periodDate === periodDate)
}

const numberFormatter = computed(() => new Intl.NumberFormat('id-ID', {
  maximumFractionDigits: field.value?.validation?.decimalPlaces ?? 2
}))

function formatNumber(value: number) {
  return numberFormatter.value.format(value)
}

const currentValue = computed(() => readDashboardRecordNumber(
  findRecord(selectedPeriod.value),
  props.descriptor.fieldKey
))
const isCppd = computed(() => props.descriptor.key === 'cppd')
const cppdValues = computed(() => ({
  pengadaan: readDashboardRecordNumber(findRecord(selectedPeriod.value), 'pengadaan'),
  penyaluran: readDashboardRecordNumber(findRecord(selectedPeriod.value), 'penyaluran')
}))
const previousPeriod = computed(() => getDashboardPreviousPeriod(
  availablePeriods.value,
  selectedPeriod.value || null
))
const previousPeriodLabel = computed(() => previousPeriod.value
  ? formatDatasetPeriod(props.card.periodicity, previousPeriod.value)
  : null)
const previousValue = computed(() => readDashboardRecordNumber(
  findRecord(previousPeriod.value),
  props.descriptor.fieldKey
))
const delta = computed(() => currentValue.value === null || previousValue.value === null
  ? null
  : currentValue.value - previousValue.value)

const valueLabel = computed(() => {
  if (!props.dataset.available) {
    return 'Dataset tidak tersedia'
  }

  if (currentValue.value === null) {
    return 'Data belum tersedia'
  }

  const formatted = formatDashboardValue(currentValue.value, field.value)
  return props.descriptor.unitSuffix ? `${formatted} ${props.descriptor.unitSuffix}` : formatted
})

const deltaLabel = computed(() => delta.value === null
  ? null
  : `${delta.value > 0 ? '+' : ''}${formatNumber(delta.value)}`)

const comparisonLine = computed(() => showTrend.value && deltaLabel.value && previousPeriodLabel.value && previousValue.value !== null
  ? `${deltaLabel.value} dari ${previousPeriodLabel.value}`
  : null)

const statusText = computed(() => {
  if (!props.dataset.available) {
    return 'Dataset tidak tersedia untuk dashboard ini.'
  }

  if (!selectedPeriodLabel.value) {
    return 'Periode Dataset belum tersedia.'
  }

  if (currentValue.value === null) {
    return `Data ${selectedPeriodLabel.value} belum tersedia.`
  }

  return 'Belum ada data pembanding.'
})

const trendMeta = computed(() => {
  if (delta.value === null) {
    return null
  }

  if (delta.value > 0) {
    return { icon: 'i-lucide-trending-up', color: 'success' as const }
  }

  if (delta.value < 0) {
    return { icon: 'i-lucide-trending-down', color: 'warning' as const }
  }

  return { icon: 'i-lucide-minus', color: 'neutral' as const }
})

/** Effective visible periods up to (and including) the currently selected period. */
const trendPeriods = computed(() => {
  if (!selectedPeriod.value) {
    return []
  }

  return availablePeriods.value
    .filter(periodDate => periodDate <= selectedPeriod.value)
    .slice()
    .reverse()
})

const trendData = computed(() => trendPeriods.value.map((periodDate, index) => ({
  index,
  value: readDashboardRecordNumber(findRecord(periodDate), props.descriptor.fieldKey)
})))
const trendValueCount = computed(() => trendData.value.reduce(
  (count, point) => count + (point.value === null ? 0 : 1),
  0
))
const hasTrend = computed(() => trendValueCount.value >= 2)
const trendChartData = computed(() => trendData.value.map(point => ({
  index: point.index,
  value: point.value ?? Number.NaN
})))
const trendEmptyLabel = computed(() => {
  if (!props.dataset.available) {
    return 'Dataset tidak tersedia'
  }

  return trendValueCount.value === 0 ? 'Tren belum tersedia' : 'Tren belum cukup'
})

function activate() {
  emit('open-detail', selectedPeriod.value || null)
}
</script>

<template>
  <DashboardWidget compact>
    <template #header>
      <div class="flex w-full items-start justify-between gap-2">
        <div class="flex min-w-0 items-center gap-2">
          <UIcon :name="descriptor.icon" class="size-4 shrink-0 text-[var(--app-foreground-soft)]" />
          <h2 class="truncate text-sm font-semibold text-[var(--app-foreground)]">
            {{ descriptor.title }}
          </h2>
        </div>
        <DashboardPeriodSelector
          v-model="selectedPeriod"
          :periodicity="card.periodicity"
          :periods="availablePeriods"
        />
      </div>
    </template>

    <div class="flex items-center gap-3">
      <div class="min-w-0 flex-1 space-y-1.5">
        <p v-if="isCppd" class="text-xs text-[var(--app-foreground-muted)]">
          Stok Akhir
        </p>
        <div class="flex flex-wrap items-center gap-2">
          <p
            class="min-w-0 font-semibold tracking-tight text-[var(--app-foreground)]"
            :class="currentValue === null || !dataset.available ? 'text-base leading-6' : 'text-2xl'"
          >
            {{ valueLabel }}
          </p>
          <UBadge
            v-if="showTrend && trendMeta && deltaLabel"
            :color="trendMeta.color"
            variant="subtle"
          >
            <UIcon :name="trendMeta.icon" class="mr-1 size-3" />
            {{ deltaLabel }}
          </UBadge>
        </div>

        <p v-if="field?.unit" class="text-xs text-[var(--app-foreground-muted)]">
          {{ field.unit }}
        </p>

        <template v-if="isCppd && currentValue !== null">
          <div class="grid grid-cols-2 gap-2 pt-1 text-xs">
            <p class="text-[var(--app-foreground-muted)]">
              Pengadaan <span class="ml-1 font-medium tabular-nums text-[var(--app-foreground)]">{{ cppdValues.pengadaan === null ? '—' : `${formatNumber(cppdValues.pengadaan)} Ton` }}</span>
            </p>
            <p class="text-[var(--app-foreground-muted)]">
              Penyaluran <span class="ml-1 font-medium tabular-nums text-[var(--app-foreground)]">{{ cppdValues.penyaluran === null ? '—' : `${formatNumber(cppdValues.penyaluran)} Ton` }}</span>
            </p>
          </div>
        </template>
        <p v-else class="text-xs leading-5 text-[var(--app-foreground-muted)]">
          {{ comparisonLine ?? statusText }}
        </p>
      </div>

      <div
        v-if="showTrend"
        class="flex h-16 w-24 shrink-0 items-center sm:w-32"
      >
        <ChartsMiniTrendChart
          v-if="hasTrend"
          :data="trendChartData"
          color="#2563eb"
          :height="64"
          class="h-full w-full"
        />
        <p v-else class="text-[0.65rem] leading-4 text-[var(--app-foreground-muted)]">
          {{ trendEmptyLabel }}
        </p>
      </div>
    </div>

    <template #footer>
      <div class="flex items-center justify-between gap-3">
        <DashboardCardSource :source="dataset.definition.source" />
        <UButton
          size="xs"
          color="neutral"
          variant="ghost"
          trailing-icon="i-lucide-arrow-right"
          @click="activate"
        >
          Lihat detail
        </UButton>
      </div>
    </template>
  </DashboardWidget>
</template>
