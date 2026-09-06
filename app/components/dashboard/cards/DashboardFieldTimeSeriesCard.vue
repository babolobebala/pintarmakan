<script setup lang="ts">
import type { DashboardDatasetBundle, DashboardFieldTimeSeriesCardDefinition } from '~~/shared/dashboard'

import {
  getDashboardAvailablePeriods,
  getDashboardSelectableFields,
  readDashboardRecordNumber
} from '~~/shared/dashboard'

type ChartPoint = Record<string, unknown> & {
  index: number
  value: number
}

const props = defineProps<{
  card: DashboardFieldTimeSeriesCardDefinition
  dataset: DashboardDatasetBundle
}>()

const emit = defineEmits<{
  'open-detail': [periodDate: string | null]
}>()

const formatter = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 })
const selectedPeriod = ref('')
const selectedFieldKey = ref('')
const availablePeriods = computed(() => getDashboardAvailablePeriods(props.dataset.definition.coverage, props.card))
const selectableFields = computed(() => getDashboardSelectableFields(props.card, props.dataset.definition.dataSchema))
const fieldOptions = computed(() => selectableFields.value.map(field => ({ value: field.key, label: field.label })))
const selectedField = computed(() => selectableFields.value.find(field => field.key === selectedFieldKey.value) ?? null)
const recordsByPeriod = computed(() => new Map(props.dataset.records.map(record => [record.periodDate, record])))
const chartData = computed<ChartPoint[]>(() => availablePeriods.value
  .slice()
  .reverse()
  .map((periodDate, index) => ({
    index,
    value: readDashboardRecordNumber(recordsByPeriod.value.get(periodDate), selectedFieldKey.value) ?? Number.NaN
  })))
const selectedValue = computed(() => readDashboardRecordNumber(
  recordsByPeriod.value.get(selectedPeriod.value),
  selectedFieldKey.value
))
const getIndex = (point: Record<string, unknown>) => Number(point.index)
const getValue = (point: Record<string, unknown>) => Number(point.value)

watch(selectableFields, (fields) => {
  if (!fields.some(field => field.key === selectedFieldKey.value)) {
    selectedFieldKey.value = fields[0]?.key ?? ''
  }
}, { immediate: true })
</script>

<template>
  <DashboardWidget
    interactive
    :activation-label="`Buka detail ${card.title}`"
    @activate="emit('open-detail', selectedPeriod || null)"
  >
    <template #header>
      <div class="flex w-full flex-wrap items-start justify-between gap-3">
        <div class="flex min-w-0 items-center gap-2">
          <UIcon name="i-lucide-chart-no-axes-combined" class="size-4 shrink-0 text-[var(--app-foreground-soft)]" />
          <h2 class="truncate text-sm font-semibold text-[var(--app-foreground)]">
            {{ card.title }}
          </h2>
        </div>
        <div class="flex flex-wrap items-center gap-1">
          <div @click.stop @keydown.stop>
            <USelectMenu
              v-model="selectedFieldKey"
              :items="fieldOptions"
              value-key="value"
              label-key="label"
              size="xs"
              color="neutral"
              variant="ghost"
              class="w-44"
              :disabled="!fieldOptions.length"
              aria-label="Pilih komoditas"
            />
          </div>
          <DashboardPeriodSelector v-model="selectedPeriod" :periodicity="card.periodicity" :periods="availablePeriods" />
        </div>
      </div>
    </template>

    <div v-if="!dataset.available" class="text-sm text-[var(--app-foreground-muted)]">
      Dataset tidak tersedia untuk dashboard ini.
    </div>
    <div v-else-if="!selectedField" class="text-sm text-[var(--app-foreground-muted)]">
      Field numerik Dataset belum tersedia.
    </div>
    <div v-else class="space-y-3">
      <div class="flex items-baseline justify-between gap-3">
        <p class="text-sm text-[var(--app-foreground-muted)]">
          {{ selectedField.label }}
        </p>
        <p class="text-lg font-semibold tabular-nums text-[var(--app-foreground)]">
          {{ selectedValue === null ? 'Data belum tersedia' : formatter.format(selectedValue) }}
        </p>
      </div>
      <ChartsLineChart
        :data="chartData"
        :x="getIndex"
        :series="[{ key: 'value', label: selectedField.label, y: getValue, color: '#2563eb' }]"
        :height="220"
        :show-legend="false"
        :x-tick-format="(tick) => availablePeriods.slice().reverse()[Number(tick)] ?? ''"
        :y-tick-format="(tick) => formatter.format(Number(tick))"
        :aria-label="`Grafik ${selectedField.label}`"
      />
    </div>

    <template #footer>
      <DashboardCardSource :source="dataset.definition.source" />
    </template>
  </DashboardWidget>
</template>
