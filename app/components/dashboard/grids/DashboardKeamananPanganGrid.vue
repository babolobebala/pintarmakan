<script setup lang="ts">
import type {
  DashboardConfiguredPayload,
  DashboardDatasetBundle,
  DashboardDatasetTableRecord,
  KeamananPanganSection
} from '~~/shared/dashboard'

import {
  readDashboardRecordText
} from '~~/shared/dashboard'
import DashboardPeriodSelector from '../DashboardPeriodSelector.vue'
import DashboardWidget from '../DashboardWidget.vue'

type CountItem = {
  label: string
  count: number
}

type Kpi = {
  label: string
  value: string
  detail: string
  icon: string
  tone: string
}

const props = defineProps<{
  payload: DashboardConfiguredPayload
  section: KeamananPanganSection
  pending?: boolean
}>()

const emit = defineEmits<{
  'update:section': [section: KeamananPanganSection]
}>()

const selectedYear = ref('')
const search = ref('')
const resultFilter = ref<'SEMUA' | 'POSITIF' | 'NEGATIF'>('SEMUA')

const sectionCards: Record<KeamananPanganSection, keyof DashboardConfiguredPayload['cards']> = {
  PENDATAAN: 'keamanan-pangan-pendataan',
  PENGAWASAN_RAPID_TEST: 'keamanan-pangan-rapid-test',
  PENGAWASAN_MUTU: 'keamanan-pangan-mutu-beras',
  REGISTRASI_SERTIFIKASI: 'keamanan-pangan-sertifikasi-prima-3'
}

const dataset = computed<DashboardDatasetBundle | null>(() => props.payload.cards[sectionCards[props.section]] ?? null)
const availableYears = computed(() => [...new Set(
  (dataset.value?.tableRecords ?? []).map(record => record.periodDate)
)].sort((left, right) => right.localeCompare(left)))
const rows = computed(() => dataset.value?.tableRecords.filter(record => record.periodDate === selectedYear.value) ?? [])
const source = computed(() => dataset.value?.definition.source ?? null)
const activeTopSection = computed(() => props.section.startsWith('PENGAWASAN') ? 'PENGAWASAN' : props.section)
const selectedYearLabel = computed(() => selectedYear.value.slice(0, 4))

const sectionMeta = computed(() => ({
  PENDATAAN: {
    title: 'Pendataan Pelaku Usaha PSAT',
    description: 'Catatan pendataan pelaku usaha Pangan Segar Asal Tumbuhan (PSAT).',
    icon: 'i-lucide-clipboard-list'
  },
  PENGAWASAN_RAPID_TEST: {
    title: 'Pengawasan · Rapid Test',
    description: 'Hasil pengujian parameter pada sampel pangan segar asal tumbuhan.',
    icon: 'i-lucide-flask-conical'
  },
  PENGAWASAN_MUTU: {
    title: 'Pengawasan · Mutu',
    description: 'Hasil pengujian kelas mutu beras kemasan.',
    icon: 'i-lucide-badge-check'
  },
  REGISTRASI_SERTIFIKASI: {
    title: 'Registrasi & Sertifikasi',
    description: 'Sertifikasi Prima 3 PSAT yang tercatat pada periode terpilih.',
    icon: 'i-lucide-award'
  }
}[props.section]))

const commodityCounts = computed(() => countBy(rows.value, 'komoditas'))
const businessTypeCounts = computed(() => countBy(rows.value, 'jenis_usaha'))
const izinCounts = computed(() => countBy(rows.value, 'izin_registrasi'))
const parameterCounts = computed(() => countBy(rows.value, 'parameter_pengujian'))
const resultCounts = computed(() => countBy(rows.value, 'hasil'))
const classCounts = computed(() => countBy(rows.value, 'kelas_mutu'))
const positiveRows = computed(() => rows.value.filter(row => text(row, 'hasil') === 'POSITIF'))
const negativeCount = computed(() => resultCounts.value.find(item => item.label === 'NEGATIF')?.count ?? 0)
const positiveCount = computed(() => resultCounts.value.find(item => item.label === 'POSITIF')?.count ?? 0)
const certificateDates = computed(() => rows.value
  .map(row => text(row, 'tanggal_kedaluwarsa'))
  .filter((value): value is string => Boolean(value))
  .sort((left, right) => left.localeCompare(right)))
