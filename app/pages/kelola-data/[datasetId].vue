<script setup lang="ts">
import type {
  DataManagementOptionsResponse,
  DatasetPeriodOverviewItem,
  DatasetPeriodOverviewResponse
} from '~/types'

import AppPageIntro from '~/components/AppPageIntro.vue'
import PeriodMatrixModal from '~/components/data-records/PeriodMatrixModal.vue'
import TabularPeriodModal from '~/components/data-records/TabularPeriodModal.vue'
import { appPermissions } from '~~/auth/permissions'
import { formatDatasetPeriod } from '~~/shared/datasets'

definePageMeta({ permission: appPermissions.businessDataRead })

const route = useRoute()
const datasetId = computed(() => {
  const value = route.params.datasetId

  return typeof value === 'string' ? value : ''
})
const {
  data: optionsResponse,
  error: optionsError,
  status: optionsStatus
} = await useFetch<DataManagementOptionsResponse>(
  '/api/data-management/options',
  {
    default: () => ({ bidangs: [], datasetsByBidang: {} })
  }
)
const allDatasets = computed(() =>
  Object.values(optionsResponse.value.datasetsByBidang).flat()
)
const dataset = computed(
  () => allDatasets.value.find(item => item.id === datasetId.value) ?? null
)
const requestFetch = useRequestFetch()

function createEmptyPeriodOverview(): DatasetPeriodOverviewResponse {
  return { datasetId: '', mode: 'REGIONAL', expectedRegionCount: 0, periods: [] }
}

async function loadPeriodOverview(): Promise<DatasetPeriodOverviewResponse> {
  if (!dataset.value) {
    return createEmptyPeriodOverview()
  }

  return requestFetch<DatasetPeriodOverviewResponse>(
    '/api/dataset-period-overview',
    {
      query: { datasetId: dataset.value.id }
    }
  )
}

const {
  data: periodOverview,
  error: periodOverviewError,
  clear: clearPeriodOverview,
  refresh: refreshPeriodOverview,
  status: periodOverviewStatus
} = await useAsyncData<DatasetPeriodOverviewResponse>(
  'dataset-period-overview-detail',
  loadPeriodOverview,
  {
    default: createEmptyPeriodOverview,
    watch: [dataset]
  }
)

const selectedYear = ref('')
const selectedMonth = ref('')
const periodSearch = ref('')
const selectedPeriod = ref<DatasetPeriodOverviewItem | null>(null)
const periodModalOpen = ref(false)
const tabularPeriodModalOpen = ref(false)
const dateTimeFormatter = new Intl.DateTimeFormat('id-ID', {
  dateStyle: 'medium',
  timeStyle: 'short'
})
const yearFormatter = new Intl.DateTimeFormat('id-ID', {
  month: 'long',
  timeZone: 'UTC'
})

const periodicity = computed(() => dataset.value?.periodicity ?? null)
const isRegionalDataset = computed(() => dataset.value?.mode === 'REGIONAL')
const isTabularDataset = computed(() => dataset.value?.mode === 'TABULAR')
const years = computed(() => {
  return Array.from(
    new Set(
      periodOverview.value.periods.map(period =>
        period.periodDate.slice(0, 4)
      )
    )
  ).sort((left, right) => right.localeCompare(left))
})
const yearOptions = computed(() =>
  years.value.map(year => ({ value: year, label: year }))
)
const monthOptions = computed(() => {
  if (periodicity.value !== 'HARIAN' || !selectedYear.value) {
    return []
  }

  return Array.from(
    new Set(
      periodOverview.value.periods
        .filter(period =>
          period.periodDate.startsWith(`${selectedYear.value}-`)
        )
        .map(period => period.periodDate.slice(5, 7))
    )
  )
    .sort((left, right) => right.localeCompare(left))
    .map(month => ({
      value: month,
      label: yearFormatter.format(
        new Date(Date.UTC(2000, Number(month) - 1, 1))
      )
    }))
})
const usesYearFilter = computed(() => {
  return (
    periodicity.value === 'HARIAN'
    || periodicity.value === 'BULANAN'
    || periodicity.value === 'TRIWULANAN'
  )
})
const filteredPeriods = computed(() => {
  const query = periodSearch.value.trim().toLocaleLowerCase('id-ID')

  return periodOverview.value.periods.filter((period) => {
    if (
      usesYearFilter.value
      && period.periodDate.slice(0, 4) !== selectedYear.value
    ) {
      return false
    }

    if (
      periodicity.value === 'HARIAN'
      && period.periodDate.slice(5, 7) !== selectedMonth.value
    ) {
      return false
    }

    return (
      !query
      || formatPeriod(period.periodDate).toLocaleLowerCase('id-ID').includes(query)
    )
  })
})
const periodSummary = computed(() => {
  const counts = {
    total: filteredPeriods.value.length,
    complete: 0,
    partial: 0,
    empty: 0,
    withData: 0
  }

  for (const period of filteredPeriods.value) {
    if (isTabularDataset.value) {
      if (period.recordCount === 0) {
        counts.empty += 1
      } else {
        counts.withData += 1
      }

      continue
    }

    switch (getPeriodCompleteness(period).label) {
      case 'Lengkap':
        counts.complete += 1
        break
      case 'Sebagian':
        counts.partial += 1
        break
      default:
        counts.empty += 1
    }
  }

  return counts
})

