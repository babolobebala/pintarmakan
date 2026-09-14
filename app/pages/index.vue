<script setup lang="ts">
import DashboardSelector from '~/components/dashboard/DashboardSelector.vue'
import DashboardCadanganPanganPemerintahGrid from '~/components/dashboard/grids/DashboardCadanganPanganPemerintahGrid.vue'
import DashboardHargaPanganGrid from '~/components/dashboard/grids/DashboardHargaPanganGrid.vue'
import DashboardKerawananPanganGrid from '~/components/dashboard/grids/DashboardKerawananPanganGrid.vue'
import DashboardKonsumsiPphGrid from '~/components/dashboard/grids/DashboardKonsumsiPphGrid.vue'
import DashboardKeamananPanganGrid from '~/components/dashboard/grids/DashboardKeamananPanganGrid.vue'
import DashboardLumbungPanganGrid from '~/components/dashboard/grids/DashboardLumbungPanganGrid.vue'
import DashboardProduksiGrid from '~/components/dashboard/grids/DashboardProduksiGrid.vue'
import DashboardStokPanganGrid from '~/components/dashboard/grids/DashboardStokPanganGrid.vue'
import DashboardUtamaGrid from '~/components/dashboard/grids/DashboardUtamaGrid.vue'

import { appPermissions } from '~~/auth/permissions'

definePageMeta({
  permission: appPermissions.dashboardRead
})

const {
  activeDashboard,
  activeKeamananPanganSection,
  data: dashboardData,
  error,
  options,
  pending,
  refreshDashboard,
  selectKeamananPanganSection,
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
        <h1 class="mt-1 text-xl font-semibold tracking-tight text-[var(--app-foreground)] sm:text-2xl">
          {{ dashboardData?.meta.title ?? options.find(option => option.key === activeDashboard)?.label }}
        </h1>
        <p v-if="activeDashboard === 'dashboard-utama'" class="mt-1 text-sm text-[var(--app-foreground-muted)]">
          Ringkasan kondisi pangan Kabupaten Sumbawa Barat
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

    <section
      v-else-if="dashboardData?.kind === 'empty'"
      class="rounded-[calc(var(--radius-shell)-0.55rem)] border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-10"
    >
      <UEmpty
        icon="i-lucide-layout-panel-top"
        title="Belum ada indikator yang dikonfigurasi pada kelompok ini."
        variant="naked"
      />
    </section>

    <DashboardUtamaGrid
      v-else-if="dashboardData?.kind === 'dashboard-utama'"
      :payload="dashboardData"
      :pending="pending"
    />

    <DashboardProduksiGrid
      v-else-if="dashboardData?.kind === 'configured' && activeDashboard === 'produksi-ketersediaan'"
      :payload="dashboardData"
      :pending="pending"
    />

    <DashboardStokPanganGrid
      v-else-if="dashboardData?.kind === 'configured' && activeDashboard === 'stok-pangan'"
      :payload="dashboardData"
      :pending="pending"
    />

    <DashboardCadanganPanganPemerintahGrid
      v-else-if="dashboardData?.kind === 'configured' && activeDashboard === 'cadangan-pangan-pemerintah'"
      :payload="dashboardData"
      :pending="pending"
    />

    <DashboardHargaPanganGrid
      v-else-if="dashboardData?.kind === 'configured' && activeDashboard === 'harga-pangan'"
      :payload="dashboardData"
      :pending="pending"
    />

    <DashboardKerawananPanganGrid
      v-else-if="dashboardData?.kind === 'configured' && activeDashboard === 'kerawanan-pangan'"
      :payload="dashboardData"
      :pending="pending"
    />

    <DashboardKonsumsiPphGrid
      v-else-if="dashboardData?.kind === 'configured' && activeDashboard === 'konsumsi-pph'"
      :payload="dashboardData"
      :pending="pending"
    />

    <DashboardKeamananPanganGrid
      v-else-if="dashboardData?.kind === 'configured' && activeDashboard === 'keamanan-pangan'"
      :payload="dashboardData"
      :section="activeKeamananPanganSection"
      :pending="pending"
      @update:section="selectKeamananPanganSection"
    />

    <DashboardLumbungPanganGrid
      v-else-if="dashboardData?.kind === 'configured' && activeDashboard === 'data-pendukung'"
      :payload="dashboardData"
      :pending="pending"
    />
  </div>
</template>
