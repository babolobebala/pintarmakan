<script setup lang="ts">
import { appPermissions } from '~~/auth/permissions'

definePageMeta({
  permission: appPermissions.dashboardRead
})

type CommodityKey
  = 'padi'
    | 'jagung'
    | 'kedelai'
    | 'cabai'
    | 'bawangMerah'
    | 'sayuran'
    | 'buahBuahan'
    | 'dagingSapi'
    | 'ayam'
    | 'telur'
    | 'ikan'

type DistrictProduction = {
  name: string
  lat: number
  lng: number
  harvestArea: number
  production: number
}

type CommodityDefinition = {
  label: string
  unit: string
  note: string
  category: string
  districts: DistrictProduction[]
}

const ALL_KECAMATAN = 'Semua kecamatan'

const commodityOptions: Array<{ key: CommodityKey, label: string }> = [{
  key: 'padi',
  label: 'Padi'
}, {
  key: 'jagung',
  label: 'Jagung'
}, {
  key: 'kedelai',
  label: 'Kedelai'
}, {
  key: 'cabai',
  label: 'Cabai'
}, {
  key: 'bawangMerah',
  label: 'Bawang merah'
}, {
  key: 'sayuran',
  label: 'Sayuran'
}, {
  key: 'buahBuahan',
  label: 'Buah-buahan'
}, {
  key: 'dagingSapi',
  label: 'Daging sapi'
}, {
  key: 'ayam',
  label: 'Ayam'
}, {
  key: 'telur',
  label: 'Telur'
}, {
  key: 'ikan',
  label: 'Ikan'
}]

