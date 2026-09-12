<script setup lang="ts">
import type {
  DashboardCardDetailContext,
  DashboardConfiguredPayload,
  DashboardDatasetBundle,
  DashboardNeracaStatus,
  DashboardProyeksiCardDefinition,
  DashboardProyeksiCardKey
} from '~~/shared/dashboard'

import {
  dashboardProyeksiCardDefinitions,
  formatDashboardValue,
  getDashboardAvailablePeriods,
  getDashboardDatasetField,
  getDashboardNeracaStatus,
  readDashboardRecordNumber
} from '~~/shared/dashboard'

type ProjectionItem = {
  card: DashboardProyeksiCardDefinition
  dataset: DashboardDatasetBundle | null
  commodity: string
  availability: number | null
  need: number | null
  balance: number | null
  stockEndurance: number | null
  status: DashboardNeracaStatus | null
}

const props = defineProps<{
  payload: DashboardConfiguredPayload
  pending?: boolean
}>()

const selectedPeriod = ref('')
const detailOpen = ref(false)
const selectedDetail = shallowRef<DashboardCardDetailContext | null>(null)
const number = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 })

const datasetsByKey = computed(() => new Map(dashboardProyeksiCardDefinitions.map(card => [
  card.key,
  props.payload.cards[card.key] ?? null
])))
const availablePeriods = computed(() => [...new Set(dashboardProyeksiCardDefinitions.flatMap((card) => {
  const dataset = datasetsByKey.value.get(card.key)
  return dataset ? getDashboardAvailablePeriods(dataset.definition.coverage, card) : []
}))].sort().reverse())

watch(availablePeriods, (periods) => {
  if (!periods.includes(selectedPeriod.value)) {
    selectedPeriod.value = periods[0] ?? ''
  }
}, { immediate: true })

function getDataset(key: DashboardProyeksiCardKey) {
  return datasetsByKey.value.get(key) ?? null
}

function commodityLabel(card: DashboardProyeksiCardDefinition) {
  return card.title.replace(/^Proyeksi Neraca\s+/i, '')
}

function shortCommodityLabel(label: string) {
  const shortLabels: Record<string, string> = {
    'Jagung Pipilan Kering': 'Jagung',
    'Kedelai Biji Kering': 'Kedelai',
    'Daging Sapi/Kerbau': 'Daging Sapi',
    'Telur Ayam Ras': 'Telur',
    'Gula Pasir Konsumsi': 'Gula'
  }

  return shortLabels[label] ?? label
}

function selectedRecord(dataset: DashboardDatasetBundle | null) {
  return dataset?.records.find(record => record.periodDate === selectedPeriod.value)
}

function readStoredMetric(dataset: DashboardDatasetBundle | null, fieldKey: string) {
  return readDashboardRecordNumber(selectedRecord(dataset), fieldKey)
}

function formatMetric(dataset: DashboardDatasetBundle | null, fieldKey: string, value: number | null, signed = false) {
  if (value === null) {
    return null
  }

  const field = dataset ? getDashboardDatasetField(dataset.definition.dataSchema, fieldKey) : null
  const display = formatDashboardValue(value, field)
  return signed && value > 0 ? `+${display}` : display
}

const items = computed<ProjectionItem[]>(() => dashboardProyeksiCardDefinitions.map((card) => {
  const dataset = getDataset(card.key)
  const balance = readStoredMetric(dataset, 'neraca')

  return {
    card,
    dataset,
    commodity: commodityLabel(card),
    availability: readStoredMetric(dataset, 'total_ketersediaan'),
    need: readStoredMetric(dataset, 'total_kebutuhan'),
    balance,
    stockEndurance: readStoredMetric(dataset, 'ketahanan_stok'),
    status: getDashboardNeracaStatus(balance)
  }
}))

const hasSelectedMonthData = computed(() => items.value.some(item => selectedRecord(item.dataset)))
const statusCounts = computed(() => ({
  surplus: items.value.filter(item => item.status === 'Surplus').length,
  deficit: items.value.filter(item => item.status === 'Defisit').length,
  balanced: items.value.filter(item => item.status === 'Seimbang').length
}))
const classifiedCount = computed(() => statusCounts.value.surplus + statusCounts.value.deficit + statusCounts.value.balanced)
const lowestStockEndurance = computed(() => items.value
  .filter((item): item is ProjectionItem & { stockEndurance: number } => item.stockEndurance !== null)
  .sort((left, right) => left.stockEndurance - right.stockEndurance)[0] ?? null)
