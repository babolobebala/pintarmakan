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

const trendBadge = computed(() => {
  switch (props.indicator.trendDirection) {
    case 'up':
      return {
        label: deltaLabel.value,
        color: 'success' as const,
        icon: 'i-lucide-trending-up'
      }
    case 'down':
      return {
        label: deltaLabel.value,
        color: 'error' as const,
        icon: 'i-lucide-trending-down'
      }
    case 'flat':
      return {
        label: 'Stabil',
        color: 'neutral' as const,
        icon: 'i-lucide-minus'
      }
    default:
      return null
  }
})
</script>

<template>
  <DashboardWidget
    :title="indicator.title"
    :description="indicator.description"
    icon="i-lucide-badge-info"
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

        <UBadge v-if="trendBadge" :color="trendBadge.color" variant="subtle">
          <UIcon :name="trendBadge.icon" class="mr-1 size-3.5" />
          {{ trendBadge.label }}
        </UBadge>
        <UBadge v-else color="neutral" variant="subtle">
          {{ indicator.year ? `Tahun ${indicator.year}` : 'Belum ada tahun' }}
        </UBadge>
      </div>

      <p class="text-sm leading-6 text-[var(--app-foreground-muted)]">
        {{ indicator.value === null && indicator.year
          ? `Data tahun ${indicator.year} belum tersedia.`
          : 'Widget ini menampilkan nilai tahunan IKP tingkat kabupaten dari dataset riil.' }}
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
            Tahun sebelumnya
          </p>
          <p class="mt-2 text-lg font-semibold text-[var(--app-foreground)]">
            {{ previousValueLabel || '-' }}
          </p>
        </div>
      </div>
    </template>
  </DashboardWidget>
</template>
