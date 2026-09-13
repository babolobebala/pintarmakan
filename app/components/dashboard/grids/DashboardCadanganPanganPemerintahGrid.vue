<script setup lang="ts">
import type {
  DashboardCardDetailContext,
  DashboardConfiguredPayload,
  DashboardDatasetBundle,
  DashboardDatasetRecord
} from '~~/shared/dashboard'
import type { DatasetSchemaField } from '~~/shared/datasets'

import {
  dashboardCardDefinitions,
  getDashboardAvailablePeriods,
  getDashboardDatasetField,
  readDashboardRecordNumber,
  readDashboardRecordText
} from '~~/shared/dashboard'
import { formatDatasetPeriod } from '~~/shared/datasets'

type MetricKey = 'stok_awal' | 'pengadaan' | 'penyaluran' | 'stok_akhir'
type MetricPresentation = { key: MetricKey, fallbackLabel: string, icon: string, tone: string, prefix?: '+' | '-' }

const props = defineProps<{
  payload: DashboardConfiguredPayload
  pending?: boolean
}>()

const cppdCard = dashboardCardDefinitions.find(card => card.key === 'cppd')
const metricPresentation: readonly MetricPresentation[] = [
  { key: 'stok_awal', fallbackLabel: 'Stok Awal', icon: 'i-lucide-package-open', tone: 'bg-info/10 text-info' },
  { key: 'pengadaan', fallbackLabel: 'Pengadaan', icon: 'i-lucide-arrow-down-to-line', tone: 'bg-success/10 text-success', prefix: '+' },
  { key: 'penyaluran', fallbackLabel: 'Penyaluran', icon: 'i-lucide-arrow-up-from-line', tone: 'bg-warning/10 text-warning', prefix: '-' },
  { key: 'stok_akhir', fallbackLabel: 'Stok Akhir', icon: 'i-lucide-warehouse', tone: 'bg-primary/10 text-primary' }
]

const selectedPeriod = ref('')
const detailOpen = ref(false)
const selectedDetail = shallowRef<DashboardCardDetailContext | null>(null)
const dataset = computed<DashboardDatasetBundle | null>(() => props.payload.cards.cppd ?? null)
const availablePeriods = computed(() => dataset.value && cppdCard
  ? getDashboardAvailablePeriods(dataset.value.definition.coverage, cppdCard)
  : [])
const recordsByPeriod = computed(() => new Map(
  (dataset.value?.records ?? []).map(record => [record.periodDate, record])
))
const selectedRecord = computed(() => recordsByPeriod.value.get(selectedPeriod.value))
const selectedPeriodLabel = computed(() => selectedPeriod.value
  ? formatDatasetPeriod('BULANAN', selectedPeriod.value)
  : null)
const keteranganField = computed(() => dataset.value
  ? getDashboardDatasetField(dataset.value.definition.dataSchema, 'keterangan')
  : null)
const selectedKeterangan = computed(() => readDashboardRecordText(selectedRecord.value, keteranganField.value?.key ?? null))
const source = computed(() => dataset.value?.definition.source ?? null)
const selectedYear = computed(() => selectedPeriod.value.slice(0, 4))

watch(availablePeriods, (periods) => {
  if (!periods.includes(selectedPeriod.value)) {
    selectedPeriod.value = periods[0] ?? ''
  }
}, { immediate: true })

function displayLabel(field: DatasetSchemaField | null, fallbackLabel: string) {
  return field?.label.replace(/\s*\([^)]*\)\s*$/, '') ?? fallbackLabel
}

function fieldForMetric(key: MetricKey) {
  return dataset.value ? getDashboardDatasetField(dataset.value.definition.dataSchema, key) : null
}

function valueForMetric(record: DashboardDatasetRecord | undefined, key: MetricKey) {
  return readDashboardRecordNumber(record, key)
}

function formatValue(value: number | null, field: DatasetSchemaField | null) {
  if (value === null) {
    return '—'
  }

  return new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: field?.validation?.decimalPlaces ?? 2
  }).format(value)
}

