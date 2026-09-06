<script setup lang="ts">
import type { DashboardDatasetBundle } from '~~/shared/dashboard'
import type { DatasetSchemaField } from '~~/shared/datasets'

import { readDashboardRecordNumber } from '~~/shared/dashboard'
import { formatDatasetPeriod } from '~~/shared/datasets'

import {
  formatChangePercent,
  formatRupiah,
  getHargaPriceRangeOption,
  parseCommodityField,
  shiftIsoDate
} from './commodityPrice'
import type { HargaPriceRangeKey } from './commodityPrice'

const props = defineProps<{
  field: DatasetSchemaField
  dataset: DashboardDatasetBundle
  /** Effective HARIAN coverage days, newest first. */
  days: readonly string[]
  range: HargaPriceRangeKey
}>()

const emit = defineEmits<{
  'open-detail': [periodDate: string | null]
}>()

const parsed = parseCommodityField(props.field)

const observations = computed(() => {
  const map = new Map<string, number>()

  for (const record of props.dataset.records) {
    const value = readDashboardRecordNumber(record, props.field.key)

    if (value !== null) {
      map.set(record.periodDate, value)
    }
  }

  return map
})
const observationDates = computed(() => [...observations.value.keys()].sort())
const latestDate = computed(() => {
  const dates = observationDates.value
  return dates.length ? dates[dates.length - 1] ?? null : null
})
const previousDate = computed(() => {
  const dates = observationDates.value
  return dates.length > 1 ? dates[dates.length - 2] ?? null : null
})
const latestValue = computed(() => latestDate.value === null
  ? null
  : observations.value.get(latestDate.value) ?? null)
const previousValue = computed(() => previousDate.value === null
  ? null
  : observations.value.get(previousDate.value) ?? null)
const delta = computed(() => latestValue.value === null || previousValue.value === null
  ? null
  : latestValue.value - previousValue.value)

const changeText = computed(() => {
  if (delta.value === null || latestValue.value === null) {
    return null
  }

  const deltaText = delta.value > 0 ? `+${formatRupiah(delta.value)}` : formatRupiah(delta.value)
  const percent = previousValue.value === 0
    ? null
    : (delta.value / (previousValue.value ?? 1)) * 100
  const percentText = percent === null
    ? '—'
    : percent > 0 ? `+${formatChangePercent(percent)}` : formatChangePercent(percent)

  return `${deltaText} (${percentText}%)`
})

const changeTone = computed<'positive' | 'negative' | 'neutral' | null>(() => {
  if (delta.value === null) {
    return null
  }

  return delta.value > 0 ? 'positive' : delta.value < 0 ? 'negative' : 'neutral'
})

const changeBadge = computed(() => {
  if (!changeTone.value) {
    return null
  }

  if (changeTone.value === 'positive') {
    return { icon: 'i-lucide-arrow-up-right', color: 'success' as const }
  }

  if (changeTone.value === 'negative') {
    return { icon: 'i-lucide-arrow-down-right', color: 'error' as const }
  }

  return { icon: 'i-lucide-minus', color: 'neutral' as const }
})

const rangeOption = computed(() => getHargaPriceRangeOption(props.range))

/** Trailing calendar window ending at the latest observation for this commodity. */
const windowDates = computed(() => {
  if (!latestDate.value) {
    return []
  }

  const startDate = shiftIsoDate(latestDate.value, -(rangeOption.value.days - 1))

  return props.days
    .filter(periodDate => periodDate >= startDate && periodDate <= latestDate.value!)
    .slice()
    .reverse()
})

const sparkData = computed(() => windowDates.value.map((periodDate, index) => ({
  index,
  value: observations.value.get(periodDate) ?? Number.NaN
})))
const sparkValueCount = computed(() => windowDates.value.reduce(
  (count, periodDate) => count + (observations.value.has(periodDate) ? 1 : 0),
  0
))
const hasSparkline = computed(() => sparkValueCount.value >= 2)

const priceText = computed(() => latestValue.value === null ? null : formatRupiah(latestValue.value))
const observationDateText = computed(() => latestDate.value
  ? formatDatasetPeriod('HARIAN', latestDate.value)
  : null)

function activate() {
  emit('open-detail', latestDate.value)
}
</script>

<template>
  <DashboardWidget
    interactive
    :activation-label="`Buka detail ${parsed.name}`"
    @activate="activate"
  >
    <template #header>
      <div class="flex w-full items-center gap-2">
        <UIcon name="i-lucide-tag" class="size-4 shrink-0 text-[var(--app-foreground-soft)]" />
        <h2 class="truncate text-sm font-semibold text-[var(--app-foreground)]">
          {{ parsed.name }}
        </h2>
      </div>
    </template>

    <div class="flex items-center gap-3">
      <div class="min-w-0 flex-1 space-y-1.5">
        <p v-if="priceText !== null" class="text-xl font-semibold tabular-nums text-[var(--app-foreground)]">
          Rp{{ priceText }}
          <span class="ml-1 text-xs font-medium text-[var(--app-foreground-muted)]">
            {{ parsed.unitLabel }}
          </span>
        </p>
        <p v-else class="text-sm text-[var(--app-foreground-muted)]">
          Data belum tersedia
        </p>

        <UBadge
          v-if="changeBadge && changeText"
          :color="changeBadge.color"
          variant="subtle"
        >
          <UIcon :name="changeBadge.icon" class="mr-1 size-3" />
          {{ changeText }}
        </UBadge>
        <p v-else-if="latestValue !== null" class="text-xs text-[var(--app-foreground-muted)]">
          Belum ada data pembanding
        </p>
      </div>

      <div
        class="flex h-14 w-24 shrink-0 items-center sm:w-32"
        @click.stop
        @keydown.stop
      >
        <ChartsMiniTrendChart
          v-if="hasSparkline"
          :data="sparkData"
          color="#2563eb"
          :height="56"
          class="h-full w-full"
        />
        <p v-else class="text-[0.65rem] leading-4 text-[var(--app-foreground-muted)]">
          {{ latestDate ? 'Riwayat singkat' : 'Belum ada riwayat' }}
        </p>
      </div>
    </div>

    <p v-if="observationDateText" class="mt-1 text-xs text-[var(--app-foreground-muted)]">
      {{ observationDateText }}
    </p>

    <template #footer>
      <DashboardCardSource :source="dataset.definition.source" />
    </template>
  </DashboardWidget>
</template>

