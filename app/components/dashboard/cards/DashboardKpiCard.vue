<script setup lang="ts">
import type { DashboardDatasetBundle, DashboardKpiCardDefinition } from '~~/shared/dashboard'

import {
  getDashboardAvailablePeriods,
  getDashboardDatasetField,
  getDashboardPreviousPeriod,
  readDashboardRecordNumber
} from '~~/shared/dashboard'
import { formatDatasetPeriod } from '~~/shared/datasets'

const props = defineProps<{
  card: DashboardKpiCardDefinition
  dataset: DashboardDatasetBundle
}>()

const emit = defineEmits<{
  'open-detail': [periodDate: string | null]
}>()

const formatter = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 })
const selectedPeriod = ref('')
const availablePeriods = computed(() => getDashboardAvailablePeriods(props.dataset.definition.coverage, props.card))
const field = computed(() => getDashboardDatasetField(props.dataset.definition.dataSchema, props.card.fieldKey))
const currentRecord = computed(() => props.dataset.records.find(record => record.periodDate === selectedPeriod.value))
const previousPeriod = computed(() => getDashboardPreviousPeriod(availablePeriods.value, selectedPeriod.value))
const previousRecord = computed(() => props.dataset.records.find(record => record.periodDate === previousPeriod.value))
const value = computed(() => readDashboardRecordNumber(currentRecord.value, field.value?.key ?? null))
const previousValue = computed(() => readDashboardRecordNumber(previousRecord.value, field.value?.key ?? null))
const delta = computed(() => value.value === null || previousValue.value === null
  ? null
  : value.value - previousValue.value)
const periodLabel = computed(() => selectedPeriod.value
  ? formatDatasetPeriod(props.card.periodicity, selectedPeriod.value)
  : null)
const valueLabel = computed(() => !props.dataset.available
  ? 'Dataset tidak tersedia'
  : value.value === null ? 'Data belum tersedia' : formatter.format(value.value))
const deltaLabel = computed(() => {
  if (delta.value === null || !previousPeriod.value) {
    return null
  }

  const prefix = delta.value > 0 ? '+' : ''
  return `${prefix}${formatter.format(delta.value)} dari ${formatDatasetPeriod(props.card.periodicity, previousPeriod.value)}`
})
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
          <UIcon :name="card.icon" class="size-4 shrink-0 text-[var(--app-foreground-soft)]" />
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

    <div class="space-y-2">
      <p class="text-3xl font-semibold tracking-tight text-[var(--app-foreground)]">
        {{ valueLabel }}
      </p>
      <p v-if="field?.unit" class="text-xs text-[var(--app-foreground-muted)]">
        {{ field.unit }}
      </p>
      <p class="text-xs leading-5 text-[var(--app-foreground-muted)]">
        {{ deltaLabel ?? (periodLabel ? value === null ? `Data ${periodLabel} belum tersedia.` : 'Belum ada data pembanding.' : 'Periode Dataset belum tersedia.') }}
      </p>
    </div>

    <template #footer>
      <DashboardCardSource :source="dataset.definition.source" />
    </template>
  </DashboardWidget>
</template>
