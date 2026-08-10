<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { BidangOption, Member, RoleOption } from '~/types'
import { formatRoleLabel } from '~~/auth/permissions'

const props = withDefaults(
  defineProps<{
    member?: Member | null
    showTrigger?: boolean
    canManagePassword?: boolean
    canManageStatus?: boolean
  }>(),
  {
    member: null,
    showTrigger: true,
    canManagePassword: false,
    canManageStatus: false
  }
)

const emit = defineEmits<{
  created: []
  updated: []
  password: [member: Member]
  status: [member: Member]
}>()

const open = defineModel<boolean>('open', { default: false })
const toast = useToast()

const { data: roles } = await useFetch<RoleOption[]>('/api/roles/options', {
  default: () => []
})
const {
  data: bidangs,
  error: bidangOptionsError,
  status: bidangOptionsStatus
} = await useFetch<BidangOption[]>(
  '/api/bidang/options',
  {
    default: () => []
  }
)

const roleOptions = computed(() => roles.value)
const roleSlugs = computed(() => roleOptions.value.map(role => role.slug))
const bidangOptions = computed(() => {
  return bidangs.value.map(bidang => ({
    id: bidang.id,
    name: bidang.name,
    description: bidang.description ?? undefined
  }))
})
const bidangIds = computed(() =>
  bidangOptions.value.map(bidang => bidang.id)
)
const isEdit = computed(() => !!props.member)
const isReadOnlySuperAdmin = computed(() =>
  isEdit.value && props.member?.role === 'super-admin'
)

const schema = z.object({
  name: z.string().min(2, 'Too short'),
  email: z.email('Invalid email'),
  password: z.union([
    z.literal(''),
    z.string().min(8, 'Password must be at least 8 characters')
  ]),
  role: z
    .string()
    .min(1, 'Select a role')
    .superRefine((value, ctx) => {
      if (isReadOnlySuperAdmin.value && value === 'super-admin') {
        return
      }

      if (!roleSlugs.value.includes(value)) {
        ctx.addIssue({
          code: 'custom',
          message: 'Select a valid role.'
        })
      }
    }),
  bidangIds: z.array(z.string()).superRefine((value, ctx) => {
    const availableBidangs = new Set(bidangIds.value)

    for (const bidangId of value) {
      if (!availableBidangs.has(bidangId)) {
        ctx.addIssue({
          code: 'custom',
          message: 'Select a valid Bidang.'
        })
        return
      }
    }
  })
})

type Schema = z.output<typeof schema>

const state = reactive<Schema>({
  name: '',
  email: '',
  password: '',
  role: 'user',
  bidangIds: []
})

const loading = ref(false)
const modalTitle = computed(() =>
  isEdit.value ? 'Ubah user' : 'Tambah user'
)
const modalDescription = computed(() => {
  return isEdit.value
    ? 'Perbarui profil user, role sistem, dan penugasan Bidang operator.'
    : 'Buat akun internal dan tetapkan satu role sistem.'
})
const submitLabel = computed(() =>
  isEdit.value ? 'Simpan perubahan' : 'Tambah user'
)
const defaultRole = computed(() => {
  if (roleSlugs.value.length === 0) {
    return ''
  }

  return roleSlugs.value.includes('user') ? 'user' : (roleSlugs.value[0] ?? '')
})
const selectedRole = computed(() => {
  return roleOptions.value.find(role => role.slug === state.role) ?? null
})
const selectedRoleDescription = computed(() => {
  if (isReadOnlySuperAdmin.value) {
    return 'Akun Super Admin tetap valid, tetapi role-nya tidak dapat diubah dari form ini.'
  }

  return selectedRole.value?.description ?? null
})
const shouldShowBidangAssignments = computed(() =>
  !isReadOnlySuperAdmin.value && state.role === 'operator'
)
const hasBidangOptions = computed(() => bidangOptions.value.length > 0)
const isBidangOptionsLoading = computed(() => bidangOptionsStatus.value === 'pending')
const hasBidangOptionsError = computed(() => !!bidangOptionsError.value)
const bidangOptionsErrorMessage = computed(() => {
  if (!hasBidangOptionsError.value) {
    return ''
  }

  return bidangOptionsError.value instanceof Error
    ? bidangOptionsError.value.message
    : 'Coba muat ulang halaman lalu ulangi kembali.'
})
const submitDisabled = computed(() => {
  return shouldShowBidangAssignments.value
    && (isBidangOptionsLoading.value || hasBidangOptionsError.value)
})

function syncState() {
  if (props.member) {
    state.name = props.member.name
    state.email = props.member.email
    state.password = ''
    state.role = props.member.role
    state.bidangIds = props.member.bidangs.map(bidang => bidang.id)

    return
  }

  state.name = ''
  state.email = ''
  state.password = ''
  state.role = defaultRole.value
  state.bidangIds = []
}

watch(
  roleSlugs,
  (value) => {
    if (value.length === 0) {
      state.role = ''
      return
    }

    if (isReadOnlySuperAdmin.value && state.role === 'super-admin') {
      return
    }

    if (!value.includes(state.role)) {
      state.role = value.includes('user') ? 'user' : (value[0] ?? '')
    }
  },
  { immediate: true }
)

watch(
  bidangIds,
  (value) => {
    state.bidangIds = state.bidangIds.filter(bidangId =>
      value.includes(bidangId)
    )
  },
  { immediate: true }
)

