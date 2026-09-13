<script setup lang="ts">
import type {
  DashboardCardDetailContext,
  DashboardConfiguredPayload,
  DashboardDatasetBundle,
  DashboardDatasetTableRecord
} from '~~/shared/dashboard'

import {
  dashboardLumbungCardDefinition,
  getDashboardAvailablePeriods,
  getDashboardDatasetField,
  readDashboardRecordNumber,
  readDashboardRecordText
} from '~~/shared/dashboard'
import { formatDatasetPeriod } from '~~/shared/datasets'

import DashboardCardDetailModal from '../DashboardCardDetailModal.vue'

type KecamatanCount = {
  key: string
  label: string
  count: number
}

const lumbungMapColorMap = {
  'lumbung-0': '#ecfccb',
  'lumbung-1': '#d9f99d',
  'lumbung-2': '#a3e635',
  'lumbung-3': '#65a30d',
  'lumbung-4': '#166534'
}

const props = defineProps<{
  payload: DashboardConfiguredPayload
  pending?: boolean
}>()

const selectedYear = ref('')
const search = ref('')
const detailOpen = ref(false)
const selectedDetail = shallowRef<DashboardCardDetailContext | null>(null)
const dataset = computed<DashboardDatasetBundle | null>(() => props.payload.cards['lumbung-pangan'] ?? null)
const availableYears = computed(() => dataset.value
  ? getDashboardAvailablePeriods(dataset.value.definition.coverage, dashboardLumbungCardDefinition)
  : [])
const selectedYearLabel = computed(() => selectedYear.value
  ? formatDatasetPeriod('TAHUNAN', selectedYear.value)
  : null)
const rows = computed(() => dataset.value?.tableRecords.filter(record => record.periodDate === selectedYear.value) ?? [])
const source = computed(() => dataset.value?.definition.source ?? null)
const kecamatanField = computed(() => dataset.value
  ? getDashboardDatasetField(dataset.value.definition.dataSchema, 'kecamatan')
  : null)
const desaField = computed(() => dataset.value
  ? getDashboardDatasetField(dataset.value.definition.dataSchema, 'desa')
  : null)
const namaField = computed(() => dataset.value
  ? getDashboardDatasetField(dataset.value.definition.dataSchema, 'nama_kelompok_lumbung')
  : null)
const sumberDanaField = computed(() => dataset.value
  ? getDashboardDatasetField(dataset.value.definition.dataSchema, 'sumber_dana')
  : null)
const danaFisikField = computed(() => dataset.value
  ? getDashboardDatasetField(dataset.value.definition.dataSchema, 'jumlah_dana_fisik')
  : null)
const danaModalField = computed(() => dataset.value
  ? getDashboardDatasetField(dataset.value.definition.dataSchema, 'dana_penguatan_modal')
  : null)
const tahapanField = computed(() => dataset.value
  ? getDashboardDatasetField(dataset.value.definition.dataSchema, 'klasifikasi_tahapan')
  : null)
const keteranganField = computed(() => dataset.value
  ? getDashboardDatasetField(dataset.value.definition.dataSchema, 'keterangan')
  : null)
