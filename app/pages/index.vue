<script setup lang="ts">
import { appPermissions } from '~~/auth/permissions'

definePageMeta({
  permission: appPermissions.dashboardRead
})

const { data: currentUser } = await useCurrentUser()
const {
  activeIndicator,
  activeOption,
  data: indicatorData,
  error,
  indicatorOptions,
  pending,
  refreshIndicator,
  selectIndicator
} = useDashboardIndicator()

const refreshedAtLabel = computed(() => {
  if (!indicatorData.value?.meta.updatedAt) {
    return '-'
  }

  return new Date(indicatorData.value.meta.updatedAt).toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short'
  })
})

async function updateIndicator(indicator: (typeof indicatorOptions)[number]['key']) {
  await selectIndicator(indicator)
}
</script>

<template>
  <div class="space-y-6">
    <section class="dashboard-stage rounded-[var(--radius-shell)] border border-[var(--app-border)] px-5 py-5 shadow-sm sm:px-6 lg:px-8 lg:py-7">
      <div class="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.65fr)] xl:items-end">
        <div class="space-y-4">
          <div class="flex flex-wrap items-center gap-2">
            <UBadge color="neutral" variant="subtle">
              Kabupaten Sumbawa Barat
            </UBadge>
            <UBadge color="neutral" variant="outline">
              Sidebar-free workspace
            </UBadge>
            <UBadge color="neutral" variant="outline">
              {{ activeOption.description }}
            </UBadge>
          </div>

          <div class="space-y-2">
            <p class="cobalt-kicker text-[var(--app-foreground-soft)]">
              Monitoring dashboard
            </p>
            <h1 class="max-w-4xl text-2xl font-semibold tracking-tight text-[var(--app-foreground)] sm:text-3xl lg:text-[2.15rem]">
              Monitoring pangan tanpa sidebar dengan satu konteks indikator global.
            </h1>
            <p class="max-w-3xl text-sm leading-6 text-[var(--app-foreground-muted)]">
              Pergantian indikator di kanan memuat payload baru dari server untuk konteks dashboard yang aktif. Filter di dalam widget tetap bekerja di sisi klien terhadap payload yang sudah dimuat.
            </p>
          </div>

          <div class="grid gap-3 sm:grid-cols-3">
            <div class="rounded-2xl border border-white/80 bg-white/80 p-4 backdrop-blur">
              <p class="text-xs uppercase tracking-[0.16em] text-[var(--app-foreground-soft)]">
                Pengguna aktif
              </p>
              <p class="mt-2 text-lg font-semibold text-[var(--app-foreground)]">
                {{ currentUser?.user.name || 'Operator' }}
              </p>
            </div>
            <div class="rounded-2xl border border-white/80 bg-white/80 p-4 backdrop-blur">
              <p class="text-xs uppercase tracking-[0.16em] text-[var(--app-foreground-soft)]">
                Indikator aktif
              </p>
              <p class="mt-2 text-lg font-semibold text-[var(--app-foreground)]">
                {{ activeOption.label }}
              </p>
            </div>
            <div class="rounded-2xl border border-white/80 bg-white/80 p-4 backdrop-blur">
              <p class="text-xs uppercase tracking-[0.16em] text-[var(--app-foreground-soft)]">
                Diperbarui
              </p>
              <p class="mt-2 text-lg font-semibold text-[var(--app-foreground)]">
                {{ refreshedAtLabel }}
              </p>
            </div>
          </div>
        </div>

        <div class="space-y-3 rounded-[calc(var(--radius-shell)-0.35rem)] border border-white/80 bg-white/88 p-4 shadow-sm backdrop-blur">
          <DashboardIndicatorSelector
            :model-value="activeIndicator"
            :options="indicatorOptions"
            :pending="pending"
            @update:model-value="updateIndicator"
          />

          <div class="flex flex-wrap gap-2">
            <UButton
              label="Refresh"
              icon="i-lucide-refresh-cw"
              color="neutral"
              variant="outline"
              :loading="pending"
              @click="refreshIndicator"
            />
            <NuxtLink to="/pengaturan">
              <UButton
                label="Settings"
                icon="i-lucide-settings-2"
                color="neutral"
                variant="ghost"
              />
            </NuxtLink>
          </div>

          <p class="text-sm leading-6 text-[var(--app-foreground-muted)]">
            {{ indicatorData?.meta.description || activeOption.description }}
          </p>
        </div>
      </div>
    </section>

    <UAlert
      v-if="indicatorData && !indicatorData.meta.databaseBacked"
      color="warning"
      variant="subtle"
      icon="i-lucide-database-zap"
      title="Indicator payload saat ini masih server-served mock data"
      description="Repositori ini belum memiliki tabel Prisma khusus pangan. Arsitektur global selector dan local widget filters sudah dipisahkan, tetapi muatan indikator saat ini belum mengambil statistik pangan dari database domain."
    />

    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      title="Indicator gagal dimuat"
      :description="error.message"
    />

    <section
      v-if="pending && !indicatorData"
      class="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
    >
      <div
        v-for="skeleton in 4"
        :key="skeleton"
        class="rounded-[calc(var(--radius-shell)-0.55rem)] border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-sm"
      >
        <USkeleton class="h-4 w-32" />
        <USkeleton class="mt-5 h-8 w-24" />
        <USkeleton class="mt-4 h-16 w-full" />
      </div>
    </section>

    <OverviewMonitoring
      v-else-if="indicatorData?.kind === 'overview'"
      :payload="indicatorData"
      :pending="pending"
    />

    <ProductionMonitoring
      v-else-if="indicatorData?.kind === 'production'"
      :payload="indicatorData"
      :pending="pending"
    />
  </div>
</template>

<style scoped>
.dashboard-stage {
  background:
    radial-gradient(circle at top left, rgba(31, 87, 235, 0.08), transparent 34%),
    radial-gradient(circle at bottom right, rgba(16, 24, 40, 0.05), transparent 28%),
    linear-gradient(135deg, rgba(248, 250, 252, 0.96), rgba(255, 255, 255, 0.98));
}
</style>
