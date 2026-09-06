<script setup lang="ts">
import type { DashboardDatasetBundle, DashboardRegionalMetricCardDefinition } from '~~/shared/dashboard'

import {
  getDashboardAvailablePeriods,
  getDashboardSelectableFields,
  readDashboardRecordNumber
} from '~~/shared/dashboard'

type ChartBar = Record<string, unknown> & {
  index: number
  value: number
  label: string
}

const props = defineProps<{
  card: DashboardRegionalMetricCardDefinition
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
const bars = computed<ChartBar[]>(() => {
  const metricRows: Array<{ label: string, value: number }> = []

  for (const record of props.dataset.records) {
    if (record.periodDate !== selectedPeriod.value) {
      continue
    }

    const value = readDashboardRecordNumber(record, selectedFieldKey.value)

    if (value !== null) {
      metricRows.push({ label: record.regionName, value })
    }
  }

  return metricRows
    .sort((left, right) => right.value - left.value)
    .map((item, index) => ({ ...item, index }))
})
const getValue = (bar: Record<string, unknown>) => Number(bar.value)
const getIndex = (bar: Record<string, unknown>) => Number(bar.index)

watch(selectableFields, (fields) => {
  const preferredKey = props.card.defaultFieldKey

  if (!fields.some(field => field.key === selectedFieldKey.value)) {
    selectedFieldKey.value = fields.find(field => field.key === preferredKey)?.key ?? fields[0]?.key ?? ''
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
          <UIcon name="i-lucide-chart-column-big" class="size-4 shrink-0 text-[var(--app-foreground-soft)]" />
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
              aria-label="Pilih metrik"
            />
          </div>
          <DashboardPeriodSelector v-model="selectedPeriod" :periodicity="card.periodicity" :periods="availablePeriods" />
        </div>
      </div>
    </template>

    <div v-if="!dataset.available" class="text-sm text-[var(--app-foreground-muted)]">
      Dataset tidak tersedia untuk dashboard ini.
    </div>
    <div v-else-if="!selectedField || !bars.length" class="text-sm text-[var(--app-foreground-muted)]">
      Data belum tersedia untuk periode ini.
    </div>
    <ChartsBarChart
      v-else
      :data="bars"
      :x="getValue"
      :y="getIndex"
      orientation="horizontal"
      :height="Math.max(220, bars.length * 34)"
      :y-tick-format="(tick) => bars[Number(tick)]?.label ?? ''"
      :x-tick-format="(tick) => formatter.format(Number(tick))"
      :aria-label="`Perbandingan ${selectedField.label} menurut Kecamatan`"
    />

    <template #footer>
      <DashboardCardSource :source="dataset.definition.source" />
    </template>
  </DashboardWidget>
</template>
