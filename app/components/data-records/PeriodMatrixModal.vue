<script setup lang="ts">
import PeriodMatrixWorkspace from './PeriodMatrixWorkspace.vue'

defineProps<{
  datasetId: string
  periodDate: string | null
  periodLabel: string
}>()

const emit = defineEmits<{
  saved: []
}>()

const open = defineModel<boolean>('open', { default: false })
</script>

<template>
  <UModal
    v-model:open="open"
    title="Kelola data periode"
    :description="periodLabel || 'Memuat ruang kerja periode...'"
    :ui="{ content: 'sm:max-w-[calc(100vw-2rem)]' }"
  >
    <template #body>
      <PeriodMatrixWorkspace
        :dataset-id="datasetId"
        :period-date="periodDate ?? ''"
        @close="open = false"
        @saved="emit('saved')"
      />
    </template>
  </UModal>
</template>
