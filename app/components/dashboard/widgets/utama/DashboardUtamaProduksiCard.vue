<script setup lang="ts">
import type { DashboardDatasetBundle, DashboardUtamaPayload } from '~~/shared/dashboard'

import { dashboardProduksiCardDefinitions, getDashboardAvailablePeriods, getDashboardNumericSchemaFields, sumDashboardRecordFields } from '~~/shared/dashboard'

import DashboardCardSource from '../../DashboardCardSource.vue'
import DashboardPeriodSelector from '../../DashboardPeriodSelector.vue'
import DashboardWidget from '../../DashboardWidget.vue'

const props = defineProps<{ payload: DashboardUtamaPayload }>()
const selectedPeriod = ref('')
const firstCard = dashboardProduksiCardDefinitions[0]!
const periods = computed(() => getDashboardAvailablePeriods(props.payload.cards[firstCard.key].definition.coverage, firstCard))

watch(periods, (values) => {
  if (!values.includes(selectedPeriod.value)) selectedPeriod.value = values[0] ?? ''
}, { immediate: true })

const metricDefinitions = [
  ['produksi-padi', 'Padi', 'produksi', 'Ton', 'i-lucide-wheat'],
  ['produksi-jagung', 'Jagung', 'produksi', 'Ton', 'i-lucide-sprout'],
  ['produksi-daging-hewan-ternak', 'Daging', null, 'Kg', 'i-lucide-beef'],
  ['produksi-telur-unggas', 'Telur', null, 'Butir', 'i-lucide-egg'],
  ['produksi-buah-buahan', 'Buah', null, 'Kuintal', 'i-lucide-apple'],
  ['produksi-sayur-sayuran', 'Sayur', null, 'Kuintal', 'i-lucide-leaf']
] as const

function total(dataset: DashboardDatasetBundle, fieldKey: string | null) {
  const records = dataset.records.filter(record => record.periodDate === selectedPeriod.value)
  const keys = fieldKey ? [fieldKey] : getDashboardNumericSchemaFields(dataset.definition.dataSchema).map(field => field.key)
  return sumDashboardRecordFields(records, keys)
}

const metrics = computed(() => metricDefinitions.map(([key, label, fieldKey, unit, icon]) => ({
  key,
  label,
  unit,
  icon,
  value: total(props.payload.cards[key], fieldKey)
})))
const sources = computed(() => [...new Set(dashboardProduksiCardDefinitions
  .map(card => props.payload.cards[card.key].definition.source)
  .filter((source): source is string => Boolean(source)))].join(' · ') || null)
const number = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 })
</script>

<template>
  <DashboardWidget compact>
    <template #header>
      <div class="flex w-full items-center justify-between gap-3">
        <div class="flex min-w-0 items-center gap-2">
          <UIcon name="i-lucide-wheat" class="size-4 shrink-0 text-[var(--app-foreground-soft)]" /><h2 class="truncate text-sm font-semibold text-[var(--app-foreground)]">
            Produksi Pangan
          </h2>
        </div>
        <DashboardPeriodSelector v-model="selectedPeriod" periodicity="TAHUNAN" :periods="periods" />
      </div>
    </template>
    <div v-if="!selectedPeriod" class="text-sm text-[var(--app-foreground-muted)]">
      Belum ada data untuk periode ini.
    </div>
    <div v-else class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
      <div v-for="metric in metrics" :key="metric.key" class="min-w-0 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-muted)] px-2.5 py-2">
        <div class="flex min-w-0 items-center gap-1.5">
          <span class="flex size-5 shrink-0 items-center justify-center rounded-md bg-success/10 text-success">
            <UIcon :name="metric.icon" class="size-3.5" />
          </span>
          <p class="truncate text-[0.68rem] font-medium text-[var(--app-foreground-muted)]">
            {{ metric.label }}
          </p>
        </div>
        <p v-if="metric.value !== null" class="mt-1 whitespace-normal break-words text-sm font-semibold tabular-nums text-[var(--app-foreground)]">
          {{ number.format(metric.value) }} <span class="text-[0.68rem] font-medium text-[var(--app-foreground-muted)]">{{ metric.unit }}</span>
        </p>
        <p v-else class="mt-1 text-sm text-[var(--app-foreground-muted)]">
          —
        </p>
      </div>
    </div>
    <template #footer>
      <DashboardCardSource :source="sources" />
    </template>
  </DashboardWidget>
</template>
