<script setup lang="ts">
import type { DashboardConfiguredPayload, DashboardDatasetBundle, DashboardDatasetRecord } from '~~/shared/dashboard'

import { readDashboardRecordNumber } from '~~/shared/dashboard'
import { formatDatasetPeriod } from '~~/shared/datasets'

type StuntingDesaRow = {
  readonly record: DashboardDatasetRecord
  readonly desaName: string
  readonly kecamatanName: string
  readonly jumlahBalita: number
  readonly jumlahStunting: number
  /** The stored DESA/Kelurahan percentage; it is never re-derived for ranking or display. */
  readonly persentaseStunting: number
}

type StuntingKecamatanRow = {
  readonly kecamatanName: string
  readonly jumlahBalita: number
  readonly jumlahStunting: number
  /** Weighted percentage derived from the DESA/Kelurahan count totals. */
  readonly persentaseStunting: number
}

const props = defineProps<{
  payload: DashboardConfiguredPayload
  pending?: boolean
}>()

const numberFormatter = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 })
const percentageFormatter = new Intl.NumberFormat('id-ID', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
})
const ALL_KECAMATAN = '__ALL__'
const selectedMonth = ref('')
const search = ref('')
const selectedKecamatan = ref(ALL_KECAMATAN)
const stuntingDataset = computed<DashboardDatasetBundle | null>(() => props.payload.cards['stunting-desa'] ?? null)
const availableMonths = computed(() => [...new Set(stuntingDataset.value?.records.map(record => record.periodDate) ?? [])]
  .sort((left, right) => right.localeCompare(left)))
const selectedMonthLabel = computed(() => selectedMonth.value
  ? formatDatasetPeriod('BULANAN', selectedMonth.value)
  : null)

/**
 * Keeps every selected period as the same reusable DESA-level projection so a
 * future trend view can consume monthly rows without changing the Dataset contract.
 */
function desaRowsForPeriod(periodDate: string): StuntingDesaRow[] {
  if (!stuntingDataset.value || !periodDate) {
    return []
  }

  const rows: StuntingDesaRow[] = []

  for (const record of stuntingDataset.value.records) {
    if (record.periodDate !== periodDate) {
      continue
    }

    const jumlahBalita = readDashboardRecordNumber(record, 'jumlah_balita')
    const jumlahStunting = readDashboardRecordNumber(record, 'jumlah_stunting')
    const persentaseStunting = readDashboardRecordNumber(record, 'persentase_stunting')

    if (jumlahBalita === null || jumlahStunting === null || persentaseStunting === null) {
      continue
    }

    rows.push({
      record,
      desaName: record.regionName,
      kecamatanName: record.parentRegionName ?? 'Tidak diketahui',
      jumlahBalita,
      jumlahStunting,
      persentaseStunting
    })
  }

  return rows
}

const selectedMonthRows = computed(() => desaRowsForPeriod(selectedMonth.value))
const totalBalita = computed(() => selectedMonthRows.value.reduce((total, row) => total + row.jumlahBalita, 0))
const totalStunting = computed(() => selectedMonthRows.value.reduce((total, row) => total + row.jumlahStunting, 0))
const totalPersentaseStunting = computed(() => totalBalita.value > 0
  ? (totalStunting.value / totalBalita.value) * 100
  : 0)
const kecamatanRows = computed<StuntingKecamatanRow[]>(() => {
  const totalsByKecamatan = new Map<string, { jumlahBalita: number, jumlahStunting: number }>()

  for (const row of selectedMonthRows.value) {
    const totals = totalsByKecamatan.get(row.kecamatanName) ?? { jumlahBalita: 0, jumlahStunting: 0 }
    totals.jumlahBalita += row.jumlahBalita
    totals.jumlahStunting += row.jumlahStunting
    totalsByKecamatan.set(row.kecamatanName, totals)
  }

  return [...totalsByKecamatan.entries()]
    .map(([kecamatanName, totals]) => ({
      kecamatanName,
      ...totals,
      persentaseStunting: totals.jumlahBalita > 0
        ? (totals.jumlahStunting / totals.jumlahBalita) * 100
        : 0
    }))
    .sort((left, right) => right.persentaseStunting - left.persentaseStunting || left.kecamatanName.localeCompare(right.kecamatanName, 'id-ID'))
})
const rankedDesaRows = computed(() => [...selectedMonthRows.value]
  .sort((left, right) => right.persentaseStunting - left.persentaseStunting || left.desaName.localeCompare(right.desaName, 'id-ID'))
  .slice(0, 5))
