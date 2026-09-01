<script setup lang="ts">
import type {
  DatasetPeriodWorkspaceField,
  DatasetPeriodWorkspaceResponse,
  DatasetRecordBulkSaveResult
} from '~/types'

type MatrixRow = {
  regionId: string
  regionName: string
  recordId: string | null
  touched: boolean
  data: Record<string, unknown>
  initialData: Record<string, unknown>
}

type RowError = {
  regionId: string
  regionName: string
  message: string
}

const props = defineProps<{
  datasetId: string
  periodDate: string | null
  periodLabel: string
}>()

const emit = defineEmits<{
  saved: []
}>()

const open = defineModel<boolean>('open', { default: false })
const requestFetch = useRequestFetch()
const toast = useToast()
const workspace = ref<DatasetPeriodWorkspaceResponse | null>(null)
const rows = ref<MatrixRow[]>([])
const loading = ref(false)
const saving = ref(false)
const workspaceError = ref('')
const rowErrors = ref<RowError[]>([])

const fields = computed(() => workspace.value?.dataset.fields ?? [])
const canCreate = computed(() => workspace.value?.dataset.permissions.canCreate ?? false)
const canUpdate = computed(() => workspace.value?.dataset.permissions.canUpdate ?? false)
const isArchived = computed(() => !!workspace.value?.dataset.archivedAt)
const filledCount = computed(() => rows.value.filter(row => !!row.recordId).length)
const errorsByRegionId = computed(() => {
  const errors = new Map<string, string[]>()

  for (const error of rowErrors.value) {
    errors.set(error.regionId, [...(errors.get(error.regionId) ?? []), error.message])
  }

  return errors
})

function getEmptyFieldValue(field: DatasetPeriodWorkspaceField) {
  return field.type === 'boolean' ? false : ''
}

function normalizeFieldValue(field: DatasetPeriodWorkspaceField, value: unknown) {
  if (value === undefined || value === null) {
    return getEmptyFieldValue(field)
  }

  return value
}

function createRowData(data: Record<string, unknown> | null) {
  return Object.fromEntries(fields.value.map(field => [
    field.key,
    normalizeFieldValue(field, data?.[field.key])
  ]))
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
  return !isArchived.value && !saving.value && dirtyRows.value.some((row) => {
    return row.recordId ? canUpdate.value : canCreate.value
  })
})

function canEditRow(row: MatrixRow) {
  return !isArchived.value && (row.recordId ? canUpdate.value : canCreate.value)
}

function getFieldValue(row: MatrixRow, field: DatasetPeriodWorkspaceField) {
  return normalizeFieldValue(field, row.data[field.key])
}

function setFieldValue(row: MatrixRow, field: DatasetPeriodWorkspaceField, value: unknown) {
  row.touched = true
  row.data[field.key] = value
  rowErrors.value = rowErrors.value.filter(error => error.regionId !== row.regionId)
}

function getNumberStep(field: DatasetPeriodWorkspaceField) {
  const decimalPlaces = field.validation?.decimalPlaces

  return decimalPlaces === undefined
    ? 'any'
    : decimalPlaces === 0
      ? 1
      : 1 / (10 ** decimalPlaces)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function syncWorkspace(nextWorkspace: DatasetPeriodWorkspaceResponse) {
  workspace.value = nextWorkspace
  rows.value = nextWorkspace.rows.map((row) => {
    const data = createRowData(row.record?.data ?? null)

    return {
      regionId: row.regionId,
      regionName: row.regionName,
      recordId: row.record?.id ?? null,
      touched: false,
      data,
      initialData: createRowData(row.record?.data ?? null)
    }
  })
}

async function loadWorkspace() {
  if (!open.value || !props.datasetId || !props.periodDate) {
    return
  }

  loading.value = true
  workspaceError.value = ''
  rowErrors.value = []

  try {
    const nextWorkspace = await requestFetch<DatasetPeriodWorkspaceResponse>('/api/dataset-period-workspace', {
      query: {
        datasetId: props.datasetId,
        periodDate: props.periodDate
      }
    })

    syncWorkspace(nextWorkspace)
  } catch (error) {
    workspaceError.value = error instanceof Error ? error.message : 'Ruang kerja periode tidak dapat dimuat.'
  } finally {
    loading.value = false
  }
}

function getBulkRowErrors(error: unknown) {
  if (!isRecord(error) || !isRecord(error.data) || !Array.isArray(error.data.rowErrors)) {
    return []
  }

  return error.data.rowErrors.flatMap((rowError) => {
    if (!isRecord(rowError)) {
      return []
    }

    const { regionId, regionName, message } = rowError

    return typeof regionId === 'string' && typeof regionName === 'string' && typeof message === 'string'
      ? [{ regionId, regionName, message }]
      : []
  })
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
  rowErrors.value = []

  try {
    const result = await $fetch<DatasetRecordBulkSaveResult>('/api/dataset-records/bulk', {
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
    })

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
      rowErrors.value = errors
      return
    }

    toast.add({
      title: 'Perubahan tidak dapat disimpan',
      description: error instanceof Error ? error.message : 'Silakan coba lagi.',
      color: 'error'
    })
  } finally {
    saving.value = false
  }
}

