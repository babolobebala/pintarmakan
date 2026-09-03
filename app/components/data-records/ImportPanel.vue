<script setup lang="ts">
import type {
  DatasetRecordDatasetOption,
  DatasetRecordImportPreview,
  DatasetRecordImportPreviewRow,
  DatasetRecordImportResult,
  DatasetPeriodWorkspaceResponse
} from '~/types'

type ImportDataset
  = | Pick<DatasetRecordDatasetOption, 'id' | 'name' | 'dataSchema'>
    | DatasetPeriodWorkspaceResponse['dataset']

const props = withDefaults(
  defineProps<{
    dataset: ImportDataset
    periodDate?: string | null
    showPicker?: boolean
  }>(),
  {
    showPicker: true
  }
)

const emit = defineEmits<{
  cancel: []
  imported: [result: DatasetRecordImportResult]
  replaceFile: []
}>()

const toast = useToast()
const selectedFile = defineModel<File | null>('file', { default: null })
const preview = ref<DatasetRecordImportPreview | null>(null)
const submitError = ref('')
const fileValidationError = ref('')
const previewing = ref(false)
const committing = ref(false)
const previewRows = computed(() => preview.value?.rows.slice(0, 20) ?? [])
const isPeriodScoped = computed(() => !!props.periodDate)
const selectedFileType = computed(() => {
  const extension = selectedFile.value?.name.split('.').pop()?.toLowerCase()
  return extension?.toUpperCase() || 'FILE'
})
const selectedFileSize = computed(() => {
  if (!selectedFile.value) {
    return ''
  }

  const sizeInKilobytes = selectedFile.value.size / 1024
  return sizeInKilobytes < 1024
    ? `${Math.max(1, Math.round(sizeInKilobytes))} KB`
    : `${(sizeInKilobytes / 1024).toFixed(1)} MB`
})

const canPreview = computed(
  () => !!selectedFile.value && !fileValidationError.value
)
const canCommit = computed(
  () => canPreview.value && !!preview.value && preview.value.invalidRows === 0
)

function getErrorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'data' in error) {
    const data = error.data

    if (
      data
      && typeof data === 'object'
      && 'statusMessage' in data
      && typeof data.statusMessage === 'string'
    ) {
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
    case 'SKIPPED':
      return 'Dilewati'
    default:
      return 'Tidak valid'
  }
}

function getFormData() {
  if (!selectedFile.value) return null

  const formData = new FormData()
  formData.append('datasetId', props.dataset.id)
  if (props.periodDate) formData.append('periodDate', props.periodDate)
  formData.append('file', selectedFile.value)
  return formData
}

watch(selectedFile, (file) => {
  preview.value = null
  submitError.value = ''
  fileValidationError.value = ''

  if (!file) {
    return
  }

  const extension = file.name.split('.').pop()?.toLowerCase()
  if (extension !== 'csv' && extension !== 'xlsx') {
    fileValidationError.value = 'Pilih file berformat CSV atau XLSX.'
  } else if (file.size > 5 * 1024 * 1024) {
    fileValidationError.value = 'Ukuran file maksimal 5 MB.'
  }
})

async function requestPreview() {
  if (fileValidationError.value) {
    submitError.value = fileValidationError.value
    return
  }

  const formData = getFormData()

  if (!formData) {
    submitError.value = 'Pilih file CSV atau XLSX terlebih dahulu.'
    return
  }

  submitError.value = ''
  previewing.value = true
  try {
    preview.value = await $fetch<DatasetRecordImportPreview>(
      isPeriodScoped.value
        ? '/api/dataset-period-import/preview'
        : '/api/dataset-records/import/preview',
      { method: 'POST', body: formData }
    )
  } catch (error) {
    preview.value = null
    submitError.value = getErrorMessage(error)
  } finally {
    previewing.value = false
  }
}

async function commitImport() {
  const formData = getFormData()
  if (!formData || !canCommit.value) return

  submitError.value = ''
  committing.value = true
  try {
    const result = await $fetch<DatasetRecordImportResult>(
      isPeriodScoped.value
        ? '/api/dataset-period-import/commit'
        : '/api/dataset-records/import/commit',
      { method: 'POST', body: formData }
    )
    toast.add({
      title: 'Import selesai',
      description: `${result.created} baru, ${result.updated} diperbarui, ${result.unchanged} tanpa perubahan.`,
      color: 'success'
    })
    emit('imported', result)
  } catch (error) {
    submitError.value = getErrorMessage(error)
  } finally {
    committing.value = false
  }
}
</script>

