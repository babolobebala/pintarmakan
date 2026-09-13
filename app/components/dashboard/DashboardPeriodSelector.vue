<script setup lang="ts">
import type { CanonicalDatasetPeriodicity } from '~~/shared/datasets'

import { formatDatasetPeriod } from '~~/shared/datasets'

const props = defineProps<{
  periodicity: CanonicalDatasetPeriodicity | null
  periods: readonly string[]
}>()

const selectedPeriod = defineModel<string>({ default: '' })

const periodLabels: Record<CanonicalDatasetPeriodicity, string> = {
  TAHUNAN: 'Tahun',
  BULANAN: 'Bulan',
  TRIWULANAN: 'Triwulan',
  HARIAN: 'Hari'
}
const periodLabel = computed(() => props.periodicity ? periodLabels[props.periodicity] : 'Periode')
const options = computed(() => props.periods.map(periodDate => ({
  value: periodDate,
  label: formatDatasetPeriod(props.periodicity, periodDate)
})))
const oldestPeriod = computed(() => props.periods.at(-1) ?? undefined)
const newestPeriod = computed(() => props.periods[0] ?? undefined)

function syncSelectedPeriod() {
  if (!props.periods.length) {
    selectedPeriod.value = ''
    return
  }

  if (!props.periods.includes(selectedPeriod.value)) {
    selectedPeriod.value = props.periods[0] ?? ''
  }
}

watch(() => props.periods, syncSelectedPeriod, { immediate: true })
watch(selectedPeriod, syncSelectedPeriod)
</script>

<template>
  <div class="inline-flex max-w-full items-center gap-1.5 rounded-[var(--radius-control)] border border-[var(--app-border)] bg-[var(--app-surface)] px-2 py-1">
    <span class="shrink-0 text-xs font-medium text-[var(--app-foreground-muted)]">{{ periodLabel }}</span>
    <div class="min-w-0" @click.stop @keydown.stop>
      <UInput
        v-if="periodicity === 'HARIAN'"
        v-model="selectedPeriod"
        type="date"
        leading-icon="i-lucide-calendar-days"
        size="sm"
        color="neutral"
        variant="outline"
        class="min-w-44 max-w-full"
        :min="oldestPeriod"
        :max="newestPeriod"
        :disabled="!periods.length"
        :aria-label="`Pilih ${periodLabel.toLocaleLowerCase('id-ID')}`"
        :ui="{
          base: 'min-h-9 cursor-pointer shadow-xs hover:bg-elevated focus-visible:ring-2 focus-visible:ring-primary/40'
        }"
      />
      <USelectMenu
        v-else
        v-model="selectedPeriod"
        :items="options"
        value-key="value"
        label-key="label"
        leading-icon="i-lucide-calendar-days"
        size="sm"
        color="neutral"
        variant="outline"
        class="min-w-36 max-w-full"
        :disabled="!options.length"
        :aria-label="`Pilih ${periodLabel.toLocaleLowerCase('id-ID')}`"
        :ui="{
          base: 'min-h-9 cursor-pointer shadow-xs hover:bg-elevated focus-visible:ring-2 focus-visible:ring-primary/40',
          value: 'font-medium whitespace-nowrap',
          trailingIcon: 'text-muted',
          item: 'cursor-pointer'
        }"
      />
    </div>
  </div>
</template>
