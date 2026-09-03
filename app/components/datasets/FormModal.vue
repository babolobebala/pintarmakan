<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { BidangOption, DatasetManagementItem } from '~/types'

import {
  datasetIdPattern,
  datasetIdValidationMessage,
  canonicalDatasetModes,
  formatDatasetJsonValue,
  getDatasetInterpretation,
  getDatasetMode,
  getDatasetSource,
  mergeDatasetConfigMetadata,
  parseDatasetJsonInput,
  type DatasetMode
} from '~~/shared/datasets'

const props = withDefaults(defineProps<{
  dataset?: DatasetManagementItem | null
  showTrigger?: boolean
}>(), {
  dataset: null,
  showTrigger: true
})

const emit = defineEmits<{
  created: []
  updated: []
}>()

const open = defineModel<boolean>('open', { default: false })
const toast = useToast()
const isEdit = computed(() => !!props.dataset)
const {
  data: bidangs,
  error: bidangsError,
  status: bidangsStatus
} = await useFetch<BidangOption[]>('/api/bidang/options', {
  default: () => []
})
const bidangItems = computed(() => {
  return bidangs.value.map(bidang => ({
    id: bidang.id,
    name: bidang.name,
    description: bidang.description ?? undefined
  }))
})
const isLoadingBidangs = computed(() => bidangsStatus.value === 'pending')

const schema = z.object({
  id: z.string()
    .trim()
    .min(1, 'Dataset ID is required.')
    .max(191, 'Dataset ID is too long.')
    .regex(datasetIdPattern, datasetIdValidationMessage),
  ownerBidangId: z.string()
    .trim()
    .min(1, 'Owner Bidang is required.')
    .max(191, 'Owner Bidang is too long.'),
  name: z.string()
    .trim()
    .min(1, 'Dataset name is required.')
    .max(191, 'Dataset name is too long.'),
  description: z.string().max(65535, 'Description is too long.'),
  mode: z.enum(canonicalDatasetModes),
  source: z.string(),
  interpretation: z.string(),
  dataSchema: z.string().superRefine((value, ctx) => {
    try {
      parseDatasetJsonInput(value, 'Data schema')
    } catch (error) {
      ctx.addIssue({
        code: 'custom',
        message: error instanceof Error ? error.message : 'Data schema must be valid JSON.'
      })
    }
  }),
  dataConfig: z.string().superRefine((value, ctx) => {
    try {
      parseDatasetJsonInput(value, 'Data config')
    } catch (error) {
      ctx.addIssue({
        code: 'custom',
        message: error instanceof Error ? error.message : 'Data config must be valid JSON.'
      })
    }
  })
})

type Schema = z.output<typeof schema>

const modeItems: { value: DatasetMode, label: string }[] = [
  { value: 'REGIONAL', label: 'Regional' },
  { value: 'TABULAR', label: 'Tabular' }
]

function normalizeDataConfigMode(dataConfig: Record<string, unknown>, mode: DatasetMode) {
  const normalized: Record<string, unknown> = { ...dataConfig, mode }

  if (mode === 'TABULAR') {
    delete normalized.regionLevel
  }

  return normalized
}

const state = reactive<Schema>({
  id: '',
  ownerBidangId: '',
  name: '',
  description: '',
  mode: 'REGIONAL',
  source: '',
  interpretation: '',
  dataSchema: formatDatasetJsonValue({}),
  dataConfig: formatDatasetJsonValue({ version: 1, mode: 'REGIONAL' })
})

const loading = ref(false)
const modalTitle = computed(() => isEdit.value ? 'Ubah dataset' : 'Tambah dataset')
const modalDescription = computed(() => {
  return isEdit.value
    ? 'Perbarui metadata dan konfigurasi JSON untuk dataset yang sudah ada.'
    : 'Buat definisi dataset baru dengan ID teknis yang stabil.'
})
const submitLabel = computed(() => isEdit.value ? 'Simpan perubahan' : 'Tambah dataset')
const isModeLocked = computed(() => isEdit.value && props.dataset?.canChangeMode === false)
const modeDescription = computed(() => isModeLocked.value
  ? 'Mode tidak dapat diubah karena Dataset sudah memiliki data atau riwayat data.'
  : 'Menentukan kontrak penyimpanan record Dataset.'
)

function syncState() {
  if (props.dataset) {
    state.id = props.dataset.id
    state.ownerBidangId = props.dataset.ownerBidangId
    state.name = props.dataset.name
    state.description = props.dataset.description ?? ''
    state.mode = getDatasetMode(props.dataset.dataConfig) ?? 'REGIONAL'
    state.source = getDatasetSource(props.dataset.dataConfig) ?? ''
    state.interpretation = getDatasetInterpretation(props.dataset.dataConfig) ?? ''
    state.dataSchema = formatDatasetJsonValue(props.dataset.dataSchema)
    state.dataConfig = formatDatasetJsonValue(
      normalizeDataConfigMode(props.dataset.dataConfig, state.mode)
    )

    return
  }

  state.id = ''
  state.ownerBidangId = ''
  state.name = ''
  state.description = ''
  state.mode = 'REGIONAL'
  state.source = ''
  state.interpretation = ''
  state.dataSchema = formatDatasetJsonValue({})
  state.dataConfig = formatDatasetJsonValue({ version: 1, mode: 'REGIONAL' })
}

watch(
  [open, () => props.dataset],
  ([isOpen]) => {
    if (isOpen) {
      syncState()
    }
  },
  { immediate: true }
)

