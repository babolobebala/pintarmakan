<script setup lang="ts">
import { VisAxis, VisLine, VisTooltip, VisXYContainer } from '@unovis/vue'
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

const normalizedSeries = computed(() => {
  return props.series.map((item, index) => ({
    ...item,
    colorValue: resolveChartColor(item.color, index),
    colorAccessor: () => resolveChartColor(item.color, index)
  }))
})

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
      :x-domain="xDomain"
      :y-domain="yDomain"
      :aria-label="ariaLabel"
      :auto-margin="true"
    >
      <VisLine
        v-for="item in normalizedSeries"
        :key="item.key"
        :x="x"
        :y="item.y"
        :color="item.colorAccessor"
      />

      <VisAxis
        type="x"
        :label="xLabel"
        :tick-format="xTickFormat"
        :tick-values="xTickValues"
        :grid-line="false"
        :tick-line="false"
      />
      <VisAxis
        type="y"
        :label="yLabel"
        :tick-format="yTickFormat"
        :tick-values="yTickValues"
        :domain-line="false"
      />
      <VisTooltip v-if="showTooltip" />
    </VisXYContainer>
  </ChartsBaseChartPanel>
</template>
