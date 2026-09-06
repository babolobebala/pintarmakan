<script setup lang="ts">
import type {
  DashboardDatasetBundle,
  DashboardDatasetRecord,
  DashboardProduksiCardDefinition
} from '~~/shared/dashboard'

import {
  getDashboardAvailablePeriods,
  getDashboardDatasetField,
  getDashboardNumericSchemaFields,
  getDashboardProduksiSummaryCard,
  readDashboardRecordNumber
} from '~~/shared/dashboard'

import DashboardCardSource from '../../DashboardCardSource.vue'
import DashboardPeriodSelector from '../../DashboardPeriodSelector.vue'
import DashboardWidget from '../../DashboardWidget.vue'

const props = defineProps<{
  card: DashboardProduksiCardDefinition
  dataset: DashboardDatasetBundle
}>()

const emit = defineEmits<{
  'open-detail': [periodDate: string | null]
}>()

const descriptor = computed(() => getDashboardProduksiSummaryCard(props.card.key))
const availablePeriods = computed(() => getDashboardAvailablePeriods(props.dataset.definition.coverage, props.card))
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

const selectedRecords = computed(() => !selectedPeriod.value
  ? []
  : props.dataset.records.filter(record => record.periodDate === selectedPeriod.value))

const numericFields = computed(() => getDashboardNumericSchemaFields(props.dataset.definition.dataSchema))
const sharedNumericDecimals = computed<number | null>(() => {
  const decimals = new Set(numericFields.value
    .map(field => field.validation?.decimalPlaces)
    .filter((value): value is number => typeof value === 'number'))

  return decimals.size === 1 ? [...decimals][0] ?? null : null
})

function sumFieldValue(records: DashboardDatasetRecord[], fieldKey: string) {
  let total = 0
  let found = false

  for (const record of records) {
    const value = readDashboardRecordNumber(record, fieldKey)

    if (value !== null) {
      total += value
      found = true
    }
  }

  return found ? total : null
}

function sumMeaningfulValues(records: DashboardDatasetRecord[]) {
  let total = 0
  let found = false

  for (const field of numericFields.value) {
    const value = sumFieldValue(records, field.key)

    if (value !== null) {
      total += value
      found = true
    }
  }

  return found ? total : null
}

function makeFormatter(decimalPlaces: number | null) {
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: decimalPlaces ?? 0,
    maximumFractionDigits: decimalPlaces ?? 2
  })
}

type SummaryRow = {
  key: string
  label: string
  unit: string
  value: number | null
  formatted: string | null
}

const rows = computed<SummaryRow[]>(() => (descriptor.value?.rows ?? []).map((row) => {
  const aggregation = row.aggregation

  if (aggregation.kind === 'field') {
    const field = getDashboardDatasetField(props.dataset.definition.dataSchema, aggregation.fieldKey)
    const value = sumFieldValue(selectedRecords.value, aggregation.fieldKey)
    const formatter = makeFormatter(field?.validation?.decimalPlaces ?? null)

    return {
      key: row.key,
      label: row.label,
      unit: row.unit,
      value,
      formatted: value === null ? null : formatter.format(value)
    }
  }

  const value = sumMeaningfulValues(selectedRecords.value)
  const formatter = makeFormatter(sharedNumericDecimals.value)

  return {
    key: row.key,
    label: row.label,
    unit: row.unit,
    value,
    formatted: value === null ? null : formatter.format(value)
  }
}))

function activate() {
  emit('open-detail', selectedPeriod.value || null)
}
</script>

<template>
  <DashboardWidget
    interactive
    :activation-label="`Buka detail ${card.title}`"
    @activate="activate"
  >
    <template #header>
      <div class="flex w-full items-start justify-between gap-3">
        <div class="flex min-w-0 items-center gap-2">
          <UIcon name="i-lucide-chart-column-big" class="size-4 shrink-0 text-[var(--app-foreground-soft)]" />
          <h2 class="truncate text-sm font-semibold text-[var(--app-foreground)]">
            {{ card.title }}
          </h2>
        </div>
        <DashboardPeriodSelector
          v-model="selectedPeriod"
          :periodicity="card.periodicity"
          :periods="availablePeriods"
        />
      </div>
    </template>

    <div v-if="!dataset.available" class="text-sm text-[var(--app-foreground-muted)]">
      Dataset tidak tersedia untuk dashboard ini.
    </div>
    <div v-else class="space-y-3">
      <div v-for="row in rows" :key="row.key">
        <p class="text-xs text-[var(--app-foreground-muted)]">
          {{ row.label }}
        </p>
        <p
          v-if="row.value !== null"
          class="mt-0.5 text-2xl font-semibold tracking-tight text-[var(--app-foreground)] tabular-nums"
        >
          {{ row.formatted }}
          <span class="ml-1 text-sm font-medium text-[var(--app-foreground-muted)]">
            {{ row.unit }}
          </span>
        </p>
        <p v-else class="mt-0.5 text-sm text-[var(--app-foreground-muted)]">
          Data belum tersedia
        </p>
      </div>
    </div>

    <template #footer>
      <DashboardCardSource :source="dataset.definition.source" />
    </template>
  </DashboardWidget>
</template>
