<script setup lang="ts">
import type { DashboardUtamaPayload } from '~~/shared/dashboard'

import { dashboardUtamaKpiCardDefinitions, dashboardUtamaStatusCardDefinition } from '~~/shared/dashboard'

import CompactKpiWidget from '../widgets/utama/CompactKpiWidget.vue'
import StatusKetahananPanganWidget from '../widgets/utama/StatusKetahananPanganWidget.vue'

const props = defineProps<{
  payload: DashboardUtamaPayload
  pending?: boolean
}>()
</script>

<template>
  <div
    class="space-y-3"
    :class="pending ? 'opacity-75 transition-opacity' : ''"
  >
    <section class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      <CompactKpiWidget
        v-for="card in dashboardUtamaKpiCardDefinitions"
        :key="card.key"
        :card="card"
        :dataset="props.payload.cards[card.key]"
      />
    </section>

    <section>
      <StatusKetahananPanganWidget
        v-if="dashboardUtamaStatusCardDefinition"
        :card="dashboardUtamaStatusCardDefinition"
        :dataset="props.payload.cards[dashboardUtamaStatusCardDefinition.key]"
      />
    </section>
  </div>
</template>
