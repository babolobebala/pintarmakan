<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { appRoleOptions } from '~~/lib/rbac'

const emit = defineEmits<{
  created: []
}>()

const open = ref(false)
const toast = useToast()

const roleOptions = [...appRoleOptions]

const schema = z.object({
  name: z.string().min(2, 'Too short'),
  email: z.email('Invalid email'),
  password: z.union([
    z.literal(''),
    z.string().min(8, 'Password must be at least 8 characters')
  ]),
  roles: z.array(z.enum(appRoleOptions)).min(1, 'Select at least one role')
})

type Schema = z.output<typeof schema>

const state = reactive<Schema>({
  name: '',
  email: '',
  password: '',
  roles: ['staff']
})

const loading = ref(false)

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true

  try {
    await $fetch('/api/members', {
      method: 'POST',
      body: event.data
    })

    toast.add({
      title: 'Member saved',
      description: `${event.data.email} is now an approved user.`,
      color: 'success'
    })

    state.name = ''
    state.email = ''
    state.password = ''
    state.roles = ['staff']
    open.value = false
    emit('created')
  }
  catch (error) {
    toast.add({
      title: 'Unable to save member',
      description: error instanceof Error ? error.message : 'Please try again.',
      color: 'error'
    })
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Approve member"
    description="Create or update an internal user record and assign one or more roles."
  >
    <UButton
      label="Approve member"
      icon="i-lucide-user-plus"
      color="neutral"
    />

    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField label="Name" name="name">
          <UInput v-model="state.name" class="w-full" />
        </UFormField>

        <UFormField label="Email" name="email">
          <UInput v-model="state.email" type="email" class="w-full" />
        </UFormField>

        <UFormField
          label="Initial password"
          name="password"
          description="Optional. Leave blank for Google-only access for now."
        >
          <UInput
            v-model="state.password"
            type="password"
            autocomplete="new-password"
            class="w-full"
          />
        </UFormField>

        <UFormField
          label="Roles"
          name="roles"
          description="Users can hold multiple roles at once."
        >
          <div class="grid gap-2 sm:grid-cols-2">
            <label
              v-for="role in roleOptions"
              :key="role"
              class="flex items-center gap-2 rounded-lg border border-default px-3 py-2 text-sm"
            >
              <UCheckbox
                :model-value="state.roles.includes(role)"
                @update:model-value="(checked: boolean | 'indeterminate') => {
                  if (checked) {
                    state.roles = Array.from(new Set([...state.roles, role]))
                    return
                  }

                  state.roles = state.roles.filter(value => value !== role)
                }"
              />
              <span class="capitalize">{{ role }}</span>
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
            label="Save member"
            type="submit"
            :loading="loading"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
