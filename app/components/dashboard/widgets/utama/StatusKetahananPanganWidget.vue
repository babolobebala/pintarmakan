<script setup lang="ts">
import type { DashboardDatasetBundle } from '~~/shared/dashboard'

import {
  filterDashboardRecordsByYear,
  getDashboardAvailableYears,
  getDashboardDatasetField,
  readDashboardRecordText,
  resolveDashboardDefaultYear
} from '~~/shared/dashboard'

const priorityPalette = [
  '#f59e0b',
  '#84cc16',
  '#22c55e',
  '#14b8a6',
  '#0ea5e9',
  '#8b5cf6'
] as const

const props = defineProps<{
  dataset: DashboardDatasetBundle
}>()

const availableYears = computed(() => getDashboardAvailableYears(props.dataset.records))
const yearOptions = computed(() => availableYears.value.map(year => String(year)))
const selectedYearValue = ref('')

watch(yearOptions, (options) => {
  if (!options.length) {
    selectedYearValue.value = ''
    return
  }

  if (!options.includes(selectedYearValue.value)) {
    selectedYearValue.value = String(resolveDashboardDefaultYear(props.dataset.records) ?? '')
  }
}, { immediate: true })

const selectedYear = computed(() => {
  return selectedYearValue.value ? Number(selectedYearValue.value) : null
})

const priorityField = computed(() => getDashboardDatasetField(props.dataset.definition.dataSchema, 'priority'))
const filteredRecords = computed(() => filterDashboardRecordsByYear(props.dataset.records, selectedYear.value))
const allPriorityKeys = computed(() => {
  return Array.from(new Set(
    props.dataset.records
      .map(record => readDashboardRecordText(record, priorityField.value?.key ?? null))
      .filter((value): value is string => !!value)
  )).sort((left, right) => Number(left) - Number(right))
})

const valueColorMap = computed(() => {
  return allPriorityKeys.value.reduce<Record<string, string>>((map, key, index) => {
    map[key] = priorityPalette[index % priorityPalette.length] ?? priorityPalette[0]
    return map
  }, {})
})

const countsByPriority = computed(() => {
  const counts = new Map<string, number>()

  for (const record of filteredRecords.value) {
    const priorityKey = readDashboardRecordText(record, priorityField.value?.key ?? null)

    if (!priorityKey) {
      continue
    }

    counts.set(priorityKey, (counts.get(priorityKey) ?? 0) + 1)
  }

  return Array.from(counts.entries())
    .sort(([left], [right]) => Number(left) - Number(right))
    .map(([key, count]) => ({
      key,
      count,
      label: `Prioritas ${key}`,
      shortLabel: `P${key}`,
      color: valueColorMap.value[key] ?? priorityPalette[0]
    }))
})

const summaryItems = computed(() => {
  if (selectedYear.value === null) {
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

    return {
      regionId: record.regionId,
      label: record.regionName,
      parentLabel: record.parentRegionName,
      valueKey: priorityKey,
      valueLabel: priorityKey ? `Prioritas ${priorityKey}` : 'Data belum tersedia'
    }
  })
})
</script>

<template>
  <DashboardWidget>
    <template #header>
      <div class="flex w-full flex-col gap-2">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-map" class="size-4 shrink-0 text-[var(--app-foreground-soft)]" />
              <h2 class="truncate text-sm font-semibold text-[var(--app-foreground)]">
                {{ dataset.definition.name }}
              </h2>
            </div>
          </div>

          <USelectMenu
            v-model="selectedYearValue"
            :items="yearOptions"
            size="xs"
            color="neutral"
            variant="ghost"
            class="w-24 shrink-0"
            :disabled="!yearOptions.length"
          />
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
            Belum ada data tahunan.
          </span>
        </div>
      </div>
    </template>

    <div class="space-y-3">
      <MapAdministrativeBoundaryMap
        map-height="500px"
        :desa-values="desaValues"
        :value-color-map="valueColorMap"
        :popup-year="selectedYear"
        no-data-color="#e2e8f0"
        no-data-label="Data belum tersedia"
      />

      <div v-if="countsByPriority.length" class="flex flex-wrap items-center gap-2 text-xs">
        <span
          v-for="item in countsByPriority"
          :key="item.key"
          class="inline-flex items-center gap-2 rounded-full border border-[var(--app-border)] bg-[var(--app-surface-muted)] px-2.5 py-1 text-[var(--app-foreground-muted)]"
        >
          <span class="size-2 rounded-full" :style="{ backgroundColor: item.color }" />
          {{ item.label }}
        </span>
      </div>
    </div>
  </DashboardWidget>
</template>