watch(
  [open, () => props.member],
  ([isOpen]) => {
    if (isOpen) {
      syncState()
    }
  },
  { immediate: true }
)

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (shouldShowBidangAssignments.value && (isBidangOptionsLoading.value || hasBidangOptionsError.value)) {
    toast.add({
      title: 'Bidang belum siap digunakan',
      description: hasBidangOptionsError.value
        ? 'Data Bidang gagal dimuat. Periksa kembali sebelum menyimpan perubahan operator.'
        : 'Tunggu hingga daftar Bidang selesai dimuat.',
      color: 'error'
    })

    return
  }

  loading.value = true

  try {
    await $fetch(
      isEdit.value && props.member
        ? `/api/members/${props.member.id}`
        : '/api/members',
      {
        method: isEdit.value ? 'PATCH' : 'POST',
        body: isEdit.value
          ? {
              name: event.data.name,
              email: event.data.email,
              role: isReadOnlySuperAdmin.value ? undefined : event.data.role,
              bidangIds:
                event.data.role === 'operator'
                  ? event.data.bidangIds
                  : undefined
            }
          : {
              ...event.data,
              bidangIds:
                event.data.role === 'operator' ? event.data.bidangIds : []
            }
      }
    )

    toast.add({
      title: isEdit.value ? 'User diperbarui' : 'User disimpan',
      description: isEdit.value
        ? `${event.data.email} berhasil diperbarui.`
        : `${event.data.email} berhasil dibuat.`,
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
      title: isEdit.value ? 'Gagal memperbarui user' : 'Gagal menyimpan user',
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
    :ui="{ content: 'sm:max-w-2xl' }"
  >
    <UButton v-if="showTrigger" label="Tambah user" icon="i-lucide-user-plus" />

    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField label="Nama" name="name">
          <UInput v-model="state.name" class="w-full" />
        </UFormField>

        <UFormField label="Email" name="email">
          <UInput v-model="state.email" type="email" class="w-full" />
        </UFormField>

        <UFormField
          v-if="!isEdit"
          label="Password awal"
          name="password"
          description="Opsional. Biarkan kosong jika akun hanya akan memakai login Google."
        >
          <UInput
            v-model="state.password"
            type="password"
            autocomplete="new-password"
            class="w-full"
          />
        </UFormField>

        <UFormField
          label="Role Sistem"
          name="role"
          :description="
            isReadOnlySuperAdmin
              ? 'Role Super Admin ditampilkan sebagai informasi dan tidak dapat diubah dari form ini.'
              : 'Pilih satu role sistem tertinggi untuk akun ini.'
          "
        >
          <div class="space-y-3">
            <UInput
              v-if="isReadOnlySuperAdmin"
              :model-value="formatRoleLabel(state.role)"
              readonly
              disabled
              class="w-full"
            />
            <USelectMenu
              v-else
              v-model="state.role"
              :items="roleOptions"
              value-key="slug"
              label-key="name"
              placeholder="Pilih role"
              class="w-full"
            />

            <p v-if="selectedRoleDescription" class="text-xs text-muted">
              {{ selectedRoleDescription }}
            </p>
          </div>
        </UFormField>

        <UFormField
          v-if="shouldShowBidangAssignments"
          label="Bidang yang Ditugaskan"
          name="bidangIds"
          description="Operator hanya dapat mengubah data pada Bidang yang dipilih."
        >
          <div class="space-y-3">
            <USelectMenu
              v-model="state.bidangIds"
              :items="bidangOptions"
              value-key="id"
              label-key="name"
              multiple
              placeholder="Pilih Bidang"
              class="w-full"
              :loading="isBidangOptionsLoading"
              :search-input="{ placeholder: 'Cari Bidang...' }"
            />

            <UAlert
              v-if="hasBidangOptionsError"
              icon="i-lucide-triangle-alert"
              title="Data Bidang gagal dimuat"
              :description="bidangOptionsErrorMessage"
              color="error"
              variant="subtle"
            />

            <UAlert
              v-else-if="!hasBidangOptions"
              icon="i-lucide-info"
              title="Belum ada master Bidang"
              description="Belum ada record Bidang di database, jadi operator belum bisa diberi scope."
              color="neutral"
              variant="subtle"
            />
          </div>
        </UFormField>

        <div
          v-if="isEdit && member && !isReadOnlySuperAdmin && (canManagePassword || canManageStatus)"
          class="space-y-3 rounded-xl border border-default/70 bg-elevated/30 p-4"
        >
          <div class="space-y-1">
            <p class="text-sm font-medium text-highlighted">
              Akses akun
            </p>
            <p class="text-xs text-muted">
              Gunakan kontrol ini untuk password dan status akun tanpa keluar dari form.
            </p>
          </div>

          <div class="flex flex-wrap gap-2">
            <UButton
              v-if="canManagePassword"
              color="neutral"
              variant="outline"
              :label="member.hasPassword ? 'Reset password' : 'Set password'"
              icon="i-lucide-key-round"
              @click="emit('password', member)"
            />
            <UButton
              v-if="canManageStatus"
              color="neutral"
              variant="outline"
              :label="member.isBanned ? 'Activate member' : 'Deactivate member'"
              :icon="
                member.isBanned
                  ? 'i-lucide-badge-check'
                  : 'i-lucide-user-round-x'
              "
              @click="emit('status', member)"
            />
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
            :disabled="submitDisabled"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
