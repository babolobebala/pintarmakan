<script setup lang="ts">
import type { DashboardDatasetBundle, DashboardDistributionCardDefinition } from '~~/shared/dashboard'

import StatusKetahananPanganWidget from '../widgets/utama/StatusKetahananPanganWidget.vue'

defineProps<{
  card: DashboardDistributionCardDefinition
  dataset: DashboardDatasetBundle
}>()

const emit = defineEmits<{
  'open-detail': [periodDate: string | null]
}>()
</script>

<template>
  <StatusKetahananPanganWidget
    :card="card"
    :dataset="dataset"
    @open-detail="emit('open-detail', $event)"
  />
</template>
