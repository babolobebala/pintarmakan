<script setup lang="ts">
import AreaChart from '../components/charts/AreaChart.vue'
import BarChart from '../components/charts/BarChart.vue'
import DonutChart from '../components/charts/DonutChart.vue'
import GroupedBarChart from '../components/charts/GroupedBarChart.vue'
import LineChart from '../components/charts/LineChart.vue'
import StackedBarChart from '../components/charts/StackedBarChart.vue'
import type { CartesianChartSeries, ChartAccessor } from '../components/charts/shared'

import { appPermissions } from '~~/auth/permissions'

definePageMeta({
  permission: appPermissions.dashboardRead
})

type MonthlyProductionDatum = {
  month: number
  padi: number
  jagung: number
  cabai: number
}

type AreaSupplyDatum = {
  month: number
  stok: number
  distribusi: number
}

type SingleBarDatum = {
  index: number
  label: string
  value: number
}

type GroupedQuarterDatum = {
  quarter: number
  tanam: number
  panen: number
  distribusi: number
}

type StackedQuarterDatum = {
  quarter: number
  beras: number
  jagung: number
  hortikultura: number
}

type DonutDatum = {
  id: string
  label: string
  value: number
}

type ChartDatum = Record<string, unknown>

const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const districtLabels = ['Taliwang', 'Seteluk', 'Brang Rea', 'Jereweh', 'Maluk', 'Sekongkang']
const quarterLabels = ['TW I', 'TW II', 'TW III', 'TW IV']
const districtValues = [22740, 17430, 21080, 7690, 6480, 5590] as const

const monthlyProductionData: MonthlyProductionDatum[] = [{
  month: 1,
  padi: 1840,
  jagung: 1120,
  cabai: 320
}, {
  month: 2,
  padi: 2015,
  jagung: 1255,
  cabai: 368
}, {
  month: 3,
  padi: 2240,
  jagung: 1390,
  cabai: 410
}, {
  month: 4,
  padi: 2365,
  jagung: 1485,
  cabai: 452
}, {
  month: 5,
  padi: 2480,
  jagung: 1530,
  cabai: 498
}, {
  month: 6,
  padi: 2575,
  jagung: 1605,
  cabai: 536
}, {
  month: 7,
  padi: 2660,
  jagung: 1710,
  cabai: 580
}, {
  month: 8,
  padi: 2510,
  jagung: 1660,
  cabai: 548
}, {
  month: 9,
  padi: 2380,
  jagung: 1585,
  cabai: 516
}, {
  month: 10,
  padi: 2290,
  jagung: 1510,
  cabai: 472
}, {
  month: 11,
  padi: 2145,
  jagung: 1415,
  cabai: 430
}, {
  month: 12,
  padi: 2060,
  jagung: 1330,
  cabai: 388
}]

const areaSupplyData: AreaSupplyDatum[] = [{
  month: 1,
  stok: 1220,
  distribusi: 860
}, {
  month: 2,
  stok: 1360,
  distribusi: 920
}, {
  month: 3,
  stok: 1445,
  distribusi: 1010
}, {
  month: 4,
  stok: 1590,
  distribusi: 1120
}, {
  month: 5,
  stok: 1660,
  distribusi: 1185
}, {
  month: 6,
  stok: 1725,
  distribusi: 1260
}, {
  month: 7,
  stok: 1810,
  distribusi: 1325
}, {
  month: 8,
  stok: 1750,
  distribusi: 1280
}, {
  month: 9,
  stok: 1680,
  distribusi: 1225
}, {
  month: 10,
  stok: 1605,
  distribusi: 1170
}, {
  month: 11,
  stok: 1510,
  distribusi: 1080
}, {
  month: 12,
  stok: 1430,
  distribusi: 990
}]

const districtBarData: SingleBarDatum[] = districtLabels.map((label, index) => ({
  index: index + 1,
  label,
  value: districtValues[index] ?? 0
}))

const groupedQuarterData: GroupedQuarterDatum[] = [{
  quarter: 1,
  tanam: 4200,
  panen: 2750,
  distribusi: 1980
}, {
  quarter: 2,
  tanam: 4680,
  panen: 3210,
  distribusi: 2250
}, {
  quarter: 3,
  tanam: 4520,
  panen: 3360,
  distribusi: 2415
}, {
  quarter: 4,
  tanam: 3980,
  panen: 2985,
  distribusi: 2125
}]

const stackedQuarterData: StackedQuarterDatum[] = [{
  quarter: 1,
  beras: 1840,
  jagung: 1120,
  hortikultura: 820
}, {
  quarter: 2,
  beras: 2110,
  jagung: 1365,
  hortikultura: 940
}, {
  quarter: 3,
  beras: 2265,
  jagung: 1490,
  hortikultura: 1015
}, {
  quarter: 4,
  beras: 1985,
  jagung: 1275,
  hortikultura: 910
}]

