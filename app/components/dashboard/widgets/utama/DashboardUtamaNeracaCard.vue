<script setup lang="ts">
import type { DashboardDatasetBundle, DashboardNeracaTimeSeriesCardDefinition } from '~~/shared/dashboard'

import { getDashboardAvailablePeriods, readDashboardRecordNumber } from '~~/shared/dashboard'

import DashboardCardSource from '../../DashboardCardSource.vue'
import DashboardPeriodSelector from '../../DashboardPeriodSelector.vue'
import DashboardWidget from '../../DashboardWidget.vue'

const props = defineProps<{
  cards: readonly DashboardNeracaTimeSeriesCardDefinition[]
  datasets: Record<string, DashboardDatasetBundle>
}>()

const selectedPeriod = ref('')
const referenceCard = computed(() => props.cards[0] ?? null)
const referenceDataset = computed(() => referenceCard.value ? props.datasets[referenceCard.value.key] : undefined)
const periods = computed(() => referenceCard.value && referenceDataset.value
  ? getDashboardAvailablePeriods(referenceDataset.value.definition.coverage, referenceCard.value)
  : [])

watch(periods, (values) => {
  if (!values.includes(selectedPeriod.value)) {
    selectedPeriod.value = values[0] ?? ''
  }
}, { immediate: true })

const rows = computed(() => props.cards.map((card) => {
  const dataset = props.datasets[card.key]
  const record = dataset?.records.find(item => item.periodDate === selectedPeriod.value)
  const value = readDashboardRecordNumber(record, 'neraca')

  return {
    key: card.key,
    label: card.title.replace(/^Proyeksi Neraca /, ''),
    value
  }
}))
const surplus = computed(() => rows.value.filter(row => row.value !== null && row.value > 0).length)
const deficit = computed(() => rows.value.filter(row => row.value !== null && row.value < 0).length)
const balanced = computed(() => rows.value.filter(row => row.value === 0).length)
const unavailable = computed(() => rows.value.filter(row => row.value === null).length)
const attention = computed(() => rows.value
  .filter((row): row is typeof row & { value: number } => row.value !== null && row.value < 0)
  .sort((left, right) => left.value - right.value)
  .slice(0, 5))
const source = computed(() => referenceDataset.value?.definition.source ?? null)
const number = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 })
</script>

<template>
  <DashboardWidget compact>
    <template #header>
      <div class="flex w-full items-start justify-between gap-3">
        <div class="flex min-w-0 items-center gap-2">
          <UIcon name="i-lucide-scale" class="size-4 shrink-0 text-[var(--app-foreground-soft)]" />
          <h2 class="truncate text-sm font-semibold text-[var(--app-foreground)]">
            Neraca Pangan
          </h2>
        </div>
        <DashboardPeriodSelector v-model="selectedPeriod" periodicity="BULANAN" :periods="periods" />
      </div>
    </template>

    <div v-if="!selectedPeriod" class="text-sm text-[var(--app-foreground-muted)]">
      Belum ada data untuk periode ini.
    </div>
    <div v-else class="space-y-3">
      <div class="grid grid-cols-3 gap-2 text-center">
        <div class="rounded-lg bg-success/10 px-2 py-2">
          <p class="text-lg font-semibold tabular-nums text-success">
            {{ surplus }}
          </p>
          <p class="text-[0.68rem] text-[var(--app-foreground-muted)]">
            Surplus
          </p>
        </div>
        <div class="rounded-lg bg-error/10 px-2 py-2">
          <p class="text-lg font-semibold tabular-nums text-error">
            {{ deficit }}
          </p>
          <p class="text-[0.68rem] text-[var(--app-foreground-muted)]">
            Defisit
          </p>
        </div>
        <div class="rounded-lg bg-[var(--app-surface-muted)] px-2 py-2">
          <p class="text-lg font-semibold tabular-nums text-[var(--app-foreground)]">
            {{ balanced }}
          </p>
          <p class="text-[0.68rem] text-[var(--app-foreground-muted)]">
            Seimbang
          </p>
        </div>
      </div>

      <div class="space-y-2">
        <template v-if="attention.length">
          <p class="text-xs font-medium text-[var(--app-foreground-muted)]">
            Perlu perhatian
          </p>
          <div v-for="item in attention" :key="item.key" class="flex items-center justify-between gap-3 text-sm">
            <span class="min-w-0 truncate text-[var(--app-foreground)]">{{ item.label }}</span>
            <span class="shrink-0 font-medium tabular-nums text-error">{{ number.format(item.value) }} Ton</span>
          </div>
        </template>
        <p v-else class="text-sm text-success">
          Semua komoditas memiliki neraca non-defisit pada periode ini.
        </p>
        <p v-if="unavailable" class="text-xs text-[var(--app-foreground-muted)]">
          Belum tersedia: {{ unavailable }} komoditas
        </p>
      </div>
    </div>

    <template #footer>
      <DashboardCardSource :source="source" />
    </template>
  </DashboardWidget>
</template>
