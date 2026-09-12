<script setup lang="ts">
import type { DashboardDatasetBundle, DashboardTabularSummaryCardDefinition } from '~~/shared/dashboard'

import { getDashboardAvailablePeriods, readDashboardRecordNumber, readDashboardRecordText } from '~~/shared/dashboard'

import DashboardCardSource from '../../DashboardCardSource.vue'
import DashboardPeriodSelector from '../../DashboardPeriodSelector.vue'
import DashboardWidget from '../../DashboardWidget.vue'

const props = defineProps<{ card: DashboardTabularSummaryCardDefinition, dataset: DashboardDatasetBundle }>()
const emit = defineEmits<{
  'open-detail': [periodDate: string | null]
}>()
const selectedPeriod = ref('')
const periods = computed(() => getDashboardAvailablePeriods(props.dataset.definition.coverage, props.card))
watch(periods, (values) => {
  if (!values.includes(selectedPeriod.value)) {
    selectedPeriod.value = values[0] ?? ''
  }
}, { immediate: true })
const rows = computed(() => props.dataset.tableRecords.filter(record => record.periodDate === selectedPeriod.value))
const counts = computed(() => ['PENUMBUHAN', 'PENGEMBANGAN', 'MANDIRI'].map(key => ({ key, count: rows.value.filter(row => readDashboardRecordText(row, 'klasifikasi_tahapan')?.toUpperCase() === key).length })))
const danaFisik = computed(() => {
  let total = 0
  let found = false

  for (const row of rows.value) {
    const value = readDashboardRecordNumber(row, 'jumlah_dana_fisik')

    if (value !== null) {
      total += value
      found = true
    }
  }

  return found ? total : null
})
const currency = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 })
</script>

<template>
  <DashboardWidget compact>
    <template #header>
      <div class="flex w-full items-center justify-between gap-3">
        <div class="flex min-w-0 items-center gap-2">
          <UIcon name="i-lucide-landmark" class="size-4 shrink-0 text-[var(--app-foreground-soft)]" /><h2 class="truncate text-sm font-semibold text-[var(--app-foreground)]">
            Lumbung Pangan
          </h2>
        </div><DashboardPeriodSelector v-model="selectedPeriod" periodicity="TAHUNAN" :periods="periods" />
      </div>
    </template>
    <div v-if="!selectedPeriod" class="text-sm text-[var(--app-foreground-muted)]">
      Belum ada data untuk periode ini.
    </div>
    <div v-else class="space-y-3">
      <p class="text-2xl font-semibold tabular-nums text-[var(--app-foreground)]">
        {{ rows.length }} <span class="text-sm font-medium text-[var(--app-foreground-muted)]">Kelompok/Lumbung</span>
      </p><div class="grid grid-cols-3 gap-1 text-center text-xs">
        <div v-for="item in counts" :key="item.key" class="rounded-lg bg-[var(--app-surface-muted)] px-1 py-2">
          <p class="font-semibold tabular-nums text-[var(--app-foreground)]">
            {{ item.count }}
          </p><p class="mt-0.5 text-[0.62rem] text-[var(--app-foreground-muted)]">
            {{ item.key.slice(0, 1) + item.key.slice(1).toLowerCase() }}
          </p>
        </div>
      </div><div>
        <p class="text-xs text-[var(--app-foreground-muted)]">
          Dana Fisik
        </p><p v-if="danaFisik !== null" class="font-semibold tabular-nums text-[var(--app-foreground)]">
          Rp{{ currency.format(danaFisik) }}
        </p><p v-else class="text-sm text-[var(--app-foreground-muted)]">
          Data belum tersedia
        </p>
      </div>
    </div>
    <template #footer>
      <div class="flex items-center justify-between gap-3">
        <DashboardCardSource :source="dataset.definition.source" />
        <UButton
          size="xs"
          color="neutral"
          variant="ghost"
          trailing-icon="i-lucide-arrow-right"
          @click="emit('open-detail', selectedPeriod || null)"
        >
          Lihat detail
        </UButton>
      </div>
    </template>
  </DashboardWidget>
</template>
