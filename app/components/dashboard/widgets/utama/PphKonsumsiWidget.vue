<script setup lang="ts">
import type { DashboardKpiPayload } from '~~/shared/dashboard'

const props = defineProps<{
  indicator: DashboardKpiPayload
}>()

const formatter = new Intl.NumberFormat('id-ID', {
  maximumFractionDigits: 2
})

const valueLabel = computed(() => {
  return props.indicator.value === null
    ? 'Data belum tersedia'
    : formatter.format(props.indicator.value)
})

const previousValueLabel = computed(() => {
  return props.indicator.previousValue === null
    ? null
    : formatter.format(props.indicator.previousValue)
})

const deltaLabel = computed(() => {
  if (props.indicator.delta === null) {
    return null
  }

  const prefix = props.indicator.delta > 0 ? '+' : ''
  return `${prefix}${formatter.format(props.indicator.delta)}`
})
</script>

<template>
  <DashboardWidget
    :title="indicator.title"
    :description="indicator.description"
    icon="i-lucide-utensils"
  >
    <div class="space-y-4">
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="text-3xl font-semibold tracking-tight text-[var(--app-foreground)]">
            {{ valueLabel }}
          </p>
          <p class="mt-2 text-sm text-[var(--app-foreground-muted)]">
            {{ indicator.unit || 'Tanpa satuan' }}
          </p>
        </div>

        <UBadge
          :color="indicator.delta === null ? 'neutral' : indicator.delta >= 0 ? 'success' : 'warning'"
          variant="subtle"
        >
          {{ deltaLabel || (indicator.year ? `Tahun ${indicator.year}` : 'Belum ada tahun') }}
        </UBadge>
      </div>

      <p class="text-sm leading-6 text-[var(--app-foreground-muted)]">
        {{ indicator.value === null && indicator.year
          ? `Data tahun ${indicator.year} belum tersedia.`
          : 'Widget ini menjaga konteks tahun yang sama dengan indikator utama lain pada dashboard.' }}
      </p>
    </div>

    <template #footer>
      <div class="grid gap-3 sm:grid-cols-2">
        <div class="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-muted)] p-4">
          <p class="text-xs uppercase tracking-[0.16em] text-[var(--app-foreground-soft)]">
            Tahun aktif
          </p>
          <p class="mt-2 text-lg font-semibold text-[var(--app-foreground)]">
            {{ indicator.year || '-' }}
          </p>
        </div>

        <div class="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-muted)] p-4">
          <p class="text-xs uppercase tracking-[0.16em] text-[var(--app-foreground-soft)]">
            Nilai tahun lalu
          </p>
          <p class="mt-2 text-lg font-semibold text-[var(--app-foreground)]">
            {{ previousValueLabel || '-' }}
          </p>
        </div>
      </div>
    </template>
  </DashboardWidget>
</template>