const donutCompositionData: DonutDatum[] = [{
  id: 'beras',
  label: 'Beras',
  value: 42
}, {
  id: 'jagung',
  label: 'Jagung',
  value: 24
}, {
  id: 'hortikultura',
  label: 'Hortikultura',
  value: 18
}, {
  id: 'peternakan',
  label: 'Peternakan',
  value: 10
}, {
  id: 'perikanan',
  label: 'Perikanan',
  value: 6
}]

const getMonthlyMonth: ChartAccessor<ChartDatum, number> = datum => datum.month as number
const getAreaSupplyMonth: ChartAccessor<ChartDatum, number> = datum => datum.month as number
const getDistrictIndex: ChartAccessor<ChartDatum, number> = datum => datum.index as number
const getDistrictValue: ChartAccessor<ChartDatum, number> = datum => datum.value as number
const getGroupedQuarter: ChartAccessor<ChartDatum, number> = datum => datum.quarter as number
const getStackedQuarter: ChartAccessor<ChartDatum, number> = datum => datum.quarter as number
const getDonutValue: ChartAccessor<ChartDatum, number> = datum => datum.value as number
const getDonutLabel: ChartAccessor<ChartDatum, string> = datum => datum.label as string

const monthlyProductionSeries: CartesianChartSeries<ChartDatum>[] = [{
  key: 'padi',
  label: 'Padi',
  y: datum => datum.padi as number,
  color: '#2563eb'
}, {
  key: 'jagung',
  label: 'Jagung',
  y: datum => datum.jagung as number,
  color: '#16a34a'
}, {
  key: 'cabai',
  label: 'Cabai',
  y: datum => datum.cabai as number,
  color: '#dc2626'
}]

const areaSupplySeries: CartesianChartSeries<ChartDatum>[] = [{
  key: 'stok',
  label: 'Stok',
  y: datum => datum.stok as number,
  color: '#0891b2'
}, {
  key: 'distribusi',
  label: 'Distribusi',
  y: datum => datum.distribusi as number,
  color: '#f59e0b'
}]

const groupedQuarterSeries: CartesianChartSeries<ChartDatum>[] = [{
  key: 'tanam',
  label: 'Tanam',
  y: datum => datum.tanam as number,
  color: '#2563eb'
}, {
  key: 'panen',
  label: 'Panen',
  y: datum => datum.panen as number,
  color: '#16a34a'
}, {
  key: 'distribusi',
  label: 'Distribusi',
  y: datum => datum.distribusi as number,
  color: '#d97706'
}]

const stackedQuarterSeries: CartesianChartSeries<ChartDatum>[] = [{
  key: 'beras',
  label: 'Beras',
  y: datum => datum.beras as number,
  color: '#2563eb'
}, {
  key: 'jagung',
  label: 'Jagung',
  y: datum => datum.jagung as number,
  color: '#16a34a'
}, {
  key: 'hortikultura',
  label: 'Hortikultura',
  y: datum => datum.hortikultura as number,
  color: '#f59e0b'
}]

function formatMonthTick(tick: number | Date) {
  if (tick instanceof Date) {
    return tick.toLocaleDateString('id-ID')
  }

  return monthLabels[Math.max(0, Math.min(monthLabels.length - 1, Math.round(tick) - 1))] ?? ''
}

function formatQuarterTick(tick: number | Date) {
  if (tick instanceof Date) {
    return tick.toLocaleDateString('id-ID')
  }

  return quarterLabels[Math.max(0, Math.min(quarterLabels.length - 1, Math.round(tick) - 1))] ?? ''
}

function formatDistrictTick(tick: number | Date) {
  if (tick instanceof Date) {
    return tick.toLocaleDateString('id-ID')
  }

  return districtLabels[Math.max(0, Math.min(districtLabels.length - 1, Math.round(tick) - 1))] ?? ''
}

