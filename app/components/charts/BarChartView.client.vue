<script setup lang="ts">
import { VisAxis, VisStackedBar, VisTooltip, VisXYContainer } from '@unovis/vue'
import { computed } from 'vue'
import type { ChartAccessor } from './shared'
import { resolveChartColor, useUnovisStyles } from './shared'

useUnovisStyles()

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

const colorAccessor = computed(() => {
  const color = resolveChartColor(props.color, 0)
  return () => color
})
</script>

<template>
  <ChartsBaseChartPanel :title="title" :description="description">
    <VisXYContainer
      :data="data"
      :height="height"
      :padding="{ top: 8, right: 8, bottom: 8, left: 8 }"
      :margin="{ top: 8, right: 8, bottom: 28, left: 8 }"
      :aria-label="ariaLabel"
      :auto-margin="true"
    >
      <VisStackedBar
        :x="x"
        :y="y"
        :color="colorAccessor"
        :orientation="orientation"
        :rounded-corners="roundedCorners"
      />

      <VisAxis
        type="x"
        :label="xLabel"
        :tick-format="xTickFormat"
        :grid-line="false"
        :tick-line="false"
      />
      <VisAxis
        type="y"
        :label="yLabel"
        :tick-format="yTickFormat"
        :domain-line="false"
      />
      <VisTooltip v-if="showTooltip" />
    </VisXYContainer>
  </ChartsBaseChartPanel>
</template>