const filteredRows = computed(() => {
  const query = search.value.trim().toLocaleLowerCase('id-ID')

  return rows.value.filter((row) => {
    if (props.section === 'PENGAWASAN_RAPID_TEST' && resultFilter.value !== 'SEMUA' && text(row, 'hasil') !== resultFilter.value) {
      return false
    }

    if (!query) {
      return true
    }

    return searchKeys().some(key => text(row, key)?.toLocaleLowerCase('id-ID').includes(query))
  })
})
const kpis = computed<Kpi[]>(() => {
  if (props.section === 'PENDATAAN') {
    return [{
      label: 'Entri Pendataan', value: String(rows.value.length), detail: 'Catatan pada tahun terpilih', icon: 'i-lucide-clipboard-list', tone: 'bg-success/10 text-success'
    }, {
      label: 'Komoditas', value: String(commodityCounts.value.length), detail: 'Komoditas yang tercatat', icon: 'i-lucide-leaf', tone: 'bg-primary/10 text-primary'
    }, {
      label: 'Jenis Usaha', value: String(businessTypeCounts.value.length), detail: 'Jenis usaha yang tercatat', icon: 'i-lucide-briefcase-business', tone: 'bg-info/10 text-info'
    }, {
      label: 'Izin / Registrasi', value: String(rows.value.filter(row => Boolean(text(row, 'izin_registrasi'))).length), detail: 'Entri dengan nilai izin/registrasi', icon: 'i-lucide-file-check-2', tone: 'bg-warning/15 text-warning'
    }]
  }

  if (props.section === 'PENGAWASAN_RAPID_TEST') {
    const parameters = parameterCounts.value

    return [{
      label: 'Sampel Diuji', value: String(rows.value.length), detail: 'Catatan pengujian pada tahun terpilih', icon: 'i-lucide-flask-conical', tone: 'bg-success/10 text-success'
    }, {
      label: 'Negatif', value: String(negativeCount.value), detail: percentageDetail(negativeCount.value, rows.value.length), icon: 'i-lucide-circle-check-big', tone: 'bg-success/10 text-success'
    }, {
      label: 'Positif', value: String(positiveCount.value), detail: percentageDetail(positiveCount.value, rows.value.length), icon: 'i-lucide-triangle-alert', tone: positiveCount.value ? 'bg-error/10 text-error' : 'bg-[var(--app-surface-muted)] text-[var(--app-foreground-muted)]'
    }, {
      label: parameters.length === 1 ? 'Parameter' : 'Parameter Diuji',
      value: parameters.length === 1 ? parameters[0]!.label : String(parameters.length),
      detail: parameters.length === 1 ? 'Parameter yang diuji' : 'Parameter berbeda yang tercatat',
      icon: 'i-lucide-chart-no-axes-column-increasing', tone: 'bg-warning/15 text-warning'
    }]
  }

  if (props.section === 'PENGAWASAN_MUTU') {
    return [{
      label: 'Sampel', value: String(rows.value.length), detail: 'Catatan pengujian pada tahun terpilih', icon: 'i-lucide-package-check', tone: 'bg-success/10 text-success'
    }, ...classCounts.value.map(item => ({
      label: classLabel(item.label), value: String(item.count), detail: 'Kelas mutu yang tercatat', icon: 'i-lucide-tags', tone: 'bg-primary/10 text-primary'
    }))]
  }

  return [{
    label: 'Sertifikat', value: String(rows.value.length), detail: 'Sertifikasi Prima 3 tercatat', icon: 'i-lucide-award', tone: 'bg-success/10 text-success'
  }, {
    label: 'Komoditas', value: String(commodityCounts.value.length), detail: 'Komoditas tersertifikasi', icon: 'i-lucide-leaf', tone: 'bg-primary/10 text-primary'
  }, {
    label: 'Tanggal Kedaluwarsa Terdekat', value: certificateDates.value[0] ? formatDate(certificateDates.value[0]) : '—', detail: 'Berdasarkan tanggal yang tersimpan', icon: 'i-lucide-calendar-clock', tone: 'bg-warning/15 text-warning'
  }]
})

watch(availableYears, (years) => {
  if (!years.includes(selectedYear.value)) {
    selectedYear.value = years[0] ?? ''
  }
}, { immediate: true })

watch(() => props.section, () => {
  search.value = ''
  resultFilter.value = 'SEMUA'
})

function text(row: DashboardDatasetTableRecord, key: string) {
  return readDashboardRecordText(row, key)
}