watch(
  [periodicity, years],
  () => {
    if (!usesYearFilter.value) {
      selectedYear.value = ''
      selectedMonth.value = ''
      return
    }

    if (!years.value.includes(selectedYear.value)) {
      selectedYear.value = years.value[0] ?? ''
    }
  },
  { immediate: true }
)

watch(
  monthOptions,
  (items) => {
    if (periodicity.value !== 'HARIAN') {
      selectedMonth.value = ''
      return
    }

    if (!items.some(item => item.value === selectedMonth.value)) {
      selectedMonth.value = items[0]?.value ?? ''
    }
  },
  { immediate: true }
)

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

function formatPeriod(periodDate: string) {
  return formatDatasetPeriod(periodicity.value as never, periodDate)
}

function getPeriodCompleteness(period: { recordCount: number }) {
  if (period.recordCount === 0) {
    return { label: 'Belum ada', color: 'neutral' as const }
  }

  if (period.recordCount === periodOverview.value.expectedRegionCount) {
    return { label: 'Lengkap', color: 'success' as const }
  }

  return { label: 'Sebagian', color: 'warning' as const }
}

function formatDateTime(value: string | null) {
  return value ? dateTimeFormatter.format(new Date(value)) : '—'
}

function openPeriodModal(period: DatasetPeriodOverviewItem) {
  if (!isRegionalDataset.value) {
    return
  }

  selectedPeriod.value = period
  periodModalOpen.value = true
}

function openTabularPeriodModal(period: DatasetPeriodOverviewItem) {
  if (!isTabularDataset.value) {
    return
  }

  selectedPeriod.value = period
  tabularPeriodModalOpen.value = true
}

async function retryPeriodOverview() {
  clearPeriodOverview()
  await refreshPeriodOverview()
}

function refreshPeriodOverviewAfterBulkSave() {
  void refreshPeriodOverview()
}
</script>

