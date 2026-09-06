<script setup lang="ts">
import type {
  DashboardCardDetailContext,
  DashboardProduksiCardDefinition,
  DashboardProduksiPayload
} from '~~/shared/dashboard'

import { dashboardProduksiCardDefinitions } from '~~/shared/dashboard'

import DashboardCardDetailModal from '../DashboardCardDetailModal.vue'
import DashboardProduksiSummaryCard from '../widgets/produksi/DashboardProduksiSummaryCard.vue'

const props = defineProps<{
  payload: DashboardProduksiPayload
  pending?: boolean
}>()

const detailOpen = ref(false)
const selectedDetail = shallowRef<DashboardCardDetailContext | null>(null)

function openDetail(card: DashboardProduksiCardDefinition, periodDate: string | null) {
  selectedDetail.value = {
    card,
    dataset: props.payload.cards[card.key],
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
    <section class="grid gap-3 md:grid-cols-2">
      <DashboardProduksiSummaryCard
        v-for="card in dashboardProduksiCardDefinitions"
        :key="card.key"
        :card="card"
        :dataset="props.payload.cards[card.key]"
        @open-detail="openDetail(card, $event)"
      />
    </section>

    <DashboardCardDetailModal
      v-model:open="detailOpen"
      :context="selectedDetail"
    />
  </div>
</template>
