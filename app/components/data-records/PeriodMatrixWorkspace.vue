<script setup lang="ts">
import ImportPanel from './ImportPanel.vue'

import type {
  DatasetPeriodWorkspaceField,
  DatasetPeriodWorkspaceResponse,
  DatasetRecordBulkSaveResult
} from '~/types'

type MatrixRow = {
  regionId: string
  regionName: string
  parentRegionId: string | null
  parentRegionName: string | null
  recordId: string | null
  touched: boolean
  data: Record<string, unknown>
  initialData: Record<string, unknown>
  numberDisplayValues: Record<string, string>
}

type RowError = {
  regionId: string
  regionName: string
  fieldKey?: string
  message: string
}

type FieldErrors = Record<string, Record<string, string[]>>

const props = defineProps<{
  datasetId: string
  periodDate: string
}>()

const emit = defineEmits<{
  close: []
  saved: []
}>()

const requestFetch = useRequestFetch()
const toast = useToast()
const workspace = ref<DatasetPeriodWorkspaceResponse | null>(null)
const rows = ref<MatrixRow[]>([])
const loading = ref(false)
const saving = ref(false)
const periodImportInput = ref<HTMLInputElement | null>(null)
const periodImportFile = ref<File | null>(null)
const workspaceError = ref('')
const rowErrors = ref<RowError[]>([])
const fieldErrors = ref<FieldErrors>({})

const fields = computed(() => workspace.value?.dataset.fields ?? [])
const canCreate = computed(
  () => workspace.value?.dataset.permissions.canCreate ?? false
)
const canUpdate = computed(
  () => workspace.value?.dataset.permissions.canUpdate ?? false
)
const isArchived = computed(() => !!workspace.value?.dataset.archivedAt)
const isDesa = computed(() => workspace.value?.dataset.regionLevel === 'DESA')
const isKecamatan = computed(
  () => workspace.value?.dataset.regionLevel === 'KECAMATAN'
)
const hasRegionFilters = computed(() => isDesa.value || isKecamatan.value)
const filledCount = computed(
  () => rows.value.filter(row => !!row.recordId).length
)
const kecamatanFilterId = ref('')
const regionSearchQuery = ref('')
const occupancyFilter = ref<'all' | 'filled' | 'missing'>('all')
const kecamatanFilterOptions = computed(() => {
  const options = new Map<string, string>()

  for (const row of rows.value) {
    if (row.parentRegionId && row.parentRegionName) {
      options.set(row.parentRegionId, row.parentRegionName)
    }
  }

  return [
    { value: '', label: 'Semua Kecamatan' },
    ...Array.from(options, ([value, label]) => ({ value, label })).sort(
      (left, right) =>
        left.label.localeCompare(right.label)
        || left.value.localeCompare(right.value)
    )
  ]
})
const visibleRows = computed(() => {
  if (!hasRegionFilters.value) {
    return rows.value
  }

  const query = regionSearchQuery.value.trim().toLowerCase()

  return rows.value.filter((row) => {
    const matchesKecamatan
      = !isDesa.value
        || !kecamatanFilterId.value
        || row.parentRegionId === kecamatanFilterId.value
    const matchesSearch
      = !query || row.regionName.toLowerCase().includes(query)
    const matchesOccupancy
      = occupancyFilter.value === 'all'
        || (occupancyFilter.value === 'filled' ? !!row.recordId : !row.recordId)

    return matchesKecamatan && matchesSearch && matchesOccupancy
  })
})
const errorsByRegionId = computed(() => {
  const errors = new Map<string, string[]>()

  for (const error of rowErrors.value) {
    errors.set(error.regionId, [
      ...(errors.get(error.regionId) ?? []),
      error.message
    ])
  }

  return errors
})

function getFieldErrors(regionId: string, fieldKey: string) {
  return fieldErrors.value[regionId]?.[fieldKey] ?? []
}