watch(
  () => state.mode,
  (mode) => {
    try {
      state.dataConfig = formatDatasetJsonValue(
        normalizeDataConfigMode(
          parseDatasetJsonInput(state.dataConfig, 'Data config'),
          mode
        )
      )
    } catch {
      // Keep invalid JSON untouched so the existing form validation can report it.
    }
  }
)

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true

  try {
    const parsedDataConfig = normalizeDataConfigMode(
      parseDatasetJsonInput(event.data.dataConfig, 'Data config'),
      event.data.mode
    )
    const dataConfig = formatDatasetJsonValue(
      mergeDatasetConfigMetadata(
        parsedDataConfig,
        {
          source: event.data.source,
          interpretation: event.data.interpretation
        }
      )
    )
    await $fetch(
      isEdit.value && props.dataset
        ? `/api/datasets/${props.dataset.id}`
        : '/api/datasets',
      {
        method: isEdit.value ? 'PATCH' : 'POST',
        body: isEdit.value
          ? {
              ownerBidangId: event.data.ownerBidangId,
              name: event.data.name,
              description: event.data.description,
              dataSchema: event.data.dataSchema,
              dataConfig
            }
          : {
              id: event.data.id,
              ownerBidangId: event.data.ownerBidangId,
              name: event.data.name,
              description: event.data.description,
              dataSchema: event.data.dataSchema,
              dataConfig
            }
      }
    )

    toast.add({
      title: isEdit.value ? 'Dataset diperbarui' : 'Dataset dibuat',
      description: isEdit.value
        ? `${event.data.id} berhasil diperbarui.`
        : `${event.data.id} berhasil dibuat.`,
      color: 'success'
    })

    open.value = false
    syncState()

    if (isEdit.value) {
      emit('updated')
      return
    }

    emit('created')
  } catch (error) {
    toast.add({
      title: isEdit.value ? 'Gagal memperbarui dataset' : 'Gagal membuat dataset',
      description: error instanceof Error ? error.message : 'Silakan coba lagi.',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="modalTitle"
    :description="modalDescription"
    :ui="{ content: 'sm:max-w-4xl' }"
  >
    <UButton
      v-if="showTrigger"
      label="Tambah dataset"
      icon="i-lucide-database"
      class="cursor-pointer"
    />

    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UAlert
          v-if="bidangsError"
          icon="i-lucide-triangle-alert"
          title="Gagal memuat opsi bidang"
          description="Refresh halaman lalu coba lagi sebelum menyimpan dataset."
          color="error"
          variant="subtle"
        />

        <div class="grid gap-4 lg:grid-cols-2">
          <UFormField
            label="Dataset ID"
            name="id"
            :description="isEdit
              ? 'Dataset ID bersifat permanen setelah dibuat.'
              : 'Gunakan format teknis seperti FOOD_STOCK_DAILY atau IKP_YEARLY.'"
          >
            <UInput
              v-model="state.id"
              class="w-full"
              :readonly="isEdit"
              :disabled="isEdit"
            />
          </UFormField>

          <UFormField
            label="Owner Bidang"
            name="ownerBidangId"
            description="Pilih bidang pemilik struktural dataset ini."
          >
            <USelectMenu
              v-model="state.ownerBidangId"
              :items="bidangItems"
              value-key="id"
              label-key="name"
              placeholder="Pilih bidang"
              class="w-full"
              :loading="isLoadingBidangs"
              :search-input="{ placeholder: 'Cari bidang...' }"
            />
          </UFormField>

          <UFormField
            label="Mode Dataset"
            name="mode"
            :description="modeDescription"
          >
            <USelectMenu
              v-model="state.mode"
              :items="modeItems"
              value-key="value"
              label-key="label"
              class="w-full"
              :disabled="isModeLocked"
            />
          </UFormField>
        </div>

        <div class="grid gap-4 lg:grid-cols-1">
          <UFormField label="Nama dataset" name="name">
            <UInput v-model="state.name" class="w-full" />
          </UFormField>
        </div>

        <UFormField
          label="Deskripsi"
          name="description"
          description="Opsional. Ringkasan singkat untuk membantu admin lain memahami tujuan dataset."
        >
          <UTextarea
            v-model="state.description"
            class="w-full"
            :rows="3"
          />
        </UFormField>

        <div class="grid gap-4 lg:grid-cols-2">
          <UFormField
            label="Sumber Data"
            name="source"
          >
            <UInput
              v-model="state.source"
              class="w-full"
              placeholder="Contoh: Dinas Ketahanan Pangan Kabupaten Sumbawa Barat"
            />
          </UFormField>

          <UFormField
            label="Interpretasi Data"
            name="interpretation"
          >
            <UTextarea
              v-model="state.interpretation"
              class="w-full"
              placeholder="Catatan singkat mengenai arti atau cara membaca data ini."
              :rows="3"
            />
          </UFormField>
        </div>

        <div class="grid gap-4 xl:grid-cols-2">
          <UFormField
            label="Data schema"
            name="dataSchema"
            description="Definisikan field data yang akan diisi oleh record dataset."
          >
            <UTextarea
              v-model="state.dataSchema"
              class="w-full font-mono text-xs"
              :rows="14"
              autoresize
            />
          </UFormField>

          <UFormField
            label="Data config"
            name="dataConfig"
            :description="state.mode === 'REGIONAL'
              ? 'REGIONAL wajib memuat periodicity, regionLevel, dan startPeriod.'
              : 'TABULAR wajib memuat periodicity dan startPeriod; regionLevel dihapus saat disimpan.'"
          >
            <UTextarea
              v-model="state.dataConfig"
              class="w-full font-mono text-xs"
              :rows="14"
              autoresize
            />
          </UFormField>
        </div>

        <div class="flex justify-end gap-2 border-t border-default pt-4">
          <UButton
            label="Batal"
            color="neutral"
            variant="subtle"
            @click="open = false"
          />
          <UButton
            :label="submitLabel"
            type="submit"
            :loading="loading"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
