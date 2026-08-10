<script setup lang="ts">
import type { DashboardProduksiPayload } from '~~/shared/dashboard'

defineProps<{
  payload: DashboardProduksiPayload
  pending?: boolean
}>()
</script>

<template>
  <div
    class="space-y-3"
    :class="pending ? 'opacity-75 transition-opacity' : ''"
  >
    <section class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <DashboardWidget
        v-for="widget in payload.widgets.slice(0, 3)"
        :key="widget.id"
        :title="widget.title"
        :icon="widget.icon"
        muted
      >
        <div class="space-y-2">
          <div class="flex items-start justify-between gap-3">
            <p class="text-xl font-semibold tracking-tight text-[var(--app-foreground)]">
              {{ widget.value }}
            </p>
            <UBadge color="neutral" variant="subtle">
              {{ widget.badge }}
            </UBadge>
          </div>
          <p class="text-xs leading-5 text-[var(--app-foreground-muted)]">
            {{ widget.note }}
          </p>
        </div>
      </DashboardWidget>
    </section>

    <section class="grid gap-3 xl:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.75fr)]">
      <DashboardWidget
        :title="payload.widgets[3]?.title"
        :icon="payload.widgets[3]?.icon"
      >
        <div class="grid gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(220px,0.85fr)]">
          <div class="rounded-2xl border border-dashed border-[var(--app-border)] bg-[var(--app-surface-muted)] p-4">
            <div class="grid h-full min-h-[220px] grid-cols-3 gap-2">
              <div class="rounded-xl bg-[var(--app-surface)]/85" />
              <div class="rounded-xl bg-[var(--app-surface)]/65" />
              <div class="rounded-xl bg-[var(--app-surface)]/85" />
              <div class="col-span-2 rounded-xl bg-[var(--app-surface)]/70" />
              <div class="rounded-xl bg-[var(--app-surface)]/90" />
              <div class="rounded-xl bg-[var(--app-surface)]/75" />
              <div class="col-span-2 rounded-xl bg-[var(--app-surface)]/60" />
            </div>
          </div>

          <div class="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
            <p class="text-xs uppercase tracking-[0.16em] text-[var(--app-foreground-soft)]">
              Status
            </p>
            <p class="mt-2 text-sm font-medium text-[var(--app-foreground)]">
              {{ payload.widgets[3]?.value }}
            </p>
            <p class="mt-2 text-xs leading-5 text-[var(--app-foreground-muted)]">
              {{ payload.widgets[3]?.note }}
            </p>
          </div>
        </div>
      </DashboardWidget>

      <DashboardWidget
        title="Placeholder"
        icon="i-lucide-badge-info"
        muted
      >
        <div class="space-y-2">
          <div
            v-for="widget in payload.widgets"
            :key="`${widget.id}-status`"
            class="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-3.5"
          >
            <div class="flex items-center justify-between gap-3">
              <p class="text-sm font-medium text-[var(--app-foreground)]">
                {{ widget.title }}
              </p>
              <UBadge color="neutral" variant="outline">
                {{ widget.badge }}
              </UBadge>
            </div>
            <p class="mt-1.5 text-xs leading-5 text-[var(--app-foreground-muted)]">
              {{ widget.note }}
            </p>
          </div>
        </div>
      </DashboardWidget>
    </section>
  </div>
</template>
