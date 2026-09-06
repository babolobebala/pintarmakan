<script setup lang="ts">
import { VisLine, VisXYContainer } from '@unovis/vue'

import { useUnovisStyles } from './shared'

useUnovisStyles()

type TrendPoint = {
  index: number
  value: number
}

const props = withDefaults(defineProps<{
  data: TrendPoint[]
  color?: string
  height?: number
  ariaLabel?: string
}>(), {
  color: '#2563eb',
  height: 64,
  ariaLabel: 'Tren indikator'
})

const xAccessor = (point: TrendPoint) => point.index
const yAccessor = (point: TrendPoint) => point.value
const colorAccessor = () => props.color
</script>

<template>
  <VisXYContainer
    :data="data"
    :height="height"
    :padding="{ top: 2, right: 2, bottom: 2, left: 2 }"
    :margin="{ top: 2, right: 2, bottom: 2, left: 2 }"
    :aria-label="ariaLabel"
  >
    <VisLine
      :x="xAccessor"
      :y="yAccessor"
      :color="colorAccessor"
    />
  </VisXYContainer>
</template>
