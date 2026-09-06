<script setup lang="ts">
import type { DashboardDatasetBundle, DashboardDistributionCardDefinition } from '~~/shared/dashboard'

import {
  getDashboardAvailablePeriods,
  getDashboardDatasetField,
  readDashboardRecordText
} from '~~/shared/dashboard'
import { formatDatasetPeriod } from '~~/shared/datasets'

const priorityLegend = [
  { valueKey: '1', code: 'P1', category: 'Sangat rentan', color: '#D73027' },
  { valueKey: '2', code: 'P2', category: 'Rentan', color: '#FC8D59' },
  { valueKey: '3', code: 'P3', category: 'Cukup rentan', color: '#FEE08B' },
  { valueKey: '4', code: 'P4', category: 'Cukup tahan', color: '#D9EF8B' },
  { valueKey: '5', code: 'P5', category: 'Tahan', color: '#91CF60' },
  { valueKey: '6', code: 'P6', category: 'Sangat tahan', color: '#1A9850' }
] as const
const priorityByValueKey = new Map<string, (typeof priorityLegend)[number]>(
  priorityLegend.map(item => [item.valueKey, item])
)
const valueColorMap = Object.fromEntries(priorityLegend.map(item => [item.valueKey, item.color]))
const ALL_KECAMATAN = '__ALL__'

const props = defineProps<{
  card: DashboardDistributionCardDefinition
  dataset: DashboardDatasetBundle
}>()

const emit = defineEmits<{
  'open-detail': [periodDate: string | null]
}>()

const availablePeriods = computed(() => getDashboardAvailablePeriods(props.dataset.definition.coverage, props.card))
const selectedPeriodValue = ref('')
const selectedKecamatan = ref(ALL_KECAMATAN)

const priorityField = computed(() => getDashboardDatasetField(props.dataset.definition.dataSchema, props.card.fieldKey))
const selectedPeriodDate = computed(() => selectedPeriodValue.value || null)
const selectedPeriodLabel = computed(() => selectedPeriodDate.value
  ? formatDatasetPeriod(props.dataset.definition.coverage?.periodicity ?? null, selectedPeriodDate.value)
  : null)
const periodRecords = computed(() => props.dataset.records.filter(
  record => record.periodDate === selectedPeriodDate.value
))
const kecamatanOptions = computed(() => {
  const kecamatanNames = [...new Set(periodRecords.value
    .map(record => record.parentRegionName)
    .filter((name): name is string => Boolean(name)))]
    .sort((left, right) => left.localeCompare(right, 'id-ID'))

  return [{
    label: 'Semua Kecamatan',
    value: ALL_KECAMATAN
  }, ...kecamatanNames.map(name => ({ label: name, value: name }))]
})
const filteredRecords = computed(() => selectedKecamatan.value === ALL_KECAMATAN
  ? periodRecords.value
  : periodRecords.value.filter(record => record.parentRegionName === selectedKecamatan.value))

watch(kecamatanOptions, (options) => {
  if (!options.some(option => option.value === selectedKecamatan.value)) {
    selectedKecamatan.value = ALL_KECAMATAN
  }
}, { immediate: true })

const countsByPriority = computed(() => {
  const counts = new Map<string, number>()

  for (const record of filteredRecords.value) {
    const priorityKey = readDashboardRecordText(record, priorityField.value?.key ?? null)

    if (!priorityKey) {
      continue
    }

    counts.set(priorityKey, (counts.get(priorityKey) ?? 0) + 1)
  }

  return priorityLegend.map(item => ({
    key: item.valueKey,
    count: counts.get(item.valueKey) ?? 0,
    label: `${item.code} · ${item.category}`,
    shortLabel: item.code,
    color: item.color
  }))
})

const summaryItems = computed(() => {
  if (!selectedPeriodDate.value || filteredRecords.value.length === 0) {
    return []
  }

  return [
    `${filteredRecords.value.length} desa`,
    ...countsByPriority.value.map(item => `${item.shortLabel}: ${item.count}`)
  ]
})

const desaValues = computed(() => {
  return filteredRecords.value.map((record) => {
    const priorityKey = readDashboardRecordText(record, priorityField.value?.key ?? null)
    const priority = priorityByValueKey.get(priorityKey ?? '')

    return {
      regionId: record.regionId,
      label: record.regionName,
      parentLabel: record.parentRegionName,
      valueKey: priority?.valueKey ?? null,
      valueLabel: priority ? `${priority.code} · ${priority.category}` : 'Data belum tersedia'
    }
  })
})
</script>

<template>
  <DashboardWidget
    interactive
    :activation-label="`Buka detail ${card.title}`"
    @activate="emit('open-detail', selectedPeriodDate)"
  >
    <template #header>
      <div class="flex w-full flex-col gap-2">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-map" class="size-4 shrink-0 text-[var(--app-foreground-soft)]" />
              <h2 class="truncate text-sm font-semibold text-[var(--app-foreground)]">
                {{ card.title }}
              </h2>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-1" @click.stop @keydown.stop>
            <USelectMenu
              v-model="selectedKecamatan"
              :items="kecamatanOptions"
              value-key="value"
              label-key="label"
              size="xs"
              color="neutral"
              variant="ghost"
              class="w-44"
              aria-label="Pilih kecamatan"
            />
            <DashboardPeriodSelector
              v-model="selectedPeriodValue"
              :periodicity="card.periodicity"
              :periods="availablePeriods"
            />
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2 text-xs text-[var(--app-foreground-muted)]">
          <template v-if="summaryItems.length">
            <span
              v-for="item in summaryItems"
              :key="item"
              class="rounded-full border border-[var(--app-border)] bg-[var(--app-surface-muted)] px-2.5 py-1"
            >
              {{ item }}
            </span>
          </template>
          <span v-else class="rounded-full border border-[var(--app-border)] bg-[var(--app-surface-muted)] px-2.5 py-1">
            {{ dataset.available
              ? selectedPeriodLabel
                ? `Data ${selectedPeriodLabel} belum tersedia.`
                : 'Periode Dataset belum tersedia.'
              : 'Dataset tidak tersedia.' }}
          </span>
        </div>
      </div>
    </template>

    <div class="space-y-3">
      <MapAdministrativeBoundaryMap
        map-height="500px"
        :desa-values="desaValues"
        :value-color-map="valueColorMap"
        :selected-kecamatan="selectedKecamatan === ALL_KECAMATAN ? null : selectedKecamatan"
        :popup-year="selectedPeriodLabel"
        show-desa-tooltips
        stop-interaction-propagation
        no-data-color="#e2e8f0"
        no-data-label="Data belum tersedia"
      />

      <div v-if="countsByPriority.length" class="flex flex-wrap items-center gap-2 text-xs">
        <span
          v-for="item in countsByPriority"
          :key="item.key"
          class="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[var(--app-foreground-muted)]"
          :style="{ borderColor: item.color, backgroundColor: `${item.color}1A` }"
        >
          <span class="size-2 rounded-full" :style="{ backgroundColor: item.color }" />
          {{ item.label }}
        </span>
      </div>
    </div>

    <template #footer>
      <DashboardCardSource :source="dataset.definition.source" />
    </template>
  </DashboardWidget>
</template>