const maximumKecamatanPercentage = computed(() => Math.max(0, ...kecamatanRows.value.map(row => row.persentaseStunting)))
const kecamatanOptions = computed(() => [
  { label: 'Semua Kecamatan', value: ALL_KECAMATAN },
  ...[...new Set(selectedMonthRows.value.map(row => row.kecamatanName))]
    .sort((left, right) => left.localeCompare(right, 'id-ID'))
    .map(name => ({ label: name, value: name }))
])
const filteredDesaRows = computed(() => {
  const query = search.value.trim().toLocaleLowerCase('id-ID')

  return selectedMonthRows.value
    .filter(row => selectedKecamatan.value === ALL_KECAMATAN || row.kecamatanName === selectedKecamatan.value)
    .filter(row => !query
      || row.desaName.toLocaleLowerCase('id-ID').includes(query)
      || row.kecamatanName.toLocaleLowerCase('id-ID').includes(query))
    .slice()
    .sort((left, right) => right.persentaseStunting - left.persentaseStunting || left.desaName.localeCompare(right.desaName, 'id-ID'))
})
const source = computed(() => stuntingDataset.value?.definition.source ?? null)

watch(availableMonths, (months) => {
  if (!months.includes(selectedMonth.value)) {
    selectedMonth.value = months[0] ?? ''
  }
}, { immediate: true })

watch(kecamatanOptions, (options) => {
  if (!options.some(option => option.value === selectedKecamatan.value)) {
    selectedKecamatan.value = ALL_KECAMATAN
  }
}, { immediate: true })

function formatNumber(value: number) {
  return numberFormatter.format(value)
}

function formatPercentage(value: number) {
  return `${percentageFormatter.format(value)}%`
}

function relativeKecamatanPercentage(value: number) {
  return maximumKecamatanPercentage.value > 0
    ? (value / maximumKecamatanPercentage.value) * 100
    : 0
}
</script>

