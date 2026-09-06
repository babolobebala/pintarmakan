<script setup lang="ts">
import type {
  DatasetWorkbookImportAction,
  DatasetWorkbookImportPreview,
  DatasetWorkbookImportResult
} from '~/types'

const props = defineProps<{
  dataset: {
    id: string
    name: string
  }
}>()

const emit = defineEmits<{
  imported: [result: DatasetWorkbookImportResult]
}>()

const open = defineModel<boolean>('open', { default: false })
const toast = useToast()
const selectedFile = ref<File | null>(null)
const preview = ref<DatasetWorkbookImportPreview | null>(null)
const submitError = ref('')
const fileValidationError = ref('')
const previewing = ref(false)
const committing = ref(false)
const canCommit = computed(() => !!preview.value && preview.value.invalidRows === 0)

function getErrorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'data' in error) {
    const data = error.data

    if (data && typeof data === 'object' && 'statusMessage' in data && typeof data.statusMessage === 'string') {
      return data.statusMessage
    }
  }

  return error instanceof Error ? error.message : 'Silakan coba lagi.'
}

function getActionLabel(action: DatasetWorkbookImportAction) {
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

function reset() {
  selectedFile.value = null
  preview.value = null
  submitError.value = ''
  fileValidationError.value = ''
}

function close() {
  open.value = false
  reset()
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

watch(selectedFile, (file) => {
  preview.value = null
  submitError.value = ''
  fileValidationError.value = ''

  if (!file) {
    return
  }

  const extension = file.name.split('.').pop()?.toLowerCase()

  if (extension !== 'xlsx') {
    fileValidationError.value = 'Import banyak periode hanya mendukung file XLSX.'
  } else if (file.size > 5 * 1024 * 1024) {
    fileValidationError.value = 'Ukuran file maksimal 5 MB.'
  }
})

async function requestPreview() {
  const formData = getFormData()

  if (!formData || fileValidationError.value) {
    if (!fileValidationError.value) submitError.value = 'Pilih file XLSX terlebih dahulu.'
    return
  }

  previewing.value = true
  try {
    preview.value = await $fetch<DatasetWorkbookImportPreview>(
      '/api/dataset-workbook-import/preview',
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

  if (!formData || !canCommit.value) {
    return
  }

  submitError.value = ''
  committing.value = true
  try {
    const result = await $fetch<DatasetWorkbookImportResult>(
      '/api/dataset-workbook-import/commit',
      { method: 'POST', body: formData }
    )
    toast.add({
      title: 'Import selesai',
      description: `${result.created} baru, ${result.updated} diperbarui, ${result.unchanged} tanpa perubahan.`,
      color: 'success'
    })
    emit('imported', result)
    close()
  } catch (error) {
    submitError.value = getErrorMessage(error)
  } finally {
    committing.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Import data Dataset"
    description="Satu worksheet XLSX untuk setiap periode. Nama worksheet harus mengikuti periode Dataset."
    :ui="{ content: 'sm:max-w-4xl' }"
    @update:open="value => !value && reset()"
  >
    <template #body>
      <div class="space-y-4">
        <UAlert
          v-if="submitError || fileValidationError"
          icon="i-lucide-triangle-alert"
          title="Import belum dapat diproses"
          :description="fileValidationError || submitError"
          color="error"
          variant="subtle"
        />

        <UFileUpload
          v-model="selectedFile"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          color="neutral"
          icon="i-lucide-upload"
          label="Tarik workbook XLSX ke sini atau pilih file"
          description="Maksimal 5 MB · maksimal 500 baris data per worksheet"
          size="lg"
          :ui="{ base: 'min-h-36' }"
        />

        <div class="flex justify-end">
          <UButton
            label="Pratinjau"
            icon="i-lucide-scan-search"
            :loading="previewing"
            :disabled="!selectedFile || !!fileValidationError || committing"
            @click="requestPreview"
          />
        </div>

        <template v-if="preview">
          <div class="rounded-lg border border-default bg-elevated/30 p-3">
            <p class="text-sm font-medium text-highlighted">
              {{ preview.sheets.length }} periode · {{ preview.totalRows }} baris
            </p>
            <p class="mt-1 text-xs text-muted">
              {{ preview.createRows }} baru · {{ preview.updateRows }} diperbarui ·
              {{ preview.unchangedRows }} tanpa perubahan · {{ preview.invalidRows }} error
            </p>
          </div>

          <UAlert
            v-if="preview.invalidRows > 0"
            icon="i-lucide-circle-x"
            title="Perbaiki semua baris tidak valid sebelum impor"
            description="Workbook akan disimpan sekaligus atau tidak sama sekali."
            color="error"
            variant="subtle"
          />

          <div v-for="sheet in preview.sheets" :key="sheet.sheetName" class="rounded-lg border border-default">
            <div class="flex flex-wrap items-center justify-between gap-2 border-b border-default bg-elevated/30 px-3 py-2">
              <div>
                <p class="text-sm font-medium text-highlighted">
                  {{ sheet.sheetName }}
                </p>
                <p class="text-xs text-muted">
                  Periode {{ sheet.periodDate }} · {{ sheet.createRows }} baru · {{ sheet.updateRows }} diperbarui ·
                  {{ sheet.unchangedRows }} tanpa perubahan · {{ sheet.invalidRows }} error
                </p>
              </div>
              <UBadge color="neutral" variant="subtle" size="sm">
                {{ sheet.totalRows }} baris
              </UBadge>
            </div>
            <div v-if="sheet.rows.length" class="overflow-x-auto">
              <table class="w-full min-w-150 text-left text-xs">
                <thead class="text-muted">
                  <tr>
                    <th class="px-3 py-2 font-medium">
                      Baris
                    </th>
                    <th class="px-3 py-2 font-medium">
                      Identitas
                    </th>
                    <th class="px-3 py-2 font-medium">
                      Aksi
                    </th>
                    <th class="px-3 py-2 font-medium">
                      Kesalahan
                    </th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-default">
                  <tr
                    v-for="row in sheet.rows.slice(0, 20)"
                    :key="`${sheet.sheetName}-${row.rowNumber}`"
                  >
                    <td class="px-3 py-2 text-muted">
                      {{ row.rowNumber }}
                    </td>
                    <td class="px-3 py-2">
                      {{ row.regionName || row.recordId || '—' }}
                    </td>
                    <td class="px-3 py-2">
                      {{ getActionLabel(row.action) }}
                    </td>
                    <td class="px-3 py-2 text-error">
                      {{ row.errors.join(' ') || '—' }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </template>
      </div>
    </template>

    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton
          label="Batal"
          color="neutral"
          variant="subtle"
          :disabled="previewing || committing"
          @click="close"
        />
        <UButton
          label="Konfirmasi impor"
          icon="i-lucide-circle-check"
          :loading="committing"
          :disabled="!canCommit || previewing"
          @click="commitImport"
        />
      </div>
    </template>
  </UModal>
</template>