function clearFieldError(regionId: string, fieldKey: string) {
  const errorsForRegion = fieldErrors.value[regionId]

  if (!errorsForRegion?.[fieldKey]) {
    return
  }

  const nextErrorsForRegion = Object.fromEntries(
    Object.entries(errorsForRegion).filter(([key]) => key !== fieldKey)
  )

  if (Object.keys(nextErrorsForRegion).length === 0) {
    fieldErrors.value = Object.fromEntries(
      Object.entries(fieldErrors.value).filter(([key]) => key !== regionId)
    )
    return
  }

  fieldErrors.value = {
    ...fieldErrors.value,
    [regionId]: nextErrorsForRegion
  }
}

function clearMatrixErrors() {
  rowErrors.value = []
  fieldErrors.value = {}
}

function applyBulkRowErrors(errors: RowError[]) {
  const nextFieldErrors: FieldErrors = {}
  const nextRowErrors: RowError[] = []
  const fieldKeys = new Set(fields.value.map(field => field.key))

  for (const error of errors) {
    if (!error.fieldKey || !fieldKeys.has(error.fieldKey)) {
      nextRowErrors.push(error)
      continue
    }

    const errorsForRegion = nextFieldErrors[error.regionId] ?? {}
    const messages = errorsForRegion[error.fieldKey] ?? []

    nextFieldErrors[error.regionId] = {
      ...errorsForRegion,
      [error.fieldKey]: [...messages, error.message]
    }
  }

  rowErrors.value = nextRowErrors
  fieldErrors.value = nextFieldErrors
}

function getEmptyFieldValue(field: DatasetPeriodWorkspaceField) {
  return field.type === 'boolean' ? false : ''
}

function normalizeFieldValue(
  field: DatasetPeriodWorkspaceField,
  value: unknown
) {
  if (value === undefined || value === null) {
    return getEmptyFieldValue(field)
  }

  return value
}

function createRowData(data: Record<string, unknown> | null) {
  return Object.fromEntries(
    fields.value.map(field => [
      field.key,
      normalizeFieldValue(field, data?.[field.key])
    ])
  )
}

function isFixedDecimalNumberField(field: DatasetPeriodWorkspaceField) {
  return field.type === 'number' && field.validation?.decimalPlaces !== undefined
}

function formatFixedDecimalNumber(value: unknown, decimalPlaces: number) {
  return typeof value === 'number' && Number.isFinite(value)
    ? new Intl.NumberFormat('id-ID', {
        useGrouping: false,
        minimumFractionDigits: decimalPlaces,
        maximumFractionDigits: decimalPlaces
      }).format(value)
    : ''
}

function createNumberDisplayValues(data: Record<string, unknown>) {
  return Object.fromEntries(
    fields.value.flatMap((field) => {
      if (!isFixedDecimalNumberField(field)) {
        return []
      }

      return [[
        field.key,
        formatFixedDecimalNumber(
          data[field.key],
          field.validation?.decimalPlaces ?? 0
        )
      ]]
    })
  )
}

function getFixedDecimalDisplayValue(
  row: MatrixRow,
  field: DatasetPeriodWorkspaceField
) {
  return row.numberDisplayValues[field.key] ?? ''
}

function allowsNegativeNumber(field: DatasetPeriodWorkspaceField) {
  return field.validation?.min === undefined || field.validation.min < 0
}

function isValidFixedDecimalInput(
  value: string,
  field: DatasetPeriodWorkspaceField
) {
  const decimalPlaces = field.validation?.decimalPlaces

  if (decimalPlaces === undefined || value === '') {
    return true
  }

  const sign = allowsNegativeNumber(field) ? '-?' : ''
  const fractionalPart = decimalPlaces === 0
    ? ''
    : `(?:[,.]\\d{0,${decimalPlaces}})?`

  return new RegExp(`^${sign}\\d*${fractionalPart}$`).test(value)
}

function getNextFixedDecimalInputValue(
  input: HTMLInputElement,
  insertedValue: string
) {
  const selectionStart = input.selectionStart ?? input.value.length
  const selectionEnd = input.selectionEnd ?? input.value.length

  return input.value.slice(0, selectionStart)
    + insertedValue
    + input.value.slice(selectionEnd)
}

