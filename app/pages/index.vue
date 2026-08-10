<script setup lang="ts">
import DashboardSelector from '~/components/dashboard/DashboardSelector.vue'
import DashboardProduksiGrid from '~/components/dashboard/grids/DashboardProduksiGrid.vue'
import DashboardUtamaGrid from '~/components/dashboard/grids/DashboardUtamaGrid.vue'

import { appPermissions } from '~~/auth/permissions'

definePageMeta({
  permission: appPermissions.dashboardRead
})

const {
  activeDashboard,
  activeOption,
  data: dashboardData,
  error,
  options,
  pending,
  requestedYear,
  refreshDashboard,
  selectDashboard,
  selectYear
} = useDashboardState()

const refreshedAtLabel = computed(() => {
  if (!dashboardData.value?.meta.updatedAt) {
    return '-'
  }

  return new Date(dashboardData.value.meta.updatedAt).toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short'
  })
})

const yearOptions = computed(() => {
  if (dashboardData.value?.kind !== 'utama') {
    return []
  }

  return dashboardData.value.availableYears.map(year => String(year))
})

const activeYearValue = computed(() => {
  if (requestedYear.value) {
    return requestedYear.value
  }

  if (dashboardData.value?.kind === 'utama' && dashboardData.value.selectedYear) {
    return String(dashboardData.value.selectedYear)
  }

  return ''
})

async function updateDashboard(dashboard: (typeof options)[number]['key']) {
  await selectDashboard(dashboard)
}

async function updateYear(year: string | null) {
  await selectYear(year)
}
</script>

<template>
  <div class="space-y-5">
    <section class="rounded-[var(--radius-shell)] border border-[var(--app-border)] bg-[var(--app-surface)] px-5 py-5 shadow-sm sm:px-6">
      <div class="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div class="min-w-0 space-y-3">
          <div class="flex flex-wrap items-center gap-2">
            <UBadge color="neutral" variant="subtle">
              Monitoring Dashboard
            </UBadge>
            <UBadge color="neutral" variant="outline">
              Kabupaten Sumbawa Barat
            </UBadge>
          </div>

          <div class="space-y-2">
            <p class="cobalt-kicker text-[var(--app-foreground-soft)]">
              {{ dashboardData?.meta.eyebrow || 'Monitoring operasional' }}
            </p>
            <h1 class="text-2xl font-semibold tracking-tight text-[var(--app-foreground)] sm:text-[2rem]">
              {{ dashboardData?.meta.title || activeOption.label }}
            </h1>
            <p class="max-w-3xl text-sm leading-6 text-[var(--app-foreground-muted)]">
              {{ dashboardData?.meta.description || activeOption.description }}
            </p>
          </div>
        </div>

        <div class="grid gap-3 sm:grid-cols-[minmax(0,320px)_minmax(0,180px)_auto] sm:items-end">
          <DashboardSelector
            :model-value="activeDashboard"
            :options="options"
            :pending="pending"
            @update:model-value="updateDashboard"
          />

          <div
            v-if="activeDashboard === 'utama'"
            class="space-y-2 rounded-[calc(var(--radius-panel)+0.1rem)] border border-[var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-3"
          >
            <p class="cobalt-kicker text-[0.66rem] text-[var(--app-foreground-soft)]">
              Tahun
            </p>
            <USelectMenu
              :model-value="activeYearValue"
              :items="yearOptions"
              color="neutral"
              variant="ghost"
              class="min-w-0"
              :disabled="!yearOptions.length"
              @update:model-value="updateYear"
            />
          </div>

          <UButton
            label="Refresh"
            icon="i-lucide-refresh-cw"
            color="neutral"
            variant="outline"
            size="md"
            :loading="pending"
            @click="refreshDashboard"
          />
        </div>
      </div>

      <div class="mt-4 flex flex-wrap items-center gap-3 text-sm text-[var(--app-foreground-muted)]">
        <span>Sumber: {{ dashboardData?.meta.sourceLabel || '-' }}</span>
        <span>Diperbarui: {{ refreshedAtLabel }}</span>
      </div>
    </section>

    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      title="Dashboard gagal dimuat"
      :description="error.message"
    />

    <section
      v-if="pending && !dashboardData"
      class="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
    >
      <div
        v-for="skeleton in 4"
        :key="skeleton"
        class="rounded-[calc(var(--radius-shell)-0.55rem)] border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-sm"
      >
        <USkeleton class="h-4 w-32" />
        <USkeleton class="mt-5 h-8 w-24" />
        <USkeleton class="mt-4 h-28 w-full" />
      </div>
    </section>

    <DashboardUtamaGrid
      v-else-if="dashboardData?.kind === 'utama'"
      :payload="dashboardData"
      :pending="pending"
    />

    <DashboardProduksiGrid
      v-else-if="dashboardData?.kind === 'produksi'"
      :payload="dashboardData"
      :pending="pending"
    />
  </div>
</template>
