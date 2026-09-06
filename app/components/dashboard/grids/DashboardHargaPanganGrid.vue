<script setup lang="ts">
import type {
  DashboardCardDetailContext,
  DashboardHargaPanganCardDefinition,
  DashboardHargaPanganPayload
} from '~~/shared/dashboard'

import { dashboardHargaPanganCardDefinitions } from '~~/shared/dashboard'

import DashboardCardDetailModal from '../DashboardCardDetailModal.vue'
import DashboardCardRenderer from '../DashboardCardRenderer.vue'

const props = defineProps<{
  payload: DashboardHargaPanganPayload
  pending?: boolean
}>()

const detailOpen = ref(false)
const selectedDetail = shallowRef<DashboardCardDetailContext | null>(null)

function openDetail(card: DashboardHargaPanganCardDefinition, periodDate: string | null) {
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
    <section class="grid gap-3">
      <DashboardCardRenderer
        v-for="card in dashboardHargaPanganCardDefinitions"
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