function formatCompactTick(tick: number | Date) {
  if (tick instanceof Date) {
    return tick.toLocaleDateString('id-ID')
  }

  return new Intl.NumberFormat('id-ID', {
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(tick)
}
</script>

<template>
  <UDashboardPanel id="dashboard-demo-chart">
    <template #header>
      <UDashboardNavbar title="Demo Reusable Chart">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-6">
        <section class="chart-hero overflow-hidden rounded-3xl border border-default px-6 py-6 lg:px-8 lg:py-8">
          <div class="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div class="max-w-3xl space-y-4">
              <div class="flex flex-wrap items-center gap-2">
                <UBadge color="primary" variant="subtle" label="Nuxt UI + Unovis" />
                <UBadge color="neutral" variant="outline" label="Reusable Component Kit" />
              </div>

              <div class="space-y-3">
                <h1 class="text-3xl font-semibold tracking-tight text-highlighted lg:text-4xl">
                  Halaman demonstrasi chart reusable untuk dashboard analitik.
                </h1>
                <p class="text-sm leading-6 text-muted lg:text-base">
                  Semua chart di halaman ini memakai komponen reusable dari folder <code>app/components/charts</code>.
                  Tujuannya supaya pola visual, legenda, dan konfigurasi dasar chart tetap konsisten di seluruh dashboard.
                </p>
              </div>
            </div>

            <div class="grid gap-3 sm:grid-cols-3">
              <div class="rounded-2xl border border-white/70 bg-white/75 p-4 backdrop-blur">
                <p class="text-xs uppercase tracking-[0.18em] text-muted">
                  Komponen
                </p>
                <p class="mt-2 text-xl font-semibold text-highlighted">
                  6 inti
                </p>
              </div>
              <div class="rounded-2xl border border-white/70 bg-white/75 p-4 backdrop-blur">
                <p class="text-xs uppercase tracking-[0.18em] text-muted">
                  Library
                </p>
                <p class="mt-2 text-xl font-semibold text-highlighted">
                  Unovis
                </p>
              </div>
              <div class="rounded-2xl border border-white/70 bg-white/75 p-4 backdrop-blur">
                <p class="text-xs uppercase tracking-[0.18em] text-muted">
                  Shell UI
                </p>
                <p class="mt-2 text-xl font-semibold text-highlighted">
                  Nuxt UI
                </p>
              </div>
            </div>
          </div>
        </section>

        <section class="grid gap-4 xl:grid-cols-2">
          <LineChart
            title="Line Chart"
            description="Tren produksi bulanan tiga komoditas untuk memantau pola naik-turun."
            :data="monthlyProductionData"
            :x="getMonthlyMonth"
            :series="monthlyProductionSeries"
            x-label="Bulan"
            y-label="Produksi"
            :x-tick-values="[1, 3, 5, 7, 9, 11]"
            :x-tick-format="formatMonthTick"
            :y-tick-format="formatCompactTick"
            aria-label="Grafik garis tren produksi bulanan"
          />

          <AreaChart
            title="Area Chart"
            description="Visual stok dan distribusi untuk melihat area supply yang dominan sepanjang tahun."
            :data="areaSupplyData"
            :x="getAreaSupplyMonth"
            :series="areaSupplySeries"
            x-label="Bulan"
            y-label="Ton"
            :x-tick-values="[1, 3, 5, 7, 9, 11]"
            :x-tick-format="formatMonthTick"
            :y-tick-format="formatCompactTick"
            aria-label="Grafik area stok dan distribusi"
          />
        </section>

        <section class="grid gap-4 xl:grid-cols-2">
          <BarChart
            title="Bar Chart"
            description="Contoh bar tunggal untuk peringkat produksi antar kecamatan."
            :data="districtBarData"
            :x="getDistrictIndex"
            :y="getDistrictValue"
            x-label="Kecamatan"
            y-label="Produksi"
            :x-tick-values="[1, 2, 3, 4, 5, 6]"
            :x-tick-format="formatDistrictTick"
            :y-tick-format="formatCompactTick"
            color="#2563eb"
            aria-label="Grafik batang produksi kecamatan"
          />

          <GroupedBarChart
            title="Grouped Bar Chart"
            description="Perbandingan aktivitas tanam, panen, dan distribusi per triwulan."
            :data="groupedQuarterData"
            :x="getGroupedQuarter"
            :series="groupedQuarterSeries"
            x-label="Triwulan"
            y-label="Volume"
            :x-tick-values="[1, 2, 3, 4]"
            :x-tick-format="formatQuarterTick"
            :y-tick-format="formatCompactTick"
            aria-label="Grafik batang berkelompok per triwulan"
          />
        </section>

        <section class="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <StackedBarChart
            title="Stacked Bar Chart"
            description="Komposisi kategori produksi per triwulan pada satu batang yang ditumpuk."
            :data="stackedQuarterData"
            :x="getStackedQuarter"
            :series="stackedQuarterSeries"
            x-label="Triwulan"
            y-label="Ton"
            :x-tick-values="[1, 2, 3, 4]"
            :x-tick-format="formatQuarterTick"
            :y-tick-format="formatCompactTick"
            aria-label="Grafik batang bertumpuk per triwulan"
          />

          <DonutChart
            title="Donut Chart"
            description="Komposisi kontribusi kategori pangan terhadap total portofolio dashboard."
            :data="donutCompositionData"
            :value="getDonutValue"
            :label="getDonutLabel"
            :colors="['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#7c3aed']"
            central-sub-label="Komposisi"
            aria-label="Grafik donat komposisi kategori"
          />
        </section>
      </div>
    </template>
  </UDashboardPanel>
</template>

<style scoped>
.chart-hero {
  background:
    radial-gradient(circle at top left, rgba(37, 99, 235, 0.18), transparent 34%),
    radial-gradient(circle at bottom right, rgba(22, 163, 74, 0.16), transparent 28%),
    linear-gradient(135deg, #f8fafc 0%, #ffffff 48%, #eff6ff 100%);
}
</style>