const totalDanaFisik = computed(() => sumStoredValues(rows.value, danaFisikField.value?.key ?? null))
const totalDanaModal = computed(() => sumStoredValues(rows.value, danaModalField.value?.key ?? null))
const lumbungDenganDana = computed(() => rows.value.filter((row) => {
  const danaFisik = readDashboardRecordNumber(row, danaFisikField.value?.key ?? null)
  const danaModal = readDashboardRecordNumber(row, danaModalField.value?.key ?? null)

  return (danaFisik !== null && danaFisik > 0) || (danaModal !== null && danaModal > 0)
}).length)
const kecamatanCounts = computed(() => aggregateKecamatan(rows.value))
const distinctKecamatanCount = computed(() => new Set(rows.value.flatMap((row) => {
  const kecamatan = readDashboardRecordText(row, kecamatanField.value?.key ?? null)

  return kecamatan ? [normalizeIdentity(canonicalKecamatanName(kecamatan) ?? kecamatan)] : []
})).size)
const distinctDesaCount = computed(() => new Set(rows.value.flatMap((row) => {
  const kecamatan = readDashboardRecordText(row, kecamatanField.value?.key ?? null)
  const desa = readDashboardRecordText(row, desaField.value?.key ?? null)

  return kecamatan && desa ? [`${normalizeIdentity(kecamatan)}::${normalizeIdentity(desa)}`] : []
})).size)
const canonicalKecamatanCount = computed(() => dataset.value?.canonicalKecamatanNames.length ?? 0)
const rankingMaximum = computed(() => kecamatanCounts.value[0]?.count ?? 0)
const mapValues = computed(() => kecamatanCounts.value.map(row => ({
  regionName: row.label,
  valueKey: intensityKey(row.count, kecamatanCounts.value),
  valueLabel: `${row.count} ${row.count === 1 ? 'Lumbung' : 'Lumbung'}`
})))
const tahapanSummary = computed(() => {
  const options = tahapanField.value?.options ?? []
  const optionByNormalizedValue = new Map(options.map(option => [normalizeIdentity(option.value), option]))
  const counts = new Map<string, number>()
  let unclassified = 0

  for (const row of rows.value) {
    const value = readDashboardRecordText(row, tahapanField.value?.key ?? null)
    const option = value ? optionByNormalizedValue.get(normalizeIdentity(value)) : null

    if (!option) {
      unclassified += 1
      continue
    }

    counts.set(option.value, (counts.get(option.value) ?? 0) + 1)
  }

  return [
    ...options.map(option => ({ key: option.value, label: option.label, count: counts.get(option.value) ?? 0 })),
    ...(unclassified > 0 ? [{ key: '__unclassified__', label: 'Belum diklasifikasikan', count: unclassified }] : [])
  ]
})
const sumberDanaSummary = computed(() => {
  const values = new Map<string, { label: string, count: number }>()

  for (const row of rows.value) {
    const value = readDashboardRecordText(row, sumberDanaField.value?.key ?? null)

    if (!value) {
      continue
    }

    const key = normalizeIdentity(value)
    const current = values.get(key) ?? { label: value.trim(), count: 0 }
    current.count += 1
    values.set(key, current)
  }

  return [...values.values()].sort((left, right) => right.count - left.count || left.label.localeCompare(right.label, 'id-ID'))
})
const filteredRows = computed(() => {
  const query = search.value.trim().toLocaleLowerCase('id-ID')

  if (!query) {
    return rows.value
  }

  return rows.value.filter(row => [
    readDashboardRecordText(row, namaField.value?.key ?? null),
    readDashboardRecordText(row, kecamatanField.value?.key ?? null),
    readDashboardRecordText(row, desaField.value?.key ?? null),
    readDashboardRecordText(row, sumberDanaField.value?.key ?? null)
  ].some(value => value?.toLocaleLowerCase('id-ID').includes(query)))
})
const kpis = computed(() => [{
  label: 'Jumlah Lumbung',
  value: String(rows.value.length),
  detail: 'Catatan lumbung pada periode terpilih',
  icon: 'i-lucide-warehouse',
  tone: 'bg-success/10 text-success'
}, {
  label: 'Kecamatan Tercakup',
  value: canonicalKecamatanCount.value
    ? `${distinctKecamatanCount.value} dari ${canonicalKecamatanCount.value}`
    : `${distinctKecamatanCount.value} Kecamatan`,
  detail: 'Kecamatan dengan catatan lumbung',
  icon: 'i-lucide-map',
  tone: 'bg-primary/10 text-primary'
}, {
  label: 'Desa Tercakup',
  value: `${distinctDesaCount.value} Desa`,
  detail: 'Pasangan Kecamatan dan Desa yang tercatat',
  icon: 'i-lucide-users-round',
  tone: 'bg-info/10 text-info'
}, {
  label: 'Total Dana Fisik',
  value: formatRupiah(totalDanaFisik.value),
  detail: totalDanaFisik.value === null ? 'Data belum tersedia' : 'Akumulasi dana fisik tersimpan',
  icon: 'i-lucide-coins',
  tone: 'bg-warning/15 text-warning'
}, {
  label: 'Total Penguatan Modal',
  value: formatRupiah(totalDanaModal.value),
  detail: totalDanaModal.value === null ? 'Data belum tersedia' : 'Akumulasi dana penguatan modal',
  icon: 'i-lucide-sprout',
  tone: 'bg-success/10 text-success'
}, {
  label: 'Lumbung dengan Dana',
  value: rows.value.length
    ? `${lumbungDenganDana.value} (${formatPercentage(lumbungDenganDana.value, rows.value.length)})`
    : '0',
  detail: 'Memiliki dana fisik atau penguatan modal',
  icon: 'i-lucide-list-checks',
  tone: 'bg-primary/10 text-primary'
}])

watch(availableYears, (years) => {
  if (!years.includes(selectedYear.value)) {
    selectedYear.value = years[0] ?? ''
  }
}, { immediate: true })

function normalizeIdentity(value: string) {
  return value.trim().toLocaleUpperCase('id-ID')
}

