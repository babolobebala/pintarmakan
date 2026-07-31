<script setup lang="ts">
import type { ChartAccessor } from './shared'

type Datum = Record<string, unknown>
type TickFormatter = (tick: number | Date, index: number, ticks: Array<number | Date>) => string

const props = withDefaults(defineProps<{
  data: Datum[]
  x: ChartAccessor<Datum, number>
  y: ChartAccessor<Datum, number>
  title?: string
  description?: string
  height?: number | string
  color?: string
  orientation?: 'vertical' | 'horizontal'
  xLabel?: string
  yLabel?: string
  xTickFormat?: TickFormatter
  yTickFormat?: TickFormatter
  showTooltip?: boolean
  roundedCorners?: boolean | number
  ariaLabel?: string
}>(), {
  title: undefined,
  description: undefined,
  height: 320,
  color: undefined,
  orientation: 'vertical',
  xLabel: undefined,
  yLabel: undefined,
  xTickFormat: undefined,
  yTickFormat: undefined,
  showTooltip: true,
  roundedCorners: 6,
  ariaLabel: undefined
})
</script>

<template>
  <ClientOnly>
    <ChartsBarChartView v-bind="props" />

    <template #fallback>
      <ChartsBaseChartPanel :title="title" :description="description">
        <div class="h-[320px] rounded-2xl border border-dashed border-default bg-muted/30" />
      </ChartsBaseChartPanel>
    </template>
  </ClientOnly>
</template>
