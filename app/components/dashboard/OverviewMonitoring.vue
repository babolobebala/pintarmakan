<script setup lang="ts">
import type { DashboardMetricCard, DashboardOverviewPayload } from '~~/shared/dashboard'

const props = defineProps<{
  payload: DashboardOverviewPayload
  pending?: boolean
}>()

type OverviewMetricKey = 'ikp' | 'pph' | 'availability'

const selectedMetric = ref<OverviewMetricKey>('ikp')
const selectedWindow = ref<'3' | '5'>('5')

const metricMeta: Record<OverviewMetricKey, { label: string, unit: string }> = {
  ikp: {
    label: 'IKP',
    unit: 'poin'
  },
  pph: {
    label: 'PPH',
    unit: 'poin'
  },
  availability: {
    label: 'Ketersediaan',
    unit: 'ribu ton'
  }
}

const visibleTrend = computed(() => {
  return selectedWindow.value === '3'
    ? props.payload.yearlyTrend.slice(-3)
    : props.payload.yearlyTrend
})

const maxTrendValue = computed(() => {
  return Math.max(...visibleTrend.value.map(item => item[selectedMetric.value]), 1)
})

const totalPriorityAreas = computed(() => {
  return props.payload.villagePriority.reduce((total, item) => total + item.count, 0)
})

function toneClasses(tone: DashboardMetricCard['tone']) {
  switch (tone) {
    case 'emerald':
      return {
        badge: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300',
        border: 'border-emerald-500/20',
        dot: 'bg-emerald-500'
      }
    case 'amber':
      return {
        badge: 'bg-amber-500/12 text-amber-700 dark:text-amber-300',
        border: 'border-amber-500/20',
        dot: 'bg-amber-500'
      }
    case 'sky':
      return {
        badge: 'bg-sky-500/12 text-sky-700 dark:text-sky-300',
        border: 'border-sky-500/20',
        dot: 'bg-sky-500'
      }
    case 'rose':
      return {
        badge: 'bg-rose-500/12 text-rose-700 dark:text-rose-300',
        border: 'border-rose-500/20',
        dot: 'bg-rose-500'
      }
  }
}
</script>

