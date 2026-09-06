<script setup lang="ts">
import type {
  DashboardCardDetailContext,
  DashboardProyeksiCardDefinition,
  DashboardProyeksiPayload
} from '~~/shared/dashboard'

import { dashboardProyeksiCardDefinitions } from '~~/shared/dashboard'

import DashboardCardDetailModal from '../DashboardCardDetailModal.vue'
import DashboardCardRenderer from '../DashboardCardRenderer.vue'

const props = defineProps<{
  payload: DashboardProyeksiPayload
  pending?: boolean
}>()

const detailOpen = ref(false)
const selectedDetail = shallowRef<DashboardCardDetailContext | null>(null)

function openDetail(card: DashboardProyeksiCardDefinition, periodDate: string | null) {
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
    <p class="text-[0.68rem] font-medium uppercase tracking-[0.18em] text-[var(--app-foreground-soft)]">
      Proyeksi Neraca Pangan
    </p>

    <section class="grid gap-3 md:grid-cols-2">
      <DashboardCardRenderer
        v-for="card in dashboardProyeksiCardDefinitions"
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
