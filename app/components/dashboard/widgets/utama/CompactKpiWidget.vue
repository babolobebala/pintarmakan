<script setup lang="ts">
import type { DashboardDatasetBundle } from '~~/shared/dashboard'

import {
  filterDashboardRecordsByYear,
  findDashboardPreviousYear,
  getDashboardAvailableYears,
  getDashboardDatasetField,
  readDashboardRecordNumber,
  resolveDashboardDefaultYear
} from '~~/shared/dashboard'

const props = defineProps<{
  dataset: DashboardDatasetBundle
  icon: string
  badgeColor?: 'success' | 'info' | 'warning' | 'neutral'
}>()

const formatter = new Intl.NumberFormat('id-ID', {
  maximumFractionDigits: 2
})

const availableYears = computed(() => getDashboardAvailableYears(props.dataset.records))
const yearOptions = computed(() => availableYears.value.map(year => String(year)))
const selectedYearValue = ref('')

watch(yearOptions, (options) => {
  if (!options.length) {
    selectedYearValue.value = ''
    return
  }

  if (!options.includes(selectedYearValue.value)) {
    selectedYearValue.value = String(resolveDashboardDefaultYear(props.dataset.records) ?? '')
  }
}, { immediate: true })

const selectedYear = computed(() => {
  return selectedYearValue.value ? Number(selectedYearValue.value) : null
})

const field = computed(() => getDashboardDatasetField(props.dataset.definition.dataSchema, 'value'))
const currentRecord = computed(() => filterDashboardRecordsByYear(props.dataset.records, selectedYear.value)[0])
const previousYear = computed(() => findDashboardPreviousYear(props.dataset.records, selectedYear.value))
const previousRecord = computed(() => filterDashboardRecordsByYear(props.dataset.records, previousYear.value)[0])
const value = computed(() => readDashboardRecordNumber(currentRecord.value, field.value?.key ?? null))
const previousValue = computed(() => readDashboardRecordNumber(previousRecord.value, field.value?.key ?? null))
const delta = computed(() => {
  if (value.value === null || previousValue.value === null) {
    return null
  }

  return value.value - previousValue.value
})

const valueLabel = computed(() => {
  return value.value === null ? 'Data belum tersedia' : formatter.format(value.value)
})

const comparisonLine = computed(() => {
  if (delta.value === null || previousYear.value === null || previousValue.value === null) {
    return null
  }

  const prefix = delta.value > 0 ? '+' : ''
  return `${prefix}${formatter.format(delta.value)} dari ${previousYear.value} (${formatter.format(previousValue.value)})`
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
      color: props.badgeColor ?? 'success'
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
  <DashboardWidget>
    <template #header>
      <div class="flex w-full items-start justify-between gap-3">
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <UIcon :name="icon" class="size-4 shrink-0 text-[var(--app-foreground-soft)]" />
            <h2 class="truncate text-sm font-semibold text-[var(--app-foreground)]">
              {{ dataset.definition.name }}
            </h2>
          </div>
        </div>

        <USelectMenu
          v-model="selectedYearValue"
          :items="yearOptions"
          size="xs"
          color="neutral"
          variant="ghost"
          class="w-24 shrink-0"
          :disabled="!yearOptions.length"
        />
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
      <p v-else-if="selectedYear" class="text-xs leading-5 text-[var(--app-foreground-muted)]">
        {{ value === null ? `Data tahun ${selectedYear} belum tersedia.` : 'Belum ada data pembanding.' }}
      </p>
      <p v-else class="text-xs leading-5 text-[var(--app-foreground-muted)]">
        Belum ada data tahunan.
      </p>
    </div>
  </DashboardWidget>
</template>
