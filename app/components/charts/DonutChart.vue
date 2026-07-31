<script setup lang="ts">
import type { ChartAccessor } from './shared'

type Datum = Record<string, unknown>

const props = withDefaults(defineProps<{
  data: Datum[]
  value: ChartAccessor<Datum, number>
  label: ChartAccessor<Datum, string>
  title?: string
  description?: string
  height?: number | string
  colors?: string[]
  arcWidth?: number
  padAngle?: number
  cornerRadius?: number
  centralLabel?: string
  centralSubLabel?: string
  showLegend?: boolean
  ariaLabel?: string
}>(), {
  title: undefined,
  description: undefined,
  height: 320,
  colors: () => [],
  arcWidth: 36,
  padAngle: 0.02,
  cornerRadius: 8,
  centralLabel: undefined,
  centralSubLabel: undefined,
  showLegend: true,
  ariaLabel: undefined
})
</script>

<template>
  <ClientOnly>
    <ChartsDonutChartView v-bind="props" />

    <template #fallback>
      <ChartsBaseChartPanel :title="title" :description="description">
        <div class="h-[320px] rounded-2xl border border-dashed border-default bg-muted/30" />
      </ChartsBaseChartPanel>
    </template>
  </ClientOnly>
</template>
