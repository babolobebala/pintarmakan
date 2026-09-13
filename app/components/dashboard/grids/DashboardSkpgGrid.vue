<script setup lang="ts">
import type { DashboardConfiguredPayload, DashboardDatasetBundle } from '~~/shared/dashboard'

import {
  dashboardCardDefinitions,
  dashboardSkpgStatusLegend,
  getDashboardDatasetField,
  readDashboardRecordText
} from '~~/shared/dashboard'
import { formatDatasetPeriod } from '~~/shared/datasets'

const props = defineProps<{
  payload: DashboardConfiguredPayload
  pending?: boolean
}>()

const skpgCard = dashboardCardDefinitions.find(card => card.key === 'skpg-status-kecamatan')
const skpgDataset = computed<DashboardDatasetBundle | null>(() => props.payload.cards['skpg-status-kecamatan'] ?? null)
const statusField = computed(() => skpgDataset.value && skpgCard
  ? getDashboardDatasetField(skpgDataset.value.definition.dataSchema, skpgCard.fieldKey)
  : null)
const statusByValueKey = new Map<string, (typeof dashboardSkpgStatusLegend)[number]>(
  dashboardSkpgStatusLegend.map(status => [status.valueKey, status])
)
const valueColorMap = Object.fromEntries(dashboardSkpgStatusLegend.map(status => [status.valueKey, status.color]))
const selectedMonth = ref('')

const availableMonths = computed(() => [...new Set(skpgDataset.value?.records.map(record => record.periodDate) ?? [])]
  .sort((left, right) => right.localeCompare(left)))
const selectedMonthLabel = computed(() => selectedMonth.value
  ? formatDatasetPeriod('BULANAN', selectedMonth.value)
  : null)
const selectedMonthRecords = computed(() => skpgDataset.value?.records.filter(
  record => record.periodDate === selectedMonth.value
) ?? [])
const selectedMonthRows = computed(() => selectedMonthRecords.value.map((record) => {
  const status = statusByValueKey.get(readDashboardRecordText(record, statusField.value?.key ?? null) ?? '') ?? null

  return { record, status }
}).sort((left, right) => left.record.regionName.localeCompare(right.record.regionName, 'id-ID')))
const totalKecamatan = computed(() => selectedMonthRows.value.length)
const statusSummary = computed(() => dashboardSkpgStatusLegend.map((status) => {
  const count = selectedMonthRows.value.filter(row => row.status?.valueKey === status.valueKey).length

  return {
    ...status,
    count,
    percentage: totalKecamatan.value > 0 ? (count / totalKecamatan.value) * 100 : 0
  }
}))
const skpgMapValues = computed(() => selectedMonthRows.value.map(({ record, status }) => ({
  regionName: record.regionName,
  valueKey: status?.valueKey ?? null,
  valueLabel: status?.label ?? 'Data belum tersedia'
})))
const selectedYear = computed(() => selectedMonth.value.slice(0, 4))
const yearRecords = computed(() => skpgDataset.value?.records.filter(record => record.periodDate.startsWith(selectedYear.value)) ?? [])
const matrixRows = computed(() => {
  const recordsByRegion = new Map<string, Map<string, (typeof dashboardSkpgStatusLegend)[number] | null>>()
  const regionNames = new Map<string, string>()

  for (const record of yearRecords.value) {
    const statuses = recordsByRegion.get(record.regionId) ?? new Map()
    const status = statusByValueKey.get(readDashboardRecordText(record, statusField.value?.key ?? null) ?? '') ?? null

    statuses.set(record.periodDate, status)
    recordsByRegion.set(record.regionId, statuses)
    regionNames.set(record.regionId, record.regionName)
  }

  return [...recordsByRegion.entries()]
    .map(([regionId, statuses]) => ({
      regionId,
      name: regionNames.get(regionId) ?? '—',
      statuses
    }))
    .sort((left, right) => left.name.localeCompare(right.name, 'id-ID'))
})
const matrixMonths = computed(() => Array.from({ length: 12 }, (_, index) => {
  const month = String(index + 1).padStart(2, '0')
  const periodDate = `${selectedYear.value}-${month}-01`

  return {
    periodDate,
    label: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][index]!
  }
}))
const source = computed(() => skpgDataset.value?.definition.source ?? null)

watch(availableMonths, (months) => {
  if (!months.includes(selectedMonth.value)) {
    selectedMonth.value = months[0] ?? ''
  }
}, { immediate: true })

function formatPercentage(value: number) {
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(value) + '%'
}

function statusBadgeStyle(status: (typeof dashboardSkpgStatusLegend)[number] | null) {
  return status
    ? { backgroundColor: `${status.color}22`, color: status.color }
    : undefined
}
</script>