const chartRows = computed(() => items.value
  .filter((item): item is ProjectionItem & { balance: number, status: DashboardNeracaStatus } => item.balance !== null && item.status !== null)
  .map((item, index) => ({
    index,
    label: shortCommodityLabel(item.commodity),
    commodity: item.commodity,
    value: item.balance,
    color: item.status === 'Surplus' ? '#16a34a' : item.status === 'Defisit' ? '#dc2626' : '#64748b',
    neraca: `${number.format(item.balance)} Ton`
  })))
const distributionData = computed(() => [{ label: 'Surplus', value: statusCounts.value.surplus }, {
  label: 'Defisit', value: statusCounts.value.deficit
}, {
  label: 'Seimbang', value: statusCounts.value.balanced
}])
const sectionSource = computed(() => [...new Set(items.value
  .map(item => item.dataset?.definition.source)
  .filter((source): source is string => Boolean(source)))].join(' · ') || null)

function getChartIndex(row: Record<string, unknown>) {
  return Number(row.index)
}

function getChartValue(row: Record<string, unknown>) {
  return Number(row.value)
}

function getNeracaBarColor(row: Record<string, unknown>) {
  return String(row.color)
}

function chartTickFormat(tick: number | Date) {
  const index = typeof tick === 'number' ? Math.round(tick) : Number.NaN
  return Number.isFinite(index) ? chartRows.value[index]?.label ?? '' : ''
}

function statusColor(status: DashboardNeracaStatus | null) {
  return status === 'Surplus' ? 'success' : status === 'Defisit' ? 'error' : 'neutral'
}

function openDetail(item: ProjectionItem) {
  if (!item.dataset) {
    return
  }

  selectedDetail.value = {
    card: item.card,
    dataset: item.dataset,
    periodDate: selectedPeriod.value || null
  }
  detailOpen.value = true
}
</script>