const metrics = computed(() => metricPresentation.map((metric) => {
  const field = fieldForMetric(metric.key)

  return {
    ...metric,
    field,
    label: displayLabel(field, metric.fallbackLabel),
    value: valueForMetric(selectedRecord.value, metric.key),
    unit: field?.unit ?? null
  }
}))
const historyRows = computed(() => !selectedYear.value
  ? []
  : availablePeriods.value
      .filter(periodDate => periodDate.startsWith(selectedYear.value))
      .slice()
      .sort((left, right) => left.localeCompare(right))
      .map((periodDate) => {
        const record = recordsByPeriod.value.get(periodDate)

        return {
          periodDate,
          record,
          label: new Intl.DateTimeFormat('id-ID', { month: 'long', timeZone: 'UTC' })
            .format(new Date(`${periodDate}T00:00:00Z`)),
          keterangan: readDashboardRecordText(record, keteranganField.value?.key ?? null)
        }
      }))

function openDetail() {
  if (!dataset.value || !cppdCard) {
    return
  }

  selectedDetail.value = {
    card: cppdCard,
    dataset: dataset.value,
    periodDate: selectedPeriod.value || null
  }
  detailOpen.value = true
}
</script>

<template>
  <section class="space-y-3" :class="pending ? 'opacity-75 transition-opacity' : ''">
    <header class="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
      <div class="min-w-0">
        <div class="flex items-center gap-2">
          <span class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <UIcon name="i-lucide-warehouse" class="size-4" />
          </span>
          <div class="min-w-0">
            <h2 class="text-xl leading-7 font-semibold tracking-tight text-[var(--app-foreground)]">
              Cadangan Pangan Pemerintah
            </h2>
            <p class="mt-0.5 text-sm font-medium text-[var(--app-foreground-muted)]">
              Cadangan Pangan Pemerintah Daerah (CPPD) Kabupaten Sumbawa Barat
            </p>
          </div>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <DashboardPeriodSelector v-model="selectedPeriod" periodicity="BULANAN" :periods="availablePeriods" />
        <UButton
          size="sm"
          color="neutral"
          variant="outline"
          trailing-icon="i-lucide-arrow-right"
          class="cursor-pointer whitespace-nowrap"
          :disabled="!dataset || !cppdCard"
          @click="openDetail"
        >
          Lihat seluruh data
        </UButton>
      </div>
    </header>

    <div v-if="!selectedPeriod" class="rounded-[var(--radius-panel)] border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-8 text-sm text-[var(--app-foreground-muted)]">
      Belum ada periode CPPD yang tersedia.
    </div>

    <template v-else>
      <section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Ringkasan Cadangan Pangan Pemerintah">
        <article v-for="metric in metrics" :key="metric.key" class="min-w-0 rounded-[var(--radius-panel)] border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2.5 shadow-sm">
          <div class="flex min-w-0 items-center gap-2.5">
            <span :class="['flex size-9 shrink-0 items-center justify-center rounded-lg', metric.tone]">
              <UIcon :name="metric.icon" class="size-4" />
            </span>
            <div class="min-w-0">
              <p class="text-xs font-medium text-[var(--app-foreground-muted)]">
                {{ metric.label }}
              </p>
              <p class="mt-0.5 break-words text-lg font-semibold tracking-tight tabular-nums text-[var(--app-foreground)]">
                {{ metric.value === null ? '—' : `${metric.prefix ?? ''}${formatValue(metric.value, metric.field)}` }}
                <span v-if="metric.value !== null && metric.unit" class="ml-1 text-xs font-medium text-[var(--app-foreground-muted)]">{{ metric.unit }}</span>
              </p>
              <p v-if="metric.value === null" class="mt-0.5 text-xs text-[var(--app-foreground-muted)]">
                Data belum tersedia
              </p>
            </div>
          </div>
        </article>
      </section>

      <section class="grid items-start gap-3 xl:grid-cols-12">
        <DashboardWidget compact class="xl:col-span-8">
          <template #header>
            <div class="flex min-w-0 items-center gap-2">
              <UIcon name="i-lucide-scale" class="size-4 text-primary" />
              <h3 class="text-sm font-semibold text-[var(--app-foreground)]">
                Posisi Cadangan Pangan
              </h3>
            </div>
          </template>

          <div class="space-y-2">
            <div v-for="metric in metrics.slice(0, 3)" :key="metric.key" class="flex items-center justify-between gap-4 text-sm">
              <p class="text-[var(--app-foreground-muted)]">
                {{ metric.label }}
              </p>
              <p class="shrink-0 font-semibold tabular-nums text-[var(--app-foreground)]">
                <span v-if="metric.value !== null && metric.prefix">{{ metric.prefix }}</span>{{ formatValue(metric.value, metric.field) }}<span v-if="metric.value !== null && metric.unit" class="ml-1 text-xs font-medium text-[var(--app-foreground-muted)]">{{ metric.unit }}</span>
              </p>
            </div>
            <div class="border-t border-[var(--app-border)] pt-2">
              <div v-for="metric in metrics.slice(3)" :key="metric.key" class="flex items-center justify-between gap-4 text-sm">
                <p class="font-semibold text-[var(--app-foreground)]">
                  {{ metric.label }}
                </p>
                <p class="shrink-0 text-base font-semibold tabular-nums text-[var(--app-foreground)]">
                  {{ formatValue(metric.value, metric.field) }}<span v-if="metric.value !== null && metric.unit" class="ml-1 text-xs font-medium text-[var(--app-foreground-muted)]">{{ metric.unit }}</span>
                </p>
              </div>
            </div>
          </div>
        </DashboardWidget>

        <div class="grid gap-3 sm:grid-cols-2 xl:col-span-4 xl:grid-cols-1">
          <DashboardWidget compact>
            <template #header>
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-calendar-days" class="size-4 text-info" />
                <h3 class="text-sm font-semibold text-[var(--app-foreground)]">
                  Informasi Periode
                </h3>
              </div>
            </template>
            <p class="text-base font-semibold text-[var(--app-foreground)]">
              {{ selectedPeriodLabel }}
            </p>
          </DashboardWidget>

          <DashboardWidget compact>
            <template #header>
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-message-square-text" class="size-4 text-[var(--app-foreground-soft)]" />
                <h3 class="text-sm font-semibold text-[var(--app-foreground)]">
                  Keterangan
                </h3>
              </div>
            </template>
            <p class="text-sm leading-5 text-[var(--app-foreground-muted)]">
              {{ selectedKeterangan ?? 'Tidak ada keterangan.' }}
            </p>
          </DashboardWidget>
        </div>
      </section>

      <DashboardWidget compact>
        <template #header>
          <div>
            <h3 class="text-sm font-semibold text-[var(--app-foreground)]">
              Riwayat Cadangan Pangan Pemerintah
            </h3>
            <p class="mt-0.5 text-xs text-[var(--app-foreground-muted)]">
              Riwayat CPPD untuk tahun {{ selectedYear }}.
            </p>
          </div>
        </template>

        <div class="overflow-x-auto">
          <table class="w-full min-w-[840px] text-sm">
            <thead class="border-y border-[var(--app-border)] bg-[var(--app-surface-muted)] text-left text-[0.68rem] font-medium tracking-[0.1em] text-[var(--app-foreground-muted)] uppercase">
              <tr>
                <th class="px-3 py-2.5">
                  Bulan
                </th>
                <th v-for="metric in metrics" :key="metric.key" class="px-3 py-2.5 text-right">
                  {{ metric.label }}
                </th>
                <th class="px-3 py-2.5">
                  Keterangan
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[var(--app-border)]">
              <tr v-for="row in historyRows" :key="row.periodDate" :class="row.periodDate === selectedPeriod ? 'bg-primary/5' : ''">
                <td class="px-3 py-2.5 font-medium text-[var(--app-foreground)]">
                  {{ row.label }}
                </td>
                <td v-for="metric in metrics" :key="metric.key" class="px-3 py-2.5 text-right font-medium tabular-nums text-[var(--app-foreground)]">
                  {{ formatValue(valueForMetric(row.record, metric.key), metric.field) }}<span v-if="valueForMetric(row.record, metric.key) !== null && metric.unit" class="ml-1 text-xs font-normal text-[var(--app-foreground-muted)]">{{ metric.unit }}</span>
                </td>
                <td class="max-w-72 px-3 py-2.5 text-[var(--app-foreground-muted)]">
                  <span class="block whitespace-normal break-words">{{ row.keterangan ?? '—' }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <template #footer>
          <DashboardCardSource :source="source" />
        </template>
      </DashboardWidget>
    </template>

    <DashboardCardDetailModal v-model:open="detailOpen" :context="selectedDetail" />
  </section>
</template>
