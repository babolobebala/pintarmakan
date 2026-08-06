<script setup lang="ts">
import { appPermissions } from '~~/auth/permissions'

definePageMeta({
  permission: appPermissions.dashboardRead
})

type MetricCard = {
  label: string
  value: string
  period: string
  delta: string
  tone: 'emerald' | 'amber' | 'sky' | 'rose'
  note: string
}

type FoodPriority = {
  label: string
  count: number
  description: string
  tone: string
}

type RegionalSnapshot = {
  region: string
  ikp: number
  pph: number
  cppd: number
  status: string
}

const { data: currentUser } = await useCurrentUser()

const metricCards: MetricCard[] = [{
  label: 'Indeks Ketahanan Pangan',
  value: '79,24',
  period: 'Tahunan 2026',
  delta: '+2,1 poin',
  tone: 'emerald',
  note: 'Naik dibanding 2025, ditopang wilayah sentra padi dan distribusi antar-kecamatan.'
}, {
  label: 'Pola Pangan Harapan',
  value: '91,08',
  period: 'Tahunan 2026',
  delta: '+1,4 poin',
  tone: 'amber',
  note: 'Komposisi konsumsi makin seimbang, terutama pada pangan hewani dan hortikultura.'
}, {
  label: 'Ketersediaan Pangan Daerah',
  value: '162,4 ribu ton',
  period: 'Tahunan 2026',
  delta: '+8,7%',
  tone: 'sky',
  note: 'Surplus produksi didorong pemulihan luas panen dan stabilitas produksi per kecamatan.'
}, {
  label: 'Cadangan Pangan Pemerintah Daerah',
  value: '284 ton',
  period: 'Bulanan Juli 2026',
  delta: '84% dari target',
  tone: 'rose',
  note: 'Perlu pengisian ulang bertahap menjelang akhir triwulan dan periode rawan paceklik.'
}]

const yearlyTrend = [{
  year: '2022',
  ikp: 72.8,
  pph: 86.4,
  availability: 141.2
}, {
  year: '2023',
  ikp: 74.1,
  pph: 87.6,
  availability: 145.8
}, {
  year: '2024',
  ikp: 76.2,
  pph: 88.9,
  availability: 151.3
}, {
  year: '2025',
  ikp: 77.4,
  pph: 89.7,
  availability: 156.8
}, {
  year: '2026',
  ikp: 79.24,
  pph: 91.08,
  availability: 162.4
}]

const villagePriority: FoodPriority[] = [{
  label: 'Prioritas 1',
  count: 4,
  description: 'Perlu intervensi sangat tinggi',
  tone: '#c2410c'
}, {
  label: 'Prioritas 2',
  count: 7,
  description: 'Risiko tinggi',
  tone: '#ea580c'
}, {
  label: 'Prioritas 3',
  count: 11,
  description: 'Waspada',
  tone: '#f59e0b'
}, {
  label: 'Prioritas 4',
  count: 16,
  description: 'Menengah',
  tone: '#84cc16'
}, {
  label: 'Prioritas 5',
  count: 18,
  description: 'Relatif aman',
  tone: '#22c55e'
}, {
  label: 'Prioritas 6',
  count: 8,
  description: 'Sangat tahan pangan',
  tone: '#0f766e'
}]

const regionalSnapshots: RegionalSnapshot[] = [{
  region: 'Taliwang',
  ikp: 81.4,
  pph: 92.1,
  cppd: 46,
  status: 'Dominan Prioritas 5-6'
}, {
  region: 'Seteluk',
  ikp: 78.6,
  pph: 90.8,
  cppd: 38,
  status: 'Campuran Prioritas 4-5'
}, {
  region: 'Brang Rea',
  ikp: 76.3,
  pph: 89.1,
  cppd: 35,
  status: 'Campuran Prioritas 3-4'
}, {
  region: 'Jereweh',
  ikp: 74.8,
  pph: 88.6,
  cppd: 29,
  status: 'Perlu akselerasi distribusi'
}]

const spotlightPrograms = [{
  title: 'Stabilisasi CPPD',
  description: 'Fokus pada penguatan stok beras cadangan di gudang kabupaten dan buffer kecamatan.',
  badge: 'Bulanan'
}, {
  title: 'Pemetaan Prioritas Desa',
  description: 'Sinkronkan intervensi pangan dengan desa Prioritas 1-3 pada semester kedua.',
  badge: 'Tahunan'
}, {
  title: 'Produksi Pangan Strategis',
  description: 'Koneksikan dashboard ini dengan peta produksi padi, jagung, dan hortikultura.',
  badge: 'Lintas modul'
}]

const statusTotal = computed(() => villagePriority.reduce((total, item) => total + item.count, 0))

