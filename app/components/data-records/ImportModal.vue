<script setup lang="ts">
import type {
  DatasetRecordDatasetOption,
  DatasetRecordImportPreview,
  DatasetRecordImportPreviewRow,
  DatasetRecordImportResult
} from '~/types'

import { getDatasetSchemaFields } from '~~/shared/datasets'

const props = defineProps<{
  dataset: DatasetRecordDatasetOption
}>()

const emit = defineEmits<{
  imported: [result: DatasetRecordImportResult]
}>()

const open = defineModel<boolean>('open', { default: false })
const toast = useToast()
const fileInput = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)
const preview = ref<DatasetRecordImportPreview | null>(null)
const submitError = ref('')
const previewing = ref(false)
const committing = ref(false)
const previewRows = computed(() => preview.value?.rows.slice(0, 20) ?? [])
const fieldKeys = computed(() => getDatasetSchemaFields(props.dataset.dataSchema).map(field => field.key))
const headerExample = computed(() => ['regionId', 'period', 'status', ...fieldKeys.value].join(', '))
const canCommit = computed(() => !!selectedFile.value && !!preview.value && preview.value.invalidRows === 0)

function getErrorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'data' in error) {
    const data = error.data

    if (data && typeof data === 'object' && 'statusMessage' in data && typeof data.statusMessage === 'string') {
      return data.statusMessage
    }
  }

  return error instanceof Error ? error.message : 'Silakan coba lagi.'
}

function getActionLabel(action: DatasetRecordImportPreviewRow['action']) {
  switch (action) {
    case 'CREATE':
      return 'Baru'
    case 'UPDATE':
      return 'Perbarui'
    case 'UNCHANGED':
      return 'Tanpa perubahan'
    default:
      return 'Tidak valid'
  }
}

function getFormData() {
  if (!selectedFile.value) {
    return null
  }

  const formData = new FormData()
  formData.append('datasetId', props.dataset.id)
  formData.append('file', selectedFile.value)

  return formData
}

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  selectedFile.value = input.files?.[0] ?? null
  preview.value = null
  submitError.value = ''
}

async function requestPreview() {
  const formData = getFormData()

  if (!formData) {
    submitError.value = 'Pilih file CSV atau XLSX terlebih dahulu.'
    return
  }

  submitError.value = ''
  previewing.value = true

  try {
    preview.value = await $fetch<DatasetRecordImportPreview>('/api/dataset-records/import/preview', {
      method: 'POST',
      body: formData
    })
  } catch (error) {
    preview.value = null
    submitError.value = getErrorMessage(error)
  } finally {
    previewing.value = false
  }
}

async function commitImport() {
  const formData = getFormData()

  if (!formData || !canCommit.value) {
    return
  }

  submitError.value = ''
  committing.value = true

  try {
    const result = await $fetch<DatasetRecordImportResult>('/api/dataset-records/import/commit', {
      method: 'POST',
      body: formData
    })

    toast.add({
      title: 'Import selesai',
      description: `${result.created} baru, ${result.updated} diperbarui, ${result.unchanged} tanpa perubahan.`,
      color: 'success'
    })
    emit('imported', result)
    open.value = false
  } catch (error) {
    submitError.value = getErrorMessage(error)
  } finally {
    committing.value = false
  }
}

watch(open, (isOpen) => {
  if (!isOpen) {
    selectedFile.value = null
    preview.value = null
    submitError.value = ''

    if (fileInput.value) {
      fileInput.value.value = ''
    }
  }
})
</script>