<template>
  <div
    class="mx-auto flex w-full max-w-[1800px] flex-col gap-4 sm:gap-6 lg:gap-8"
  >
    <AppPageIntro
      kicker="Data operasional"
      title="Detail Dataset"
      description="Tinjau cakupan periode dan pilih periode yang akan dikelola."
    />

    <section
      v-if="optionsStatus === 'pending'"
      class="space-y-3 rounded-2xl border border-default bg-default px-4 py-6"
    >
      <div class="h-5 w-1/3 rounded bg-elevated" />
      <div class="h-10 rounded bg-elevated/80" />
    </section>
    <section
      v-else-if="optionsError || !dataset"
      class="rounded-2xl border border-default bg-default px-4 py-10"
    >
      <UEmpty
        icon="i-lucide-folder-lock"
        title="Dataset tidak dapat diakses"
        description="Dataset mungkin tidak tersedia atau berada di luar scope akses Anda."
        :actions="[
          {
            label: 'Pilih dataset lain',
            icon: 'i-lucide-list',
            color: 'neutral',
            variant: 'subtle',
            to: '/kelola-data'
          }
        ]"
      />
    </section>

    <template v-else>
      <section
        class="overflow-hidden rounded-2xl border border-default bg-default"
      >
        <div
          class="flex flex-col gap-3 px-4 py-4 lg:flex-row lg:items-center lg:justify-between"
        >
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <h1 class="truncate text-lg font-semibold text-highlighted">
                {{ dataset.name }}
              </h1>
              <UBadge
                v-if="dataset.archivedAt"
                color="warning"
                variant="subtle"
                size="sm"
              >
                Diarsipkan · read-only
              </UBadge>
            </div>
            <p class="mt-1 truncate text-xs text-muted">
              {{ dataset.ownerBidangName }} ·
              {{ formatPeriodicityLabel(dataset.periodicity) }}
              <template v-if="isRegionalDataset">
                · {{ formatRegionLevelLabel(dataset.regionLevel) }}
              </template>
            </p>
            <div
              v-if="dataset.source || dataset.interpretation"
              class="mt-3 grid gap-3 border-t border-default pt-3 text-sm"
            >
              <div v-if="dataset.source">
                <p class="text-xs font-medium tracking-[0.12em] text-muted uppercase">
                  Sumber
                </p>
                <p class="mt-1 text-highlighted">
                  {{ dataset.source }}
                </p>
              </div>
              <div v-if="dataset.interpretation">
                <p class="text-xs font-medium tracking-[0.12em] text-muted uppercase">
                  Interpretasi
                </p>
                <p class="mt-1 whitespace-pre-wrap text-highlighted">
                  {{ dataset.interpretation }}
                </p>
              </div>
            </div>
          </div>
          <UButton
            to="/kelola-data"
            label="Pilih dataset lain"
            icon="i-lucide-list"
            color="neutral"
            variant="outline"
            size="sm"
          />
        </div>
      </section>

      <section
        class="overflow-hidden rounded-2xl border border-default bg-default"
      >
        <div
          class="flex flex-col gap-3 border-b border-default px-4 py-3 lg:flex-row lg:items-center lg:justify-between"
        >
          <div class="flex min-w-0 flex-wrap items-center gap-2">
            <USelectMenu
              v-if="usesYearFilter"
              v-model="selectedYear"
              :items="yearOptions"
              value-key="value"
              label-key="label"
              placeholder="Tahun"
              class="w-32"
            />
            <USelectMenu
              v-if="periodicity === 'HARIAN'"
              v-model="selectedMonth"
              :items="monthOptions"
              value-key="value"
              label-key="label"
              placeholder="Bulan"
              class="w-44"
            />
            <UInput
              v-model="periodSearch"
              icon="i-lucide-search"
              placeholder="Cari periode..."
              class="w-full sm:w-60"
            />
          </div>
          <p class="text-xs text-muted">
            <template v-if="isRegionalDataset">
              {{ periodSummary.total }} periode ·
              {{ periodSummary.complete }} lengkap ·
              {{ periodSummary.partial }} sebagian ·
              {{ periodSummary.empty }} belum ada
            </template>
            <template v-else>
              {{ periodSummary.total }} periode ·
              {{ periodSummary.withData }} berisi ·
              {{ periodSummary.empty }} belum ada
            </template>
          </p>
        </div>

        <div
          v-if="periodOverviewStatus !== 'pending' && periodOverviewError"
          class="px-4 py-10"
        >
          <UEmpty
            icon="i-lucide-calendar-x-2"
            title="Ringkasan periode tidak dapat dimuat"
            description="Muat ulang Dataset untuk melihat cakupan periode."
            :actions="[
              {
                label: 'Muat ulang',
                icon: 'i-lucide-refresh-cw',
                color: 'neutral',
                variant: 'subtle',
                onClick: retryPeriodOverview
              }
            ]"
          />
        </div>
        <div v-else class="overflow-x-auto">
          <table class="w-full min-w-[680px] divide-y divide-default text-sm">
            <thead class="bg-elevated/35">
              <tr>
                <th
                  class="w-full px-4 py-3 text-left text-xs font-medium tracking-[0.16em] text-muted uppercase"
                >
                  Periode
                </th>
                <template v-if="isRegionalDataset">
                  <th
                    class="px-4 py-3 text-left text-xs font-medium tracking-[0.16em] text-muted uppercase"
                  >
                    Cakupan
                  </th>
                  <th
                    class="px-4 py-3 text-left text-xs font-medium tracking-[0.16em] text-muted uppercase"
                  >
                    Terisi
                  </th>
                  <th
                    class="px-4 py-3 text-left text-xs font-medium tracking-[0.16em] text-muted uppercase"
                  >
                    Status
                  </th>
                </template>
                <th
                  v-else
                  class="px-4 py-3 text-left text-xs font-medium tracking-[0.16em] text-muted uppercase"
                >
                  Jumlah Data
                </th>
                <th
                  class="px-4 py-3 text-left text-xs font-medium tracking-[0.16em] text-muted uppercase"
                >
                  Diperbarui
                </th>
                <th
                  class="px-4 py-3 text-right text-xs font-medium tracking-[0.16em] text-muted uppercase"
                >
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-default">
              <tr v-if="periodOverviewStatus === 'pending'">
                <td :colspan="isRegionalDataset ? 6 : 4" class="px-4 py-10">
                  <div class="space-y-3">
                    <div class="h-3 w-1/3 rounded bg-elevated" />
                    <div class="h-3 w-2/3 rounded bg-elevated/80" />
                  </div>
                </td>
              </tr>
              <tr v-else-if="filteredPeriods.length === 0">
                <td :colspan="isRegionalDataset ? 6 : 4" class="px-4 py-10">
                  <UEmpty
                    icon="i-lucide-calendar-search"
                    :title="
                      periodSearch
                        ? 'Tidak ada periode yang cocok'
                        : 'Cakupan periode belum tersedia'
                    "
                    description="Perbarui filter untuk melihat periode lain dalam cakupan Dataset."
                    variant="naked"
                  />
                </td>
              </tr>
              <tr v-for="period in filteredPeriods" :key="period.periodDate">
                <td class="px-4 py-3 font-medium text-highlighted">
                  {{ formatPeriod(period.periodDate) }}
                </td>
                <template v-if="isRegionalDataset">
                  <td class="px-4 py-3 text-muted">
                    {{ formatRegionLevelLabel(dataset.regionLevel) }}
                  </td>
                  <td class="px-4 py-3 text-muted">
                    {{ period.recordCount }} /
                    {{ periodOverview.expectedRegionCount }}
                  </td>
                  <td class="px-4 py-3">
                    <UBadge
                      :color="getPeriodCompleteness(period).color"
                      variant="subtle"
                      size="sm"
                    >
                      {{ getPeriodCompleteness(period).label }}
                    </UBadge>
                  </td>
                </template>
                <td v-else class="px-4 py-3 text-muted">
                  {{ period.recordCount }} baris
                </td>
                <td class="px-4 py-3 text-muted">
                  {{ formatDateTime(period.latestUpdatedAt) }}
                </td>
                <td class="px-4 py-3 text-right">
                  <UButton
                    v-if="isRegionalDataset"
                    label="Kelola"
                    class="cursor-pointer"
                    icon="i-lucide-arrow-up-right"
                    color="neutral"
                    variant="outline"
                    size="sm"
                    @click="openPeriodModal(period)"
                  />
                  <div v-else class="inline-flex items-center gap-2">
                    <UButton
                      label="Kelola"
                      class="cursor-pointer"
                      icon="i-lucide-arrow-up-right"
                      color="neutral"
                      variant="outline"
                      size="sm"
                      @click="openTabularPeriodModal(period)"
                    />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>

    <PeriodMatrixModal
      v-if="isRegionalDataset"
      v-model:open="periodModalOpen"
      :dataset-id="dataset?.id ?? ''"
      :period-date="selectedPeriod?.periodDate ?? null"
      :period-label="selectedPeriod ? formatPeriod(selectedPeriod.periodDate) : ''"
      @saved="refreshPeriodOverviewAfterBulkSave"
    />
    <TabularPeriodModal
      v-if="isTabularDataset"
      v-model:open="tabularPeriodModalOpen"
      :dataset-id="dataset?.id ?? ''"
      :period-date="selectedPeriod?.periodDate ?? null"
      :period-label="selectedPeriod ? formatPeriod(selectedPeriod.periodDate) : ''"
      @saved="refreshPeriodOverviewAfterBulkSave"
    />
  </div>
</template>
