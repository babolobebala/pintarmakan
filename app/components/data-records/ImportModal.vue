<script setup lang="ts">
import type {
  DatasetRecordDatasetOption,
  DatasetRecordImportResult,
  DatasetPeriodWorkspaceResponse
} from '~/types'

type ImportDataset = Pick<DatasetRecordDatasetOption, 'id' | 'name' | 'dataSchema'>
  | DatasetPeriodWorkspaceResponse['dataset']

withDefaults(defineProps<{
  dataset: ImportDataset
  periodDate?: string | null
  showTrigger?: boolean
}>(), {
  showTrigger: true
})

const emit = defineEmits<{
  imported: [result: DatasetRecordImportResult]
}>()

const open = defineModel<boolean>('open', { default: false })

function handleImported(result: DatasetRecordImportResult) {
  emit('imported', result)
  open.value = false
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Import data"
    :description="`Pratinjau dan impor data ke ${dataset.name}. Tidak ada data yang ditulis sebelum konfirmasi.`"
    :ui="{ content: 'sm:max-w-6xl' }"
  >
    <UButton
      v-if="showTrigger"
      label="Import"
      icon="i-lucide-upload"
      color="neutral"
      variant="outline"
      size="sm"
    />

    <template #body>
      <ImportPanel
        :dataset="dataset"
        :period-date="periodDate"
        @cancel="open = false"
        @imported="handleImported"
      />
    </template>
  </UModal>
</template>