watch([open, () => props.datasetId, () => props.periodDate], ([isOpen]) => {
  if (isOpen) {
    void loadWorkspace()
    return
  }

  workspace.value = null
  rows.value = []
  rowErrors.value = []
  workspaceError.value = ''
})
</script>

<template>
  <UModal
    v-model:open="open"
    title="Kelola data periode"
    :description="workspace ? `${workspace.dataset.name} · ${periodLabel}` : 'Memuat ruang kerja periode...'"
    :ui="{ content: 'sm:max-w-[calc(100vw-2rem)]' }"
  >
    <template #body>
      <div v-if="loading" class="space-y-3">
        <div class="h-5 w-1/3 rounded bg-elevated" /><div class="h-40 rounded bg-elevated/70" />
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
        <div class="flex flex-wrap items-center gap-2 border-b border-default pb-3 text-xs text-muted">
          <span>{{ workspace.dataset.name }}</span><span>·</span><span>{{ workspace.dataset.regionLevel }}</span><span>·</span><span>{{ filledCount }} / {{ workspace.expectedRegionCount }} terisi</span><UBadge
            v-if="isArchived"
            color="warning"
            variant="subtle"
            size="sm"
          >
            Diarsipkan · read-only
          </UBadge>
        </div>

        <UAlert
          v-if="rowErrors.length > 0"
          class="mt-3"
          icon="i-lucide-triangle-alert"
          title="Periksa baris yang ditandai"
          :description="rowErrors.map(error => `${error.regionName} — ${error.message}`).join(' · ')"
          color="error"
          variant="subtle"
        />

        <div v-if="fields.length === 0" class="py-8">
          <UEmpty
            icon="i-lucide-columns-3"
            title="Schema Dataset kosong"
            description="Dataset ini belum memiliki field data yang dapat diisi."
            variant="naked"
          />
        </div>

        <div v-else class="mt-3 overflow-x-auto rounded-lg border border-default">
          <table class="min-w-max w-full divide-y divide-default text-sm">
            <thead class="bg-elevated/45">
              <tr>
                <th class="sticky left-0 z-10 min-w-56 bg-elevated/45 px-3 py-2 text-left text-xs font-medium uppercase tracking-[0.12em] text-muted">
                  Wilayah
                </th><th v-for="field in fields" :key="field.key" class="min-w-44 px-3 py-2 text-left text-xs font-medium text-muted">
                  <span>{{ field.label }}</span><span v-if="field.required" class="ml-1 text-error">*</span>
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-default">
              <tr v-for="row in rows" :key="row.regionId" :class="isRowDirty(row) ? 'bg-primary/5' : ''">
                <td class="sticky left-0 z-10 min-w-56 bg-default px-3 py-2 align-top">
                  <div class="font-medium text-highlighted">
                    {{ row.regionName }}
                  </div><p class="text-xs text-muted">
                    {{ row.regionId }} <span v-if="isRowDirty(row)">· Diubah</span>
                  </p><p v-for="message in errorsByRegionId.get(row.regionId)" :key="message" class="mt-1 text-xs text-error">
                    {{ message }}
                  </p>
                </td>
                <td v-for="field in fields" :key="field.key" class="px-3 py-2 align-top">
                  <USwitch
                    v-if="field.type === 'boolean'"
                    :model-value="Boolean(getFieldValue(row, field))"
                    size="sm"
                    :disabled="!canEditRow(row)"
                    @update:model-value="(value) => setFieldValue(row, field, value)"
                  />
                  <USelectMenu
                    v-else-if="field.type === 'select'"
                    :model-value="String(getFieldValue(row, field) || '')"
                    :items="field.options ?? []"
                    value-key="value"
                    label-key="label"
                    placeholder="Pilih"
                    size="sm"
                    class="w-40"
                    :disabled="!canEditRow(row)"
                    @update:model-value="(value) => setFieldValue(row, field, value)"
                  />
                  <UInput
                    v-else
                    :model-value="String(getFieldValue(row, field) || '')"
                    :type="field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'"
                    :min="field.type === 'number' ? field.validation?.min : undefined"
                    :max="field.type === 'number' ? field.validation?.max : undefined"
                    :step="field.type === 'number' ? getNumberStep(field) : undefined"
                    :minlength="field.type === 'string' ? field.validation?.minLength : undefined"
                    :maxlength="field.type === 'string' ? field.validation?.maxLength : undefined"
                    size="sm"
                    class="w-40"
                    :disabled="!canEditRow(row)"
                    @update:model-value="(value) => setFieldValue(row, field, value)"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="mt-4 flex items-center justify-end gap-2 border-t border-default pt-3">
          <UButton
            label="Tutup"
            color="neutral"
            variant="subtle"
            size="sm"
            @click="open = false"
          /><UButton
            v-if="!isArchived && (canCreate || canUpdate)"
            label="Simpan perubahan"
            icon="i-lucide-save"
            size="sm"
            :disabled="!canSave"
            :loading="saving"
            @click="saveChanges"
          />
        </div>
      </template>
    </template>
  </UModal>
</template>
