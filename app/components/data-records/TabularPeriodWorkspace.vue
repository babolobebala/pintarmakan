<script setup lang="ts">
import TabularImportPanel from './TabularImportPanel.vue'

import type {
  DatasetPeriodWorkspaceField,
  DatasetTablePeriodWorkspaceResponse,
  DatasetTablePeriodWorkspaceRow
} from '~/types'

type RowEditor = {
  id: string | null
  data: Record<string, unknown>
}

type FieldErrors = Record<string, string[]>

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
const workspace = ref<DatasetTablePeriodWorkspaceResponse | null>(null)
const loading = ref(false)
const submitting = ref(false)
const workspaceError = ref('')
const editor = ref<RowEditor | null>(null)
const fieldErrors = ref<FieldErrors>({})
const pendingDeleteRecordId = ref<string | null>(null)
const importFileInput = ref<HTMLInputElement | null>(null)
const importFile = ref<File | null>(null)

const fields = computed(() => workspace.value?.dataset.fields ?? [])
const rows = computed(() => workspace.value?.rows ?? [])
const isArchived = computed(() => !!workspace.value?.dataset.archivedAt)
const canCreate = computed(() => workspace.value?.dataset.permissions.canCreate ?? false)
const canUpdate = computed(() => workspace.value?.dataset.permissions.canUpdate ?? false)
const canDelete = computed(() => workspace.value?.dataset.permissions.canDelete ?? false)
const isEditing = computed(() => !!editor.value?.id)
const editorTitle = computed(() => isEditing.value ? 'Ubah baris' : 'Tambah baris')

function createEmptyData() {
  return Object.fromEntries(
    fields.value.map(field => [field.key, field.type === 'boolean' ? false : ''])
  )
}

function clearFieldError(fieldKey: string) {
  if (!fieldErrors.value[fieldKey]) {
    return
  }

  fieldErrors.value = Object.fromEntries(
    Object.entries(fieldErrors.value).filter(([key]) => key !== fieldKey)
  )
}

function getFieldValue(field: DatasetPeriodWorkspaceField) {
  const value = editor.value?.data[field.key]

  return value === undefined || value === null
    ? field.type === 'boolean' ? false : ''
    : value
}

function setFieldValue(field: DatasetPeriodWorkspaceField, value: unknown) {
  if (!editor.value) {
    return
  }

  editor.value.data[field.key] = value
  clearFieldError(field.key)
}

function getNumberStep(field: DatasetPeriodWorkspaceField) {
  const decimalPlaces = field.validation?.decimalPlaces

  return decimalPlaces === undefined
    ? 'any'
    : decimalPlaces === 0
      ? 1
      : 1 / 10 ** decimalPlaces
}

function getSelectOptions(field: DatasetPeriodWorkspaceField) {
  return field.options ? [...field.options] : []
}

function formatValue(row: DatasetTablePeriodWorkspaceRow, field: DatasetPeriodWorkspaceField) {
  const value = row.data[field.key]

  if (value === undefined || value === null || value === '') {
    return '—'
  }

  if (typeof value === 'boolean') {
    return value ? 'Ya' : 'Tidak'
  }

  if (field.type === 'select' && typeof value === 'string') {
    return field.options?.find(option => option.value === value)?.label ?? value
  }

  return String(value)
}

function openCreateEditor() {
  editor.value = { id: null, data: createEmptyData() }
  fieldErrors.value = {}
}

function openEditEditor(row: DatasetTablePeriodWorkspaceRow) {
  editor.value = {
    id: row.id,
    data: {
      ...createEmptyData(),
      ...row.data
    }
  }
  fieldErrors.value = {}
}

