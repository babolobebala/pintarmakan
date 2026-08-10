<script setup lang="ts">
import type {
  DatasetRecordDatasetOption,
  DatasetRecordListItem,
  RegionItem
} from '~/types'

import {
  formatDatasetPeriod,
  getDatasetPeriodicity,
  getDatasetSchemaFields,
  getDefaultPeriodInput,
  getDatasetRegionLevel,
  normalizeDatasetPeriodInput,
  validateDatasetRecordData
} from '~~/shared/datasets'

type RegionOption = RegionItem & {
  readonly label: string
}

const props = withDefaults(defineProps<{
  dataset: DatasetRecordDatasetOption | null
  regions: readonly RegionItem[]
  record?: DatasetRecordListItem | null
  showTrigger?: boolean
}>(), {
  record: null,
  showTrigger: true
})

const emit = defineEmits<{
  created: []
  updated: []
}>()

const open = defineModel<boolean>('open', { default: false })
const toast = useToast()
const isEdit = computed(() => !!props.record)
const loading = ref(false)
const submitError = ref('')
const regionId = ref('')
const periodValue = ref('')
const status = ref('draft')
const dataState = reactive<Record<string, unknown>>({})

const regionsById = computed(() => {
  return new Map(props.regions.map(region => [region.id, region]))
})

function buildRegionLabel(region: RegionItem) {
  const names: string[] = [region.name]
  let parentId = region.parentId

  while (parentId) {
    const parent = regionsById.value.get(parentId)

    if (!parent) {
      break
    }

    names.unshift(parent.name)
    parentId = parent.parentId
  }

  return `${names.join(' / ')} · ${region.level}`
}

const allRegionOptions = computed<RegionOption[]>(() => {
  return props.regions.map(region => ({
    ...region,
    label: buildRegionLabel(region)
  }))
})

const periodicity = computed(() => {
  return props.dataset
    ? getDatasetPeriodicity(props.dataset.dataConfig)
    : null
})

const fields = computed(() => {
  return props.dataset
    ? getDatasetSchemaFields(props.dataset.dataSchema)
    : []
})

const regionOptions = computed(() => {
  const regionLevel = props.dataset
    ? getDatasetRegionLevel(props.dataset.dataConfig)
    : null

  return allRegionOptions.value.filter((region) => {
    return !regionLevel || region.level.toUpperCase() === regionLevel
  })
})

const modalTitle = computed(() => isEdit.value ? 'Ubah data' : 'Tambah data')
const modalDescription = computed(() => {
  if (!props.dataset) {
    return 'Pilih dataset pada halaman utama sebelum membuka form.'
  }

  return isEdit.value
    ? `Perbarui snapshot ${props.dataset.name} tanpa mengubah dataset, wilayah, atau periode.`
    : `Buat snapshot baru untuk ${props.dataset.name} pada bidang pemilik dataset yang sedang aktif.`
})
const submitLabel = computed(() => isEdit.value ? 'Simpan perubahan' : 'Simpan data')

function getFieldValue(fieldKey: string) {
  const value = dataState[fieldKey]

  if (value === undefined || value === null) {
    return ''
  }

  return value
}

function setFieldValue(fieldKey: string, value: unknown) {
  dataState[fieldKey] = value
}

function getFieldSelectOptions(fieldKey: string) {
  const field = fields.value.find(item => item.key === fieldKey)

  return field?.options ? [...field.options] : []
}

function resetDataState() {
  const nextState: Record<string, unknown> = {}

  for (const key of Object.keys(dataState)) {
    Reflect.deleteProperty(dataState, key)
  }

  for (const field of fields.value) {
    const existingValue = props.record?.data[field.key]

    if (existingValue !== undefined) {
      nextState[field.key] = existingValue
      continue
    }

    nextState[field.key] = field.type === 'boolean' ? false : ''
  }

  for (const [key, value] of Object.entries(nextState)) {
    dataState[key] = value
  }
}

function syncState() {
  submitError.value = ''

  if (props.record) {
    regionId.value = props.record.regionId
    periodValue.value = props.record.periodDate
    status.value = props.record.status
    resetDataState()

    return
  }

  regionId.value = ''
  periodValue.value = getDefaultPeriodInput(periodicity.value)
  status.value = 'draft'
  resetDataState()
}

watch(
  [open, () => props.record, () => props.dataset?.id],
  ([isOpen]) => {
    if (isOpen) {
      syncState()
    }
  },
  { immediate: true }
)

