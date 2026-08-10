<script setup lang="ts">
import type { DashboardStatusMapPayload } from '~~/shared/dashboard'

const priorityPalette = [
  '#f59e0b',
  '#84cc16',
  '#22c55e',
  '#14b8a6',
  '#0ea5e9',
  '#8b5cf6'
] as const

const props = defineProps<{
  indicator: DashboardStatusMapPayload
}>()

const legendItems = computed(() => {
  return props.indicator.countsByPriority.map((item, index) => ({
    ...item,
    color: priorityPalette[index % priorityPalette.length] ?? priorityPalette[0]
  }))
})

const valueColorMap = computed(() => {
  return legendItems.value.reduce<Record<string, string>>((map, item) => {
    map[item.key] = item.color
    return map
  }, {})
})

const desaValues = computed(() => {
  return props.indicator.records.map(record => ({
    regionId: record.regionId,
    label: record.regionName,
    parentLabel: record.parentRegionName,
    valueKey: record.priorityKey,
    valueLabel: record.priorityLabel
  }))
})
</script>

<template>
  <DashboardWidget
    :title="indicator.title"
    :description="indicator.description"
    icon="i-lucide-map"
  >
    <div class="space-y-5">
      <div class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.9fr)]">
        <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <div class="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-muted)] p-4">
            <p class="text-xs uppercase tracking-[0.16em] text-[var(--app-foreground-soft)]">
              Tahun aktif
            </p>
            <p class="mt-2 text-2xl font-semibold text-[var(--app-foreground)]">
              {{ indicator.year || '-' }}
            </p>
          </div>

          <div class="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-muted)] p-4">
            <p class="text-xs uppercase tracking-[0.16em] text-[var(--app-foreground-soft)]">
              Desa dengan data
            </p>
            <p class="mt-2 text-2xl font-semibold text-[var(--app-foreground)]">
              {{ indicator.totalWithData }}
            </p>
          </div>

          <div class="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-muted)] p-4 sm:col-span-2 xl:col-span-1">
            <p class="text-xs uppercase tracking-[0.16em] text-[var(--app-foreground-soft)]">
              Kategori aktif
            </p>
            <p class="mt-2 text-lg font-semibold text-[var(--app-foreground)]">
              {{ legendItems.length ? `${legendItems.length} prioritas` : 'Belum ada data' }}
            </p>
          </div>
        </div>

        <div class="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
          <p class="text-xs uppercase tracking-[0.16em] text-[var(--app-foreground-soft)]">
            Ringkasan prioritas
          </p>
          <div v-if="legendItems.length" class="mt-3 space-y-3">
            <div
              v-for="item in legendItems"
              :key="item.key"
              class="flex items-center justify-between gap-3 text-sm"
            >
              <div class="flex items-center gap-2">
                <span class="size-2.5 rounded-full" :style="{ backgroundColor: item.color }" />
                <span class="font-medium text-[var(--app-foreground)]">{{ item.label }}</span>
              </div>
              <span class="text-[var(--app-foreground-muted)]">{{ item.count }} desa</span>
            </div>
          </div>
          <p v-else class="mt-3 text-sm leading-6 text-[var(--app-foreground-muted)]">
            {{ indicator.year ? `Data tahun ${indicator.year} belum tersedia.` : 'Belum ada data tahunan yang dapat ditampilkan.' }}
          </p>
        </div>
      </div>

      <MapAdministrativeBoundaryMap
        title="Peta status ketahanan pangan desa"
        description="Batas desa existing diwarnai berdasarkan prioritas dari dataset tahunan yang aktif."
        map-height="560px"
        :desa-values="desaValues"
        :value-color-map="valueColorMap"
        :popup-year="indicator.year"
        no-data-color="#e2e8f0"
        no-data-label="Data belum tersedia"
      />
    </div>
  </DashboardWidget>
</template>