<template>
  <UModal
    v-model:open="open"
    title="Import data"
    :description="`Pratinjau dan impor data ke ${dataset.name}. Tidak ada data yang ditulis sebelum konfirmasi.`"
    :ui="{ content: 'sm:max-w-6xl' }"
  >
    <UButton
      label="Import"
      icon="i-lucide-upload"
      color="neutral"
      variant="outline"
      size="sm"
    />

    <template #body>
      <div class="space-y-4">
        <UAlert
          icon="i-lucide-file-spreadsheet"
          title="Format file"
          :description="`Gunakan CSV atau XLSX (worksheet pertama, maksimal 5 MB / 500 baris). Header wajib: ${headerExample}. Kolom status opsional dan default ke draft.`"
          color="neutral"
          variant="subtle"
        />

        <UAlert
          v-if="submitError"
          icon="i-lucide-triangle-alert"
          title="Import belum dapat diproses"
          :description="submitError"
          color="error"
          variant="subtle"
        />

        <div class="flex flex-wrap items-end gap-3">
          <div class="min-w-72 flex-1 space-y-1">
            <label class="text-sm font-medium text-highlighted" for="dataset-record-import-file">
              File impor
            </label>
            <input
              id="dataset-record-import-file"
              ref="fileInput"
              type="file"
              accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              class="block w-full text-sm text-muted file:mr-3 file:rounded-md file:border-0 file:bg-elevated file:px-3 file:py-2 file:text-sm file:font-medium file:text-highlighted hover:file:bg-accented"
              @change="onFileChange"
            >
          </div>
          <UButton
            label="Pratinjau"
            icon="i-lucide-scan-search"
            :loading="previewing"
            :disabled="!selectedFile || committing"
            @click="requestPreview"
          />
        </div>

        <template v-if="preview">
          <div class="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
            <div class="rounded-lg border border-default p-3 text-center">
              <p class="text-xs text-muted">Total</p>
              <p class="text-lg font-semibold text-highlighted">{{ preview.totalRows }}</p>
            </div>
            <div class="rounded-lg border border-default p-3 text-center">
              <p class="text-xs text-muted">Valid</p>
              <p class="text-lg font-semibold text-success">{{ preview.validRows }}</p>
            </div>
            <div class="rounded-lg border border-default p-3 text-center">
              <p class="text-xs text-muted">Tidak valid</p>
              <p class="text-lg font-semibold text-error">{{ preview.invalidRows }}</p>
            </div>
            <div class="rounded-lg border border-default p-3 text-center">
              <p class="text-xs text-muted">Baru</p>
              <p class="text-lg font-semibold text-highlighted">{{ preview.createRows }}</p>
            </div>
            <div class="rounded-lg border border-default p-3 text-center">
              <p class="text-xs text-muted">Perbarui</p>
              <p class="text-lg font-semibold text-highlighted">{{ preview.updateRows }}</p>
            </div>
            <div class="rounded-lg border border-default p-3 text-center">
              <p class="text-xs text-muted">Tetap</p>
              <p class="text-lg font-semibold text-muted">{{ preview.unchangedRows }}</p>
            </div>
          </div>

          <UAlert
            v-if="preview.invalidRows > 0"
            icon="i-lucide-circle-x"
            title="Perbaiki semua baris tidak valid sebelum impor"
            description="Tabel di bawah menampilkan kesalahan per baris. Tidak ada perubahan yang akan disimpan."
            color="error"
            variant="subtle"
          />

          <div class="overflow-x-auto rounded-lg border border-default">
            <table class="w-full min-w-190 text-left text-sm">
              <thead class="bg-elevated/60 text-xs text-muted">
                <tr>
                  <th class="px-3 py-2 font-medium">Baris</th>
                  <th class="px-3 py-2 font-medium">Wilayah</th>
                  <th class="px-3 py-2 font-medium">Periode</th>
                  <th class="px-3 py-2 font-medium">Status</th>
                  <th class="px-3 py-2 font-medium">Aksi</th>
                  <th class="px-3 py-2 font-medium">Kesalahan</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in previewRows" :key="row.rowNumber" class="border-t border-default">
                  <td class="px-3 py-2 text-muted">{{ row.rowNumber }}</td>
                  <td class="px-3 py-2 font-mono text-xs">{{ row.regionId || '—' }}</td>
                  <td class="px-3 py-2">{{ row.periodValue || '—' }}</td>
                  <td class="px-3 py-2">{{ row.status || '—' }}</td>
                  <td class="px-3 py-2">
                    <UBadge color="neutral" variant="subtle" size="sm">
                      {{ getActionLabel(row.action) }}
                    </UBadge>
                  </td>
                  <td class="px-3 py-2 text-xs text-error">
                    {{ row.errors.join(' ') || '—' }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-if="preview.rows.length > previewRows.length" class="text-xs text-muted">
            Menampilkan 20 dari {{ preview.rows.length }} baris.
          </p>
        </template>

        <div class="flex justify-end gap-2 border-t border-default pt-4">
          <UButton
            label="Batal"
            color="neutral"
            variant="subtle"
            :disabled="previewing || committing"
            @click="open = false"
          />
          <UButton
            label="Konfirmasi impor"
            icon="i-lucide-circle-check"
            :loading="committing"
            :disabled="!canCommit || previewing"
            @click="commitImport"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>