function countBy(records: readonly DashboardDatasetTableRecord[], key: string): CountItem[] {
  const values = new Map<string, CountItem>()

  for (const record of records) {
    const value = text(record, key)

    if (!value) {
      continue
    }

    const normalized = value.toLocaleUpperCase('id-ID')
    const item = values.get(normalized) ?? { label: value, count: 0 }
    item.count += 1
    values.set(normalized, item)
  }

  return [...values.values()].sort((left, right) => right.count - left.count || left.label.localeCompare(right.label, 'id-ID'))
}

function selectTopSection(section: 'PENDATAAN' | 'PENGAWASAN' | 'REGISTRASI_SERTIFIKASI') {
  emit('update:section', section === 'PENGAWASAN' ? 'PENGAWASAN_RAPID_TEST' : section)
}

function selectPengawasanSection(section: 'PENGAWASAN_RAPID_TEST' | 'PENGAWASAN_MUTU') {
  emit('update:section', section)
}

function searchKeys() {
  switch (props.section) {
    case 'PENDATAAN':
      return ['nama_pelaku_usaha', 'alamat', 'jenis_usaha', 'komoditas', 'nomor_pendataan']
    case 'PENGAWASAN_RAPID_TEST':
      return ['nama_pelaku_usaha', 'komoditas', 'lokasi_sampel', 'asal_komoditas', 'parameter_pengujian']
    case 'PENGAWASAN_MUTU':
      return ['nama_produk', 'jenis_sampel', 'asal_sampel', 'kode_sampel', 'kelas_mutu', 'keterangan']
    case 'REGISTRASI_SERTIFIKASI':
      return ['penerima', 'komoditas', 'nomor_sertifikat', 'alamat']
  }
}

function percentageDetail(value: number, total: number) {
  return total ? `${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format((value / total) * 100)}% dari total sampel` : 'Belum ada sampel'
}

function classLabel(value: string) {
  return {
    PREMIUM: 'Premium',
    MEDIUM: 'Medium',
    SUBMEDIUM: 'Submedium',
    PECAH: 'Pecah'
  }[value] ?? value
}

function formatDate(value: string) {
  const date = new Date(`${value.slice(0, 10)}T00:00:00`)

  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(date)
}

function fieldLabel(key: string, fallback: string) {
  return dataset.value?.definition.dataSchema && typeof dataset.value.definition.dataSchema === 'object'
    ? (Array.isArray((dataset.value.definition.dataSchema as { fields?: unknown }).fields)
        ? ((dataset.value.definition.dataSchema as { fields: Array<{ key?: unknown, label?: unknown }> }).fields.find(field => field.key === key)?.label as string | undefined) ?? fallback
        : fallback)
    : fallback
}

function resultColor(value: string | null) {
  return value === 'POSITIF' ? 'error' : value === 'NEGATIF' ? 'success' : 'neutral'
}
</script>

