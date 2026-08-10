<script setup lang="ts">
import type { DashboardProduksiPayload } from '~~/shared/dashboard'

defineProps<{
  payload: DashboardProduksiPayload
  pending?: boolean
}>()
</script>

<template>
  <div
    class="space-y-4"
    :class="pending ? 'opacity-75 transition-opacity' : ''"
  >
    <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <DashboardWidget
        v-for="widget in payload.widgets.slice(0, 3)"
        :key="widget.id"
        :title="widget.title"
        :icon="widget.icon"
        muted
      >
        <div class="space-y-3">
          <div class="flex items-start justify-between gap-3">
            <p class="text-2xl font-semibold tracking-tight text-[var(--app-foreground)]">
              {{ widget.value }}
            </p>
            <UBadge color="neutral" variant="subtle">
              {{ widget.badge }}
            </UBadge>
          </div>
          <p class="text-sm leading-6 text-[var(--app-foreground-muted)]">
            {{ widget.note }}
          </p>
        </div>
      </DashboardWidget>
    </section>

    <section class="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.75fr)]">
      <DashboardWidget
        :title="payload.widgets[3]?.title"
        :icon="payload.widgets[3]?.icon"
        description="Grid dashboard produksi sudah dipisahkan; widget ini masih placeholder sampai dataset produksi riil dihubungkan."
      >
        <div class="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(260px,0.9fr)]">
          <div class="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-muted)] p-5">
            <p class="cobalt-kicker text-[0.66rem] text-[var(--app-foreground-soft)]">
              Placeholder canvas
            </p>
            <p class="mt-3 text-sm leading-6 text-[var(--app-foreground-muted)]">
              Slot lebar ini disiapkan untuk chart, ranking, atau peta produksi tanpa perlu mengubah struktur page shell.
            </p>
          </div>

          <div class="rounded-2xl border border-dashed border-[var(--app-border)] bg-[var(--app-surface)] p-5">
            <p class="text-sm font-medium text-[var(--app-foreground)]">
              {{ payload.widgets[3]?.value }}
            </p>
            <p class="mt-3 text-sm leading-6 text-[var(--app-foreground-muted)]">
              {{ payload.widgets[3]?.note }}
            </p>
          </div>
        </div>
      </DashboardWidget>

      <DashboardWidget
        title="Status integrasi"
        icon="i-lucide-badge-info"
        description="Dashboard Produksi Pangan sengaja tetap dummy agar switching dashboard tervalidasi tanpa memalsukan data produksi."
        muted
      >
        <div class="space-y-3">
          <div
            v-for="widget in payload.widgets"
            :key="`${widget.id}-status`"
            class="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4"
          >
            <div class="flex items-center justify-between gap-3">
              <p class="font-medium text-[var(--app-foreground)]">
                {{ widget.title }}
              </p>
              <UBadge color="neutral" variant="outline">
                {{ widget.badge }}
              </UBadge>
            </div>
            <p class="mt-2 text-sm leading-6 text-[var(--app-foreground-muted)]">
              {{ widget.note }}
            </p>
          </div>
        </div>
      </DashboardWidget>
    </section>
  </div>
</template>
