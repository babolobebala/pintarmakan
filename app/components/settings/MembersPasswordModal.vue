<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { Member } from '~/types'

const props = defineProps<{
  member: Member | null
}>()

const emit = defineEmits<{
  updated: []
}>()

const open = defineModel<boolean>('open', { default: false })
const toast = useToast()

const schema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password is too long')
})

type Schema = z.output<typeof schema>

const state = reactive<Schema>({
  password: ''
})

const loading = ref(false)

watch(open, (value) => {
  if (!value) {
    state.password = ''
  }
})

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (!props.member) {
    return
  }

  loading.value = true

  try {
    await $fetch(`/api/members/${props.member.id}/password`, {
      method: 'POST',
      body: {
        password: event.data.password
      }
    })

    toast.add({
      title: props.member.hasPassword ? 'Password reset' : 'Password created',
      description: `${props.member.email} can now use email and password sign-in.`,
      color: 'success'
    })

    state.password = ''
    open.value = false
    emit('updated')
  }
  catch (error) {
    toast.add({
      title: 'Unable to save password',
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
    :title="member?.hasPassword ? 'Reset password' : 'Set password'"
    :description="member ? `Create or replace the password for ${member.email}.` : ''"
  >
    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField label="Password" name="password">
          <UInput
            v-model="state.password"
            type="password"
            autocomplete="new-password"
            class="w-full"
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
            :label="member?.hasPassword ? 'Reset password' : 'Set password'"
            type="submit"
            :loading="loading"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