const commodityData: Record<CommodityKey, CommodityDefinition> = {
  padi: {
    label: 'Padi',
    unit: 'ton',
    note: 'Komoditas utama untuk ketahanan pangan daerah.',
    category: 'Tanaman pangan',
    districts: [
      { name: 'Taliwang', lat: -8.742, lng: 116.838, harvestArea: 3620, production: 22740 },
      { name: 'Seteluk', lat: -8.640, lng: 116.903, harvestArea: 2810, production: 17430 },
      { name: 'Brang Rea', lat: -8.592, lng: 116.944, harvestArea: 3240, production: 21080 },
      { name: 'Brang Ene', lat: -8.676, lng: 116.889, harvestArea: 1960, production: 11870 },
      { name: 'Poto Tano', lat: -8.451, lng: 116.844, harvestArea: 1430, production: 8450 },
      { name: 'Jereweh', lat: -8.795, lng: 116.539, harvestArea: 1290, production: 7690 },
      { name: 'Maluk', lat: -8.900, lng: 116.725, harvestArea: 1120, production: 6480 },
      { name: 'Sekongkang', lat: -8.962, lng: 116.806, harvestArea: 980, production: 5590 }
    ]
  },
  jagung: {
    label: 'Jagung',
    unit: 'ton',
    note: 'Sentra produksi tersebar di kawasan lahan kering dan tadah hujan.',
    category: 'Tanaman pangan',
    districts: [
      { name: 'Taliwang', lat: -8.742, lng: 116.838, harvestArea: 1890, production: 10840 },
      { name: 'Seteluk', lat: -8.640, lng: 116.903, harvestArea: 1740, production: 9530 },
      { name: 'Brang Rea', lat: -8.592, lng: 116.944, harvestArea: 2120, production: 12020 },
      { name: 'Brang Ene', lat: -8.676, lng: 116.889, harvestArea: 1450, production: 7940 },
      { name: 'Poto Tano', lat: -8.451, lng: 116.844, harvestArea: 980, production: 5330 },
      { name: 'Jereweh', lat: -8.795, lng: 116.539, harvestArea: 1130, production: 6410 },
      { name: 'Maluk', lat: -8.900, lng: 116.725, harvestArea: 860, production: 4710 },
      { name: 'Sekongkang', lat: -8.962, lng: 116.806, harvestArea: 790, production: 4310 }
    ]
  },
  kedelai: {
    label: 'Kedelai',
    unit: 'ton',
    note: 'Masih berpotensi tumbuh melalui intensifikasi lahan tanaman pangan.',
    category: 'Tanaman pangan',
    districts: [
      { name: 'Taliwang', lat: -8.742, lng: 116.838, harvestArea: 460, production: 812 },
      { name: 'Seteluk', lat: -8.640, lng: 116.903, harvestArea: 390, production: 670 },
      { name: 'Brang Rea', lat: -8.592, lng: 116.944, harvestArea: 510, production: 921 },
      { name: 'Brang Ene', lat: -8.676, lng: 116.889, harvestArea: 320, production: 558 },
      { name: 'Poto Tano', lat: -8.451, lng: 116.844, harvestArea: 270, production: 446 },
      { name: 'Jereweh', lat: -8.795, lng: 116.539, harvestArea: 250, production: 420 },
      { name: 'Maluk', lat: -8.900, lng: 116.725, harvestArea: 210, production: 366 },
      { name: 'Sekongkang', lat: -8.962, lng: 116.806, harvestArea: 180, production: 298 }
    ]
  },
  cabai: {
    label: 'Cabai',
    unit: 'ton',
    note: 'Komoditas strategis untuk pengendalian inflasi pangan daerah.',
    category: 'Hortikultura',
    districts: [
      { name: 'Taliwang', lat: -8.742, lng: 116.838, harvestArea: 320, production: 2540 },
      { name: 'Seteluk', lat: -8.640, lng: 116.903, harvestArea: 280, production: 2180 },
      { name: 'Brang Rea', lat: -8.592, lng: 116.944, harvestArea: 350, production: 2790 },
      { name: 'Brang Ene', lat: -8.676, lng: 116.889, harvestArea: 220, production: 1670 },
      { name: 'Poto Tano', lat: -8.451, lng: 116.844, harvestArea: 140, production: 1010 },
      { name: 'Jereweh', lat: -8.795, lng: 116.539, harvestArea: 180, production: 1280 },
      { name: 'Maluk', lat: -8.900, lng: 116.725, harvestArea: 160, production: 1130 },
      { name: 'Sekongkang', lat: -8.962, lng: 116.806, harvestArea: 130, production: 940 }
    ]
  },
  bawangMerah: {
    label: 'Bawang merah',
    unit: 'ton',
    note: 'Cocok ditampilkan sebagai klaster sentra produksi hortikultura.',
    category: 'Hortikultura',
    districts: [
      { name: 'Taliwang', lat: -8.742, lng: 116.838, harvestArea: 210, production: 1410 },
      { name: 'Seteluk', lat: -8.640, lng: 116.903, harvestArea: 180, production: 1205 },
      { name: 'Brang Rea', lat: -8.592, lng: 116.944, harvestArea: 240, production: 1680 },
      { name: 'Brang Ene', lat: -8.676, lng: 116.889, harvestArea: 150, production: 1015 },
      { name: 'Poto Tano', lat: -8.451, lng: 116.844, harvestArea: 120, production: 790 },
      { name: 'Jereweh', lat: -8.795, lng: 116.539, harvestArea: 110, production: 720 },
      { name: 'Maluk', lat: -8.900, lng: 116.725, harvestArea: 105, production: 701 },
      { name: 'Sekongkang', lat: -8.962, lng: 116.806, harvestArea: 88, production: 566 }
    ]
  },
  sayuran: {
    label: 'Sayuran',
    unit: 'ton',
    note: 'Agregasi komoditas sayuran untuk pemantauan ketersediaan pangan segar.',
    category: 'Hortikultura',
    districts: [
      { name: 'Taliwang', lat: -8.742, lng: 116.838, harvestArea: 540, production: 4380 },
      { name: 'Seteluk', lat: -8.640, lng: 116.903, harvestArea: 470, production: 3810 },
      { name: 'Brang Rea', lat: -8.592, lng: 116.944, harvestArea: 610, production: 4960 },
      { name: 'Brang Ene', lat: -8.676, lng: 116.889, harvestArea: 340, production: 2710 },
      { name: 'Poto Tano', lat: -8.451, lng: 116.844, harvestArea: 230, production: 1760 },
      { name: 'Jereweh', lat: -8.795, lng: 116.539, harvestArea: 265, production: 2090 },
      { name: 'Maluk', lat: -8.900, lng: 116.725, harvestArea: 240, production: 1915 },
      { name: 'Sekongkang', lat: -8.962, lng: 116.806, harvestArea: 210, production: 1640 }
    ]
  },
  buahBuahan: {
    label: 'Buah-buahan',
    unit: 'ton',
    note: 'Ringkasan hortikultura tahunan berbasis kecamatan.',
    category: 'Hortikultura',
    districts: [
      { name: 'Taliwang', lat: -8.742, lng: 116.838, harvestArea: 760, production: 5810 },
      { name: 'Seteluk', lat: -8.640, lng: 116.903, harvestArea: 650, production: 4970 },
      { name: 'Brang Rea', lat: -8.592, lng: 116.944, harvestArea: 810, production: 6230 },
      { name: 'Brang Ene', lat: -8.676, lng: 116.889, harvestArea: 480, production: 3610 },
      { name: 'Poto Tano', lat: -8.451, lng: 116.844, harvestArea: 350, production: 2540 },
      { name: 'Jereweh', lat: -8.795, lng: 116.539, harvestArea: 390, production: 2860 },
      { name: 'Maluk', lat: -8.900, lng: 116.725, harvestArea: 360, production: 2615 },
      { name: 'Sekongkang', lat: -8.962, lng: 116.806, harvestArea: 320, production: 2290 }
    ]
  },
  dagingSapi: {
    label: 'Daging sapi',
    unit: 'ton',
    note: 'Mockup agregasi produksi peternakan per kecamatan.',
    category: 'Peternakan',
    districts: [
      { name: 'Taliwang', lat: -8.742, lng: 116.838, harvestArea: 420, production: 920 },
      { name: 'Seteluk', lat: -8.640, lng: 116.903, harvestArea: 390, production: 810 },
      { name: 'Brang Rea', lat: -8.592, lng: 116.944, harvestArea: 450, production: 1010 },
      { name: 'Brang Ene', lat: -8.676, lng: 116.889, harvestArea: 310, production: 690 },
      { name: 'Poto Tano', lat: -8.451, lng: 116.844, harvestArea: 205, production: 460 },
      { name: 'Jereweh', lat: -8.795, lng: 116.539, harvestArea: 255, production: 580 },
      { name: 'Maluk', lat: -8.900, lng: 116.725, harvestArea: 238, production: 521 },
      { name: 'Sekongkang', lat: -8.962, lng: 116.806, harvestArea: 220, production: 488 }
    ]
  },
  ayam: {
    label: 'Ayam',
    unit: 'ton',
    note: 'Mockup produksi unggas sebagai data tahunan lintas kecamatan.',
    category: 'Peternakan',
    districts: [
      { name: 'Taliwang', lat: -8.742, lng: 116.838, harvestArea: 520, production: 1640 },
      { name: 'Seteluk', lat: -8.640, lng: 116.903, harvestArea: 470, production: 1475 },
      { name: 'Brang Rea', lat: -8.592, lng: 116.944, harvestArea: 610, production: 1930 },
      { name: 'Brang Ene', lat: -8.676, lng: 116.889, harvestArea: 345, production: 1050 },
      { name: 'Poto Tano', lat: -8.451, lng: 116.844, harvestArea: 250, production: 755 },
      { name: 'Jereweh', lat: -8.795, lng: 116.539, harvestArea: 280, production: 880 },
      { name: 'Maluk', lat: -8.900, lng: 116.725, harvestArea: 268, production: 822 },
      { name: 'Sekongkang', lat: -8.962, lng: 116.806, harvestArea: 235, production: 724 }
    ]
  },
  telur: {
    label: 'Telur',
    unit: 'ton',
    note: 'Produksi telur untuk dukungan protein hewani dan konsumsi rumah tangga.',
    category: 'Peternakan',
    districts: [
      { name: 'Taliwang', lat: -8.742, lng: 116.838, harvestArea: 260, production: 540 },
      { name: 'Seteluk', lat: -8.640, lng: 116.903, harvestArea: 230, production: 485 },
      { name: 'Brang Rea', lat: -8.592, lng: 116.944, harvestArea: 290, production: 608 },
      { name: 'Brang Ene', lat: -8.676, lng: 116.889, harvestArea: 190, production: 395 },
      { name: 'Poto Tano', lat: -8.451, lng: 116.844, harvestArea: 120, production: 248 },
      { name: 'Jereweh', lat: -8.795, lng: 116.539, harvestArea: 150, production: 320 },
      { name: 'Maluk', lat: -8.900, lng: 116.725, harvestArea: 145, production: 302 },
      { name: 'Sekongkang', lat: -8.962, lng: 116.806, harvestArea: 136, production: 281 }
    ]
  },
  ikan: {
    label: 'Ikan',
    unit: 'ton',
    note: 'Produksi perikanan tangkap dan budidaya untuk pelengkap dashboard pangan.',
    category: 'Perikanan',
    districts: [
      { name: 'Taliwang', lat: -8.742, lng: 116.838, harvestArea: 680, production: 4380 },
      { name: 'Seteluk', lat: -8.640, lng: 116.903, harvestArea: 520, production: 3415 },
      { name: 'Brang Rea', lat: -8.592, lng: 116.944, harvestArea: 410, production: 2640 },
      { name: 'Brang Ene', lat: -8.676, lng: 116.889, harvestArea: 360, production: 2280 },
      { name: 'Poto Tano', lat: -8.451, lng: 116.844, harvestArea: 890, production: 5980 },
      { name: 'Jereweh', lat: -8.795, lng: 116.539, harvestArea: 930, production: 6320 },
      { name: 'Maluk', lat: -8.900, lng: 116.725, harvestArea: 980, production: 6710 },
      { name: 'Sekongkang', lat: -8.962, lng: 116.806, harvestArea: 1040, production: 7150 }
    ]
  }
}