const trendBounds = computed(() => {
  const values = yearlyTrend.flatMap(item => [item.ikp, item.pph])

  return {
    min: Math.min(...values) - 2,
    max: Math.max(...values) + 2
  }
})

function createPolyline(values: number[]) {
  const width = 520
  const height = 220
  const padX = 18
  const padY = 20
  const { min, max } = trendBounds.value
  const step = (width - padX * 2) / Math.max(values.length - 1, 1)

  return values.map((value, index) => {
    const x = padX + (step * index)
    const ratio = (value - min) / Math.max(max - min, 1)
    const y = height - padY - (ratio * (height - padY * 2))

    return `${x},${y}`
  }).join(' ')
}

const ikpPolyline = computed(() => createPolyline(yearlyTrend.map(item => item.ikp)))
const pphPolyline = computed(() => createPolyline(yearlyTrend.map(item => item.pph)))

function toneClasses(tone: MetricCard['tone']) {
  switch (tone) {
    case 'emerald':
      return {
        panel: 'from-emerald-500/12 via-white to-white',
        badge: 'bg-emerald-500/12 text-emerald-700',
        dot: 'bg-emerald-500'
      }
    case 'amber':
      return {
        panel: 'from-amber-500/12 via-white to-white',
        badge: 'bg-amber-500/12 text-amber-700',
        dot: 'bg-amber-500'
      }
    case 'sky':
      return {
        panel: 'from-sky-500/12 via-white to-white',
        badge: 'bg-sky-500/12 text-sky-700',
        dot: 'bg-sky-500'
      }
    case 'rose':
      return {
        panel: 'from-rose-500/12 via-white to-white',
        badge: 'bg-rose-500/12 text-rose-700',
        dot: 'bg-rose-500'
      }
  }
}
</script>

