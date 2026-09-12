<script setup lang="ts">
import type {
  DashboardCpmCardKey,
  DashboardDatasetBundle,
  DashboardTabularMonthSeriesCardDefinition
} from '~~/shared/dashboard'

import { getDashboardAvailablePeriods, readDashboardRecordNumber } from '~~/shared/dashboard'

import DashboardCardSource from '../../DashboardCardSource.vue'
import DashboardPeriodSelector from '../../DashboardPeriodSelector.vue'
import DashboardWidget from '../../DashboardWidget.vue'

const props = defineProps<{
  cards: readonly DashboardTabularMonthSeriesCardDefinition[]
  datasets: Record<DashboardCpmCardKey, DashboardDatasetBundle>
}>()
const selectedPeriod = ref('')
const firstCard = computed(() => props.cards[0] ?? null)
const periods = computed(() => firstCard.value ? getDashboardAvailablePeriods(props.datasets[firstCard.value.key].definition.coverage, firstCard.value) : [])
watch(periods, (values) => {
  if (!values.includes(selectedPeriod.value)) {
    selectedPeriod.value = values[0] ?? ''
  }
}, { immediate: true })

const summaries = computed(() => props.cards.map((card) => {
  const dataset = props.datasets[card.key]
  const rows = dataset.tableRecords.filter(record => record.periodDate === selectedPeriod.value)
  const points = card.monthFieldKeys.map((fieldKey, index) => {
    const values = rows.map(row => readDashboardRecordNumber(row, fieldKey)).filter((value): value is number => value !== null)
    return { index, value: values.length ? values.reduce((sum, value) => sum + value, 0) : Number.NaN }
  })
  const latest = [...points].reverse().find(point => Number.isFinite(point.value))?.value ?? null
  return {
    key: card.key,
    label: card.key === 'cpm-gabah' ? 'CPM Gabah' : 'CPM Jagung',
    icon: card.key === 'cpm-gabah' ? 'i-lucide-wheat' : 'i-lucide-sprout',
    dataset,
    points,
    latest
  }
}))
const number = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 })
const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const source = computed(() => [...new Set(summaries.value
  .map(summary => summary.dataset.definition.source)
  .filter((value): value is string => Boolean(value)))].join(' · ') || null)
</script>

<template>
  <DashboardWidget compact>
    <template #header>
      <div class="flex w-full items-center justify-between gap-3">
        <div class="flex min-w-0 items-center gap-2">
          <UIcon name="i-lucide-package-open" class="size-4 shrink-0 text-[var(--app-foreground-soft)]" /><h2 class="truncate text-sm font-semibold text-[var(--app-foreground)]">
            Stok Pangan Masyarakat
          </h2>
        </div><DashboardPeriodSelector v-model="selectedPeriod" periodicity="TAHUNAN" :periods="periods" />
      </div>
    </template>
    <div v-if="!selectedPeriod" class="text-sm text-[var(--app-foreground-muted)]">
      Belum ada data untuk periode ini.
    </div>
    <div v-else class="grid gap-2 sm:grid-cols-2">
      <div v-for="summary in summaries" :key="summary.key" class="min-w-0 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-muted)] px-2.5 py-2">
        <div class="flex min-w-0 items-center gap-1.5">
          <span class="flex size-6 shrink-0 items-center justify-center rounded-md bg-success/10 text-success">
            <UIcon :name="summary.icon" class="size-4" />
          </span>
          <p class="truncate text-xs font-medium text-[var(--app-foreground-muted)]">
            {{ summary.label }}
          </p>
        </div>
        <p v-if="summary.latest !== null" class="mt-1 text-lg font-semibold tabular-nums text-[var(--app-foreground)]">
          {{ number.format(summary.latest) }} <span class="text-xs font-medium text-[var(--app-foreground-muted)]">Ton</span>
        </p>
        <p v-else class="mt-1 text-sm text-[var(--app-foreground-muted)]">
          Data belum tersedia
        </p>
        <ChartsMiniTrendChart
          v-if="summary.points.filter(point => Number.isFinite(point.value)).length >= 2"
          :data="summary.points"
          color="#16a34a"
          :height="38"
          class="mt-1 h-10 w-full"
        />
        <p v-else class="mt-2 text-xs text-[var(--app-foreground-muted)]">
          Tren belum cukup
        </p>
        <div class="mt-1 hidden grid-cols-12 gap-px text-center text-[0.55rem] text-[var(--app-foreground-muted)] lg:grid">
          <span v-for="month in monthLabels" :key="month">{{ month }}</span>
        </div>
      </div>
    </div>
    <template #footer>
      <DashboardCardSource :source="source" />
    </template>
  </DashboardWidget>
</template>
