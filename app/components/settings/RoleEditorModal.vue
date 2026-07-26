<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { RoleRecord } from '~/types'
import type { AppPermission } from '#shared/rbac'
import { permissionList, permissionMetadata } from '#shared/rbac'

const props = defineProps<{
  role: RoleRecord | null
}>()

const emit = defineEmits<{
  saved: []
}>()

const open = defineModel<boolean>('open', { default: false })
const toast = useToast()

const permissionSet = new Set(permissionList)
const permissionOptions = permissionList.map((permission) => {
  return {
    value: permission,
    ...permissionMetadata[permission]
  }
})

const schema = z.object({
  name: z.string().trim().min(2, 'Role name is too short').max(191),
  description: z.string().trim().max(2000).optional().or(z.literal('')),
  permissions: z.array(z.string()).min(1, 'Select at least one permission').superRefine((value, ctx) => {
    for (const permission of value) {
      if (!permissionSet.has(permission as AppPermission)) {
        ctx.addIssue({
          code: 'custom',
          message: 'Select only valid permissions.'
        })
        return
      }
    }
  })
})

type Schema = z.output<typeof schema> & {
  permissions: string[]
}

const state = reactive<Schema>({
  name: '',
  description: '',
  permissions: []
})

const loading = ref(false)
const isEditing = computed(() => !!props.role)

watch([open, () => props.role], ([isOpen, role]) => {
  if (!isOpen) {
    return
  }

  state.name = role?.name || ''
  state.description = role?.description || ''
  state.permissions = role?.permissions ? [...role.permissions] : ['dashboard.view']
}, { immediate: true })

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true

  try {
    if (props.role) {
      await $fetch(`/api/roles/${props.role.id}`, {
        method: 'PATCH',
        body: event.data
      })
    } else {
      await $fetch('/api/roles', {
        method: 'POST',
        body: event.data
      })
    }

    toast.add({
      title: props.role ? 'Role updated' : 'Role created',
      description: props.role
        ? `${event.data.name} is now updated.`
        : `${event.data.name} is now available for assignment.`,
      color: 'success'
    })

    open.value = false
    emit('saved')
  } catch (error) {
    toast.add({
      title: props.role ? 'Unable to update role' : 'Unable to create role',
      description: error instanceof Error ? error.message : 'Please try again.',
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
    :title="isEditing ? 'Edit role' : 'Create role'"
    :description="isEditing
      ? 'Update the label, description, and permission set for this custom role.'
      : 'Create a reusable custom role for your internal members.'"
  >
    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField label="Role name" name="name">
          <UInput
            v-model="state.name"
            class="w-full"
            placeholder="Operations Lead"
          />
        </UFormField>

        <UFormField
          label="Description"
          name="description"
          description="Optional helper text shown in role management."
        >
          <UTextarea
            v-model="state.description"
            class="w-full"
            :rows="3"
            placeholder="Describe who should receive this role."
          />
        </UFormField>

        <UFormField
          label="Permissions"
          name="permissions"
          description="Choose the actions members with this role can perform."
        >
          <div class="grid gap-2 sm:grid-cols-2">
            <label
              v-for="permission in permissionOptions"
              :key="permission.value"
              class="rounded-lg border border-default px-3 py-3"
            >
              <div class="flex items-start gap-3">
                <UCheckbox
                  :model-value="state.permissions.includes(permission.value)"
                  @update:model-value="(checked: boolean | 'indeterminate') => {
                    if (checked) {
                      state.permissions = Array.from(new Set([...state.permissions, permission.value]))
                      return
                    }

                    state.permissions = state.permissions.filter(value => value !== permission.value)
                  }"
                />

                <div class="min-w-0 text-sm">
                  <p class="font-medium text-highlighted">
                    {{ permission.label }}
                  </p>
                  <p class="text-muted">
                    {{ permission.description }}
                  </p>
                </div>
              </div>
            </label>
          </div>
        </UFormField>

        <div class="flex justify-end gap-2">
          <UButton
            label="Cancel"
            color="neutral"
            variant="subtle"
            @click="open = false"
          />
          <UButton
            :label="isEditing ? 'Save changes' : 'Create role'"
            type="submit"
            :loading="loading"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