function guardFixedDecimalBeforeInput(
  event: InputEvent,
  field: DatasetPeriodWorkspaceField
) {
  if (!event.inputType.startsWith('insert') || event.data === null) {
    return
  }

  const input = event.target

  if (
    !(input instanceof HTMLInputElement)
    || isValidFixedDecimalInput(
      getNextFixedDecimalInputValue(input, event.data),
      field
    )
  ) {
    return
  }

  event.preventDefault()
}

function guardFixedDecimalPaste(
  event: ClipboardEvent,
  field: DatasetPeriodWorkspaceField
) {
  const input = event.target
  const pastedValue = event.clipboardData?.getData('text')

  if (!(input instanceof HTMLInputElement)) {
    return
  }

  if (
    pastedValue === undefined
    || !isValidFixedDecimalInput(
      getNextFixedDecimalInputValue(input, pastedValue),
      field
    )
  ) {
    event.preventDefault()
  }
}

function parseFixedDecimalInput(value: string): number | string {
  const normalized = value.trim().replace(',', '.')

  if (!normalized) {
    return ''
  }

  if (!/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(normalized)) {
    return value
  }

  const parsed = Number(normalized)

  return Number.isFinite(parsed) ? parsed : value
}

function hasFixedDecimalDisplayPrecision(value: string, decimalPlaces: number) {
  const normalized = value.trim().replace(',', '.')
  const decimalIndex = normalized.indexOf('.')

  return decimalIndex === -1 || normalized.length - decimalIndex - 1 <= decimalPlaces
}

function comparableData(value: Record<string, unknown>) {
  return JSON.stringify(value)
}

function isRowDirty(row: MatrixRow) {
  return row.recordId
    ? comparableData(row.data) !== comparableData(row.initialData)
    : row.touched
}

const dirtyRows = computed(() => rows.value.filter(isRowDirty))
const canSave = computed(() => {
  return (
    !isArchived.value
    && !saving.value
    && dirtyRows.value.some((row) => {
      return row.recordId ? canUpdate.value : canCreate.value
    })
  )
})

function canEditRow(row: MatrixRow) {
  return (
    !isArchived.value && (row.recordId ? canUpdate.value : canCreate.value)
  )
}

function getFieldValue(row: MatrixRow, field: DatasetPeriodWorkspaceField) {
  return normalizeFieldValue(field, row.data[field.key])
}

function setFieldValue(
  row: MatrixRow,
  field: DatasetPeriodWorkspaceField,
  value: unknown
) {
  row.touched = true
  row.data[field.key] = value
  clearFieldError(row.regionId, field.key)
}

function setFixedDecimalFieldValue(
  row: MatrixRow,
  field: DatasetPeriodWorkspaceField,
  value: unknown
) {
  const displayValue = String(value ?? '')

  if (!isValidFixedDecimalInput(displayValue, field)) {
    row.numberDisplayValues = { ...row.numberDisplayValues }
    return
  }

  row.numberDisplayValues[field.key] = displayValue
  setFieldValue(row, field, parseFixedDecimalInput(displayValue))
}

function normalizeFixedDecimalFieldDisplay(
  row: MatrixRow,
  field: DatasetPeriodWorkspaceField
) {
  const displayValue = getFixedDecimalDisplayValue(row, field)
  const value = parseFixedDecimalInput(displayValue)
  const decimalPlaces = field.validation?.decimalPlaces

  if (
    typeof value !== 'number'
    || decimalPlaces === undefined
    || !hasFixedDecimalDisplayPrecision(displayValue, decimalPlaces)
  ) {
    return
  }

  row.numberDisplayValues[field.key] = formatFixedDecimalNumber(
    value,
    decimalPlaces
  )
}

function getNumberStep(field: DatasetPeriodWorkspaceField) {
  const decimalPlaces = field.validation?.decimalPlaces

  return decimalPlaces === undefined
    ? 'any'
    : decimalPlaces === 0
      ? 1
      : 1 / 10 ** decimalPlaces
}