<template>
  <UDashboardPanel id="executive-dashboard">
    <template #header>
      <UDashboardNavbar title="Executive Dashboard">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton
            to="/produksi-pangan"
            label="Lihat Produksi Pangan"
            icon="i-lucide-map"
            color="neutral"
            variant="subtle"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-6">
        <section class="executive-hero overflow-hidden rounded-3xl border border-default">
          <div class="grid gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)] lg:px-8 lg:py-8">
            <div class="space-y-5">
              <div class="flex flex-wrap items-center gap-2">
                <UBadge color="primary" variant="subtle" label="Kabupaten Sumbawa Barat" />
                <UBadge color="neutral" variant="outline" label="Mockup Dashboard" />
                <UBadge color="neutral" variant="outline" label="Data simulasi 2022-2026" />
              </div>

              <div class="space-y-3">
                <h1 class="max-w-3xl text-3xl font-semibold tracking-tight text-highlighted lg:text-4xl">
                  Ringkasan ketahanan pangan daerah untuk pengambilan keputusan cepat.
                </h1>
                <p class="max-w-2xl text-sm leading-6 text-muted lg:text-base">
                  Tampilan ini merangkum IKP, PPH, ketersediaan pangan, CPPD, dan status prioritas desa/kelurahan
                  dalam satu layar eksekutif. Fokusnya adalah arah tren, wilayah yang perlu perhatian, dan kesiapan
                  stok pangan daerah.
                </p>
              </div>

              <div class="grid gap-3 sm:grid-cols-3">
                <div class="rounded-2xl border border-white/70 bg-white/70 p-4 backdrop-blur">
                  <p class="text-xs uppercase tracking-[0.18em] text-muted">
                    Pengguna aktif
                  </p>
                  <p class="mt-2 text-2xl font-semibold text-highlighted">
                    {{ currentUser?.user.name || 'Operator' }}
                  </p>
                </div>
                <div class="rounded-2xl border border-white/70 bg-white/70 p-4 backdrop-blur">
                  <p class="text-xs uppercase tracking-[0.18em] text-muted">
                    Fokus wilayah
                  </p>
                  <p class="mt-2 text-2xl font-semibold text-highlighted">
                    KSB + Desa/Kelurahan
                  </p>
                </div>
                <div class="rounded-2xl border border-white/70 bg-white/70 p-4 backdrop-blur">
                  <p class="text-xs uppercase tracking-[0.18em] text-muted">
                    Ritme data
                  </p>
                  <p class="mt-2 text-2xl font-semibold text-highlighted">
                    Tahunan & Bulanan
                  </p>
                </div>
              </div>
            </div>

            <div class="space-y-4 rounded-3xl border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-highlighted">
                    Sorotan status pangan
                  </p>
                  <p class="text-sm text-muted">
                    Total {{ statusTotal }} desa/kelurahan terpetakan.
                  </p>
                </div>

                <div class="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  Prioritas 1-6
                </div>
              </div>

              <div class="space-y-3">
                <div
                  v-for="item in villagePriority"
                  :key="item.label"
                  class="space-y-2"
                >
                  <div class="flex items-center justify-between gap-3 text-sm">
                    <div class="flex items-center gap-2">
                      <span class="size-2.5 rounded-full" :style="{ backgroundColor: item.tone }" />
                      <span class="font-medium text-highlighted">{{ item.label }}</span>
                    </div>
                    <span class="text-muted">{{ item.count }} wilayah</span>
                  </div>

                  <div class="h-2 overflow-hidden rounded-full bg-zinc-200">
                    <div
                      class="h-full rounded-full"
                      :style="{ width: `${(item.count / statusTotal) * 100}%`, backgroundColor: item.tone }"
                    />
                  </div>

                  <p class="text-xs text-muted">
                    {{ item.description }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <UPageCard
            v-for="card in metricCards"
            :key="card.label"
            variant="subtle"
            class="overflow-hidden border border-default bg-gradient-to-br"
            :class="toneClasses(card.tone).panel"
          >
            <div class="space-y-4">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="text-sm text-muted">
                    {{ card.label }}
                  </p>
                  <p class="mt-2 text-3xl font-semibold text-highlighted">
                    {{ card.value }}
                  </p>
                </div>

                <span
                  class="rounded-full px-3 py-1 text-xs font-medium"
                  :class="toneClasses(card.tone).badge"
                >
                  {{ card.delta }}
                </span>
              </div>

              <div class="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted">
                <span class="size-2 rounded-full" :class="toneClasses(card.tone).dot" />
                {{ card.period }}
              </div>

              <p class="text-sm leading-6 text-muted">
                {{ card.note }}
              </p>
            </div>
          </UPageCard>
        </section>

        <section class="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.9fr)]">
          <UPageCard
            title="Tren IKP dan PPH"
            description="Simulasi perkembangan tahunan indikator ketahanan pangan utama."
            variant="subtle"
          >
            <div class="space-y-4">
              <div class="flex flex-wrap items-center gap-4 text-sm">
                <div class="flex items-center gap-2">
                  <span class="size-3 rounded-full bg-emerald-500" />
                  <span class="text-muted">IKP</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="size-3 rounded-full bg-amber-500" />
                  <span class="text-muted">PPH</span>
                </div>
              </div>

              <div class="rounded-2xl border border-default bg-white p-4">
                <svg viewBox="0 0 520 220" class="h-64 w-full">
                  <defs>
                    <linearGradient
                      id="ikp-fill"
                      x1="0"
                      x2="0"
                      y1="0"
                      y2="1"
                    >
                      <stop offset="0%" stop-color="#10b981" stop-opacity="0.22" />
                      <stop offset="100%" stop-color="#10b981" stop-opacity="0" />
                    </linearGradient>
                    <linearGradient
                      id="pph-fill"
                      x1="0"
                      x2="0"
                      y1="0"
                      y2="1"
                    >
                      <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.18" />
                      <stop offset="100%" stop-color="#f59e0b" stop-opacity="0" />
                    </linearGradient>
                  </defs>

                  <line
                    v-for="line in 5"
                    :key="line"
                    x1="18"
                    :y1="20 + ((line - 1) * 45)"
                    x2="502"
                    :y2="20 + ((line - 1) * 45)"
                    stroke="#e4e4e7"
                    stroke-dasharray="5 5"
                  />

                  <polyline
                    :points="ikpPolyline"
                    fill="none"
                    stroke="#10b981"
                    stroke-width="4"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />

                  <polyline
                    :points="pphPolyline"
                    fill="none"
                    stroke="#f59e0b"
                    stroke-width="4"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />

                  <g v-for="(point, index) in yearlyTrend" :key="point.year">
                    <circle
                      :cx="18 + ((484 / (yearlyTrend.length - 1)) * index)"
                      :cy="
                        Number(ikpPolyline.split(' ')[index]?.split(',')[1])
                      "
                      r="5"
                      fill="#10b981"
                    />
                    <circle
                      :cx="18 + ((484 / (yearlyTrend.length - 1)) * index)"
                      :cy="
                        Number(pphPolyline.split(' ')[index]?.split(',')[1])
                      "
                      r="5"
                      fill="#f59e0b"
                    />
                    <text
                      :x="18 + ((484 / (yearlyTrend.length - 1)) * index)"
                      y="212"
                      text-anchor="middle"
                      fill="#71717a"
                      font-size="12"
                    >
                      {{ point.year }}
                    </text>
                  </g>
                </svg>
              </div>

              <div class="grid gap-3 md:grid-cols-3">
                <div
                  v-for="item in yearlyTrend"
                  :key="item.year"
                  class="rounded-2xl border border-default bg-white p-4"
                >
                  <p class="text-xs uppercase tracking-[0.18em] text-muted">
                    {{ item.year }}
                  </p>
                  <div class="mt-3 space-y-2 text-sm">
                    <div class="flex items-center justify-between">
                      <span class="text-muted">IKP</span>
                      <span class="font-medium text-highlighted">{{ item.ikp.toFixed(1) }}</span>
                    </div>
                    <div class="flex items-center justify-between">
                      <span class="text-muted">PPH</span>
                      <span class="font-medium text-highlighted">{{ item.pph.toFixed(1) }}</span>
                    </div>
                    <div class="flex items-center justify-between">
                      <span class="text-muted">Ketersediaan</span>
                      <span class="font-medium text-highlighted">{{ item.availability.toFixed(1) }} ribu ton</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </UPageCard>

          <UPageCard
            title="Status Ketahanan Pangan Wilayah"
            description="Ringkasan kategori prioritas desa/kelurahan dan snapshot kecamatan."
            variant="subtle"
          >
            <div class="space-y-4">
              <div class="space-y-3">
                <div
                  v-for="item in regionalSnapshots"
                  :key="item.region"
                  class="rounded-2xl border border-default bg-white p-4"
                >
                  <div class="flex items-start justify-between gap-3">
                    <div>
                      <p class="font-medium text-highlighted">
                        {{ item.region }}
                      </p>
                      <p class="text-sm text-muted">
                        {{ item.status }}
                      </p>
                    </div>

                    <UBadge color="neutral" variant="outline" :label="`${item.cppd} ton CPPD`" />
                  </div>

                  <div class="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div class="rounded-xl bg-zinc-50 p-3">
                      <p class="text-muted">
                        IKP
                      </p>
                      <p class="mt-1 font-semibold text-highlighted">
                        {{ item.ikp }}
                      </p>
                    </div>
                    <div class="rounded-xl bg-zinc-50 p-3">
                      <p class="text-muted">
                        PPH
                      </p>
                      <p class="mt-1 font-semibold text-highlighted">
                        {{ item.pph }}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </UPageCard>
        </section>

        <section class="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
          <UPageCard
            title="Ringkasan indikator eksekutif"
            description="Contoh tabel rekap indikator untuk pemantauan lintas periode."
            variant="subtle"
          >
            <div class="overflow-hidden rounded-2xl border border-default bg-white">
              <table class="min-w-full divide-y divide-default text-sm">
                <thead class="bg-zinc-50">
                  <tr>
                    <th class="px-4 py-3 text-left font-medium text-muted">
                      Indikator
                    </th>
                    <th class="px-4 py-3 text-left font-medium text-muted">
                      Bentuk data
                    </th>
                    <th class="px-4 py-3 text-left font-medium text-muted">
                      Periode
                    </th>
                    <th class="px-4 py-3 text-left font-medium text-muted">
                      Cakupan
                    </th>
                    <th class="px-4 py-3 text-left font-medium text-muted">
                      Nilai
                    </th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-default">
                  <tr
                    v-for="card in metricCards"
                    :key="card.label"
                    class="hover:bg-zinc-50/80"
                  >
                    <td class="px-4 py-3 font-medium text-highlighted">
                      {{ card.label }}
                    </td>
                    <td class="px-4 py-3 text-muted">
                      Tunggal
                    </td>
                    <td class="px-4 py-3 text-muted">
                      {{ card.period }}
                    </td>
                    <td class="px-4 py-3 text-muted">
                      KSB Saja
                    </td>
                    <td class="px-4 py-3 text-highlighted">
                      {{ card.value }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </UPageCard>

          <UPageCard
            title="Agenda analisis"
            description="Contoh blok insight untuk briefing pimpinan."
            variant="subtle"
          >
            <div class="space-y-3">
              <div
                v-for="program in spotlightPrograms"
                :key="program.title"
                class="rounded-2xl border border-default bg-white p-4"
              >
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <p class="font-medium text-highlighted">
                      {{ program.title }}
                    </p>
                    <p class="mt-2 text-sm leading-6 text-muted">
                      {{ program.description }}
                    </p>
                  </div>

                  <UBadge color="primary" variant="subtle" :label="program.badge" />
                </div>
              </div>
            </div>
          </UPageCard>
        </section>
      </div>
    </template>
  </UDashboardPanel>
</template>

<style scoped>
.executive-hero {
  background:
    radial-gradient(circle at top left, rgba(34, 197, 94, 0.18), transparent 34%),
    radial-gradient(circle at top right, rgba(245, 158, 11, 0.16), transparent 28%),
    linear-gradient(135deg, #f7fee7 0%, #ffffff 45%, #f8fafc 100%);
}
</style>