async function onSubmit() {
  if (!props.dataset) {
    return
  }

  submitError.value = ''

  if (!regionId.value.trim()) {
    submitError.value = 'Region is required.'
    return
  }

  if (!status.value.trim()) {
    submitError.value = 'Status is required.'
    return
  }

  try {
    normalizeDatasetPeriodInput(periodicity.value, periodValue.value)
  } catch (error) {
    submitError.value = error instanceof Error ? error.message : 'Period is invalid.'
    return
  }

  const validation = validateDatasetRecordData(props.dataset.dataSchema, dataState)

  if (validation.issues.length > 0) {
    submitError.value = validation.issues[0]?.message || 'Data payload is invalid.'
    return
  }

  loading.value = true

  try {
    await $fetch(
      isEdit.value && props.record
        ? `/api/dataset-records/${props.record.id}`
        : '/api/dataset-records',
      {
        method: isEdit.value ? 'PATCH' : 'POST',
        body: isEdit.value
          ? {
              status: status.value,
              data: validation.data
            }
          : {
              datasetId: props.dataset.id,
              regionId: regionId.value,
              periodValue: periodValue.value,
              status: status.value,
              data: validation.data
            }
      }
    )

    toast.add({
      title: isEdit.value ? 'Data diperbarui' : 'Data disimpan',
      description: isEdit.value
        ? 'Snapshot data berhasil diperbarui.'
        : 'Snapshot data berhasil dibuat.',
      color: 'success'
    })

    open.value = false

    if (isEdit.value) {
      emit('updated')
      return
    }

    emit('created')
  } catch (error) {
    toast.add({
      title: isEdit.value ? 'Gagal memperbarui data' : 'Gagal menyimpan data',
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
    :ui="{ content: 'sm:max-w-5xl' }"
  >
    <UButton
      v-if="showTrigger"
      label="Tambah data"
      icon="i-lucide-plus"
    />

    <template #body>
      <div v-if="!dataset" class="space-y-4">
        <UAlert
          icon="i-lucide-info"
          title="Pilih dataset terlebih dahulu"
          description="Form data mengikuti schema dan konfigurasi dataset yang sedang aktif."
          color="neutral"
          variant="subtle"
        />
      </div>

      <form v-else class="space-y-4" @submit.prevent="onSubmit">
        <UAlert
          v-if="submitError"
          icon="i-lucide-triangle-alert"
          title="Validasi gagal"
          :description="submitError"
          color="error"
          variant="subtle"
        />

        <div class="grid gap-4 lg:grid-cols-2">
          <div class="space-y-2">
            <p class="text-sm font-medium text-highlighted">
              Dataset
            </p>
            <UInput
              :model-value="dataset.name"
              disabled
              readonly
              class="w-full"
            />
            <p class="text-xs text-muted">
              {{ dataset.id }}
            </p>
            <p class="text-xs text-muted">
              Owner Bidang: {{ dataset.ownerBidangName }}
            </p>
          </div>

          <div class="space-y-2">
            <p class="text-sm font-medium text-highlighted">
              Status
            </p>
            <UInput v-model="status" class="w-full" />
          </div>
        </div>

        <div class="grid gap-4 lg:grid-cols-2">
          <div class="space-y-2">
            <p class="text-sm font-medium text-highlighted">
              Periode
            </p>
            <UInput
              v-if="isEdit"
              :model-value="formatDatasetPeriod(periodicity, periodValue)"
              disabled
              readonly
              class="w-full"
            />
            <UInput
              v-else-if="periodicity === 'HARIAN'"
              v-model="periodValue"
              type="date"
              class="w-full"
            />
            <UInput
              v-else-if="periodicity === 'BULANAN'"
              v-model="periodValue"
              type="month"
              class="w-full"
            />
            <UInput
              v-else-if="periodicity === 'TAHUNAN'"
              v-model="periodValue"
              placeholder="2026"
              class="w-full"
            />
            <UInput
              v-else
              v-model="periodValue"
              :placeholder="periodicity === 'TRIWULANAN' ? '2026-Q3' : '2026-W32'"
              class="w-full"
            />
          </div>

          <div class="space-y-2">
            <p class="text-sm font-medium text-highlighted">
              Wilayah
            </p>
            <UInput
              v-if="isEdit"
              :model-value="record?.regionName || regionId"
              disabled
              readonly
              class="w-full"
            />
            <USelectMenu
              v-else
              v-model="regionId"
              :items="regionOptions"
              value-key="id"
              label-key="label"
              placeholder="Pilih wilayah"
              class="w-full"
              :search-input="{ placeholder: 'Cari wilayah...' }"
            />
          </div>
        </div>

        <div class="space-y-4 rounded-2xl border border-default/70 bg-elevated/20 p-4">
          <div class="space-y-1">
            <p class="text-sm font-medium text-highlighted">
              Nilai data
            </p>
            <p class="text-xs text-muted">
              Form ini dihasilkan langsung dari <code>dataSchema</code> dataset yang aktif.
            </p>
          </div>

          <div v-if="fields.length === 0">
            <UAlert
              icon="i-lucide-info"
              title="Schema dataset kosong"
              description="Dataset ini belum memiliki field input yang dapat diisi."
              color="neutral"
              variant="subtle"
            />
          </div>

          <div v-else class="grid gap-4 xl:grid-cols-2">
            <div
              v-for="field in fields"
              :key="field.key"
              class="space-y-2"
              :class="field.type === 'textarea' ? 'xl:col-span-2' : ''"
            >
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
                <UBadge
                  v-if="field.unit"
                  color="neutral"
                  variant="outline"
                  size="sm"
                >
                  {{ field.unit }}
                </UBadge>
              </div>

              <USwitch
                v-if="field.type === 'boolean'"
                :model-value="Boolean(getFieldValue(field.key))"
                @update:model-value="(value) => setFieldValue(field.key, value)"
              />

              <USelectMenu
                v-else-if="field.type === 'select'"
                :model-value="String(getFieldValue(field.key) || '')"
                :items="getFieldSelectOptions(field.key)"
                value-key="value"
                label-key="label"
                placeholder="Pilih nilai"
                class="w-full"
                @update:model-value="(value) => setFieldValue(field.key, value)"
              />

              <UTextarea
                v-else-if="field.type === 'textarea'"
                :model-value="String(getFieldValue(field.key) || '')"
                class="w-full"
                :rows="4"
                @update:model-value="(value) => setFieldValue(field.key, value)"
              />

              <UInput
                v-else
                :model-value="String(getFieldValue(field.key) || '')"
                :type="field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'"
                class="w-full"
                @update:model-value="(value) => setFieldValue(field.key, value)"
              />
            </div>
          </div>
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
      </form>
    </template>
  </UModal>
</template>