<template>
  <section class="space-y-3" :class="pending ? 'opacity-75 transition-opacity' : ''">
    <section class="rounded-[var(--radius-panel)] border border-success/20 bg-success/5 px-4 py-3">
      <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div class="flex min-w-0 items-start gap-3">
          <span class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-success/10 text-success">
            <UIcon name="i-lucide-shield-check" class="size-5" />
          </span>
          <div class="min-w-0">
            <h3 class="text-base font-semibold text-[var(--app-foreground)]">
              SKPG
            </h3>
            <p class="text-sm font-medium text-[var(--app-foreground-muted)]">
              Sistem Peringatan Dini Kerawanan Pangan dan Gizi
            </p>
            <p class="mt-0.5 text-xs text-[var(--app-foreground-muted)]">
              Pemantauan kondisi kerawanan pangan dan gizi secara bulanan berdasarkan status kecamatan.
            </p>
          </div>
        </div>

        <DashboardPeriodSelector v-model="selectedMonth" periodicity="BULANAN" :periods="availableMonths" />
      </div>
    </section>

    <div v-if="!selectedMonth" class="rounded-[var(--radius-panel)] border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-8 text-sm text-[var(--app-foreground-muted)]">
      Belum ada bulan yang tersedia untuk SKPG.
    </div>

    <template v-else>
      <section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Ringkasan status SKPG">
        <article class="min-w-0 rounded-[var(--radius-panel)] border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2.5 shadow-sm">
          <p class="text-xs font-medium text-[var(--app-foreground-muted)]">
            Jumlah Kecamatan
          </p>
          <p class="mt-0.5 text-xl font-semibold tracking-tight tabular-nums text-[var(--app-foreground)]">
            {{ totalKecamatan }}
          </p>
          <p class="mt-0.5 text-xs text-[var(--app-foreground-muted)]">
            kecamatan
          </p>
        </article>

        <article
          v-for="status in statusSummary"
          :key="status.valueKey"
          class="min-w-0 rounded-[var(--radius-panel)] border px-3 py-2.5 shadow-sm"
          :class="status.valueKey === 'AMAN'
            ? 'border-success/20 bg-success/5'
            : status.valueKey === 'WASPADA'
              ? 'border-warning/20 bg-warning/5'
              : 'border-error/20 bg-error/5'"
        >
          <p class="text-xs font-medium text-[var(--app-foreground-muted)]">
            Status {{ status.label }}
          </p>
          <div class="mt-0.5 flex items-end justify-between gap-3">
            <div>
              <p class="text-xl font-semibold tracking-tight tabular-nums text-[var(--app-foreground)]">
                {{ status.count }}
              </p>
              <p class="mt-0.5 text-xs text-[var(--app-foreground-muted)]">
                kecamatan
              </p>
            </div>
            <span class="pb-0.5 text-sm font-semibold tabular-nums" :style="{ color: status.color }">{{ formatPercentage(status.percentage) }}</span>
          </div>
        </article>
      </section>

      <section class="grid items-start gap-3 xl:grid-cols-12">
        <DashboardWidget compact class="xl:col-span-7">
          <template #header>
            <div>
              <h3 class="text-sm font-semibold text-[var(--app-foreground)]">
                Peta SKPG Kecamatan
              </h3>
              <p class="mt-0.5 text-xs text-[var(--app-foreground-muted)]">
                Status kerawanan pangan dan gizi per kecamatan.
              </p>
            </div>
          </template>

          <MapAdministrativeBoundaryMap
            map-height="clamp(300px, 31vw, 410px)"
            :kecamatan-values="skpgMapValues"
            :value-color-map="valueColorMap"
            :popup-year="selectedMonthLabel"
            popup-period-label="Bulan"
            :show-desa-layer="false"
            stop-interaction-propagation
            no-data-color="#e2e8f0"
            no-data-label="Data belum tersedia"
          />

          <template #footer>
            <DashboardCardSource :source="source" />
          </template>
        </DashboardWidget>

        <div class="grid gap-3 xl:col-span-5">
          <DashboardWidget compact>
            <template #header>
              <div>
                <h3 class="text-sm font-semibold text-[var(--app-foreground)]">
                  Distribusi Status SKPG
                </h3>
                <p class="mt-0.5 text-xs text-[var(--app-foreground-muted)]">
                  {{ selectedMonthLabel }}
                </p>
              </div>
            </template>

            <div class="space-y-3">
              <div class="flex h-3 overflow-hidden rounded-full bg-[var(--app-surface-muted)]" aria-label="Distribusi status SKPG">
                <span v-for="status in statusSummary" :key="status.valueKey" :style="{ width: `${status.percentage}%`, backgroundColor: status.color }" />
              </div>
              <div class="space-y-2">
                <div v-for="status in statusSummary" :key="status.valueKey" class="flex items-center justify-between gap-3 text-sm">
                  <span class="inline-flex items-center gap-2 text-[var(--app-foreground-muted)]"><span class="size-2.5 rounded-full" :style="{ backgroundColor: status.color }" />{{ status.label }}</span>
                  <span class="flex items-center gap-4 font-medium tabular-nums text-[var(--app-foreground)]"><span>{{ status.count }}</span><span class="w-12 text-right text-[var(--app-foreground-muted)]">{{ formatPercentage(status.percentage) }}</span></span>
                </div>
              </div>
            </div>
          </DashboardWidget>

          <DashboardWidget compact>
            <template #header>
              <h3 class="text-sm font-semibold text-[var(--app-foreground)]">
                Daftar Kecamatan ({{ selectedMonthLabel }})
              </h3>
            </template>

            <div class="overflow-x-auto">
              <table class="w-full min-w-[360px] text-sm">
                <thead class="border-y border-[var(--app-border)] bg-[var(--app-surface-muted)] text-left text-[0.68rem] font-medium tracking-[0.1em] text-[var(--app-foreground-muted)] uppercase">
                  <tr>
                    <th class="w-12 px-3 py-2">
                      No.
                    </th><th class="px-3 py-2">
                      Kecamatan
                    </th><th class="px-3 py-2">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-[var(--app-border)]">
                  <tr v-for="({ record, status }, index) in selectedMonthRows" :key="record.regionId">
                    <td class="px-3 py-2 tabular-nums text-[var(--app-foreground-muted)]">
                      {{ index + 1 }}
                    </td>
                    <td class="px-3 py-2 font-medium text-[var(--app-foreground)]">
                      {{ record.regionName }}
                    </td>
                    <td class="px-3 py-2">
                      <span class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium" :class="status ? '' : 'bg-[var(--app-surface-muted)] text-[var(--app-foreground-muted)]'" :style="statusBadgeStyle(status)">{{ status?.label ?? 'Data belum tersedia' }}</span>
                    </td>
                  </tr>
                  <tr v-if="!selectedMonthRows.length">
                    <td colspan="3" class="px-3 py-6 text-center text-sm text-[var(--app-foreground-muted)]">
                      Data kecamatan belum tersedia.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </DashboardWidget>
        </div>
      </section>

      <DashboardWidget compact>
        <template #header>
          <div>
            <h3 class="text-sm font-semibold text-[var(--app-foreground)]">
              Perkembangan Status SKPG Tahun {{ selectedYear }}
            </h3>
            <p class="mt-0.5 text-xs text-[var(--app-foreground-muted)]">
              Status kerawanan pangan dan gizi per kecamatan selama 12 bulan.
            </p>
          </div>
        </template>

        <div class="overflow-x-auto">
          <table class="w-full min-w-[760px] text-sm">
            <thead class="border-y border-[var(--app-border)] bg-[var(--app-surface-muted)] text-center text-[0.68rem] font-medium tracking-[0.08em] text-[var(--app-foreground-muted)] uppercase">
              <tr>
                <th class="w-12 px-3 py-2 text-left">
                  No.
                </th>
                <th class="min-w-36 px-3 py-2 text-left">
                  Kecamatan
                </th>
                <th v-for="month in matrixMonths" :key="month.periodDate" class="w-12 px-1 py-2">
                  {{ month.label }}
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[var(--app-border)]">
              <tr v-for="(row, index) in matrixRows" :key="row.regionId">
                <td class="px-3 py-2 tabular-nums text-[var(--app-foreground-muted)]">
                  {{ index + 1 }}
                </td>
                <td class="px-3 py-2 font-medium text-[var(--app-foreground)]">
                  {{ row.name }}
                </td>
                <td v-for="month in matrixMonths" :key="month.periodDate" class="px-1 py-1.5 text-center">
                  <span
                    class="inline-flex min-w-7 justify-center rounded px-1.5 py-0.5 text-xs font-semibold"
                    :class="row.statuses.get(month.periodDate) ? '' : 'bg-[var(--app-surface-muted)] text-[var(--app-foreground-muted)]'"
                    :style="statusBadgeStyle(row.statuses.get(month.periodDate) ?? null)"
                    :title="row.statuses.get(month.periodDate)?.label ?? 'Data belum tersedia'"
                    :aria-label="`${row.name}, ${month.label}: ${row.statuses.get(month.periodDate)?.label ?? 'Data belum tersedia'}`"
                  >{{ row.statuses.get(month.periodDate)?.shortLabel ?? '—' }}</span>
                </td>
              </tr>
              <tr v-if="!matrixRows.length">
                <td colspan="14" class="px-3 py-6 text-center text-sm text-[var(--app-foreground-muted)]">
                  Data SKPG tahun {{ selectedYear }} belum tersedia.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <template #footer>
          <div class="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--app-foreground-muted)]">
            <DashboardCardSource :source="source" />
            <span class="inline-flex flex-wrap items-center gap-x-3 gap-y-1"><span v-for="status in dashboardSkpgStatusLegend" :key="status.valueKey" class="inline-flex items-center gap-1.5"><span class="size-2 rounded-full" :style="{ backgroundColor: status.color }" />{{ status.shortLabel }} · {{ status.label }}</span></span>
          </div>
        </template>
      </DashboardWidget>
    </template>
  </section>
</template>