function canonicalKecamatanName(value: string | null) {
  if (!value) {
    return null
  }

  return dataset.value?.canonicalKecamatanNames.find(name => normalizeIdentity(name) === normalizeIdentity(value)) ?? null
}

function sumStoredValues(records: readonly DashboardDatasetTableRecord[], fieldKey: string | null) {
  let total = 0
  let found = false

  for (const record of records) {
    const value = readDashboardRecordNumber(record, fieldKey)

    if (value !== null) {
      total += value
      found = true
    }
  }

  return found ? total : null
}

function aggregateKecamatan(records: readonly DashboardDatasetTableRecord[]): KecamatanCount[] {
  const groups = new Map<string, KecamatanCount>()

  for (const record of records) {
    const rawName = readDashboardRecordText(record, kecamatanField.value?.key ?? null)

    if (!rawName) {
      continue
    }

    const canonicalName = canonicalKecamatanName(rawName)

    if (!canonicalName) {
      continue
    }

    const key = normalizeIdentity(canonicalName)
    const group = groups.get(key) ?? { key, label: canonicalName, count: 0 }
    group.count += 1
    groups.set(key, group)
  }

  return [...groups.values()].sort((left, right) => right.count - left.count || left.label.localeCompare(right.label, 'id-ID'))
}

function intensityKey(value: number, counts: readonly KecamatanCount[]) {
  const minimum = Math.min(...counts.map(item => item.count))
  const maximum = Math.max(...counts.map(item => item.count))
  const ratio = maximum === minimum ? 0.5 : (value - minimum) / (maximum - minimum)

  return `lumbung-${Math.min(4, Math.max(0, Math.round(ratio * 4)))}`
}

function formatRupiah(value: number | null) {
  return value === null
    ? '—'
    : new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0
      }).format(value)
}

function formatPercentage(value: number, total: number) {
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format((value / total) * 100) + '%'
}

function stageLabel(record: DashboardDatasetTableRecord) {
  const value = readDashboardRecordText(record, tahapanField.value?.key ?? null)
  const option = tahapanField.value?.options?.find(item => value && normalizeIdentity(item.value) === normalizeIdentity(value))

  return option?.label ?? value ?? '—'
}

function openDetail() {
  if (!dataset.value) {
    return
  }

  selectedDetail.value = {
    card: dashboardLumbungCardDefinition,
    dataset: dataset.value,
    periodDate: selectedYear.value || null
  }
  detailOpen.value = true
}
</script>

