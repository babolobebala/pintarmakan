<script setup lang="ts">
import type {
  DashboardCardDetailContext,
  DashboardCpmCardKey,
  DashboardDatasetBundle,
  DashboardUtamaCardDefinition,
  DashboardUtamaCardKey,
  DashboardUtamaPayload,
  DashboardUtamaSummaryCardDescriptor
} from '~~/shared/dashboard'

import {
  dashboardCpmCardDefinitions,
  dashboardHargaPanganCardDefinitions,
  dashboardLumbungCardDefinition,
  dashboardProyeksiCardDefinitions,
  dashboardUtamaCardDefinitions,
  dashboardUtamaSummaryCards
} from '~~/shared/dashboard'

import DashboardCardDetailModal from '../DashboardCardDetailModal.vue'
import DashboardCardRenderer from '../DashboardCardRenderer.vue'
import DashboardUtamaSummaryCard from '../widgets/utama/DashboardUtamaSummaryCard.vue'
import DashboardUtamaCpmCard from '../widgets/utama/DashboardUtamaCpmCard.vue'
import DashboardUtamaHargaCard from '../widgets/utama/DashboardUtamaHargaCard.vue'
import DashboardUtamaLumbungCard from '../widgets/utama/DashboardUtamaLumbungCard.vue'
import DashboardUtamaNeracaCard from '../widgets/utama/DashboardUtamaNeracaCard.vue'
import DashboardUtamaProduksiCard from '../widgets/utama/DashboardUtamaProduksiCard.vue'

const props = defineProps<{
  payload: DashboardUtamaPayload
  pending?: boolean
}>()

const detailOpen = ref(false)
const selectedDetail = shallowRef<DashboardCardDetailContext | null>(null)
const datasets = computed(() => props.payload.cards as Record<string, DashboardDatasetBundle>)
const cpmDatasets = computed(() => props.payload.cards as Record<DashboardCpmCardKey, DashboardDatasetBundle>)
const statusCard = dashboardUtamaCardDefinitions.find(card => card.type === 'DISTRIBUTION')
const hargaCard = dashboardHargaPanganCardDefinitions[0]!

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

    <section class="grid items-start gap-3 xl:grid-cols-12">
      <DashboardCardRenderer
        v-if="statusCard"
        class="xl:col-span-5"
        :card="statusCard"
        :dataset="props.payload.cards[statusCard.key as DashboardUtamaCardKey]"
        @open-detail="openDetail(statusCard, $event)"
      />
      <div class="grid gap-3 sm:grid-cols-2 xl:col-span-7 xl:grid-cols-1">
        <DashboardUtamaNeracaCard :cards="dashboardProyeksiCardDefinitions" :datasets="datasets" />
        <DashboardUtamaHargaCard :card="hargaCard" :dataset="props.payload.cards[hargaCard.key]" />
      </div>
    </section>

    <section class="grid items-start gap-3 xl:grid-cols-12">
      <DashboardUtamaProduksiCard class="xl:col-span-5" :payload="payload" />
      <DashboardUtamaCpmCard class="xl:col-span-4" :cards="dashboardCpmCardDefinitions" :datasets="cpmDatasets" />
      <DashboardUtamaLumbungCard
        class="xl:col-span-3"
        :card="dashboardLumbungCardDefinition"
        :dataset="props.payload.cards[dashboardLumbungCardDefinition.key]"
        @open-detail="openDetail(dashboardLumbungCardDefinition, $event)"
      />
    </section>

    <DashboardCardDetailModal
      v-model:open="detailOpen"
      :context="selectedDetail"
    />
  </div>
</template>
