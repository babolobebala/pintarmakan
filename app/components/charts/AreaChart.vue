<script setup lang="ts">
import type { ChartAccessor, CartesianChartSeries } from './shared'

type Datum = Record<string, unknown>
type TickFormatter = (tick: number | Date, index: number, ticks: Array<number | Date>) => string

const props = withDefaults(defineProps<{
  data: Datum[]
  x: ChartAccessor<Datum, number>
  series: CartesianChartSeries<Datum>[]
  title?: string
  description?: string
  height?: number | string
  xLabel?: string
  yLabel?: string
  xTickFormat?: TickFormatter
  yTickFormat?: TickFormatter
  showLegend?: boolean
  showTooltip?: boolean
  showLineOverlay?: boolean
  ariaLabel?: string
}>(), {
  title: undefined,
  description: undefined,
  height: 320,
  xLabel: undefined,
  yLabel: undefined,
  xTickFormat: undefined,
  yTickFormat: undefined,
  showLegend: true,
  showTooltip: true,
  showLineOverlay: true,
  ariaLabel: undefined
})
</script>

<template>
  <ClientOnly>
    <ChartsAreaChartView v-bind="props" />

    <template #fallback>
      <ChartsBaseChartPanel :title="title" :description="description">
        <div class="h-[320px] rounded-2xl border border-dashed border-default bg-muted/30" />
      </ChartsBaseChartPanel>
    </template>
  </ClientOnly>
</template>