function closeEditor() {
  editor.value = null
  fieldErrors.value = {}
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function applyFieldErrors(error: unknown) {
  if (!isRecord(error) || !isRecord(error.data)) {
    return false
  }

  const payload = isRecord(error.data.data) ? error.data.data : error.data
  const rawFieldErrors = payload.fieldErrors

  if (!Array.isArray(rawFieldErrors)) {
    return false
  }

  const nextErrors: FieldErrors = {}

  for (const item of rawFieldErrors) {
    if (!isRecord(item) || typeof item.key !== 'string' || typeof item.message !== 'string') {
      continue
    }

    nextErrors[item.key] = [...(nextErrors[item.key] ?? []), item.message]
  }

  fieldErrors.value = nextErrors

  return Object.keys(nextErrors).length > 0
}

async function loadWorkspace() {
  if (!props.datasetId || !props.periodDate) {
    return
  }

  loading.value = true
  workspaceError.value = ''

  try {
    workspace.value = await requestFetch<DatasetTablePeriodWorkspaceResponse>(
      '/api/dataset-table-period-workspace',
      {
        query: {
          datasetId: props.datasetId,
          periodDate: props.periodDate
        }
      }
    )
  } catch (error) {
    workspaceError.value = error instanceof Error
      ? error.message
      : 'Ruang kerja periode tidak dapat dimuat.'
  } finally {
    loading.value = false
  }
}

async function saveEditor() {
  if (!workspace.value || !editor.value || submitting.value || isArchived.value) {
    return
  }

  submitting.value = true
  fieldErrors.value = {}

  try {
    const row = editor.value
    const isEdit = !!row.id

    await $fetch(
      isEdit ? `/api/dataset-table-records/${row.id}` : '/api/dataset-table-records',
      {
        method: isEdit ? 'PATCH' : 'POST',
        body: {
          datasetId: workspace.value.dataset.id,
          periodDate: workspace.value.periodDate,
          data: row.data
        }
      }
    )

    closeEditor()
    await loadWorkspace()
    emit('saved')
    toast.add({
      title: isEdit ? 'Baris diperbarui' : 'Baris ditambahkan',
      color: 'success'
    })
  } catch (error) {
    if (applyFieldErrors(error)) {
      toast.add({
        title: 'Periksa nilai baris',
        description: 'Beberapa field belum valid.',
        color: 'error'
      })
      return
    }

    toast.add({
      title: 'Baris tidak dapat disimpan',
      description: error instanceof Error ? error.message : 'Silakan coba lagi.',
      color: 'error'
    })
  } finally {
    submitting.value = false
  }
}

async function deleteRow(row: DatasetTablePeriodWorkspaceRow) {
  if (!workspace.value || submitting.value || isArchived.value) {
    return
  }

  submitting.value = true

  try {
    await $fetch(`/api/dataset-table-records/${row.id}`, {
      method: 'DELETE',
      query: {
        datasetId: workspace.value.dataset.id,
        periodDate: workspace.value.periodDate
      }
    })

    pendingDeleteRecordId.value = null
    await loadWorkspace()
    emit('saved')
    toast.add({ title: 'Baris dihapus', color: 'success' })
  } catch (error) {
    toast.add({
      title: 'Baris tidak dapat dihapus',
      description: error instanceof Error ? error.message : 'Silakan coba lagi.',
      color: 'error'
    })
  } finally {
    submitting.value = false
  }
}

function openImportPicker() {
  if (importFileInput.value) {
    importFileInput.value.value = ''
  }

  importFileInput.value?.click()
}

function handleImportFile(event: Event) {
  const input = event.target as HTMLInputElement
  importFile.value = input.files?.[0] ?? null
}

function clearImport() {
  importFile.value = null

  if (importFileInput.value) {
    importFileInput.value.value = ''
  }
}

async function handleImported() {
  clearImport()
  await loadWorkspace()
  emit('saved')
}

function downloadSpreadsheet(kind: 'template' | 'export') {
  if (!workspace.value || !import.meta.client) {
    return
  }

  const endpoint = kind === 'template'
    ? '/api/dataset-table-period-template'
    : '/api/dataset-table-period-export'
  const query = new URLSearchParams({
    datasetId: workspace.value.dataset.id,
    periodDate: workspace.value.periodDate
  })

  window.open(`${endpoint}?${query.toString()}`, '_blank', 'noopener')
}

watch([() => props.datasetId, () => props.periodDate], () => {
  closeEditor()
  pendingDeleteRecordId.value = null
  clearImport()
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
      />
      <UButton
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
        <span>{{ workspace.dataset.name }}</span><span>·</span><span>{{ rows.length }} data</span><UBadge
          v-if="isArchived"
          color="warning"
          variant="subtle"
          size="sm"
        >
          Diarsipkan · read-only
        </UBadge>
      </div>

      <div class="mt-3 flex flex-wrap items-center gap-2">
        <UButton
          label="Tambah Baris"
          icon="i-lucide-plus"
          size="sm"
          class="cursor-pointer"
          :disabled="isArchived || !canCreate"
          @click="openCreateEditor"
        />
        <UButton
          v-if="!isArchived && (canCreate || canUpdate)"
          label="Import"
          icon="i-lucide-upload"
          color="neutral"
          variant="outline"
          size="sm"
          class="cursor-pointer"
          @click="openImportPicker"
        />
        <UButton
          label="Export data"
          icon="i-lucide-download"
          color="neutral"
          variant="outline"
          size="sm"
          class="cursor-pointer"
          @click="downloadSpreadsheet('export')"
        />
        <UButton
          label="Unduh template"
          icon="i-lucide-file-down"
          color="neutral"
          variant="outline"
          size="sm"
          class="cursor-pointer"
          @click="downloadSpreadsheet('template')"
        />
      </div>

      <input
        ref="importFileInput"
        type="file"
        accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        class="hidden"
        @change="handleImportFile"
      >

      <TabularImportPanel
        v-if="importFile"
        v-model:file="importFile"
        class="mt-3 rounded-lg border border-default p-3"
        :dataset="workspace.dataset"
        :period-date="workspace.periodDate"
        @cancel="clearImport"
        @imported="handleImported"
        @replace-file="openImportPicker"
      />

      <form v-if="editor" class="space-y-4 rounded-xl border border-default bg-elevated/25 p-4" @submit.prevent="saveEditor">
        <div class="flex items-center justify-between gap-3">
          <div>
            <h3 class="text-sm font-semibold text-highlighted">
              {{ editorTitle }}
            </h3>
            <p class="mt-1 text-xs text-muted">
              Periode {{ workspace.periodDate }}
            </p>
          </div>
          <UButton
            label="Tutup"
            color="neutral"
            variant="subtle"
            size="sm"
            @click="closeEditor"
          />
        </div>

        <div class="grid gap-4 lg:grid-cols-2">
          <div v-for="field in fields" :key="field.key" class="space-y-2">
            <div class="flex items-center gap-2">
              <p class="text-sm font-medium text-highlighted">
                {{ field.label }}
              </p>
              <UBadge
                v-if="field.required"
                color="neutral"
                variant="subtle"
                size="sm"
              >
                Wajib
              </UBadge>
            </div>

            <USwitch
              v-if="field.type === 'boolean'"
              :model-value="Boolean(getFieldValue(field))"
              @update:model-value="(value) => setFieldValue(field, value)"
            />
            <USelectMenu
              v-else-if="field.type === 'select'"
              :model-value="String(getFieldValue(field))"
              :items="getSelectOptions(field)"
              value-key="value"
              label-key="label"
              placeholder="Pilih nilai"
              class="w-full"
              @update:model-value="(value) => setFieldValue(field, value)"
            />
            <UTextarea
              v-else-if="field.type === 'textarea'"
              :model-value="String(getFieldValue(field))"
              class="w-full"
              :rows="3"
              @update:model-value="(value) => setFieldValue(field, value)"
            />
            <UInput
              v-else
              :model-value="String(getFieldValue(field))"
              :type="field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'"
              :min="field.type === 'number' ? field.validation?.min : undefined"
              :max="field.type === 'number' ? field.validation?.max : undefined"
              :step="field.type === 'number' ? getNumberStep(field) : undefined"
              class="w-full"
              @update:model-value="(value) => setFieldValue(field, value)"
            />
            <p v-for="message in fieldErrors[field.key]" :key="message" class="text-xs text-error">
              {{ message }}
            </p>
          </div>
        </div>

        <div class="flex justify-end gap-2 border-t border-default pt-3">
          <UButton
            label="Batal"
            color="neutral"
            variant="subtle"
            @click="closeEditor"
          />
          <UButton :label="isEditing ? 'Simpan perubahan' : 'Simpan baris'" type="submit" :loading="submitting" />
        </div>
      </form>

      <div class="mt-3 overflow-x-auto rounded-lg border border-default">
        <table class="w-full min-w-max divide-y divide-default text-sm">
          <thead class="bg-elevated/35">
            <tr>
              <th v-for="field in fields" :key="field.key" class="px-3 py-2 text-left text-xs font-medium tracking-[0.12em] text-muted uppercase">
                {{ field.label }}
              </th>
              <th class="sticky right-0 bg-elevated/35 px-3 py-2 text-right text-xs font-medium tracking-[0.12em] text-muted uppercase">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-default">
            <tr v-if="rows.length === 0">
              <td :colspan="fields.length + 1" class="px-3 py-10 text-center text-sm text-muted">
                Belum ada data pada periode ini.
              </td>
            </tr>
            <tr v-for="row in rows" :key="row.id">
              <td v-for="field in fields" :key="field.key" class="max-w-64 px-3 py-2 text-muted">
                {{ formatValue(row, field) }}
              </td>
              <td class="sticky right-0 bg-default px-3 py-2 text-right">
                <div v-if="pendingDeleteRecordId === row.id" class="inline-flex items-center justify-end gap-1">
                  <span class="mr-1 text-xs text-muted">Hapus?</span>
                  <UButton
                    label="Ya"
                    color="error"
                    size="xs"
                    :loading="submitting"
                    @click="deleteRow(row)"
                  />
                  <UButton
                    label="Batal"
                    color="neutral"
                    variant="subtle"
                    size="xs"
                    @click="pendingDeleteRecordId = null"
                  />
                </div>
                <div v-else class="inline-flex gap-1">
                  <UButton
                    icon="i-lucide-pencil"
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    aria-label="Ubah baris"
                    :disabled="isArchived || !canUpdate"
                    @click="openEditEditor(row)"
                  />
                  <UButton
                    icon="i-lucide-trash-2"
                    color="error"
                    variant="ghost"
                    size="xs"
                    aria-label="Hapus baris"
                    :disabled="isArchived || !canDelete"
                    @click="pendingDeleteRecordId = row.id"
                  />
                </div>
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
          @click="emit('close')"
        />
      </div>
    </template>
  </div>
</template>
