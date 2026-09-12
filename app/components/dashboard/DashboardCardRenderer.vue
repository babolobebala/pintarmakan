<script setup lang="ts">
import type { DashboardCardDefinition, DashboardDatasetBundle } from '~~/shared/dashboard'

import DashboardDualKpiCard from './cards/DashboardDualKpiCard.vue'
import DashboardDistributionCard from './cards/DashboardDistributionCard.vue'
import DashboardFieldTimeSeriesCard from './cards/DashboardFieldTimeSeriesCard.vue'
import DashboardKpiCard from './cards/DashboardKpiCard.vue'
import DashboardMultiKpiCard from './cards/DashboardMultiKpiCard.vue'
import DashboardNeracaTimeSeriesCard from './cards/DashboardNeracaTimeSeriesCard.vue'
import DashboardRegionalMetricCard from './cards/DashboardRegionalMetricCard.vue'
import DashboardTabularMonthSeriesCard from './cards/DashboardTabularMonthSeriesCard.vue'

defineProps<{
  card: DashboardCardDefinition
  dataset: DashboardDatasetBundle
}>()

const emit = defineEmits<{
  'open-detail': [periodDate: string | null]
}>()
</script>

<template>
  <DashboardKpiCard
    v-if="card.type === 'KPI'"
    :card="card"
    :dataset="dataset"
    @open-detail="emit('open-detail', $event)"
  />
  <DashboardDualKpiCard
    v-else-if="card.type === 'DUAL_KPI'"
    :card="card"
    :dataset="dataset"
    @open-detail="emit('open-detail', $event)"
  />
  <DashboardMultiKpiCard
    v-else-if="card.type === 'MULTI_KPI'"
    :card="card"
    :dataset="dataset"
    @open-detail="emit('open-detail', $event)"
  />
  <DashboardDistributionCard
    v-else-if="card.type === 'DISTRIBUTION'"
    :card="card"
    :dataset="dataset"
    @open-detail="emit('open-detail', $event)"
  />
  <DashboardFieldTimeSeriesCard
    v-else-if="card.type === 'FIELD_TIME_SERIES'"
    :card="card"
    :dataset="dataset"
    @open-detail="emit('open-detail', $event)"
  />
  <DashboardRegionalMetricCard
    v-else-if="card.type === 'REGIONAL_METRIC'"
    :card="card"
    :dataset="dataset"
    @open-detail="emit('open-detail', $event)"
  />
  <DashboardTabularMonthSeriesCard
    v-else-if="card.type === 'TABULAR_MONTH_SERIES'"
    :card="card"
    :dataset="dataset"
    @open-detail="emit('open-detail', $event)"
  />
  <DashboardNeracaTimeSeriesCard
    v-else-if="card.type === 'NERACA_TIME_SERIES'"
    :card="card"
    :dataset="dataset"
    @open-detail="emit('open-detail', $event)"
  />
  <UAlert
    v-else
    color="warning"
    variant="subtle"
    title="Kartu dashboard belum memiliki renderer."
  />
</template>