<template>
  <section class="space-y-3" :class="pending ? 'opacity-75 transition-opacity' : ''">
    <header class="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
      <div class="min-w-0">
        <p class="text-[0.68rem] font-medium uppercase tracking-[0.18em] text-[var(--app-foreground-soft)]">
          Wilayah &amp; Kelompok Rentan
        </p>
        <div class="mt-1 flex min-w-0 items-center gap-2">
          <span class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <UIcon name="i-lucide-chart-no-axes-combined" class="size-4" />
          </span>
          <div class="min-w-0">
            <h2 class="text-xl leading-7 font-semibold tracking-tight text-[var(--app-foreground)]">
              Stunting
            </h2>
            <p class="mt-0.5 text-sm font-medium text-[var(--app-foreground-muted)]">
              Perkembangan stunting balita bulanan menurut desa/kelurahan di Kabupaten Sumbawa Barat.
            </p>
          </div>
        </div>
      </div>

      <DashboardPeriodSelector v-model="selectedMonth" periodicity="BULANAN" :periods="availableMonths" />
    </header>

    <div v-if="!stuntingDataset || !stuntingDataset.available" class="rounded-[var(--radius-panel)] border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-8 text-sm text-[var(--app-foreground-muted)]">
      Dataset Stunting tidak tersedia untuk dashboard ini.
    </div>
    <div v-else-if="!selectedMonth" class="rounded-[var(--radius-panel)] border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-8 text-sm text-[var(--app-foreground-muted)]">
      Belum ada data Stunting untuk periode yang tersedia.
    </div>

    <template v-else>
      <section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Ringkasan Stunting">
        <article class="min-w-0 rounded-[var(--radius-panel)] border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-3 shadow-sm">
          <div class="flex items-start gap-3">
            <span class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><UIcon name="i-lucide-baby" class="size-5" /></span><div>
              <p class="text-xs font-medium text-[var(--app-foreground-muted)]">
                Jumlah Balita
              </p><p class="mt-1 text-2xl font-semibold tracking-tight tabular-nums text-[var(--app-foreground)]">
                {{ formatNumber(totalBalita) }}
              </p><p class="mt-0.5 text-xs text-[var(--app-foreground-muted)]">
                balita
              </p>
            </div>
          </div>
        </article>
        <article class="min-w-0 rounded-[var(--radius-panel)] border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-3 shadow-sm">
          <div class="flex items-start gap-3">
            <span class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-error/10 text-error"><UIcon name="i-lucide-heart-pulse" class="size-5" /></span><div>
              <p class="text-xs font-medium text-[var(--app-foreground-muted)]">
                Balita Stunting
              </p><p class="mt-1 text-2xl font-semibold tracking-tight tabular-nums text-[var(--app-foreground)]">
                {{ formatNumber(totalStunting) }}
              </p><p class="mt-0.5 text-xs text-[var(--app-foreground-muted)]">
                balita
              </p>
            </div>
          </div>
        </article>
        <article class="min-w-0 rounded-[var(--radius-panel)] border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-3 shadow-sm">
          <div class="flex items-start gap-3">
            <span class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-warning/10 text-warning"><UIcon name="i-lucide-percent" class="size-5" /></span><div>
              <p class="text-xs font-medium text-[var(--app-foreground-muted)]">
                Persentase Stunting
              </p><p class="mt-1 text-2xl font-semibold tracking-tight tabular-nums text-[var(--app-foreground)]">
                {{ formatPercentage(totalPersentaseStunting) }}
              </p><p class="mt-0.5 text-xs text-[var(--app-foreground-muted)]">
                Kabupaten Sumbawa Barat
              </p>
            </div>
          </div>
        </article>
        <article class="min-w-0 rounded-[var(--radius-panel)] border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-3 shadow-sm">
          <div class="flex items-start gap-3">
            <span class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-info/10 text-info"><UIcon name="i-lucide-house" class="size-5" /></span><div>
              <p class="text-xs font-medium text-[var(--app-foreground-muted)]">
                Jumlah Desa/Kelurahan
              </p><p class="mt-1 text-2xl font-semibold tracking-tight tabular-nums text-[var(--app-foreground)]">
                {{ formatNumber(selectedMonthRows.length) }}
              </p><p class="mt-0.5 text-xs text-[var(--app-foreground-muted)]">
                dari {{ formatNumber(kecamatanRows.length) }} kecamatan
              </p>
            </div>
          </div>
        </article>
      </section>

      <section v-if="selectedMonthRows.length" class="grid items-start gap-3 xl:grid-cols-12">
        <DashboardWidget compact class="xl:col-span-7">
          <template #header>
            <div>
              <h3 class="text-sm font-semibold text-[var(--app-foreground)]">
                Persentase Stunting per Kecamatan
              </h3><p class="mt-0.5 text-xs text-[var(--app-foreground-muted)]">
                Kabupaten: {{ formatPercentage(totalPersentaseStunting) }} · dihitung dari total balita dan stunting desa/kelurahan.
              </p>
            </div>
          </template>

          <div v-if="kecamatanRows.length" class="space-y-2.5">
            <div v-for="row in kecamatanRows" :key="row.kecamatanName" class="grid grid-cols-[minmax(0,8rem)_1fr_auto] items-center gap-2 text-xs">
              <span class="truncate text-[var(--app-foreground-muted)]">{{ row.kecamatanName }}</span>
              <div class="flex h-3 overflow-hidden rounded-full bg-[var(--app-surface-muted)]">
                <span class="rounded-full bg-primary" :style="{ width: `${relativeKecamatanPercentage(row.persentaseStunting)}%` }" />
              </div>
              <span class="font-medium tabular-nums text-[var(--app-foreground)]">{{ formatPercentage(row.persentaseStunting) }}</span>
            </div>
          </div>
          <p v-else class="text-sm text-[var(--app-foreground-muted)]">
            Belum ada rekap kecamatan untuk ditampilkan.
          </p>

          <template #footer>
            <DashboardCardSource :source="source" />
          </template>
        </DashboardWidget>

        <DashboardWidget compact class="xl:col-span-5">
          <template #header>
            <div>
              <h3 class="text-sm font-semibold text-[var(--app-foreground)]">
                Desa/Kelurahan dengan Persentase Stunting Tertinggi
              </h3><p class="mt-0.5 text-xs text-[var(--app-foreground-muted)]">
                5 desa/kelurahan teratas menurut persentase yang tersimpan.
              </p>
            </div>
          </template>
          <div class="space-y-2.5">
            <div v-for="row in rankedDesaRows" :key="row.record.regionId" class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-xs">
              <span class="min-w-0"><span class="block truncate font-medium text-[var(--app-foreground)]">{{ row.desaName }}</span><span class="block truncate text-[var(--app-foreground-muted)]">{{ row.kecamatanName }} · {{ formatNumber(row.jumlahStunting) }} dari {{ formatNumber(row.jumlahBalita) }} balita</span></span>
              <span class="font-medium tabular-nums text-[var(--app-foreground)]">{{ formatPercentage(row.persentaseStunting) }}</span>
            </div>
          </div>
          <template #footer>
            <DashboardCardSource :source="source" />
          </template>
        </DashboardWidget>
      </section>

      <DashboardWidget v-if="selectedMonthRows.length" compact>
        <template #header>
          <div class="flex w-full flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 class="text-sm font-semibold text-[var(--app-foreground)]">
                Daftar Desa/Kelurahan
              </h3><p class="mt-0.5 text-xs text-[var(--app-foreground-muted)]">
                {{ filteredDesaRows.length }} dari {{ selectedMonthRows.length }} desa/kelurahan · diurutkan menurut persentase stunting.
              </p>
            </div>
            <div class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <UInput
                v-model="search"
                icon="i-lucide-search"
                placeholder="Cari desa/kelurahan..."
                size="sm"
                class="sm:w-56"
              /><USelectMenu
                v-model="selectedKecamatan"
                :items="kecamatanOptions"
                value-key="value"
                label-key="label"
                size="sm"
                color="neutral"
                variant="outline"
                class="sm:w-48"
                aria-label="Filter kecamatan"
              />
            </div>
          </div>
        </template>
        <div class="overflow-x-auto">
          <table class="w-full min-w-[760px] text-sm">
            <thead class="border-y border-[var(--app-border)] bg-[var(--app-surface-muted)] text-left text-[0.68rem] font-medium tracking-[0.08em] text-[var(--app-foreground-muted)] uppercase">
              <tr>
                <th class="px-3 py-2">
                  Desa/Kelurahan
                </th><th class="px-3 py-2">
                  Kecamatan
                </th><th class="px-3 py-2 text-right">
                  Jumlah Balita
                </th><th class="px-3 py-2 text-right">
                  Jumlah Balita Stunting
                </th><th class="px-3 py-2 text-right">
                  Persentase Stunting
                </th>
              </tr>
            </thead><tbody class="divide-y divide-[var(--app-border)]">
              <tr v-for="row in filteredDesaRows" :key="row.record.regionId">
                <td class="px-3 py-2 font-medium text-[var(--app-foreground)]">
                  {{ row.desaName }}
                </td><td class="px-3 py-2 text-[var(--app-foreground-muted)]">
                  {{ row.kecamatanName }}
                </td><td class="px-3 py-2 text-right tabular-nums">
                  {{ formatNumber(row.jumlahBalita) }}
                </td><td class="px-3 py-2 text-right tabular-nums">
                  {{ formatNumber(row.jumlahStunting) }}
                </td><td class="px-3 py-2 text-right font-medium tabular-nums">
                  {{ formatPercentage(row.persentaseStunting) }}
                </td>
              </tr><tr v-if="!filteredDesaRows.length">
                <td colspan="5" class="px-3 py-6 text-center text-sm text-[var(--app-foreground-muted)]">
                  Desa/kelurahan tidak ditemukan.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <template #footer>
          <DashboardCardSource :source="source" />
        </template>
      </DashboardWidget>

      <div v-else class="rounded-[var(--radius-panel)] border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-8 text-sm text-[var(--app-foreground-muted)]">
        Data Stunting untuk {{ selectedMonthLabel }} belum lengkap untuk ditampilkan.
      </div>
    </template>
  </section>
</template>
