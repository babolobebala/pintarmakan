<script setup lang="ts">
import type { DashboardProductionPayload, ProductionCommodityDefinition, ProductionCommodityKey } from '~~/shared/dashboard'

const ALL_KECAMATAN = 'Semua kecamatan'

const props = defineProps<{
  payload: DashboardProductionPayload
  pending?: boolean
}>()

const commodityOptions = computed(() => {
  return Object.values(props.payload.commodities).map(item => ({
    key: item.key,
    label: item.label
  }))
})

const selectedCommodity = ref<ProductionCommodityKey>('padi')
const selectedKecamatan = ref(ALL_KECAMATAN)

watch(commodityOptions, (options) => {
  if (!options.some(option => option.key === selectedCommodity.value)) {
    selectedCommodity.value = options[0]?.key ?? 'padi'
  }
}, { immediate: true })

const selectedDefinition = computed<ProductionCommodityDefinition>(() => {
  return props.payload.commodities[selectedCommodity.value]
})

const districtOptions = computed(() => {
  return [ALL_KECAMATAN, ...selectedDefinition.value.districts.map(item => item.name)]
})

watch(districtOptions, (options) => {
  if (!options.includes(selectedKecamatan.value)) {
    selectedKecamatan.value = ALL_KECAMATAN
  }
}, { immediate: true })

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

const leadingDistrict = computed(() => sortedDistricts.value[0] ?? null)
const coverageLabel = computed(() => selectedKecamatan.value === ALL_KECAMATAN ? 'Kecamatan se-KSB' : selectedKecamatan.value)
</script>

