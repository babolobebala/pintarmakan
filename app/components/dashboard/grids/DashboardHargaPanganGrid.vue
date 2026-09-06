<script setup lang="ts">
import type { DashboardCardDetailContext, DashboardHargaPanganPayload } from '~~/shared/dashboard'

import {
  dashboardHargaPanganCardDefinitions,
  getDashboardAvailablePeriods,
  getDashboardNumericSchemaFields
} from '~~/shared/dashboard'
import { formatDatasetPeriod } from '~~/shared/datasets'

import DashboardCardDetailModal from '../DashboardCardDetailModal.vue'
import DashboardCommodityPriceCard from '../widgets/harga/DashboardCommodityPriceCard.vue'
import {
  defaultHargaPriceRange,
  hargaPriceRangeOptions
} from '../widgets/harga/commodityPrice'
import type { HargaPriceRangeKey } from '../widgets/harga/commodityPrice'

const props = defineProps<{
  payload: DashboardHargaPanganPayload
  pending?: boolean
}>()

const hargaCard = dashboardHargaPanganCardDefinitions[0] ?? null
const dataset = computed(() => props.payload.cards['harga-pangan'])
const commodityFields = computed(() => getDashboardNumericSchemaFields(dataset.value.definition.dataSchema))
const availableDays = computed(() => getDashboardAvailablePeriods(dataset.value.definition.coverage, hargaCard ?? undefined))
const priceRange = ref<HargaPriceRangeKey>(defaultHargaPriceRange)

const detailOpen = ref(false)
const selectedDetail = shallowRef<DashboardCardDetailContext | null>(null)

const latestRecordDate = computed(() => {
  let latest: string | null = null

  for (const record of dataset.value.records) {
    if (latest === null || record.periodDate > latest) {
      latest = record.periodDate
    }
  }

  return latest
})
const latestRecordDateText = computed(() => latestRecordDate.value
  ? formatDatasetPeriod('HARIAN', latestRecordDate.value)
  : null)

function openDetail(periodDate: string | null) {
  if (!hargaCard) {
    return
  }

  selectedDetail.value = {
    card: hargaCard,
    dataset: dataset.value,
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
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div class="min-w-0 space-y-1">
        <p class="text-[0.68rem] font-medium uppercase tracking-[0.18em] text-[var(--app-foreground-soft)]">
          Harga Pangan Harian
        </p>
        <p v-if="latestRecordDateText" class="text-xs text-[var(--app-foreground-muted)]">
          Data terbaru hingga {{ latestRecordDateText }}
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <span class="text-xs text-[var(--app-foreground-muted)]">
          Rentang Grafik
        </span>
        <div class="flex items-center gap-1">
          <UButton
            v-for="option in hargaPriceRangeOptions"
            :key="option.key"
            size="xs"
            color="neutral"
            :label="option.label"
            :title="option.hint"
            :variant="priceRange === option.key ? 'solid' : 'ghost'"
            @click="priceRange = option.key"
          />
        </div>
      </div>
    </div>

    <div v-if="!dataset.available" class="text-sm text-[var(--app-foreground-muted)]">
      Dataset tidak tersedia untuk dashboard ini.
    </div>
    <div v-else-if="!commodityFields.length" class="text-sm text-[var(--app-foreground-muted)]">
      Komoditas harga belum tersedia pada Dataset.
    </div>
    <section v-else class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <DashboardCommodityPriceCard
        v-for="field in commodityFields"
        :key="field.key"
        :field="field"
        :dataset="dataset"
        :days="availableDays"
        :range="priceRange"
        @open-detail="openDetail"
      />
    </section>

    <DashboardCardDetailModal
      v-model:open="detailOpen"
      :context="selectedDetail"
    />
  </div>
</template>
