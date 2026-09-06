<script setup lang="ts">
import type { CanonicalDatasetPeriodicity } from '~~/shared/datasets'

import { formatDatasetPeriod } from '~~/shared/datasets'

const props = defineProps<{
  periodicity: CanonicalDatasetPeriodicity | null
  periods: readonly string[]
}>()

const selectedPeriod = defineModel<string>({ default: '' })

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
  <div @click.stop @keydown.stop>
    <UInput
      v-if="periodicity === 'HARIAN'"
      v-model="selectedPeriod"
      type="date"
      size="xs"
      color="neutral"
      variant="ghost"
      class="w-36"
      :min="oldestPeriod"
      :max="newestPeriod"
      :disabled="!periods.length"
      aria-label="Pilih periode harian"
    />
    <USelectMenu
      v-else
      v-model="selectedPeriod"
      :items="options"
      value-key="value"
      label-key="label"
      size="xs"
      color="neutral"
      variant="ghost"
      class="w-32"
      :disabled="!options.length"
      :aria-label="periodicity === 'BULANAN' ? 'Pilih bulan' : 'Pilih tahun'"
    />
  </div>
</template>
