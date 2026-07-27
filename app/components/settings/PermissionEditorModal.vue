<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

import { isPermissionKey } from '#shared/rbac'
import type { PermissionRecord } from '~/types'

const props = defineProps<{
  permission: PermissionRecord | null
}>()

const emit = defineEmits<{
  saved: []
}>()

const open = defineModel<boolean>('open', { default: false })
const toast = useToast()
const loading = ref(false)
const isEditing = computed(() => !!props.permission)

const schema = z.object({
  key: z.string().trim().min(3, 'Permission key is too short').max(191).refine(isPermissionKey, {
    message: 'Use lowercase segments separated by dots, for example billing.export.'
  }),
  label: z.string().trim().min(2, 'Permission label is too short').max(191),
  description: z.string().trim().max(2000).optional().or(z.literal('')),
  group: z.string().trim().min(2, 'Permission group is too short').max(191)
})

type Schema = z.output<typeof schema>

const state = reactive<Schema>({
  key: '',
  label: '',
  description: '',
  group: ''
})

watch([open, () => props.permission], ([isOpen, permission]) => {
  if (!isOpen) {
    return
  }

  state.key = permission?.key || ''
  state.label = permission?.label || ''
  state.description = permission?.description || ''
  state.group = permission?.group || ''
}, { immediate: true })

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true

  try {
    if (props.permission) {
      await $fetch(`/api/permissions/${props.permission.id}`, {
        method: 'PATCH',
        body: {
          label: event.data.label,
          description: event.data.description,
          group: event.data.group
        }
      })
    } else {
      await $fetch('/api/permissions', {
        method: 'POST',
        body: event.data
      })
    }

    toast.add({
      title: props.permission ? 'Permission updated' : 'Permission created',
      description: props.permission
        ? `${event.data.label} is now updated.`
        : `${event.data.label} can now be assigned to roles.`,
      color: 'success'
    })

    open.value = false
    emit('saved')
  } catch (error) {
    toast.add({
      title: props.permission ? 'Unable to update permission' : 'Unable to create permission',
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
    :title="isEditing ? 'Edit permission' : 'Create permission'"
    :description="isEditing
      ? 'Update the label, description, and grouping for this custom permission.'
      : 'Create a reusable custom permission that can be assigned to one or more roles.'"
  >
    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField
          label="Permission key"
          name="key"
          :description="isEditing
            ? 'Permission keys stay fixed after creation to avoid breaking role assignments.'
            : 'Use lowercase segments separated by dots, for example billing.export.'"
        >
          <UInput
            v-model="state.key"
            class="w-full"
            :disabled="isEditing"
            placeholder="billing.export"
          />
        </UFormField>

        <UFormField label="Label" name="label">
          <UInput
            v-model="state.label"
            class="w-full"
            placeholder="Export Billing"
          />
        </UFormField>

        <UFormField label="Group" name="group" description="Groups control how permissions are organized in the UI.">
          <UInput
            v-model="state.group"
            class="w-full"
            placeholder="Billing"
          />
        </UFormField>

        <UFormField
          label="Description"
          name="description"
          description="Optional helper text shown anywhere this permission is listed."
        >
          <UTextarea
            v-model="state.description"
            class="w-full"
            :rows="3"
            placeholder="Allow members to export billing data."
          />
        </UFormField>

        <div class="flex justify-end gap-2">
          <UButton
            label="Cancel"
            color="neutral"
            variant="subtle"
            @click="open = false"
          />
          <UButton
            :label="isEditing ? 'Save changes' : 'Create permission'"
            type="submit"
            :loading="loading"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
