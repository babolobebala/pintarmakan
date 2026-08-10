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
  data: dashboardData,
  error,
  options,
  pending,
  refreshDashboard,
  selectDashboard
} = useDashboardState()

async function updateDashboard(dashboard: (typeof options)[number]['key']) {
  await selectDashboard(dashboard)
}
</script>

<template>
  <div class="space-y-4">
    <section class="flex flex-wrap items-center justify-between gap-3">
      <div class="min-w-0">
        <p class="text-[0.68rem] font-medium uppercase tracking-[0.18em] text-[var(--app-foreground-soft)]">
          Dashboard
        </p>
      </div>

      <div class="flex items-center gap-2">
        <DashboardSelector
          :model-value="activeDashboard"
          :options="options"
          :pending="pending"
          @update:model-value="updateDashboard"
        />
        <UButton
          icon="i-lucide-refresh-cw"
          color="neutral"
          variant="ghost"
          size="sm"
          :loading="pending"
          aria-label="Refresh dashboard"
          @click="refreshDashboard"
        />
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
      class="grid gap-3 md:grid-cols-2 xl:grid-cols-4"
    >
      <div
        v-for="skeleton in 4"
        :key="skeleton"
        class="rounded-[calc(var(--radius-shell)-0.55rem)] border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-sm"
      >
        <USkeleton class="h-4 w-28" />
        <USkeleton class="mt-4 h-8 w-20" />
        <USkeleton class="mt-3 h-24 w-full" />
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