<template>
  <div
    class="space-y-4"
    :class="pending ? 'opacity-75 transition-opacity' : ''"
  >
    <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <DashboardWidget
        v-for="card in payload.metrics"
        :key="card.label"
        :title="card.label"
        icon="i-lucide-badge-info"
        muted
      >
        <div class="space-y-4">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-3xl font-semibold tracking-tight text-[var(--app-foreground)]">
                {{ card.value }}
              </p>
              <p class="mt-2 text-sm text-[var(--app-foreground-muted)]">
                {{ card.period }}
              </p>
            </div>

            <span
              class="rounded-full border px-3 py-1 text-xs font-medium"
              :class="[toneClasses(card.tone).badge, toneClasses(card.tone).border]"
            >
              {{ card.delta }}
            </span>
          </div>

          <p class="text-sm leading-6 text-[var(--app-foreground-muted)]">
            {{ card.note }}
          </p>
        </div>
      </DashboardWidget>
    </section>

    <section class="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.8fr)]">
      <DashboardWidget
        title="Tren indikator utama"
        description="Filter widget ini hanya mengubah statistik yang sudah dimuat pada payload indikator."
        icon="i-lucide-chart-no-axes-column"
      >
        <template #actions>
          <div class="flex flex-wrap gap-2">
            <UButton
              v-for="option in [
                { key: 'ikp', label: 'IKP' },
                { key: 'pph', label: 'PPH' },
                { key: 'availability', label: 'Ketersediaan' }
              ]"
              :key="option.key"
              :label="option.label"
              size="xs"
              color="neutral"
              :variant="selectedMetric === option.key ? 'solid' : 'outline'"
              @click="selectedMetric = option.key as OverviewMetricKey"
            />
            <UButton
              v-for="windowSize in ['3', '5']"
              :key="windowSize"
              :label="`${windowSize} tahun`"
              size="xs"
              color="neutral"
              :variant="selectedWindow === windowSize ? 'solid' : 'outline'"
              @click="selectedWindow = windowSize as '3' | '5'"
            />
          </div>
        </template>

        <div class="space-y-5">
          <div class="grid gap-3 sm:grid-cols-3">
            <div class="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-muted)] p-4">
              <p class="text-xs uppercase tracking-[0.16em] text-[var(--app-foreground-soft)]">
                Seri aktif
              </p>
              <p class="mt-2 text-lg font-semibold text-[var(--app-foreground)]">
                {{ metricMeta[selectedMetric].label }}
              </p>
            </div>
            <div class="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-muted)] p-4">
              <p class="text-xs uppercase tracking-[0.16em] text-[var(--app-foreground-soft)]">
                Rentang
              </p>
              <p class="mt-2 text-lg font-semibold text-[var(--app-foreground)]">
                {{ visibleTrend[0]?.year }} - {{ visibleTrend.at(-1)?.year }}
              </p>
            </div>
            <div class="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-muted)] p-4">
              <p class="text-xs uppercase tracking-[0.16em] text-[var(--app-foreground-soft)]">
                Satuan
              </p>
              <p class="mt-2 text-lg font-semibold text-[var(--app-foreground)]">
                {{ metricMeta[selectedMetric].unit }}
              </p>
            </div>
          </div>

          <div class="grid gap-3 md:grid-cols-5">
            <article
              v-for="item in visibleTrend"
              :key="item.year"
              class="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4"
            >
              <div class="flex items-center justify-between gap-3">
                <p class="text-sm font-medium text-[var(--app-foreground)]">
                  {{ item.year }}
                </p>
                <p class="text-sm text-[var(--app-foreground-muted)]">
                  {{ item[selectedMetric].toFixed(1).replace('.', ',') }}
                </p>
              </div>
              <div class="mt-4 flex h-28 items-end">
                <div class="w-full rounded-full bg-[var(--app-border)]/70">
                  <div
                    class="rounded-full bg-[var(--app-foreground)]"
                    :style="{ height: `${(item[selectedMetric] / maxTrendValue) * 100}%` }"
                  />
                </div>
              </div>
            </article>
          </div>
        </div>
      </DashboardWidget>

      <DashboardWidget
        title="Prioritas desa dan kelurahan"
        description="Sebaran prioritas wilayah untuk penentuan intervensi lapangan."
        icon="i-lucide-map-pinned"
      >
        <div class="space-y-3">
          <div class="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-muted)] p-4">
            <p class="text-xs uppercase tracking-[0.16em] text-[var(--app-foreground-soft)]">
              Total wilayah terpetakan
            </p>
            <p class="mt-2 text-3xl font-semibold text-[var(--app-foreground)]">
              {{ totalPriorityAreas }}
            </p>
          </div>

          <div
            v-for="item in payload.villagePriority"
            :key="item.label"
            class="space-y-2 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4"
          >
            <div class="flex items-center justify-between gap-3 text-sm">
              <div class="flex items-center gap-2">
                <span class="size-2.5 rounded-full" :style="{ backgroundColor: item.tone }" />
                <span class="font-medium text-[var(--app-foreground)]">{{ item.label }}</span>
              </div>
              <span class="text-[var(--app-foreground-muted)]">{{ item.count }} wilayah</span>
            </div>

            <div class="h-2 overflow-hidden rounded-full bg-[var(--app-border)]">
              <div
                class="h-full rounded-full"
                :style="{ width: `${(item.count / totalPriorityAreas) * 100}%`, backgroundColor: item.tone }"
              />
            </div>

            <p class="text-sm text-[var(--app-foreground-muted)]">
              {{ item.description }}
            </p>
          </div>
        </div>
      </DashboardWidget>
    </section>

    <section class="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
      <DashboardWidget
        title="Snapshot wilayah"
        description="Perbandingan singkat IKP, PPH, dan cadangan pangan per kecamatan."
        icon="i-lucide-building-2"
      >
        <div class="overflow-hidden rounded-2xl border border-[var(--app-border)]">
          <table class="min-w-full divide-y divide-[var(--app-border)] text-sm">
            <thead class="bg-[var(--app-surface-muted)]">
              <tr>
                <th class="px-4 py-3 text-left font-medium text-[var(--app-foreground-soft)]">
                  Wilayah
                </th>
                <th class="px-4 py-3 text-left font-medium text-[var(--app-foreground-soft)]">
                  IKP
                </th>
                <th class="px-4 py-3 text-left font-medium text-[var(--app-foreground-soft)]">
                  PPH
                </th>
                <th class="px-4 py-3 text-left font-medium text-[var(--app-foreground-soft)]">
                  CPPD
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[var(--app-border)] bg-[var(--app-surface)]">
              <tr v-for="item in payload.regionalSnapshots" :key="item.region">
                <td class="px-4 py-3">
                  <p class="font-medium text-[var(--app-foreground)]">
                    {{ item.region }}
                  </p>
                  <p class="text-xs text-[var(--app-foreground-muted)]">
                    {{ item.status }}
                  </p>
                </td>
                <td class="px-4 py-3 text-[var(--app-foreground-muted)]">
                  {{ item.ikp.toFixed(1).replace('.', ',') }}
                </td>
                <td class="px-4 py-3 text-[var(--app-foreground-muted)]">
                  {{ item.pph.toFixed(1).replace('.', ',') }}
                </td>
                <td class="px-4 py-3 text-[var(--app-foreground-muted)]">
                  {{ item.cppd }} ton
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </DashboardWidget>

      <DashboardWidget
        title="Agenda analisis"
        description="Poin tindak lanjut untuk briefing pimpinan dan sinkronisasi lintas modul."
        icon="i-lucide-clipboard-list"
      >
        <div class="space-y-3">
          <article
            v-for="item in payload.spotlightPrograms"
            :key="item.title"
            class="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4"
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="font-medium text-[var(--app-foreground)]">
                  {{ item.title }}
                </p>
                <p class="mt-2 text-sm leading-6 text-[var(--app-foreground-muted)]">
                  {{ item.description }}
                </p>
              </div>

              <UBadge color="neutral" variant="subtle">
                {{ item.badge }}
              </UBadge>
            </div>
          </article>
        </div>
      </DashboardWidget>
    </section>
  </div>
</template>