<template>
  <section class="space-y-3" :class="pending ? 'opacity-75 transition-opacity' : ''">
    <header class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div class="min-w-0">
        <div class="flex flex-wrap items-baseline gap-2">
          <h2 class="text-xl leading-7 font-semibold tracking-tight text-[var(--app-foreground)]">
            Proyeksi Neraca Pangan
          </h2>
          <UBadge color="info" variant="subtle" size="sm">
            Proyeksi
          </UBadge>
        </div>
        <p class="mt-1 text-sm text-[var(--app-foreground-muted)]">
          Perkiraan ketersediaan, kebutuhan, neraca, dan ketahanan stok pangan Kabupaten Sumbawa Barat
        </p>
      </div>
      <DashboardPeriodSelector v-model="selectedPeriod" periodicity="BULANAN" :periods="availablePeriods" />
    </header>

    <p class="flex items-center gap-2 rounded-lg border border-info/15 bg-info/5 px-3 py-2 text-xs text-[var(--app-foreground-muted)]">
      <UIcon name="i-lucide-info" class="size-4 shrink-0 text-info" />
      Data pada bagian ini merupakan data proyeksi dan bukan angka realisasi.
    </p>

    <div v-if="!selectedPeriod || !hasSelectedMonthData" class="rounded-[var(--radius-panel)] border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-7 text-sm text-[var(--app-foreground-muted)]">
      Data proyeksi belum tersedia untuk periode yang dipilih.
    </div>

    <template v-else>
      <section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Ringkasan proyeksi neraca pangan">
        <article class="rounded-[var(--radius-panel)] border border-success/20 bg-[var(--app-surface)] px-3 py-2.5 shadow-sm">
          <div class="flex items-center gap-2.5">
            <span class="flex size-9 items-center justify-center rounded-lg bg-success/10 text-success"><UIcon name="i-lucide-arrow-up" class="size-4" /></span><div>
              <p class="text-lg font-semibold tabular-nums text-[var(--app-foreground)]">
                {{ statusCounts.surplus }}
              </p><p class="text-xs font-medium text-[var(--app-foreground-muted)]">
                Komoditas Surplus
              </p>
            </div>
          </div>
        </article>
        <article class="rounded-[var(--radius-panel)] border border-error/20 bg-[var(--app-surface)] px-3 py-2.5 shadow-sm">
          <div class="flex items-center gap-2.5">
            <span class="flex size-9 items-center justify-center rounded-lg bg-error/10 text-error"><UIcon name="i-lucide-arrow-down" class="size-4" /></span><div>
              <p class="text-lg font-semibold tabular-nums text-[var(--app-foreground)]">
                {{ statusCounts.deficit }}
              </p><p class="text-xs font-medium text-[var(--app-foreground-muted)]">
                Komoditas Defisit
              </p>
            </div>
          </div>
        </article>
        <article class="rounded-[var(--radius-panel)] border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2.5 shadow-sm">
          <div class="flex items-center gap-2.5">
            <span class="flex size-9 items-center justify-center rounded-lg bg-[var(--app-surface-muted)] text-[var(--app-foreground-muted)]"><UIcon name="i-lucide-equal" class="size-4" /></span><div>
              <p class="text-lg font-semibold tabular-nums text-[var(--app-foreground)]">
                {{ statusCounts.balanced }}
              </p><p class="text-xs font-medium text-[var(--app-foreground-muted)]">
                Komoditas Seimbang
              </p>
            </div>
          </div>
        </article>
        <article class="rounded-[var(--radius-panel)] border border-warning/20 bg-[var(--app-surface)] px-3 py-2.5 shadow-sm">
          <div class="flex items-center gap-2.5">
            <span class="flex size-9 items-center justify-center rounded-lg bg-warning/15 text-warning"><UIcon name="i-lucide-calendar-clock" class="size-4" /></span><div>
              <p v-if="lowestStockEndurance" class="text-lg font-semibold tabular-nums text-[var(--app-foreground)]">
                {{ formatMetric(lowestStockEndurance.dataset, 'ketahanan_stok', lowestStockEndurance.stockEndurance) }} <span class="text-xs font-medium text-[var(--app-foreground-muted)]">Hari</span>
              </p><p v-else class="text-lg font-semibold text-[var(--app-foreground-muted)]">
                —
              </p><p class="text-xs font-medium text-[var(--app-foreground-muted)]">
                Ketahanan Stok Terendah<span v-if="lowestStockEndurance"> · {{ lowestStockEndurance.commodity }}</span>
              </p>
            </div>
          </div>
        </article>
      </section>

      <section class="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1.8fr)_minmax(280px,0.8fr)]">
        <DashboardWidget compact>
          <template #header>
            <div>
              <h3 class="text-sm font-semibold text-[var(--app-foreground)]">
                Neraca Pangan per Komoditas
              </h3><p class="mt-0.5 text-xs text-[var(--app-foreground-muted)]">
                Surplus dan defisit berdasarkan periode proyeksi yang dipilih.
              </p>
            </div>
          </template>
          <div v-if="!chartRows.length" class="text-sm text-[var(--app-foreground-muted)]">
            Neraca belum tersedia untuk periode ini.
          </div>
          <ChartsBarChart
            v-else
            :data="chartRows"
            :x="getChartIndex"
            :y="getChartValue"
            :color-accessor="getNeracaBarColor"
            :height="210"
            :x-tick-format="chartTickFormat"
            :y-tick-format="(tick) => number.format(Number(tick))"
            aria-label="Grafik neraca pangan per komoditas"
          />
        </DashboardWidget>
        <DashboardWidget compact>
          <template #header>
            <div>
              <h3 class="text-sm font-semibold text-[var(--app-foreground)]">
                Status Neraca Pangan
              </h3><p class="mt-0.5 text-xs text-[var(--app-foreground-muted)]">
                Proporsi komoditas berdasarkan neraca tersimpan.
              </p>
            </div>
          </template>
          <div v-if="!classifiedCount" class="text-sm text-[var(--app-foreground-muted)]">
            Status neraca belum tersedia.
          </div>
          <template v-else>
            <ChartsDonutChart
              :data="distributionData"
              :value="(row) => Number(row.value)"
              :label="(row) => String(row.label)"
              :colors="['#16a34a', '#dc2626', '#64748b']"
              :height="168"
              :arc-width="28"
              :central-label="String(classifiedCount)"
              central-sub-label="Komoditas"
              :show-legend="false"
              aria-label="Distribusi status neraca pangan"
            /><div class="mt-1 grid grid-cols-3 gap-2 text-center text-xs">
              <span><strong class="block text-success">{{ statusCounts.surplus }}</strong>Surplus</span><span><strong class="block text-error">{{ statusCounts.deficit }}</strong>Defisit</span><span><strong class="block text-[var(--app-foreground-muted)]">{{ statusCounts.balanced }}</strong>Seimbang</span>
            </div>
          </template>
        </DashboardWidget>
      </section>

      <section class="mt-3">
        <div>
          <h3 class="text-base font-semibold text-[var(--app-foreground)]">
            Detail Proyeksi per Komoditas
          </h3><p class="mt-1 text-sm text-[var(--app-foreground-muted)]">
            Ringkasan ketersediaan, kebutuhan, neraca, dan ketahanan stok pada periode terpilih.
          </p>
        </div>
        <div class="mt-2 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article
            v-for="item in items"
            :key="item.card.key"
            class="min-w-0 rounded-[var(--radius-panel)] border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2.5 shadow-sm"
            :class="item.status === 'Defisit' ? 'border-error/30' : ''"
          >
            <div class="flex min-w-0 items-start justify-between gap-2">
              <div class="min-w-0">
                <h4 class="text-sm font-semibold text-[var(--app-foreground)]">
                  {{ item.commodity }}
                </h4><p class="text-xs text-[var(--app-foreground-muted)]">
                  Ton
                </p>
              </div><UBadge
                v-if="item.status"
                :color="statusColor(item.status)"
                variant="subtle"
                size="sm"
              >
                {{ item.status }}
              </UBadge><span v-else class="text-xs text-[var(--app-foreground-muted)]">Tidak ada data</span>
            </div>
            <dl class="mt-2 space-y-1 text-xs">
              <div class="flex items-baseline justify-between gap-3">
                <dt class="text-[var(--app-foreground-muted)]">
                  Ketersediaan
                </dt><dd v-if="item.availability !== null" class="text-right font-medium tabular-nums text-[var(--app-foreground)]">
                  {{ formatMetric(item.dataset, 'total_ketersediaan', item.availability) }} Ton
                </dd><dd v-else class="text-[var(--app-foreground-muted)]">
                  —
                </dd>
              </div><div class="flex items-baseline justify-between gap-3">
                <dt class="text-[var(--app-foreground-muted)]">
                  Kebutuhan
                </dt><dd v-if="item.need !== null" class="text-right font-medium tabular-nums text-[var(--app-foreground)]">
                  {{ formatMetric(item.dataset, 'total_kebutuhan', item.need) }} Ton
                </dd><dd v-else class="text-[var(--app-foreground-muted)]">
                  —
                </dd>
              </div><div class="flex items-baseline justify-between gap-3 border-t border-[var(--app-border)] pt-1.5">
                <dt class="text-[var(--app-foreground-muted)]">
                  Neraca
                </dt><dd v-if="item.balance !== null" class="text-right font-semibold tabular-nums" :class="item.status === 'Surplus' ? 'text-success' : item.status === 'Defisit' ? 'text-error' : 'text-[var(--app-foreground)]'">
                  {{ formatMetric(item.dataset, 'neraca', item.balance, true) }} Ton
                </dd><dd v-else class="text-[var(--app-foreground-muted)]">
                  —
                </dd>
              </div><div class="flex items-baseline justify-between gap-3">
                <dt class="text-[var(--app-foreground-muted)]">
                  Ketahanan Stok
                </dt><dd v-if="item.stockEndurance !== null" class="text-right font-medium tabular-nums text-[var(--app-foreground)]">
                  {{ formatMetric(item.dataset, 'ketahanan_stok', item.stockEndurance) }} Hari
                </dd><dd v-else class="text-[var(--app-foreground-muted)]">
                  —
                </dd>
              </div>
            </dl>
            <div class="mt-2 flex justify-end">
              <UButton
                size="xs"
                color="neutral"
                variant="ghost"
                trailing-icon="i-lucide-arrow-right"
                :disabled="!item.dataset"
                @click="openDetail(item)"
              >
                Lihat detail
              </UButton>
            </div>
          </article>
        </div>
      </section>

      <footer class="mt-2">
        <DashboardCardSource :source="sectionSource" />
      </footer>
    </template>
    <DashboardCardDetailModal v-model:open="detailOpen" :context="selectedDetail" />
  </section>
</template>