<template>
  <div
    class="space-y-4"
    :class="pending ? 'opacity-75 transition-opacity' : ''"
  >
    <DashboardWidget
      title="Kontrol widget produksi"
      description="Komoditas dan kecamatan di bawah ini hanya menyaring payload yang sudah dimuat untuk indikator produksi pangan."
      icon="i-lucide-sliders-horizontal"
      muted
    >
      <div class="space-y-4">
        <div class="flex flex-wrap items-center gap-2">
          <UButton
            v-for="option in commodityOptions"
            :key="option.key"
            :label="option.label"
            size="xs"
            color="neutral"
            :variant="selectedCommodity === option.key ? 'solid' : 'outline'"
            @click="selectedCommodity = option.key"
          />
        </div>

        <div class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div class="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
            <p class="cobalt-kicker text-[0.66rem] text-[var(--app-foreground-soft)]">
              Filter lokal
            </p>
            <p class="mt-2 text-sm leading-6 text-[var(--app-foreground-muted)]">
              Perubahan komoditas dan kecamatan tidak memicu request baru. Seluruh data indikator produksi dimuat sekali dari server, lalu widget ini menghitung ulang tampilannya secara lokal.
            </p>
          </div>

          <USelectMenu
            v-model="selectedKecamatan"
            :items="districtOptions"
          />
        </div>
      </div>
    </DashboardWidget>

    <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <DashboardWidget title="Komoditas aktif" icon="i-lucide-wheat">
        <p class="text-3xl font-semibold text-[var(--app-foreground)]">
          {{ selectedDefinition.label }}
        </p>
        <p class="mt-2 text-sm text-[var(--app-foreground-muted)]">
          {{ selectedDefinition.category }} · {{ coverageLabel }}
        </p>
      </DashboardWidget>

      <DashboardWidget title="Total luas panen" icon="i-lucide-ruler">
        <p class="text-3xl font-semibold text-[var(--app-foreground)]">
          {{ totalHarvestArea.toLocaleString('id-ID') }} ha
        </p>
        <p class="mt-2 text-sm text-[var(--app-foreground-muted)]">
          Akumulasi luas panen untuk filter wilayah yang aktif.
        </p>
      </DashboardWidget>

      <DashboardWidget title="Total produksi" icon="i-lucide-chart-column">
        <p class="text-3xl font-semibold text-[var(--app-foreground)]">
          {{ totalProduction.toLocaleString('id-ID') }} {{ selectedDefinition.unit }}
        </p>
        <p class="mt-2 text-sm text-[var(--app-foreground-muted)]">
          Nilai agregat produksi dari payload indikator yang sama.
        </p>
      </DashboardWidget>

      <DashboardWidget title="Produktivitas rata-rata" icon="i-lucide-gauge">
        <p class="text-3xl font-semibold text-[var(--app-foreground)]">
          {{ averageProductivity.toFixed(2).replace('.', ',') }}
        </p>
        <p class="mt-2 text-sm text-[var(--app-foreground-muted)]">
          {{ selectedDefinition.unit }}/ha · pemimpin {{ leadingDistrict?.name || '-' }}
        </p>
      </DashboardWidget>
    </section>

    <section class="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(340px,0.8fr)]">
      <DashboardWidget
        title="Peta sebaran produksi"
        description="Layer administratif dipertahankan; fokus kecamatan mengikuti filter widget."
        icon="i-lucide-map"
      >
        <DashboardLeafletProductionMap
          :commodity-label="selectedDefinition.label"
          :selected-kecamatan="selectedKecamatan === ALL_KECAMATAN ? null : selectedKecamatan"
        />
      </DashboardWidget>

      <DashboardWidget
        title="Peringkat kecamatan"
        description="Peringkat mengikuti komoditas dan cakupan wilayah yang aktif."
        icon="i-lucide-trophy"
      >
        <div class="space-y-3">
          <article
            v-for="district in sortedDistricts"
            :key="district.name"
            class="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4"
          >
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="font-medium text-[var(--app-foreground)]">
                  {{ district.name }}
                </p>
                <p class="text-sm text-[var(--app-foreground-muted)]">
                  {{ district.harvestArea.toLocaleString('id-ID') }} ha luas panen
                </p>
              </div>
              <span class="text-sm font-semibold text-[var(--app-foreground)]">
                {{ district.production.toLocaleString('id-ID') }} {{ selectedDefinition.unit }}
              </span>
            </div>

            <div class="mt-3 h-2 overflow-hidden rounded-full bg-[var(--app-border)]">
              <div
                class="h-full rounded-full bg-[var(--app-foreground)]"
                :style="{ width: `${(district.production / Math.max(leadingDistrict?.production || 1, 1)) * 100}%` }"
              />
            </div>
          </article>
        </div>
      </DashboardWidget>
    </section>

    <section class="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]">
      <DashboardWidget
        title="Rekap produksi per kecamatan"
        description="Tabel ini tetap lokal pada indikator produksi yang sedang aktif."
        icon="i-lucide-table-properties"
      >
        <div class="overflow-hidden rounded-2xl border border-[var(--app-border)]">
          <table class="min-w-full divide-y divide-[var(--app-border)] text-sm">
            <thead class="bg-[var(--app-surface-muted)]">
              <tr>
                <th class="px-4 py-3 text-left font-medium text-[var(--app-foreground-soft)]">
                  Kecamatan
                </th>
                <th class="px-4 py-3 text-left font-medium text-[var(--app-foreground-soft)]">
                  Luas panen
                </th>
                <th class="px-4 py-3 text-left font-medium text-[var(--app-foreground-soft)]">
                  Produksi
                </th>
                <th class="px-4 py-3 text-left font-medium text-[var(--app-foreground-soft)]">
                  Produktivitas
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[var(--app-border)] bg-[var(--app-surface)]">
              <tr v-for="district in sortedDistricts" :key="district.name">
                <td class="px-4 py-3 font-medium text-[var(--app-foreground)]">
                  {{ district.name }}
                </td>
                <td class="px-4 py-3 text-[var(--app-foreground-muted)]">
                  {{ district.harvestArea.toLocaleString('id-ID') }} ha
                </td>
                <td class="px-4 py-3 text-[var(--app-foreground-muted)]">
                  {{ district.production.toLocaleString('id-ID') }} {{ selectedDefinition.unit }}
                </td>
                <td class="px-4 py-3 text-[var(--app-foreground-muted)]">
                  {{ (district.production / district.harvestArea).toFixed(2).replace('.', ',') }}
                  {{ selectedDefinition.unit }}/ha
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </DashboardWidget>

      <DashboardWidget
        title="Catatan indikator"
        description="Konteks tambahan dari indikator produksi yang saat ini dimuat."
        icon="i-lucide-notebook-pen"
      >
        <div class="space-y-3">
          <article class="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
            <p class="text-sm text-[var(--app-foreground-soft)]">
              Komoditas
            </p>
            <p class="mt-2 text-lg font-semibold text-[var(--app-foreground)]">
              {{ selectedDefinition.label }}
            </p>
            <p class="mt-2 text-sm leading-6 text-[var(--app-foreground-muted)]">
              {{ selectedDefinition.note }}
            </p>
          </article>

          <article class="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
            <p class="text-sm text-[var(--app-foreground-soft)]">
              Cakupan
            </p>
            <p class="mt-2 text-lg font-semibold text-[var(--app-foreground)]">
              {{ coverageLabel }}
            </p>
            <p class="mt-2 text-sm leading-6 text-[var(--app-foreground-muted)]">
              {{ selectedKecamatan === ALL_KECAMATAN
                ? 'Peta dan tabel menggunakan seluruh kecamatan yang sudah ada dalam payload produksi.'
                : `Peta, ranking, dan tabel dibatasi ke ${selectedKecamatan}.` }}
            </p>
          </article>

          <article class="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
            <p class="text-sm text-[var(--app-foreground-soft)]">
              Sumber indikator
            </p>
            <p class="mt-2 text-lg font-semibold text-[var(--app-foreground)]">
              {{ payload.meta.sourceLabel }}
            </p>
            <p class="mt-2 text-sm leading-6 text-[var(--app-foreground-muted)]">
              Seluruh komoditas strategis ikut dimuat agar kontrol widget tetap client-side.
            </p>
          </article>
        </div>
      </DashboardWidget>
    </section>
  </div>
</template>