<template>
  <section class="space-y-3" :class="pending ? 'opacity-75 transition-opacity' : ''">
    <header class="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
      <div class="min-w-0">
        <div class="flex items-center gap-2">
          <span class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-success/10 text-success"><UIcon name="i-lucide-warehouse" class="size-4" /></span>
          <div class="min-w-0">
            <h2 class="text-xl leading-7 font-semibold tracking-tight text-[var(--app-foreground)]">
              Lumbung Pangan
            </h2>
            <p class="mt-0.5 text-sm font-medium text-[var(--app-foreground-muted)]">
              Profil lumbung pangan dan kelembagaan pendukung ketahanan pangan Kabupaten Sumbawa Barat.
            </p>
          </div>
        </div>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <DashboardPeriodSelector v-model="selectedYear" periodicity="TAHUNAN" :periods="availableYears" /><UButton
          size="sm"
          color="neutral"
          variant="outline"
          trailing-icon="i-lucide-arrow-right"
          class="cursor-pointer whitespace-nowrap"
          :disabled="!dataset"
          @click="openDetail"
        >
          Lihat seluruh data
        </UButton>
      </div>
    </header>

    <div v-if="!selectedYear" class="rounded-[var(--radius-panel)] border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-8 text-sm text-[var(--app-foreground-muted)]">
      Belum ada tahun Lumbung Pangan yang tersedia.
    </div>

    <template v-else>
      <section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Ringkasan Lumbung Pangan">
        <article v-for="metric in kpis" :key="metric.label" class="min-w-0 rounded-[var(--radius-panel)] border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2.5 shadow-sm">
          <div class="flex min-w-0 items-center gap-2.5">
            <span :class="['flex size-9 shrink-0 items-center justify-center rounded-lg', metric.tone]"><UIcon :name="metric.icon" class="size-4" /></span><div class="min-w-0">
              <p class="text-xs font-medium text-[var(--app-foreground-muted)]">
                {{ metric.label }}
              </p><p class="mt-0.5 break-words text-lg font-semibold tracking-tight tabular-nums text-[var(--app-foreground)]">
                {{ metric.value }}
              </p><p class="mt-0.5 text-xs text-[var(--app-foreground-muted)]">
                {{ metric.detail }}
              </p>
            </div>
          </div>
        </article>
      </section>

      <section class="grid items-start gap-3 xl:grid-cols-12">
        <DashboardWidget compact class="xl:col-span-7">
          <template #header>
            <div>
              <h3 class="text-sm font-semibold text-[var(--app-foreground)]">
                Sebaran Lumbung Pangan
              </h3><p class="mt-0.5 text-xs text-[var(--app-foreground-muted)]">
                Intensitas warna menunjukkan jumlah catatan lumbung menurut Kecamatan pada {{ selectedYearLabel }}.
              </p>
            </div>
          </template>
          <p v-if="!kecamatanCounts.length" class="text-sm text-[var(--app-foreground-muted)]">
            Tidak ada Kecamatan yang dapat dipetakan secara persis dari catatan tahun ini.
          </p>
          <MapAdministrativeBoundaryMap
            v-else
            map-height="clamp(300px, 31vw, 410px)"
            :kecamatan-values="mapValues"
            :value-color-map="lumbungMapColorMap"
            :popup-year="selectedYearLabel"
            :show-desa-layer="false"
            stop-interaction-propagation
            no-data-color="#e2e8f0"
            no-data-label="Data lumbung belum tersedia"
          />
          <template #footer>
            <DashboardCardSource :source="source" />
          </template>
        </DashboardWidget>

        <div class="grid gap-3 xl:col-span-5">
          <DashboardWidget compact>
            <template #header>
              <h3 class="text-sm font-semibold text-[var(--app-foreground)]">
                Lumbung per Kecamatan
              </h3>
            </template>
            <div v-if="kecamatanCounts.length" class="space-y-2.5">
              <div v-for="(row, index) in kecamatanCounts" :key="row.key" class="grid grid-cols-[1.5rem_minmax(0,1fr)_minmax(5rem,0.7fr)] items-center gap-2 text-xs">
                <span class="tabular-nums text-[var(--app-foreground-muted)]">{{ index + 1 }}</span><span class="truncate font-medium text-[var(--app-foreground)]">{{ row.label }}</span><span class="flex items-center justify-end gap-2"><span class="h-3 min-w-0 flex-1 overflow-hidden rounded-sm bg-[var(--app-surface-muted)]"><span class="block h-full rounded-sm bg-success" :style="{ width: `${rankingMaximum ? (row.count / rankingMaximum) * 100 : 0}%` }" /></span><span class="w-6 text-right tabular-nums text-[var(--app-foreground-muted)]">{{ row.count }}</span></span>
              </div>
            </div>
            <p v-else class="text-sm text-[var(--app-foreground-muted)]">
              Belum ada Kecamatan yang dapat dipetakan.
            </p>
          </DashboardWidget>
          <section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            <DashboardWidget compact>
              <template #header>
                <h3 class="text-sm font-semibold text-[var(--app-foreground)]">
                  Klasifikasi Tahapan Lumbung
                </h3>
              </template><div v-if="tahapanSummary.length" class="space-y-2">
                <div v-for="item in tahapanSummary" :key="item.key" class="space-y-1 text-xs">
                  <div class="flex items-center justify-between gap-3">
                    <span class="min-w-0 truncate text-[var(--app-foreground-muted)]">{{ item.label }}</span><span class="shrink-0 font-medium tabular-nums text-[var(--app-foreground)]">{{ item.count }} · {{ rows.length ? formatPercentage(item.count, rows.length) : '—' }}</span>
                  </div><span class="block h-1.5 overflow-hidden rounded-full bg-[var(--app-surface-muted)]"><span class="block h-full rounded-full bg-success" :style="{ width: `${rows.length ? (item.count / rows.length) * 100 : 0}%` }" /></span>
                </div>
              </div><p v-else class="text-sm text-[var(--app-foreground-muted)]">
                Data tahapan belum tersedia.
              </p>
            </DashboardWidget>
            <DashboardWidget compact>
              <template #header>
                <h3 class="text-sm font-semibold text-[var(--app-foreground)]">
                  Sumber Dana
                </h3>
              </template><div v-if="sumberDanaSummary.length" class="space-y-2">
                <div v-for="item in sumberDanaSummary" :key="item.label" class="space-y-1 text-xs">
                  <div class="flex items-center justify-between gap-3">
                    <span class="min-w-0 truncate text-[var(--app-foreground-muted)]">{{ item.label }}</span><span class="shrink-0 font-medium tabular-nums text-[var(--app-foreground)]">{{ item.count }} · {{ rows.length ? formatPercentage(item.count, rows.length) : '—' }}</span>
                  </div><span class="block h-1.5 overflow-hidden rounded-full bg-[var(--app-surface-muted)]"><span class="block h-full rounded-full bg-primary" :style="{ width: `${rows.length ? (item.count / rows.length) * 100 : 0}%` }" /></span>
                </div>
              </div><p v-else class="text-sm text-[var(--app-foreground-muted)]">
                Sumber dana belum tersedia.
              </p>
            </DashboardWidget>
          </section>
        </div>
      </section>

      <DashboardWidget compact>
        <template #header>
          <div class="flex w-full flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 class="text-sm font-semibold text-[var(--app-foreground)]">
                Daftar Lumbung Pangan
              </h3><p class="mt-0.5 text-xs text-[var(--app-foreground-muted)]">
                Seluruh catatan lumbung pada {{ selectedYearLabel }}.
              </p>
            </div><UInput
              v-model="search"
              icon="i-lucide-search"
              placeholder="Cari nama lumbung, desa, kecamatan..."
              size="xs"
              class="w-full sm:w-72"
            />
          </div>
        </template>
        <div class="overflow-x-auto">
          <table class="w-full min-w-[1120px] text-xs">
            <thead class="border-y border-[var(--app-border)] bg-[var(--app-surface-muted)] text-left font-medium text-[var(--app-foreground-muted)]">
              <tr>
                <th class="w-12 px-3 py-2.5">
                  No
                </th><th class="px-3 py-2.5">
                  {{ namaField?.label ?? 'Nama Lumbung' }}
                </th><th class="px-3 py-2.5">
                  {{ kecamatanField?.label ?? 'Kecamatan' }}
                </th><th class="px-3 py-2.5">
                  {{ desaField?.label ?? 'Desa' }}
                </th><th class="px-3 py-2.5">
                  {{ tahapanField?.label ?? 'Tahapan' }}
                </th><th class="px-3 py-2.5">
                  {{ sumberDanaField?.label ?? 'Sumber Dana' }}
                </th><th class="px-3 py-2.5 text-right">
                  {{ danaFisikField?.label ?? 'Dana Fisik' }}
                </th><th class="px-3 py-2.5 text-right">
                  {{ danaModalField?.label ?? 'Dana Penguatan Modal' }}
                </th><th class="px-3 py-2.5">
                  {{ keteranganField?.label ?? 'Keterangan' }}
                </th>
              </tr>
            </thead><tbody class="divide-y divide-[var(--app-border)]">
              <tr v-for="(row, index) in filteredRows" :key="`${row.periodDate}-${index}`">
                <td class="px-3 py-2.5 tabular-nums text-[var(--app-foreground-muted)]">
                  {{ index + 1 }}
                </td><td class="px-3 py-2.5 font-medium text-[var(--app-foreground)]">
                  {{ readDashboardRecordText(row, namaField?.key ?? null) ?? '—' }}
                </td><td class="px-3 py-2.5 text-[var(--app-foreground-muted)]">
                  {{ readDashboardRecordText(row, kecamatanField?.key ?? null) ?? '—' }}
                </td><td class="px-3 py-2.5 text-[var(--app-foreground-muted)]">
                  {{ readDashboardRecordText(row, desaField?.key ?? null) ?? '—' }}
                </td><td class="px-3 py-2.5">
                  <span class="inline-flex rounded-full bg-[var(--app-surface-muted)] px-2 py-0.5 text-[0.68rem] font-medium text-[var(--app-foreground-muted)]">{{ stageLabel(row) }}</span>
                </td><td class="px-3 py-2.5 text-[var(--app-foreground-muted)]">
                  {{ readDashboardRecordText(row, sumberDanaField?.key ?? null) ?? '—' }}
                </td><td class="px-3 py-2.5 text-right tabular-nums text-[var(--app-foreground)]">
                  {{ formatRupiah(readDashboardRecordNumber(row, danaFisikField?.key ?? null)) }}
                </td><td class="px-3 py-2.5 text-right tabular-nums text-[var(--app-foreground)]">
                  {{ formatRupiah(readDashboardRecordNumber(row, danaModalField?.key ?? null)) }}
                </td><td class="max-w-64 px-3 py-2.5 text-[var(--app-foreground-muted)]">
                  <span class="block whitespace-normal break-words">{{ readDashboardRecordText(row, keteranganField?.key ?? null) ?? '—' }}</span>
                </td>
              </tr><tr v-if="!filteredRows.length">
                <td colspan="9" class="px-3 py-8 text-center text-sm text-[var(--app-foreground-muted)]">
                  Tidak ada catatan lumbung yang sesuai.
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
