<script setup lang="ts">
import type { DashboardDatasetBundle, DashboardDualKpiCardDefinition } from '~~/shared/dashboard'

import {
  getDashboardAvailablePeriods,
  getDashboardDatasetField,
  readDashboardRecordNumber
} from '~~/shared/dashboard'

const props = defineProps<{
  card: DashboardDualKpiCardDefinition
  dataset: DashboardDatasetBundle
}>()

const emit = defineEmits<{
  'open-detail': [periodDate: string | null]
}>()

const formatter = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 })
const selectedPeriod = ref('')
const availablePeriods = computed(() => getDashboardAvailablePeriods(props.dataset.definition.coverage, props.card))
const record = computed(() => props.dataset.records.find(item => item.periodDate === selectedPeriod.value))
const metrics = computed(() => props.card.fieldKeys.map((fieldKey) => {
  const field = getDashboardDatasetField(props.dataset.definition.dataSchema, fieldKey)
  const value = readDashboardRecordNumber(record.value, fieldKey)

  return {
    key: fieldKey,
    label: field?.label ?? fieldKey,
    unit: field?.unit,
    valueLabel: value === null ? 'Data belum tersedia' : formatter.format(value)
  }
}))
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
          <UIcon name="i-lucide-utensils" class="size-4 shrink-0 text-[var(--app-foreground-soft)]" />
          <h2 class="truncate text-sm font-semibold text-[var(--app-foreground)]">
            {{ card.title }}
          </h2>
        </div>
        <DashboardPeriodSelector v-model="selectedPeriod" :periodicity="card.periodicity" :periods="availablePeriods" />
      </div>
    </template>

    <div class="grid gap-3 sm:grid-cols-2">
      <div v-for="metric in metrics" :key="metric.key" class="min-w-0">
        <p class="text-xs text-[var(--app-foreground-muted)]">
          {{ metric.label }}
        </p>
        <p class="mt-1 text-2xl font-semibold tracking-tight text-[var(--app-foreground)]">
          {{ dataset.available ? metric.valueLabel : 'Dataset tidak tersedia' }}
        </p>
        <p v-if="metric.unit" class="text-xs text-[var(--app-foreground-muted)]">
          {{ metric.unit }}
        </p>
      </div>
    </div>

    <template #footer>
      <DashboardCardSource :source="dataset.definition.source" />
    </template>
  </DashboardWidget>
</template>
