<script setup lang="ts">
import type { DashboardDatasetBundle } from '~~/shared/dashboard'

import { getDashboardAvailablePeriods, getDashboardNumericSchemaFields, readDashboardRecordNumber } from '~~/shared/dashboard'

import DashboardCardSource from '../../DashboardCardSource.vue'
import DashboardWidget from '../../DashboardWidget.vue'
import { hargaPriceRangeOptions, parseCommodityField, shiftIsoDate } from '../harga/commodityPrice'
import type { HargaPriceRangeKey } from '../harga/commodityPrice'

const props = defineProps<{ dataset: DashboardDatasetBundle, card: import('~~/shared/dashboard').DashboardFieldTimeSeriesCardDefinition }>()
const range = ref<HargaPriceRangeKey>('7H')
const fields = computed(() => getDashboardNumericSchemaFields(props.dataset.definition.dataSchema))
const days = computed(() => getDashboardAvailablePeriods(props.dataset.definition.coverage, props.card))
const formatter = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 })

const movements = computed(() => fields.value.map((field, order) => {
  const observations = props.dataset.records
    .map(record => ({ date: record.periodDate, value: readDashboardRecordNumber(record, field.key) }))
    .filter((point): point is { date: string, value: number } => point.value !== null)
    .sort((left, right) => left.date.localeCompare(right.date))
  const latest = observations.at(-1) ?? null
  const previous = observations.at(-2) ?? null
  const delta = latest && previous ? latest.value - previous.value : null
  const percent = delta === null || !previous || previous.value === 0 ? null : (delta / previous.value) * 100
  const rangeDays = hargaPriceRangeOptions.find(option => option.key === range.value)?.days ?? 7
  const start = latest ? shiftIsoDate(latest.date, -(rangeDays - 1)) : ''
  const points = days.value.filter(day => day >= start && latest && day <= latest.date).slice().reverse().map((date, index) => ({
    index,
    value: observations.find(point => point.date === date)?.value ?? Number.NaN
  }))

  return { field, order, latest, delta, percent, points }
}).filter(item => item.latest).sort((left, right) => {
  const leftScore = left.percent === null ? Math.abs(left.delta ?? 0) : Math.abs(left.percent)
  const rightScore = right.percent === null ? Math.abs(right.delta ?? 0) : Math.abs(right.percent)
  return rightScore - leftScore || left.order - right.order
}).slice(0, 4))
</script>

<template>
  <DashboardWidget compact>
    <template #header>
      <div class="flex w-full items-center justify-between gap-3">
        <div class="flex min-w-0 items-center gap-2">
          <UIcon name="i-lucide-store" class="size-4 shrink-0 text-[var(--app-foreground-soft)]" />
          <h2 class="truncate text-sm font-semibold text-[var(--app-foreground)]">
            Harga Pangan Harian
          </h2>
        </div>
        <div class="flex rounded-lg bg-[var(--app-surface-muted)] p-0.5" @click.stop>
          <UButton
            v-for="option in hargaPriceRangeOptions"
            :key="option.key"
            size="xs"
            color="neutral"
            :variant="range === option.key ? 'solid' : 'ghost'"
            @click="range = option.key"
          >
            {{ option.label }}
          </UButton>
        </div>
      </div>
    </template>

    <div v-if="!dataset.available || !movements.length" class="text-sm text-[var(--app-foreground-muted)]">
      Belum ada data harga untuk periode ini.
    </div>
    <div v-else class="space-y-2">
      <div v-for="item in movements" :key="item.field.key" class="grid grid-cols-[minmax(0,1fr)_4.5rem_auto] items-center gap-2 border-b border-[var(--app-border)] pb-2 last:border-0 last:pb-0">
        <div class="min-w-0">
          <p class="truncate text-sm font-medium text-[var(--app-foreground)]">
            {{ parseCommodityField(item.field).name }}
          </p>
          <p class="text-xs tabular-nums text-[var(--app-foreground-muted)]">
            Rp{{ formatter.format(item.latest!.value) }} {{ parseCommodityField(item.field).unitLabel }}
          </p>
        </div>
        <ChartsMiniTrendChart
          v-if="item.points.filter(point => Number.isFinite(point.value)).length >= 2"
          :data="item.points"
          color="#f97316"
          :height="30"
          class="h-8 w-full"
        />
        <span v-if="item.delta !== null" class="text-right text-xs font-medium tabular-nums" :class="item.delta > 0 ? 'text-warning' : item.delta < 0 ? 'text-success' : 'text-[var(--app-foreground-muted)]'">
          {{ item.percent === null ? `${item.delta > 0 ? '+' : ''}${formatter.format(item.delta)}` : `${item.percent > 0 ? '+' : ''}${item.percent.toFixed(1)}%` }}
        </span>
        <span v-else class="text-xs text-[var(--app-foreground-muted)]">—</span>
      </div>
    </div>
    <template #footer>
      <DashboardCardSource :source="dataset.definition.source" />
    </template>
  </DashboardWidget>
</template>