const selectedCommodity = ref<CommodityKey>('padi')
const selectedKecamatan = ref(ALL_KECAMATAN)

const selectedDefinition = computed(() => commodityData[selectedCommodity.value])
const districtOptions = computed(() => {
  return [ALL_KECAMATAN, ...selectedDefinition.value.districts.map(item => item.name)]
})
const activeDistricts = computed(() => {
  if (selectedKecamatan.value === ALL_KECAMATAN) {
    return selectedDefinition.value.districts
  }

  return selectedDefinition.value.districts.filter(item => item.name === selectedKecamatan.value)
})
const sortedDistricts = computed(() => {
  return [...activeDistricts.value].sort((a, b) => b.production - a.production)
})
const totalHarvestArea = computed(() => {
  return activeDistricts.value.reduce((sum, item) => sum + item.harvestArea, 0)
})
const totalProduction = computed(() => {
  return activeDistricts.value.reduce((sum, item) => sum + item.production, 0)
})
const averageProductivity = computed(() => {
  return totalProduction.value / Math.max(totalHarvestArea.value, 1)
})
const leadingDistrict = computed(() => sortedDistricts.value[0])
const coverageLabel = computed(() => {
  return selectedKecamatan.value === ALL_KECAMATAN ? 'Kecamatan se-KSB' : selectedKecamatan.value
})

