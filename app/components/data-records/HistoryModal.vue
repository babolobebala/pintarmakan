<script setup lang="ts">
import type { DatasetRecordHistoryContext, DatasetRecordHistoryItem } from '~/types'
import type { DatasetSchemaField } from '~~/shared/datasets'

import { getDatasetSchemaFields } from '~~/shared/datasets'

const props = defineProps<{
  record: DatasetRecordHistoryContext
  dataSchema: Record<string, unknown>
}>()

const open = defineModel<boolean>('open', { default: false })
const history = ref<DatasetRecordHistoryItem[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const fields = computed(() => getDatasetSchemaFields(props.dataSchema))
const dateTimeFormatter = new Intl.DateTimeFormat('id-ID', {
  dateStyle: 'medium',
  timeStyle: 'short'
})

async function loadHistory() {
  const recordId = props.record.id

  loading.value = true
  error.value = null
  history.value = []

  try {
    const result = await $fetch<DatasetRecordHistoryItem[]>(`/api/dataset-records/${recordId}/history`)

    if (open.value && props.record.id === recordId) {
      history.value = result
    }
  } catch (requestError) {
    if (open.value && props.record.id === recordId) {
      error.value = requestError instanceof Error
        ? requestError.message
        : 'Riwayat perubahan tidak dapat dimuat.'
    }
  } finally {
    if (props.record.id === recordId) {
      loading.value = false
    }
  }
}

watch(open, (isOpen) => {
  if (isOpen) {
    loadHistory()
  }
})

function formatDateTime(value: string) {
  return dateTimeFormatter.format(new Date(value))
}

function getChangeTypeLabel(changeType: string) {
  return changeType === 'DELETE' ? 'Dihapus' : 'Diperbarui'
}

function getChangeTypeColor(changeType: string) {
  return changeType === 'DELETE' ? 'error' : 'info'
}

function getDisplayFields(data: Record<string, unknown>) {
  const knownKeys = new Set(fields.value.map(field => field.key))
  const historicalOnlyFields = Object.keys(data)
    .filter(key => !knownKeys.has(key))
    .map(key => ({ key, label: key }))

  return [...fields.value, ...historicalOnlyFields]
}

function formatFieldValue(data: Record<string, unknown>, field: {
  key: string
  type?: DatasetSchemaField['type']
  options?: DatasetSchemaField['options']
}) {
  const value = data[field.key]

  if (typeof value === 'boolean') {
    return value ? 'Ya' : 'Tidak'
  }

  if (field.type === 'select' && typeof value === 'string') {
    return field.options?.find(option => option.value === value)?.label ?? value
  }

  return value === undefined || value === null || value === ''
    ? '—'
    : String(value)
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Riwayat Perubahan"
    :description="`${record.regionName} · ${record.periodLabel}`"
  >
    <template #body>
      <div class="space-y-4">
        <div class="rounded-xl border border-default/70 bg-elevated/20 px-3 py-2">
          <p class="text-sm font-medium text-highlighted">
            {{ record.datasetId }}
          </p>
          <p class="text-xs text-muted">
            {{ record.regionName }} · {{ record.periodLabel }}
          </p>
        </div>

        <div v-if="loading" class="space-y-3">
          <div class="h-20 rounded-xl bg-elevated/70" />
          <div class="h-20 rounded-xl bg-elevated/50" />
        </div>

        <UAlert
          v-else-if="error"
          icon="i-lucide-circle-alert"
          title="Riwayat tidak dapat dimuat"
          :description="error"
          color="error"
          variant="subtle"
        />

        <UEmpty
          v-else-if="history.length === 0"
          icon="i-lucide-history"
          title="Tidak ada riwayat perubahan"
          description="Belum ada riwayat perubahan."
          variant="naked"
        />

        <div v-else class="space-y-3">
          <article
            v-for="entry in history"
            :key="entry.id"
            class="rounded-xl border border-default p-3"
          >
            <div class="flex flex-wrap items-start justify-between gap-2">
              <div class="flex items-center gap-2">
                <UBadge :color="getChangeTypeColor(entry.changeType)" variant="subtle" size="sm">
                  {{ getChangeTypeLabel(entry.changeType) }}
                </UBadge>
                <span class="text-xs text-muted">{{ formatDateTime(entry.changedAt) }}</span>
              </div>
              <span class="text-xs text-muted">
                {{ entry.changedByName ?? 'Pengguna tidak tersedia' }}
              </span>
            </div>

            <div class="mt-3 space-y-3">
              <div>
                <p class="text-xs font-medium tracking-[0.14em] text-muted uppercase">
                  Status sebelumnya
                </p>
                <UBadge class="mt-1" color="neutral" variant="subtle" size="sm">
                  {{ entry.status }}
                </UBadge>
              </div>

              <div>
                <p class="text-xs font-medium tracking-[0.14em] text-muted uppercase">
                  Data sebelumnya
                </p>
                <dl v-if="getDisplayFields(entry.data).length" class="mt-2 grid gap-2 sm:grid-cols-2">
                  <div
                    v-for="field in getDisplayFields(entry.data)"
                    :key="field.key"
                    class="rounded-lg bg-elevated/45 px-2.5 py-2"
                  >
                    <dt class="text-xs text-muted">{{ field.label }}</dt>
                    <dd class="mt-0.5 break-words text-sm text-highlighted">
                      {{ formatFieldValue(entry.data, field) }}
                    </dd>
                  </div>
                </dl>
                <p v-else class="mt-1 text-sm text-muted">
                  Tidak ada nilai data sebelumnya.
                </p>
              </div>
            </div>
          </article>
        </div>
      </div>
    </template>
  </UModal>
</template>
