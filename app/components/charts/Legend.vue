<script setup lang="ts">
import type { ChartLegendItem } from './shared'

defineProps<{
  items: ChartLegendItem[]
}>()
</script>

<template>
  <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
    <div
      v-for="item in items"
      :key="item.label"
      class="flex items-center gap-2 text-xs text-muted"
    >
      <span
        class="size-2.5 rounded-full border border-black/5"
        :style="{ backgroundColor: item.color }"
      />
      <span>{{ item.label }}</span>
    </div>
  </div>
</template>
