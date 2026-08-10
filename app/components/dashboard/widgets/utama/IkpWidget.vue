<script setup lang="ts">
import type { DashboardDatasetBundle } from '~~/shared/dashboard'
import CompactKpiWidget from './CompactKpiWidget.vue'

defineProps<{
  dataset: DashboardDatasetBundle
}>()
</script>

<template>
  <CompactKpiWidget
    :dataset="dataset"
    icon="i-lucide-badge-info"
    badge-color="success"
  />
</template>