<template>
  <section class="keamanan-dashboard space-y-3" :class="pending ? 'opacity-75 transition-opacity' : ''">
    <header class="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
      <div class="min-w-0">
        <div class="flex items-start gap-2.5">
          <span class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-success/10 text-success"><UIcon name="i-lucide-shield-check" class="size-5" /></span>
          <div class="min-w-0">
            <h2 class="text-xl leading-7 font-semibold tracking-tight text-[var(--app-foreground)]">Keamanan Pangan</h2>
            <p class="mt-0.5 text-sm font-medium text-[var(--app-foreground-muted)]">Monitoring data pendataan, pengawasan, serta registrasi dan sertifikasi pangan segar asal tumbuhan (PSAT).</p>
          </div>
        </div>
      </div>
      <DashboardPeriodSelector v-model="selectedYear" periodicity="TAHUNAN" :periods="availableYears" />
    </header>

    <nav class="flex flex-wrap gap-1 rounded-[var(--radius-panel)] border border-[var(--app-border)] bg-[var(--app-surface)] p-1" aria-label="Bagian Keamanan Pangan">
      <UButton size="sm" :color="activeTopSection === 'PENDATAAN' ? 'primary' : 'neutral'" :variant="activeTopSection === 'PENDATAAN' ? 'solid' : 'ghost'" class="cursor-pointer whitespace-nowrap" @click="selectTopSection('PENDATAAN')">Pendataan</UButton>
      <UButton size="sm" :color="activeTopSection === 'PENGAWASAN' ? 'primary' : 'neutral'" :variant="activeTopSection === 'PENGAWASAN' ? 'solid' : 'ghost'" class="cursor-pointer whitespace-nowrap" @click="selectTopSection('PENGAWASAN')">Pengawasan</UButton>
      <UButton size="sm" :color="activeTopSection === 'REGISTRASI_SERTIFIKASI' ? 'primary' : 'neutral'" :variant="activeTopSection === 'REGISTRASI_SERTIFIKASI' ? 'solid' : 'ghost'" class="cursor-pointer whitespace-nowrap" @click="selectTopSection('REGISTRASI_SERTIFIKASI')">Registrasi & Sertifikasi</UButton>
    </nav>

    <nav v-if="activeTopSection === 'PENGAWASAN'" class="flex flex-wrap gap-1 rounded-[var(--radius-panel)] border border-[var(--app-border)] bg-[var(--app-surface-muted)] p-1" aria-label="Jenis Pengawasan">
      <UButton size="xs" :color="section === 'PENGAWASAN_RAPID_TEST' ? 'primary' : 'neutral'" :variant="section === 'PENGAWASAN_RAPID_TEST' ? 'solid' : 'ghost'" class="cursor-pointer whitespace-nowrap" @click="selectPengawasanSection('PENGAWASAN_RAPID_TEST')">Rapid Test</UButton>
      <UButton size="xs" :color="section === 'PENGAWASAN_MUTU' ? 'primary' : 'neutral'" :variant="section === 'PENGAWASAN_MUTU' ? 'solid' : 'ghost'" class="cursor-pointer whitespace-nowrap" @click="selectPengawasanSection('PENGAWASAN_MUTU')">Mutu</UButton>
    </nav>

    <div v-if="!selectedYear" class="rounded-[var(--radius-panel)] border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-8 text-sm text-[var(--app-foreground-muted)]">
      Belum ada tahun yang tersedia untuk {{ sectionMeta.title }}.
    </div>

    <template v-else>
      <section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" :aria-label="`Ringkasan ${sectionMeta.title}`">
        <article v-for="metric in kpis" :key="metric.label" class="min-w-0 rounded-[var(--radius-panel)] border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2.5 shadow-sm">
          <div class="flex min-w-0 items-center gap-2.5"><span :class="['flex size-9 shrink-0 items-center justify-center rounded-lg', metric.tone]"><UIcon :name="metric.icon" class="size-4" /></span><div class="min-w-0"><p class="text-xs font-medium text-[var(--app-foreground-muted)]">{{ metric.label }}</p><p class="mt-0.5 break-words text-lg font-semibold tracking-tight tabular-nums text-[var(--app-foreground)]">{{ metric.value }}</p><p class="mt-0.5 text-xs text-[var(--app-foreground-muted)]">{{ metric.detail }}</p></div></div>
        </article>
      </section>

      <section v-if="section === 'PENDATAAN'" class="grid items-start gap-3 xl:grid-cols-2">
        <DashboardWidget compact>
          <template #header><div><h3 class="text-sm font-semibold text-[var(--app-foreground)]">Pendataan per Tahun</h3><p class="mt-0.5 text-xs text-[var(--app-foreground-muted)]">Komoditas yang dicatat pada {{ selectedYearLabel }}.</p></div></template>
          <div v-if="commodityCounts.length" class="space-y-2.5"><div v-for="item in commodityCounts" :key="item.label" class="space-y-1 text-xs"><div class="flex items-center justify-between gap-3"><span class="min-w-0 truncate text-[var(--app-foreground-muted)]">{{ item.label }}</span><span class="shrink-0 font-medium tabular-nums text-[var(--app-foreground)]">{{ item.count }}</span></div><span class="block h-1.5 overflow-hidden rounded-full bg-[var(--app-surface-muted)]"><span class="block h-full rounded-full bg-success" :style="{ width: `${commodityCounts[0] ? (item.count / commodityCounts[0].count) * 100 : 0}%` }" /></span></div></div>
          <p v-else class="text-sm text-[var(--app-foreground-muted)]">Belum ada komoditas yang tercatat.</p>
          <template #footer><DashboardCardSource :source="source" /></template>
        </DashboardWidget>
        <DashboardWidget compact>
          <template #header><div><h3 class="text-sm font-semibold text-[var(--app-foreground)]">Izin / Registrasi Tercatat</h3><p class="mt-0.5 text-xs text-[var(--app-foreground-muted)]">Nilai izin atau registrasi disajikan sesuai data sumber.</p></div></template>
          <div v-if="izinCounts.length" class="space-y-2.5"><div v-for="item in izinCounts" :key="item.label" class="flex items-center justify-between gap-3 text-sm"><span class="min-w-0 truncate text-[var(--app-foreground-muted)]">{{ item.label }}</span><span class="shrink-0 font-semibold tabular-nums text-[var(--app-foreground)]">{{ item.count }}</span></div></div>
          <p v-else class="text-sm text-[var(--app-foreground-muted)]">Belum ada nilai izin atau registrasi yang tercatat.</p>
          <template #footer><DashboardCardSource :source="source" /></template>
        </DashboardWidget>
      </section>

      <section v-else-if="section === 'PENGAWASAN_RAPID_TEST'" class="grid items-start gap-3 xl:grid-cols-2">
        <DashboardWidget compact>
          <template #header><div><h3 class="text-sm font-semibold text-[var(--app-foreground)]">Distribusi Hasil Rapid Test</h3><p class="mt-0.5 text-xs text-[var(--app-foreground-muted)]">Hasil sesuai parameter pengujian yang tersimpan.</p></div></template>
          <ChartsDonutChart :data="resultCounts" :value="item => item.count" :label="item => item.label" :colors="['var(--app-success)', 'var(--app-error)']" :height="250" :arc-width="34" :central-label="String(rows.length)" central-sub-label="Sampel" aria-label="Distribusi hasil rapid test" />
          <template #footer><DashboardCardSource :source="source" /></template>
        </DashboardWidget>
        <DashboardWidget compact>
          <template #header><div><h3 class="text-sm font-semibold text-[var(--app-foreground)]">Ringkasan Komoditas</h3><p class="mt-0.5 text-xs text-[var(--app-foreground-muted)]">Jumlah catatan pengujian per komoditas, bukan penilaian risiko.</p></div></template>
          <div v-if="commodityCounts.length" class="space-y-2.5"><div v-for="item in commodityCounts" :key="item.label" class="grid grid-cols-[minmax(7rem,0.7fr)_minmax(0,1fr)_2rem] items-center gap-2 text-xs"><span class="truncate text-[var(--app-foreground-muted)]">{{ item.label }}</span><span class="h-4 overflow-hidden rounded-sm bg-[var(--app-surface-muted)]"><span class="block h-full rounded-sm bg-success" :style="{ width: `${commodityCounts[0] ? (item.count / commodityCounts[0].count) * 100 : 0}%` }" /></span><span class="text-right font-semibold tabular-nums text-[var(--app-foreground)]">{{ item.count }}</span></div></div>
          <p v-else class="text-sm text-[var(--app-foreground-muted)]">Belum ada komoditas yang diuji.</p>
          <template #footer><DashboardCardSource :source="source" /></template>
        </DashboardWidget>
      </section>

      <section v-else-if="section === 'PENGAWASAN_MUTU'" class="grid items-start gap-3 xl:grid-cols-2">
        <DashboardWidget compact>
          <template #header><div><h3 class="text-sm font-semibold text-[var(--app-foreground)]">Distribusi Kelas Mutu</h3><p class="mt-0.5 text-xs text-[var(--app-foreground-muted)]">Klasifikasi mutu tersimpan, tanpa penilaian keamanan pangan.</p></div></template>
          <div v-if="classCounts.length" class="space-y-3"><div v-for="item in classCounts" :key="item.label" class="space-y-1 text-xs"><div class="flex items-center justify-between gap-3"><span class="font-medium text-[var(--app-foreground-muted)]">{{ classLabel(item.label) }}</span><span class="font-semibold tabular-nums text-[var(--app-foreground)]">{{ item.count }} · {{ percentageDetail(item.count, rows.length) }}</span></div><span class="block h-2 overflow-hidden rounded-full bg-[var(--app-surface-muted)]"><span class="block h-full rounded-full bg-primary" :style="{ width: `${rows.length ? (item.count / rows.length) * 100 : 0}%` }" /></span></div></div>
          <p v-else class="text-sm text-[var(--app-foreground-muted)]">Belum ada kelas mutu yang tercatat.</p>
          <template #footer><DashboardCardSource :source="source" /></template>
        </DashboardWidget>
        <DashboardWidget compact>
          <template #header><h3 class="text-sm font-semibold text-[var(--app-foreground)]">Pengujian yang Tercatat</h3></template>
          <div v-if="countBy(rows, 'pengujian').length" class="space-y-2.5"><div v-for="item in countBy(rows, 'pengujian')" :key="item.label" class="flex items-center justify-between gap-3 text-sm"><span class="min-w-0 truncate text-[var(--app-foreground-muted)]">{{ item.label }}</span><span class="shrink-0 font-semibold tabular-nums text-[var(--app-foreground)]">{{ item.count }}</span></div></div>
          <p v-else class="text-sm text-[var(--app-foreground-muted)]">Belum ada jenis pengujian yang tercatat.</p>
          <template #footer><DashboardCardSource :source="source" /></template>
        </DashboardWidget>
      </section>

      <DashboardWidget v-else compact>
        <template #header><div><h3 class="text-sm font-semibold text-[var(--app-foreground)]">Sertifikasi Prima 3 PSAT</h3><p class="mt-0.5 text-xs text-[var(--app-foreground-muted)]">Tanggal kedaluwarsa ditampilkan dari data sumber.</p></div></template>
        <div v-if="certificateDates.length" class="grid gap-2 sm:grid-cols-2 xl:grid-cols-4"><div v-for="date in certificateDates.slice(0, 4)" :key="date" class="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-muted)] px-3 py-2"><p class="text-xs text-[var(--app-foreground-muted)]">Tanggal Kedaluwarsa</p><p class="mt-0.5 text-sm font-semibold text-[var(--app-foreground)]">{{ formatDate(date) }}</p></div></div>
        <p v-else class="text-sm text-[var(--app-foreground-muted)]">Belum ada tanggal kedaluwarsa yang tercatat.</p>
        <template #footer><DashboardCardSource :source="source" /></template>
      </DashboardWidget>

      <DashboardWidget v-if="section === 'PENGAWASAN_RAPID_TEST'" compact :class="positiveRows.length ? 'border-error/25 bg-error/5' : ''">
        <template #header><div><h3 :class="['text-sm font-semibold', positiveRows.length ? 'text-error' : 'text-[var(--app-foreground)]']">Hasil Positif</h3><p class="mt-0.5 text-xs text-[var(--app-foreground-muted)]">Perlu perhatian operasional; bukan penetapan keamanan pangan secara menyeluruh.</p></div></template>
        <div v-if="positiveRows.length" class="overflow-x-auto"><table class="w-full min-w-[840px] text-xs"><thead class="border-y border-error/20 bg-error/5 text-left font-medium text-[var(--app-foreground-muted)]"><tr><th class="px-3 py-2.5">Pelaku Usaha</th><th class="px-3 py-2.5">Komoditas</th><th class="px-3 py-2.5">Lokasi</th><th class="px-3 py-2.5">Asal Komoditas</th><th class="px-3 py-2.5">Parameter</th><th class="px-3 py-2.5">Hasil</th></tr></thead><tbody class="divide-y divide-error/15"><tr v-for="(row, index) in positiveRows" :key="`${row.periodDate}-${index}`"><td class="px-3 py-2.5 font-medium text-[var(--app-foreground)]">{{ text(row, 'nama_pelaku_usaha') ?? '—' }}</td><td class="px-3 py-2.5 text-[var(--app-foreground-muted)]">{{ text(row, 'komoditas') ?? '—' }}</td><td class="px-3 py-2.5 text-[var(--app-foreground-muted)]">{{ text(row, 'lokasi_sampel') ?? '—' }}</td><td class="px-3 py-2.5 text-[var(--app-foreground-muted)]">{{ text(row, 'asal_komoditas') ?? '—' }}</td><td class="px-3 py-2.5 text-[var(--app-foreground-muted)]">{{ text(row, 'parameter_pengujian') ?? '—' }}</td><td class="px-3 py-2.5"><UBadge color="error" variant="subtle" size="xs">POSITIF</UBadge></td></tr></tbody></table></div>
        <UEmpty v-else icon="i-lucide-circle-check-big" title="Tidak ada hasil positif pada tahun terpilih." description="Tidak ada catatan dengan nilai POSITIF di dalam dataset aktif." variant="naked" />
      </DashboardWidget>

      <DashboardWidget compact>
        <template #header><div class="flex w-full flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><h3 class="text-sm font-semibold text-[var(--app-foreground)]">{{ sectionMeta.title }}</h3><p class="mt-0.5 text-xs text-[var(--app-foreground-muted)]">Seluruh catatan pada {{ selectedYearLabel }}.</p></div><div class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row"><UInput v-model="search" icon="i-lucide-search" :placeholder="section === 'PENDATAAN' ? 'Cari nama, alamat, komoditas...' : 'Cari data...'" size="xs" class="w-full sm:w-64" /><USelectMenu v-if="section === 'PENGAWASAN_RAPID_TEST'" v-model="resultFilter" :items="[{ label: 'Hasil: Semua', value: 'SEMUA' }, { label: 'Positif', value: 'POSITIF' }, { label: 'Negatif', value: 'NEGATIF' }]" value-key="value" label-key="label" size="xs" class="w-full sm:w-36" /></div></div></template>

        <div class="overflow-x-auto">
          <table v-if="section === 'PENDATAAN'" class="w-full min-w-[1080px] text-xs"><thead class="border-y border-[var(--app-border)] bg-[var(--app-surface-muted)] text-left font-medium text-[var(--app-foreground-muted)]"><tr><th class="w-12 px-3 py-2.5">No</th><th class="px-3 py-2.5">{{ fieldLabel('nama_pelaku_usaha', 'Nama Pelaku Usaha / Kelompok') }}</th><th class="px-3 py-2.5">Kontak</th><th class="px-3 py-2.5">Alamat</th><th class="px-3 py-2.5">Jenis Usaha</th><th class="px-3 py-2.5">Izin / Registrasi</th><th class="px-3 py-2.5">Komoditas</th><th class="px-3 py-2.5">Nomor Pendataan</th></tr></thead><tbody class="divide-y divide-[var(--app-border)]"><tr v-for="(row, index) in filteredRows" :key="`${row.periodDate}-${index}`"><td class="px-3 py-2.5 tabular-nums text-[var(--app-foreground-muted)]">{{ index + 1 }}</td><td class="px-3 py-2.5 font-medium text-[var(--app-foreground)]">{{ text(row, 'nama_pelaku_usaha') ?? '—' }}</td><td class="px-3 py-2.5 text-[var(--app-foreground-muted)]">{{ text(row, 'kontak') ?? '—' }}</td><td class="max-w-64 px-3 py-2.5 text-[var(--app-foreground-muted)]">{{ text(row, 'alamat') ?? '—' }}</td><td class="px-3 py-2.5 text-[var(--app-foreground-muted)]">{{ text(row, 'jenis_usaha') ?? '—' }}</td><td class="px-3 py-2.5 text-[var(--app-foreground-muted)]">{{ text(row, 'izin_registrasi') ?? '—' }}</td><td class="px-3 py-2.5 text-[var(--app-foreground-muted)]">{{ text(row, 'komoditas') ?? '—' }}</td><td class="px-3 py-2.5 text-[var(--app-foreground-muted)]">{{ text(row, 'nomor_pendataan') ?? '—' }}</td></tr></tbody></table>
          <table v-else-if="section === 'PENGAWASAN_RAPID_TEST'" class="w-full min-w-[900px] text-xs"><thead class="border-y border-[var(--app-border)] bg-[var(--app-surface-muted)] text-left font-medium text-[var(--app-foreground-muted)]"><tr><th class="w-12 px-3 py-2.5">No</th><th class="px-3 py-2.5">Pelaku Usaha</th><th class="px-3 py-2.5">Komoditas</th><th class="px-3 py-2.5">Lokasi Sampel</th><th class="px-3 py-2.5">Asal Komoditas</th><th class="px-3 py-2.5">Parameter</th><th class="px-3 py-2.5">Hasil</th></tr></thead><tbody class="divide-y divide-[var(--app-border)]"><tr v-for="(row, index) in filteredRows" :key="`${row.periodDate}-${index}`"><td class="px-3 py-2.5 tabular-nums text-[var(--app-foreground-muted)]">{{ index + 1 }}</td><td class="px-3 py-2.5 font-medium text-[var(--app-foreground)]">{{ text(row, 'nama_pelaku_usaha') ?? '—' }}</td><td class="px-3 py-2.5 text-[var(--app-foreground-muted)]">{{ text(row, 'komoditas') ?? '—' }}</td><td class="px-3 py-2.5 text-[var(--app-foreground-muted)]">{{ text(row, 'lokasi_sampel') ?? '—' }}</td><td class="px-3 py-2.5 text-[var(--app-foreground-muted)]">{{ text(row, 'asal_komoditas') ?? '—' }}</td><td class="px-3 py-2.5 text-[var(--app-foreground-muted)]">{{ text(row, 'parameter_pengujian') ?? '—' }}</td><td class="px-3 py-2.5"><UBadge :color="resultColor(text(row, 'hasil'))" variant="subtle" size="xs">{{ text(row, 'hasil') ?? '—' }}</UBadge></td></tr></tbody></table>
          <table v-else-if="section === 'PENGAWASAN_MUTU'" class="w-full min-w-[900px] text-xs"><thead class="border-y border-[var(--app-border)] bg-[var(--app-surface-muted)] text-left font-medium text-[var(--app-foreground-muted)]"><tr><th class="w-12 px-3 py-2.5">No</th><th class="px-3 py-2.5">Nama Produk</th><th class="px-3 py-2.5">Jenis Sampel</th><th class="px-3 py-2.5">Asal Sampel</th><th class="px-3 py-2.5">Kode Sampel</th><th class="px-3 py-2.5">Kelas Mutu</th><th class="px-3 py-2.5">Keterangan</th></tr></thead><tbody class="divide-y divide-[var(--app-border)]"><tr v-for="(row, index) in filteredRows" :key="`${row.periodDate}-${index}`"><td class="px-3 py-2.5 tabular-nums text-[var(--app-foreground-muted)]">{{ index + 1 }}</td><td class="px-3 py-2.5 font-medium text-[var(--app-foreground)]">{{ text(row, 'nama_produk') ?? '—' }}</td><td class="px-3 py-2.5 text-[var(--app-foreground-muted)]">{{ text(row, 'jenis_sampel') ?? '—' }}</td><td class="px-3 py-2.5 text-[var(--app-foreground-muted)]">{{ text(row, 'asal_sampel') ?? '—' }}</td><td class="px-3 py-2.5 text-[var(--app-foreground-muted)]">{{ text(row, 'kode_sampel') ?? '—' }}</td><td class="px-3 py-2.5"><UBadge color="neutral" variant="subtle" size="xs">{{ classLabel(text(row, 'kelas_mutu') ?? '—') }}</UBadge></td><td class="max-w-72 px-3 py-2.5 text-[var(--app-foreground-muted)]">{{ text(row, 'keterangan') ?? '—' }}</td></tr></tbody></table>
          <table v-else class="w-full min-w-[820px] text-xs"><thead class="border-y border-[var(--app-border)] bg-[var(--app-surface-muted)] text-left font-medium text-[var(--app-foreground-muted)]"><tr><th class="w-12 px-3 py-2.5">No</th><th class="px-3 py-2.5">Penerima</th><th class="px-3 py-2.5">Komoditas</th><th class="px-3 py-2.5">Nomor Sertifikat</th><th class="px-3 py-2.5">Tanggal Kedaluwarsa</th><th class="px-3 py-2.5">Alamat</th></tr></thead><tbody class="divide-y divide-[var(--app-border)]"><tr v-for="(row, index) in filteredRows" :key="`${row.periodDate}-${index}`"><td class="px-3 py-2.5 tabular-nums text-[var(--app-foreground-muted)]">{{ index + 1 }}</td><td class="px-3 py-2.5 font-medium text-[var(--app-foreground)]">{{ text(row, 'penerima') ?? '—' }}</td><td class="px-3 py-2.5 text-[var(--app-foreground-muted)]">{{ text(row, 'komoditas') ?? '—' }}</td><td class="px-3 py-2.5 text-[var(--app-foreground-muted)]">{{ text(row, 'nomor_sertifikat') ?? '—' }}</td><td class="px-3 py-2.5 text-[var(--app-foreground-muted)]">{{ text(row, 'tanggal_kedaluwarsa') ? formatDate(text(row, 'tanggal_kedaluwarsa')!) : '—' }}</td><td class="max-w-72 px-3 py-2.5 text-[var(--app-foreground-muted)]">{{ text(row, 'alamat') ?? '—' }}</td></tr></tbody></table>
          <p v-if="!filteredRows.length" class="px-3 py-8 text-center text-sm text-[var(--app-foreground-muted)]">Tidak ada catatan yang sesuai.</p>
        </div>
        <template #footer><DashboardCardSource :source="source" /></template>
      </DashboardWidget>
    </template>
  </section>
</template>

<style scoped>
/* Hallmark · pre-emit critique: P5 H5 E4 S5 R5 V4 · genre: modern-minimal · macrostructure: Workbench · tone: compact enterprise · anchor hue: green */
.keamanan-dashboard {
  min-width: 0;
}
</style>
