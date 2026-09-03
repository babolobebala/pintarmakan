<script setup lang="ts">
import type { DataManagementOptionsResponse } from '~/types'

import AppPageIntro from '~/components/AppPageIntro.vue'
import { appPermissions } from '~~/auth/permissions'

definePageMeta({ permission: appPermissions.businessDataRead })

const {
  data: optionsResponse,
  error: optionsError,
  refresh: refreshOptions,
  status: optionsStatus
} = await useFetch<DataManagementOptionsResponse>(
  '/api/data-management/options',
  {
    default: () => ({ bidangs: [], datasetsByBidang: {} })
  }
)

const allBidangsValue = '__all_bidangs__'
const selectedBidangId = ref(allBidangsValue)
const bidangs = computed(() => optionsResponse.value.bidangs)
const bidangSelectItems = computed(() => [
  { id: allBidangsValue, name: 'Semua Bidang' },
  ...bidangs.value.map(bidang => ({
    id: bidang.id,
    name: bidang.name,
    description: bidang.description ?? undefined
  }))
])
const allDatasets = computed(() =>
  Object.values(optionsResponse.value.datasetsByBidang).flat()
)
const datasets = computed(() => {
  return selectedBidangId.value === allBidangsValue
    ? allDatasets.value
    : (optionsResponse.value.datasetsByBidang[selectedBidangId.value] ?? [])
})
const datasetCountLabel = computed(
  () =>
    `${datasets.value.length} dataset${datasets.value.length === 1 ? '' : 's'}`
)

watch(
  bidangs,
  (items) => {
    if (
      selectedBidangId.value !== allBidangsValue
      && !items.some(item => item.id === selectedBidangId.value)
    ) {
      selectedBidangId.value = allBidangsValue
    }
  },
  { immediate: true }
)

function reloadOptions() {
  void refreshOptions()
}

function formatPeriodicityLabel(value: string | null) {
  switch (value) {
    case 'HARIAN':
      return 'Harian'
    case 'BULANAN':
      return 'Bulanan'
    case 'TRIWULANAN':
      return 'Triwulanan'
    case 'TAHUNAN':
      return 'Tahunan'
    default:
      return 'Tanpa periode'
  }
}

function formatRegionLevelLabel(value: string | null) {
  switch (value) {
    case 'KABUPATEN':
      return 'Kabupaten'
    case 'KECAMATAN':
      return 'Kecamatan'
    case 'DESA':
      return 'Desa/Kelurahan'
    default:
      return 'Wilayah tidak diketahui'
  }
}
</script>

<template>
  <div
    class="mx-auto flex w-full max-w-[1800px] flex-col gap-4 sm:gap-6 lg:gap-8"
  >
    <AppPageIntro
      kicker="Data operasional"
      title="Kelola Data"
      description="Pilih Dataset untuk melihat cakupan dan mengelola data berdasarkan periode."
    />

    <section
      class="overflow-hidden rounded-2xl border border-default bg-default"
    >
      <div
        class="flex flex-col gap-4 border-b border-default px-4 py-4 lg:flex-row lg:items-end lg:justify-between"
      >
        <div class="flex flex-wrap items-center gap-2">
          <h2 class="text-lg font-semibold text-highlighted">
            Dataset
          </h2>
          <UBadge color="neutral" variant="subtle" size="sm">
            {{ datasetCountLabel }}
          </UBadge>
        </div>
        <USelectMenu
          v-if="
            optionsStatus !== 'pending' && !optionsError && bidangs.length > 0
          "
          v-model="selectedBidangId"
          :items="bidangSelectItems"
          value-key="id"
          label-key="name"
          placeholder="Filter bidang"
          class="w-full lg:w-56"
        />
      </div>

      <div v-if="optionsStatus === 'pending'" class="space-y-3 px-4 py-6">
        <div v-for="row in 4" :key="row" class="h-10 rounded bg-elevated" />
      </div>
      <div v-else-if="optionsError" class="px-4 py-10">
        <UEmpty
          icon="i-lucide-folder-search"
          title="Konteks operasional tidak dapat dimuat"
          description="Muat ulang pilihan bidang dan Dataset untuk melanjutkan."
          :actions="[
            {
              label: 'Muat ulang',
              icon: 'i-lucide-refresh-cw',
              color: 'neutral',
              variant: 'subtle',
              onClick: reloadOptions
            }
          ]"
        />
      </div>
      <div v-else-if="bidangs.length === 0" class="px-4 py-10">
        <UEmpty
          icon="i-lucide-briefcase-business"
          title="Belum ada bidang yang bisa digunakan"
          description="Anda belum memiliki penugasan bidang untuk mengelola data."
        />
      </div>
      <div v-else-if="datasets.length === 0" class="px-4 py-10">
        <UEmpty
          icon="i-lucide-folder-lock"
          title="Belum ada Dataset yang bisa dikelola"
          description="Tambahkan Dataset dengan owner bidang yang sesuai untuk mulai mengelola data."
        />
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full min-w-[680px] divide-y divide-default text-sm">
          <thead class="bg-elevated/35">
            <tr>
              <th
                class="w-full px-4 py-3 text-left text-xs font-medium tracking-[0.16em] text-muted uppercase"
              >
                Nama
              </th>
              <th
                class="px-4 py-3 text-left text-xs font-medium tracking-[0.16em] text-muted uppercase"
              >
                Periodisitas
              </th>
              <th
                class="px-4 py-3 text-left text-xs font-medium tracking-[0.16em] text-muted uppercase"
              >
                Wilayah
              </th>
              <th
                class="w-[220px] px-4 py-3 text-left text-xs font-medium tracking-[0.16em] text-muted uppercase"
              >
                Owner
              </th>
              <th
                class="px-4 py-3 text-right text-xs font-medium tracking-[0.16em] text-muted uppercase"
              >
                Aksi
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-default">
            <tr v-for="dataset in datasets" :key="dataset.id">
              <td class="px-4 py-3">
                <div class="flex min-w-0 items-center gap-2">
                  <p class="truncate font-medium text-highlighted">
                    {{ dataset.name }}
                  </p>
                  <UBadge
                    v-if="dataset.archivedAt"
                    color="warning"
                    variant="subtle"
                    size="sm"
                  >
                    Diarsipkan
                  </UBadge>
                </div>
              </td>
              <td class="px-4 py-3">
                <UBadge color="neutral" variant="subtle" size="sm">
                  {{ formatPeriodicityLabel(dataset.periodicity) }}
                </UBadge>
              </td>
              <td class="px-4 py-3">
                <UBadge color="neutral" variant="outline" size="sm">
                  {{ formatRegionLevelLabel(dataset.regionLevel) }}
                </UBadge>
              </td>
              <td class="max-w-[220px] px-4 py-3">
                <p class="truncate text-highlighted">
                  {{ dataset.ownerBidangName }}
                </p>
              </td>
              <td class="px-4 py-3 text-right">
                <NuxtLink
                  :to="`/kelola-data/${dataset.id}`"
                  target="_blank"
                  rel="noopener"
                  class="inline-flex items-center gap-1.5 rounded-md border border-default px-2.5 py-1.5 text-sm font-medium text-highlighted hover:bg-elevated focus-visible:outline-2 focus-visible:outline-offset-2"
                ><UIcon name="i-lucide-arrow-up-right" class="size-4" /><span>Buka</span></NuxtLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