<template>
  <div class="space-y-4">
    <UAlert
      v-if="submitError"
      icon="i-lucide-triangle-alert"
      title="Import belum dapat diproses"
      :description="submitError"
      color="error"
      variant="subtle"
    />

    <div
      v-if="selectedFile && !showPicker"
      class="rounded-lg border border-default bg-elevated/30 p-3"
    >
      <p class="text-sm font-medium text-highlighted">
        File yang dipilih
      </p>
      <div class="mt-2 flex flex-wrap items-center gap-3">
        <UIcon
          name="i-lucide-file-spreadsheet"
          class="size-8 shrink-0 text-primary"
        />
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-medium text-highlighted">
            {{ selectedFile.name }}
          </p>
          <p class="text-xs text-muted">
            {{ selectedFileType }} · {{ selectedFileSize }}
          </p>
        </div>
        <div class="flex items-center gap-1">
          <UButton
            label="Ganti file"
            color="neutral"
            variant="ghost"
            size="xs"
            :disabled="previewing || committing"
            @click="emit('replaceFile')"
          />
          <UButton
            aria-label="Hapus file"
            icon="i-lucide-trash-2"
            color="neutral"
            variant="ghost"
            size="xs"
            :disabled="previewing || committing"
            @click="emit('cancel')"
          />
        </div>
      </div>
      <UAlert
        v-if="fileValidationError"
        class="mt-3"
        icon="i-lucide-triangle-alert"
        title="File tidak dapat dipratinjau"
        :description="fileValidationError"
        color="error"
        variant="subtle"
      />
      <div class="mt-3 flex justify-end">
        <UButton
          label="Preview data"
          icon="i-lucide-scan-search"
          :loading="previewing"
          :disabled="!canPreview || committing"
          @click="requestPreview"
        />
      </div>
    </div>

    <div v-else class="space-y-3">
      <UFileUpload
        v-if="showPicker"
        v-model="selectedFile"
        accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        color="neutral"
        icon="i-lucide-upload"
        label="Tarik file ke sini atau pilih file"
        description="XLSX atau CSV · maksimal 5 MB"
        size="lg"
        :ui="{ base: 'min-h-40' }"
      />
      <p v-if="selectedFile" class="text-sm text-muted">
        {{ selectedFile.name }}
      </p>
      <UButton
        label="Pratinjau"
        icon="i-lucide-scan-search"
        :loading="previewing"
        :disabled="!canPreview || committing"
        @click="requestPreview"
      />
    </div>

    <template v-if="preview">
      <div class="rounded-lg border border-default bg-elevated/30 p-3">
        <p class="text-sm font-medium text-highlighted">
          Preview import
        </p>
        <p class="mt-1 text-sm text-muted">
          {{ preview.totalRows }} baris diproses
        </p>
        <p class="mt-1 text-xs text-muted">
          {{ preview.createRows }} akan ditambahkan ·
          {{ preview.updateRows }} akan diperbarui ·
          {{ preview.unchangedRows }} tidak berubah ·
          {{ preview.skippedRows }} dilewati · {{ preview.invalidRows }} error
        </p>
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
              <th class="px-3 py-2 font-medium">
                Baris
              </th>
              <th class="px-3 py-2 font-medium">
                Wilayah
              </th>
              <th class="px-3 py-2 font-medium">
                Periode
              </th>
              <th class="px-3 py-2 font-medium">
                Status
              </th>
              <th class="px-3 py-2 font-medium">
                Aksi
              </th>
              <th class="px-3 py-2 font-medium">
                Kesalahan
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in previewRows"
              :key="row.rowNumber"
              class="border-t border-default"
            >
              <td class="px-3 py-2 text-muted">
                {{ row.rowNumber }}
              </td>
              <td class="px-3 py-2 font-mono text-xs">
                {{ row.regionId || "—" }}
              </td>
              <td class="px-3 py-2">
                {{ row.periodValue || "—" }}
              </td>
              <td class="px-3 py-2">
                {{ row.status || "—" }}
              </td>
              <td class="px-3 py-2">
                <UBadge color="neutral" variant="subtle" size="sm">
                  {{ getActionLabel(row.action) }}
                </UBadge>
              </td>
              <td class="px-3 py-2 text-xs text-error">
                {{ row.errors.join(" ") || "—" }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p
        v-if="preview.rows.length > previewRows.length"
        class="text-xs text-muted"
      >
        Menampilkan 20 dari {{ preview.rows.length }} baris.
      </p>
    </template>

    <div
      v-if="preview || showPicker"
      class="flex justify-end gap-2 border-t border-default pt-4"
    >
      <UButton
        v-if="showPicker"
        label="Batal"
        color="neutral"
        variant="subtle"
        :disabled="previewing || committing"
        @click="emit('cancel')"
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