const highlightNotes = computed(() => [{
  title: 'Komoditas terpilih',
  value: selectedDefinition.value.label,
  note: selectedDefinition.value.note
}, {
  title: 'Kategori',
  value: selectedDefinition.value.category,
  note: 'Bisa dikembangkan menjadi filter multi-kategori pada iterasi berikutnya.'
}, {
  title: 'Cakupan data',
  value: coverageLabel.value,
  note: selectedKecamatan.value === ALL_KECAMATAN
    ? 'Peta memakai OSM dan batas desa interaktif dari berkas GeoJSON publik.'
    : `Peta dan ringkasan dibatasi pada kecamatan ${selectedKecamatan.value}.`
}])
</script>

<template>
  <UDashboardPanel id="dashboard-produksi-pangan">
    <template #header>
      <UDashboardNavbar title="Dashboard Produksi Pangan">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-6">
        <section class="production-hero overflow-hidden rounded-3xl border border-default px-6 py-6 lg:px-8 lg:py-8">
          <div class="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div class="max-w-3xl space-y-4">
              <div class="flex flex-wrap items-center gap-2">
                <UBadge color="primary" variant="subtle" label="GIS + Statistik" />
                <UBadge color="neutral" variant="outline" label="Leaflet + OpenStreetMap" />
              </div>

              <div class="space-y-3">
                <h1 class="text-3xl font-semibold tracking-tight text-highlighted lg:text-4xl">
                  Monitor produksi pangan per kecamatan untuk komoditas strategis.
                </h1>
                <p class="text-sm leading-6 text-muted lg:text-base">
                  Halaman ini memadukan filter komoditas, kartu KPI, peta sebaran produksi, ranking kecamatan,
                  dan tabel rekap luas panen serta produksi. Seluruh angka di bawah ini masih data simulasi.
                </p>
              </div>
            </div>

            <div class="grid gap-3 sm:grid-cols-3">
              <div class="rounded-2xl border border-white/70 bg-white/75 p-4 backdrop-blur">
                <p class="text-xs uppercase tracking-[0.18em] text-muted">
                  Periode
                </p>
                <p class="mt-2 text-xl font-semibold text-highlighted">
                  Tahunan
                </p>
              </div>
              <div class="rounded-2xl border border-white/70 bg-white/75 p-4 backdrop-blur">
                <p class="text-xs uppercase tracking-[0.18em] text-muted">
                  Cakupan
                </p>
                <p class="mt-2 text-xl font-semibold text-highlighted">
                  Kecamatan
                </p>
              </div>
              <div class="rounded-2xl border border-white/70 bg-white/75 p-4 backdrop-blur">
                <p class="text-xs uppercase tracking-[0.18em] text-muted">
                  Bentuk data
                </p>
                <p class="mt-2 text-xl font-semibold text-highlighted">
                  Tunggal
                </p>
              </div>
            </div>
          </div>
        </section>

        <section class="space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p class="text-sm font-medium text-highlighted">
                Pilih komoditas dan kecamatan
              </p>
              <p class="text-sm text-muted">
                Filter di bawah ini mengubah ringkasan mockup dan fokus wilayah pada peta.
              </p>
            </div>

            <div class="w-full max-w-xs">
              <USelectMenu
                v-model="selectedKecamatan"
                :items="districtOptions"
              />
            </div>
          </div>

          <div class="flex flex-wrap gap-2">
            <UButton
              v-for="option in commodityOptions"
              :key="option.key"
              :label="option.label"
              size="sm"
              color="neutral"
              :variant="selectedCommodity === option.key ? 'solid' : 'outline'"
              @click="selectedCommodity = option.key"
            />
          </div>
        </section>

        <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <UPageCard title="Komoditas aktif" variant="subtle">
            <p class="text-3xl font-semibold text-highlighted">
              {{ selectedDefinition.label }}
            </p>
            <p class="mt-2 text-sm text-muted">
              {{ selectedDefinition.category }} • {{ coverageLabel }}
            </p>
          </UPageCard>

          <UPageCard title="Total luas panen" variant="subtle">
            <p class="text-3xl font-semibold text-highlighted">
              {{ totalHarvestArea.toLocaleString('id-ID') }} ha
            </p>
            <p class="mt-2 text-sm text-muted">
              {{ selectedKecamatan === ALL_KECAMATAN ? 'Akumulasi seluruh kecamatan pada mockup tahunan.' : `Akumulasi untuk kecamatan ${selectedKecamatan}.` }}
            </p>
          </UPageCard>

          <UPageCard title="Total produksi" variant="subtle">
            <p class="text-3xl font-semibold text-highlighted">
              {{ totalProduction.toLocaleString('id-ID') }} {{ selectedDefinition.unit }}
            </p>
            <p class="mt-2 text-sm text-muted">
              {{ selectedKecamatan === ALL_KECAMATAN ? 'Nilai produksi agregat untuk simulasi dashboard.' : `Nilai produksi agregat untuk kecamatan ${selectedKecamatan}.` }}
            </p>
          </UPageCard>

          <UPageCard title="Produktivitas rata-rata" variant="subtle">
            <p class="text-3xl font-semibold text-highlighted">
              {{ averageProductivity.toFixed(2).replace('.', ',') }}
            </p>
            <p class="mt-2 text-sm text-muted">
              {{ selectedDefinition.unit }}/ha dengan pemimpin {{ leadingDistrict?.name }}.
            </p>
          </UPageCard>
        </section>

        <section class="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.8fr)]">
          <UPageCard
            title="Peta sebaran produksi"
            description="Peta batas desa dan kecamatan dengan filter fokus wilayah."
            variant="subtle"
          >
            <DashboardLeafletProductionMap
              :commodity-label="selectedDefinition.label"
              :selected-kecamatan="selectedKecamatan === ALL_KECAMATAN ? null : selectedKecamatan"
            />
          </UPageCard>

          <UPageCard
            title="Peringkat produksi per kecamatan"
            description="Ranking ini mengikuti komoditas yang sedang aktif."
            variant="subtle"
          >
            <div class="space-y-3">
              <div
                v-for="district in sortedDistricts"
                :key="district.name"
                class="rounded-2xl border border-default bg-white p-4"
              >
                <div class="flex items-center justify-between gap-3">
                  <div>
                    <p class="font-medium text-highlighted">
                      {{ district.name }}
                    </p>
                    <p class="text-sm text-muted">
                      {{ district.harvestArea.toLocaleString('id-ID') }} ha luas panen
                    </p>
                  </div>
                  <span class="text-sm font-semibold text-highlighted">
                    {{ district.production.toLocaleString('id-ID') }} {{ selectedDefinition.unit }}
                  </span>
                </div>

                <div class="mt-3 h-2 overflow-hidden rounded-full bg-zinc-200">
                  <div
                    class="h-full rounded-full bg-primary"
                    :style="{ width: `${(district.production / Math.max(leadingDistrict?.production || 1, 1)) * 100}%` }"
                  />
                </div>
              </div>
            </div>
          </UPageCard>
        </section>

        <section class="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <UPageCard
            title="Tabel produksi pangan"
            description="Contoh tabel rinci per kecamatan untuk dashboard analitik dan operasional."
            variant="subtle"
          >
            <div class="overflow-hidden rounded-2xl border border-default bg-white">
              <table class="min-w-full divide-y divide-default text-sm">
                <thead class="bg-zinc-50">
                  <tr>
                    <th class="px-4 py-3 text-left font-medium text-muted">
                      Kecamatan
                    </th>
                    <th class="px-4 py-3 text-left font-medium text-muted">
                      Luas panen
                    </th>
                    <th class="px-4 py-3 text-left font-medium text-muted">
                      Produksi
                    </th>
                    <th class="px-4 py-3 text-left font-medium text-muted">
                      Produktivitas
                    </th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-default">
                  <tr
                    v-for="district in sortedDistricts"
                    :key="district.name"
                    class="hover:bg-zinc-50/80"
                  >
                    <td class="px-4 py-3 font-medium text-highlighted">
                      {{ district.name }}
                    </td>
                    <td class="px-4 py-3 text-muted">
                      {{ district.harvestArea.toLocaleString('id-ID') }} ha
                    </td>
                    <td class="px-4 py-3 text-muted">
                      {{ district.production.toLocaleString('id-ID') }} {{ selectedDefinition.unit }}
                    </td>
                    <td class="px-4 py-3 text-highlighted">
                      {{ (district.production / district.harvestArea).toFixed(2).replace('.', ',') }}
                      {{ selectedDefinition.unit }}/ha
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </UPageCard>

          <UPageCard
            title="Catatan desain mockup"
            description="Blok ini menjelaskan asumsi awal sebelum masuk ke desain basis data."
            variant="subtle"
          >
            <div class="space-y-3">
              <div
                v-for="note in highlightNotes"
                :key="note.title"
                class="rounded-2xl border border-default bg-white p-4"
              >
                <p class="text-sm text-muted">
                  {{ note.title }}
                </p>
                <p class="mt-2 text-lg font-semibold text-highlighted">
                  {{ note.value }}
                </p>
                <p class="mt-2 text-sm leading-6 text-muted">
                  {{ note.note }}
                </p>
              </div>
            </div>
          </UPageCard>
        </section>
      </div>
    </template>
  </UDashboardPanel>
</template>

<style scoped>
.production-hero {
  background:
    radial-gradient(circle at top left, rgba(14, 165, 233, 0.18), transparent 34%),
    radial-gradient(circle at bottom right, rgba(34, 197, 94, 0.16), transparent 28%),
    linear-gradient(135deg, #f0fdf4 0%, #ffffff 48%, #eff6ff 100%);
}
</style>
