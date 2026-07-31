<script setup lang="ts">
import { VisDonut, VisSingleContainer } from '@unovis/vue'
import { computed } from 'vue'
import type { ChartAccessor } from './shared'
import { resolveChartColor, sumBy, useUnovisStyles } from './shared'

useUnovisStyles()

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

const total = computed(() => sumBy(props.data, props.value))

const colorAccessor = (datum: Datum, index: number) => {
  return resolveChartColor(props.colors[index], index)
}

const legendItems = computed(() => {
  return props.data.map((item, index) => ({
    label: props.label(item, index),
    color: colorAccessor(item, index)
  }))
})

const resolvedCentralLabel = computed(() => {
  return props.centralLabel ?? total.value.toLocaleString('id-ID')
})

const resolvedCentralSubLabel = computed(() => {
  return props.centralSubLabel ?? 'Total'
})
</script>

<template>
  <ChartsBaseChartPanel :title="title" :description="description">
    <template #actions>
      <ChartsLegend
        v-if="showLegend"
        :items="legendItems"
      />
    </template>

    <VisSingleContainer
      :data="data"
      :height="height"
      :padding="{ top: 8, right: 8, bottom: 8, left: 8 }"
      :aria-label="ariaLabel"
    >
      <VisDonut
        :value="value"
        :color="colorAccessor"
        :arc-width="arcWidth"
        :pad-angle="padAngle"
        :corner-radius="cornerRadius"
        :central-label="resolvedCentralLabel"
        :central-sub-label="resolvedCentralSubLabel"
      />
    </VisSingleContainer>
  </ChartsBaseChartPanel>
</template>
