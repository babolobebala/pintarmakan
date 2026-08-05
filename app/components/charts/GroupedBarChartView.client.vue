<script setup lang="ts">
import { VisAxis, VisGroupedBar, VisTooltip, VisXYContainer } from '@unovis/vue'
import { computed } from 'vue'
import type { ChartAccessor, CartesianChartSeries } from './shared'
import { buildLegendItems, resolveChartColor, useUnovisStyles } from './shared'

useUnovisStyles()

type Datum = Record<string, unknown>
type TickFormatter = (tick: number | Date, index: number, ticks: Array<number | Date>) => string

const props = withDefaults(defineProps<{
  data: Datum[]
  x: ChartAccessor<Datum, number>
  series: CartesianChartSeries<Datum>[]
  title?: string
  description?: string
  height?: number | string
  orientation?: 'vertical' | 'horizontal'
  xLabel?: string
  yLabel?: string
  xTickFormat?: TickFormatter
  yTickFormat?: TickFormatter
  showLegend?: boolean
  showTooltip?: boolean
  roundedCorners?: boolean | number
  ariaLabel?: string
}>(), {
  title: undefined,
  description: undefined,
  height: 320,
  orientation: 'vertical',
  xLabel: undefined,
  yLabel: undefined,
  xTickFormat: undefined,
  yTickFormat: undefined,
  showLegend: true,
  showTooltip: true,
  roundedCorners: 6,
  ariaLabel: undefined
})

const seriesAccessors = computed(() => props.series.map(item => item.y))
const seriesColors = computed<string[]>(() => props.series.map((item, index) => resolveChartColor(item.color, index)))
const legendItems = computed(() => buildLegendItems(props.series))
</script>

<template>
  <ChartsBaseChartPanel :title="title" :description="description">
    <template #actions>
      <ChartsLegend
        v-if="showLegend && legendItems.length > 1"
        :items="legendItems"
      />
    </template>

    <VisXYContainer
      :data="data"
      :height="height"
      :padding="{ top: 8, right: 8, bottom: 8, left: 8 }"
      :margin="{ top: 8, right: 8, bottom: 28, left: 8 }"
      :aria-label="ariaLabel"
      :auto-margin="true"
    >
      <VisGroupedBar
        :x="x"
        :y="seriesAccessors"
        :color="seriesColors"
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