function resetRegionFilters() {
  kecamatanFilterId.value = ''
  regionSearchQuery.value = ''
  occupancyFilter.value = 'all'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function syncWorkspace(nextWorkspace: DatasetPeriodWorkspaceResponse) {
  workspace.value = nextWorkspace
  rows.value = nextWorkspace.rows.map((row) => {
    const initialData = createRowData(row.record?.data ?? null)

    return {
      regionId: row.regionId,
      regionName: row.regionName,
      parentRegionId: row.parentRegionId,
      parentRegionName: row.parentRegionName,
      recordId: row.record?.id ?? null,
      touched: false,
      data: { ...initialData },
      initialData,
      numberDisplayValues: createNumberDisplayValues(initialData)
    }
  })
}

async function loadWorkspace() {
  if (!props.datasetId || !props.periodDate) {
    return
  }

  loading.value = true
  workspaceError.value = ''
  clearMatrixErrors()

  try {
    const nextWorkspace = await requestFetch<DatasetPeriodWorkspaceResponse>(
      '/api/dataset-period-workspace',
      {
        query: {
          datasetId: props.datasetId,
          periodDate: props.periodDate
        }
      }
    )

    syncWorkspace(nextWorkspace)
  } catch (error) {
    workspaceError.value
      = error instanceof Error
        ? error.message
        : 'Ruang kerja periode tidak dapat dimuat.'
  } finally {
    loading.value = false
  }
}

function getBulkRowErrors(error: unknown) {
  if (!isRecord(error) || !isRecord(error.data)) {
    return []
  }

  const errorPayload = isRecord(error.data.data)
    ? error.data.data
    : error.data

  if (!Array.isArray(errorPayload.rowErrors)) {
    return []
  }

  return errorPayload.rowErrors.flatMap((rowError) => {
    if (!isRecord(rowError)) {
      return []
    }

    const { regionId, regionName, fieldKey, message } = rowError

    return typeof regionId === 'string'
      && typeof regionName === 'string'
      && typeof message === 'string'
      ? [{
          regionId,
          regionName,
          fieldKey: typeof fieldKey === 'string' ? fieldKey : undefined,
          message
        }]
      : []
  })
}

async function handlePeriodImport() {
  clearPeriodImport()
  await loadWorkspace()
  emit('saved')
}

function openPeriodImportPicker() {
  if (periodImportInput.value) {
    periodImportInput.value.value = ''
  }

  periodImportInput.value?.click()
}

function handlePeriodImportFile(event: Event) {
  const input = event.target as HTMLInputElement
  periodImportFile.value = input.files?.[0] ?? null
}

function clearPeriodImport() {
  periodImportFile.value = null

  if (periodImportInput.value) {
    periodImportInput.value.value = ''
  }
}

function downloadPeriodSpreadsheet(kind: 'template' | 'export') {
  if (!workspace.value || !import.meta.client) {
    return
  }

  const endpoint
    = kind === 'template'
      ? '/api/dataset-period-template'
      : '/api/dataset-period-export'
  const query = new URLSearchParams({
    datasetId: workspace.value.dataset.id,
    periodDate: workspace.value.periodDate
  })

  window.open(`${endpoint}?${query.toString()}`, '_blank', 'noopener')
}

async function saveChanges() {
  if (!props.periodDate || !canSave.value) {
    return
  }

  const changedRows = dirtyRows.value.filter(canEditRow)

  if (changedRows.length === 0) {
    return
  }

  saving.value = true
  clearMatrixErrors()

  try {
    const result = await $fetch<DatasetRecordBulkSaveResult>(
      '/api/dataset-records/bulk',
      {
        method: 'POST',
        body: {
          datasetId: props.datasetId,
          periodDate: props.periodDate,
          rows: changedRows.map(row => ({
            regionId: row.regionId,
            intent: true,
            data: row.data
          }))
        }
      }
    )

    clearMatrixErrors()
    await loadWorkspace()
    emit('saved')
    toast.add({
      title: 'Perubahan disimpan',
      description: `${result.created} data ditambahkan · ${result.updated} diperbarui`,
      color: 'success'
    })
  } catch (error) {
    const errors = getBulkRowErrors(error)

    if (errors.length > 0) {
      applyBulkRowErrors(errors)
      toast.add({
        title: 'Perubahan tidak dapat disimpan',
        description: 'Periksa kembali data yang belum valid.',
        color: 'error'
      })
      return
    }

    toast.add({
      title: 'Perubahan tidak dapat disimpan',
      description:
        error instanceof Error ? error.message : 'Silakan coba lagi.',
      color: 'error'
    })
  } finally {
    saving.value = false
  }
}

watch([() => props.datasetId, () => props.periodDate], () => {
  resetRegionFilters()
  void loadWorkspace()
})

await loadWorkspace()
</script>

<template>
  <div class="space-y-4">
    <div v-if="loading" class="space-y-3">
      <div class="h-5 w-1/3 rounded bg-elevated" />
      <div class="h-40 rounded bg-elevated/70" />
    </div>

    <div v-else-if="workspaceError" class="space-y-4">
      <UAlert
        icon="i-lucide-triangle-alert"
        title="Ruang kerja periode tidak dapat dimuat"
        :description="workspaceError"
        color="error"
        variant="subtle"
      /><UButton
        label="Muat ulang"
        icon="i-lucide-refresh-cw"
        color="neutral"
        variant="outline"
        size="sm"
        @click="loadWorkspace"
      />
    </div>

    <template v-else-if="workspace">
      <div
        class="flex flex-wrap items-center gap-2 border-b border-default pb-3 text-xs text-muted"
      >
        <span>{{ workspace.dataset.name }}</span><span>·</span><span>{{ workspace.dataset.regionLevel }}</span><span>·</span><span>{{ filledCount }} /
          {{ workspace.expectedRegionCount }} terisi</span><UBadge
          v-if="isArchived"
          color="warning"
          variant="subtle"
          size="sm"
        >
          Diarsipkan · read-only
        </UBadge>
      </div>

      <input
        ref="periodImportInput"
        type="file"
        accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        class="hidden"
        @change="handlePeriodImportFile"
      >

      <div class="mt-3 flex flex-wrap items-center gap-2">
        <UButton
          v-if="!isArchived && (canCreate || canUpdate)"
          label="Import"
          class="cursor-pointer"
          icon="i-lucide-upload"
          color="neutral"
          variant="outline"
          size="sm"
          @click="openPeriodImportPicker"
        />
        <UButton
          label="Export data"
          class="cursor-pointer"
          icon="i-lucide-download"
          color="neutral"
          variant="outline"
          size="sm"
          @click="downloadPeriodSpreadsheet('export')"
        />
        <UButton
          label="Unduh template"
          class="cursor-pointer"
          icon="i-lucide-file-down"
          color="neutral"
          variant="outline"
          size="sm"
          @click="downloadPeriodSpreadsheet('template')"
        />
      </div>

      <ImportPanel
        v-if="periodImportFile"
        v-model:file="periodImportFile"
        class="mt-3 rounded-lg border border-default p-3"
        :dataset="workspace.dataset"
        :period-date="workspace.periodDate"
        :show-picker="false"
        @cancel="clearPeriodImport"
        @imported="handlePeriodImport"
        @replace-file="openPeriodImportPicker"
      />

      <div
        v-if="hasRegionFilters"
        class="mt-3 flex flex-wrap items-center gap-2"
      >
        <USelectMenu
          v-if="isDesa"
          :model-value="kecamatanFilterId"
          :items="kecamatanFilterOptions"
          value-key="value"
          label-key="label"
          size="sm"
          class="w-52"
          @update:model-value="
            (value) => (kecamatanFilterId = String(value ?? ''))
          "
        />
        <UInput
          :model-value="regionSearchQuery"
          icon="i-lucide-search"
          :placeholder="
            isDesa ? 'Cari desa/kelurahan...' : 'Cari kecamatan...'
          "
          size="sm"
          class="w-64"
          @update:model-value="
            (value) => (regionSearchQuery = String(value ?? ''))
          "
        />
        <div class="flex items-center gap-1">
          <UButton
            label="Semua"
            size="sm"
            :color="occupancyFilter === 'all' ? 'primary' : 'neutral'"
            :variant="occupancyFilter === 'all' ? 'solid' : 'outline'"
            @click="occupancyFilter = 'all'"
          />
          <UButton
            label="Sudah terisi"
            size="sm"
            :color="occupancyFilter === 'filled' ? 'primary' : 'neutral'"
            :variant="occupancyFilter === 'filled' ? 'solid' : 'outline'"
            @click="occupancyFilter = 'filled'"
          />
          <UButton
            label="Belum terisi"
            size="sm"
            :color="occupancyFilter === 'missing' ? 'primary' : 'neutral'"
            :variant="occupancyFilter === 'missing' ? 'solid' : 'outline'"
            @click="occupancyFilter = 'missing'"
          />
        </div>
      </div>

      <div v-if="fields.length === 0" class="py-8">
        <UEmpty
          icon="i-lucide-columns-3"
          title="Schema Dataset kosong"
          description="Dataset ini belum memiliki field data yang dapat diisi."
          variant="naked"
        />
      </div>

      <div
        v-else
        class="mt-3 overflow-x-auto rounded-lg border border-default"
      >
        <table class="w-full min-w-max divide-y divide-default text-sm">
          <thead class="bg-elevated/45">
            <tr>
              <th
                v-if="isDesa"
                class="sticky left-0 z-20 min-w-56 border-r border-default bg-elevated/45 px-3 py-2 text-left text-xs font-medium tracking-[0.12em] text-muted uppercase"
              >
                Kecamatan
              </th>
              <th
                v-if="isDesa"
                class="sticky left-56 z-20 min-w-56 border-r border-default bg-elevated/45 px-3 py-2 text-left text-xs font-medium tracking-[0.12em] text-muted uppercase"
              >
                Desa/Kelurahan
              </th>
              <th
                v-else
                class="sticky left-0 z-10 min-w-56 bg-elevated/45 px-3 py-2 text-left text-xs font-medium tracking-[0.12em] text-muted uppercase"
              >
                Wilayah
              </th>
              <th
                v-for="field in fields"
                :key="field.key"
                class="min-w-44 px-3 py-2 text-left text-xs font-medium text-muted"
              >
                <span>{{ field.label }}</span><span v-if="field.required" class="ml-1 text-error">*</span>
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-default">
            <tr
              v-for="row in visibleRows"
              :key="row.regionId"
              :class="isRowDirty(row) ? 'bg-primary/5' : ''"
            >
              <td
                v-if="isDesa"
                class="sticky left-0 z-20 min-w-56 border-r border-default bg-default px-3 py-2 align-top"
              >
                <div class="font-medium text-highlighted">
                  {{ row.parentRegionName }}
                </div>
              </td>
              <td
                v-if="isDesa"
                class="sticky left-56 z-10 min-w-56 border-r border-default bg-default px-3 py-2 align-top"
              >
                <div class="font-medium text-highlighted">
                  {{ row.regionName }}
                </div>
                <p class="text-xs text-muted">
                  {{ row.regionId }}
                  <span v-if="isRowDirty(row)">· Diubah</span>
                </p>
                <p
                  v-for="message in errorsByRegionId.get(row.regionId)"
                  :key="message"
                  class="mt-1 text-xs text-error"
                >
                  {{ message }}
                </p>
              </td>
              <td
                v-else
                class="sticky left-0 z-10 min-w-56 bg-default px-3 py-2 align-top"
              >
                <div class="font-medium text-highlighted">
                  {{ row.regionName }}
                </div>
                <p class="text-xs text-muted">
                  {{ row.regionId }}
                  <span v-if="isRowDirty(row)">· Diubah</span>
                </p>
                <p
                  v-for="message in errorsByRegionId.get(row.regionId)"
                  :key="message"
                  class="mt-1 text-xs text-error"
                >
                  {{ message }}
                </p>
              </td>
              <td
                v-for="field in fields"
                :key="field.key"
                class="px-3 py-2 align-top"
              >
                <div class="w-40 space-y-1">
                  <USwitch
                    v-if="field.type === 'boolean'"
                    :model-value="Boolean(getFieldValue(row, field))"
                    :color="
                      getFieldErrors(row.regionId, field.key).length > 0
                        ? 'error'
                        : 'primary'
                    "
                    :highlight="getFieldErrors(row.regionId, field.key).length > 0"
                    size="sm"
                    :disabled="!canEditRow(row)"
                    @update:model-value="
                      (value) => setFieldValue(row, field, value)
                    "
                  />
                  <USelectMenu
                    v-else-if="field.type === 'select'"
                    :model-value="String(getFieldValue(row, field) || '')"
                    :items="field.options ?? []"
                    value-key="value"
                    label-key="label"
                    placeholder="Pilih"
                    size="sm"
                    class="w-full"
                    :color="
                      getFieldErrors(row.regionId, field.key).length > 0
                        ? 'error'
                        : 'primary'
                    "
                    :highlight="getFieldErrors(row.regionId, field.key).length > 0"
                    :aria-invalid="getFieldErrors(row.regionId, field.key).length > 0"
                    :disabled="!canEditRow(row)"
                    @update:model-value="
                      (value) => setFieldValue(row, field, value)
                    "
                  />
                  <UInput
                    v-else-if="isFixedDecimalNumberField(field)"
                    :model-value="getFixedDecimalDisplayValue(row, field)"
                    type="text"
                    inputmode="decimal"
                    :color="
                      getFieldErrors(row.regionId, field.key).length > 0
                        ? 'error'
                        : 'primary'
                    "
                    :highlight="getFieldErrors(row.regionId, field.key).length > 0"
                    :aria-invalid="getFieldErrors(row.regionId, field.key).length > 0"
                    size="sm"
                    class="w-full"
                    :disabled="!canEditRow(row)"
                    @beforeinput="guardFixedDecimalBeforeInput($event, field)"
                    @paste="guardFixedDecimalPaste($event, field)"
                    @update:model-value="
                      (value) => setFixedDecimalFieldValue(row, field, value)
                    "
                    @blur="normalizeFixedDecimalFieldDisplay(row, field)"
                  />
                  <UInput
                    v-else
                    :model-value="String(getFieldValue(row, field) || '')"
                    :type="
                      field.type === 'number'
                        ? 'number'
                        : field.type === 'date'
                          ? 'date'
                          : 'text'
                    "
                    :min="
                      field.type === 'number'
                        ? field.validation?.min
                        : undefined
                    "
                    :max="
                      field.type === 'number'
                        ? field.validation?.max
                        : undefined
                    "
                    :step="
                      field.type === 'number' ? getNumberStep(field) : undefined
                    "
                    :minlength="
                      field.type === 'string'
                        ? field.validation?.minLength
                        : undefined
                    "
                    :maxlength="
                      field.type === 'string'
                        ? field.validation?.maxLength
                        : undefined
                    "
                    :color="
                      getFieldErrors(row.regionId, field.key).length > 0
                        ? 'error'
                        : 'primary'
                    "
                    :highlight="getFieldErrors(row.regionId, field.key).length > 0"
                    :aria-invalid="getFieldErrors(row.regionId, field.key).length > 0"
                    size="sm"
                    class="w-full"
                    :disabled="!canEditRow(row)"
                    @update:model-value="
                      (value) => setFieldValue(row, field, value)
                    "
                  />
                  <p
                    v-for="message in getFieldErrors(row.regionId, field.key)"
                    :key="message"
                    class="text-xs leading-tight text-error"
                  >
                    {{ message }}
                  </p>
                </div>
              </td>
            </tr>
            <tr v-if="visibleRows.length === 0">
              <td
                :colspan="fields.length + (isDesa ? 2 : 1)"
                class="px-3 py-8 text-center text-sm text-muted"
              >
                Tidak ada wilayah yang sesuai dengan filter.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div
        class="mt-4 flex items-center justify-end gap-2 border-t border-default pt-3"
      >
        <UButton
          label="Tutup"
          color="neutral"
          class="cursor-pointer"
          variant="subtle"
          size="sm"
          @click="emit('close')"
        /><UButton
          v-if="!isArchived && (canCreate || canUpdate)"
          label="Simpan perubahan"
          class="cursor-pointer"
          icon="i-lucide-save"
          size="sm"
          :disabled="!canSave"
          :loading="saving"
          @click="saveChanges"
        />
      </div>
    </template>
  </div>
</template>
