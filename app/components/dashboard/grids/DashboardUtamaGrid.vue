<script setup lang="ts">
import type {
  DashboardCardDetailContext,
  DashboardUtamaCardDefinition,
  DashboardUtamaCardKey,
  DashboardUtamaPayload,
  DashboardUtamaSummaryCardDescriptor
} from '~~/shared/dashboard'

import {
  dashboardUtamaCardDefinitions,
  dashboardUtamaSummaryCards
} from '~~/shared/dashboard'

import DashboardCardDetailModal from '../DashboardCardDetailModal.vue'
import DashboardCardRenderer from '../DashboardCardRenderer.vue'
import DashboardUtamaSummaryCard from '../widgets/utama/DashboardUtamaSummaryCard.vue'

const props = defineProps<{
  payload: DashboardUtamaPayload
  pending?: boolean
}>()

const detailOpen = ref(false)
const selectedDetail = shallowRef<DashboardCardDetailContext | null>(null)

const summaryEntries = computed(() => dashboardUtamaSummaryCards.flatMap((descriptor) => {
  const card = dashboardUtamaCardDefinitions.find(definition => definition.key === descriptor.cardKey)

  if (!card) {
    return []
  }

  return [{
    descriptor,
    card,
    dataset: props.payload.cards[descriptor.cardKey]
  }]
}))

function openDetail(card: DashboardUtamaCardDefinition, periodDate: string | null) {
  selectedDetail.value = {
    card,
    dataset: props.payload.cards[card.key as DashboardUtamaCardKey],
    periodDate
  }
  detailOpen.value = true
}

function openSummaryDetail(descriptor: DashboardUtamaSummaryCardDescriptor, periodDate: string | null) {
  const card = dashboardUtamaCardDefinitions.find(definition => definition.key === descriptor.cardKey)

  if (!card) {
    return
  }

  selectedDetail.value = {
    card,
    dataset: props.payload.cards[descriptor.cardKey],
    periodDate
  }
  detailOpen.value = true
}
</script>

<template>
  <div
    class="space-y-3"
    :class="pending ? 'opacity-75 transition-opacity' : ''"
  >
    <section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <DashboardUtamaSummaryCard
        v-for="entry in summaryEntries"
        :key="entry.descriptor.key"
        :descriptor="entry.descriptor"
        :card="entry.card"
        :dataset="entry.dataset"
        @open-detail="openSummaryDetail(entry.descriptor, $event)"
      />
    </section>

    <section>
      <DashboardCardRenderer
        v-for="card in dashboardUtamaCardDefinitions.filter(card => card.type === 'DISTRIBUTION')"
        :key="card.key"
        :card="card"
        :dataset="props.payload.cards[card.key as DashboardUtamaCardKey]"
        @open-detail="openDetail(card, $event)"
      />
    </section>

    <DashboardCardDetailModal
      v-model:open="detailOpen"
      :context="selectedDetail"
    />
  </div>
</template>
