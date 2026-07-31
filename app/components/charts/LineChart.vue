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
  xTickValues?: number[]
  yTickValues?: number[]
  xDomain?: [number | undefined, number | undefined]
  yDomain?: [number | undefined, number | undefined]
  showLegend?: boolean
  showTooltip?: boolean
  ariaLabel?: string
}>(), {
  title: undefined,
  description: undefined,
  height: 320,
  xLabel: undefined,
  yLabel: undefined,
  xTickFormat: undefined,
  yTickFormat: undefined,
  xTickValues: undefined,
  yTickValues: undefined,
  xDomain: undefined,
  yDomain: undefined,
  showLegend: true,
  showTooltip: true,
  ariaLabel: undefined
})
</script>

<template>
  <ClientOnly>
    <ChartsLineChartView v-bind="props" />

    <template #fallback>
      <ChartsBaseChartPanel :title="title" :description="description">
        <div class="h-[320px] rounded-2xl border border-dashed border-default bg-muted/30" />
      </ChartsBaseChartPanel>
    </template>
  </ClientOnly>
</template>
