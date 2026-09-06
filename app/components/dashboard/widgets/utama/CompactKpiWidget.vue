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

const formatter = new Intl.NumberFormat('id-ID', {
  maximumFractionDigits: 2
})

const availablePeriods = computed(() => getDashboardAvailablePeriods(props.dataset.definition.coverage, props.card))
const periodOptions = computed(() => availablePeriods.value.map(periodDate => ({
  value: periodDate,
  label: formatDatasetPeriod(props.dataset.definition.coverage?.periodicity ?? null, periodDate)
})))
const selectedPeriodValue = ref('')

watch(availablePeriods, (periods) => {
  if (!periods.length) {
    selectedPeriodValue.value = ''
    return
  }

  if (!periods.includes(selectedPeriodValue.value)) {
    selectedPeriodValue.value = periods[0] ?? ''
  }
}, { immediate: true })

const field = computed(() => getDashboardDatasetField(props.dataset.definition.dataSchema, props.card.fieldKey))
const selectedPeriodDate = computed(() => selectedPeriodValue.value || null)
const selectedPeriodLabel = computed(() => selectedPeriodDate.value
  ? formatDatasetPeriod(props.dataset.definition.coverage?.periodicity ?? null, selectedPeriodDate.value)
  : null)
const currentRecord = computed(() => props.dataset.records.find(
  record => record.periodDate === selectedPeriodDate.value
))
const previousPeriodDate = computed(() => getDashboardPreviousPeriod(
  availablePeriods.value,
  selectedPeriodDate.value
))
const previousPeriodLabel = computed(() => previousPeriodDate.value
  ? formatDatasetPeriod(props.dataset.definition.coverage?.periodicity ?? null, previousPeriodDate.value)
  : null)
const previousRecord = computed(() => props.dataset.records.find(
  record => record.periodDate === previousPeriodDate.value
))
const value = computed(() => readDashboardRecordNumber(currentRecord.value, field.value?.key ?? null))
const previousValue = computed(() => readDashboardRecordNumber(previousRecord.value, field.value?.key ?? null))
const delta = computed(() => {
  if (value.value === null || previousValue.value === null) {
    return null
  }

  return value.value - previousValue.value
})

const valueLabel = computed(() => {
  if (!props.dataset.available) {
    return 'Dataset tidak tersedia'
  }

  return value.value === null ? 'Data belum tersedia' : formatter.format(value.value)
})

const comparisonLine = computed(() => {
  if (delta.value === null || previousPeriodLabel.value === null || previousValue.value === null) {
    return null
  }

  const prefix = delta.value > 0 ? '+' : ''
  return `${prefix}${formatter.format(delta.value)} dari ${previousPeriodLabel.value} (${formatter.format(previousValue.value)})`
})

const deltaBadgeLabel = computed(() => {
  if (delta.value === null) {
    return null
  }

  const prefix = delta.value > 0 ? '+' : ''
  return `${prefix}${formatter.format(delta.value)}`
})

const trendMeta = computed(() => {
  if (delta.value === null) {
    return null
  }

  if (delta.value > 0) {
    return {
      icon: 'i-lucide-trending-up',
      color: props.card.badgeColor
    }
  }

  if (delta.value < 0) {
    return {
      icon: 'i-lucide-trending-down',
      color: 'warning' as const
    }
  }

  return {
    icon: 'i-lucide-minus',
    color: 'neutral' as const
  }
})
</script>

<template>
  <DashboardWidget
    interactive
    :activation-label="`Buka detail ${card.title}`"
    @activate="emit('open-detail', selectedPeriodDate)"
  >
    <template #header>
      <div class="flex w-full items-start justify-between gap-3">
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <UIcon :name="card.icon" class="size-4 shrink-0 text-[var(--app-foreground-soft)]" />
            <h2 class="truncate text-sm font-semibold text-[var(--app-foreground)]">
              {{ card.title }}
            </h2>
          </div>
        </div>

        <div @click.stop @keydown.stop>
          <USelectMenu
            v-model="selectedPeriodValue"
            :items="periodOptions"
            value-key="value"
            label-key="label"
            size="xs"
            color="neutral"
            variant="ghost"
            class="w-24 shrink-0"
            :disabled="!periodOptions.length"
          />
        </div>
      </div>
    </template>

    <div class="space-y-2">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div class="min-w-0">
          <p class="text-3xl font-semibold tracking-tight text-[var(--app-foreground)]">
            {{ valueLabel }}
          </p>
          <p v-if="field?.unit" class="text-xs text-[var(--app-foreground-muted)]">
            {{ field.unit }}
          </p>
        </div>

        <UBadge v-if="trendMeta && deltaBadgeLabel" :color="trendMeta.color" variant="subtle">
          <UIcon :name="trendMeta.icon" class="mr-1 size-3.5" />
          {{ deltaBadgeLabel }}
        </UBadge>
      </div>

      <p v-if="comparisonLine" class="text-xs leading-5 text-[var(--app-foreground-muted)]">
        {{ comparisonLine }}
      </p>
      <p v-else-if="!dataset.available" class="text-xs leading-5 text-[var(--app-foreground-muted)]">
        Dataset tidak tersedia untuk dashboard ini.
      </p>
      <p v-else-if="selectedPeriodLabel" class="text-xs leading-5 text-[var(--app-foreground-muted)]">
        {{ value === null ? `Data ${selectedPeriodLabel} belum tersedia.` : 'Belum ada data pembanding.' }}
      </p>
      <p v-else class="text-xs leading-5 text-[var(--app-foreground-muted)]">
        Periode Dataset belum tersedia.
      </p>
    </div>
  </DashboardWidget>
</template>
