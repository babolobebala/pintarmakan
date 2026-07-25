<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({
  layout: false,
  public: true
})

const route = useRoute()
const router = useRouter()
const toast = useToast()
const auth = useAuth()

const schema = z.object({
  email: z.email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters')
})

type Schema = z.output<typeof schema>

const state = reactive<Schema>({
  email: '',
  password: ''
})

const loading = ref(false)
const googleLoading = ref(false)

const redirectTo = computed(() => {
  const redirect = route.query.redirect
  return typeof redirect === 'string' && redirect.startsWith('/')
    ? redirect
    : '/'
})

const { data: session } = await auth.useSession(useFetch)

if (session.value?.user) {
  await navigateTo(redirectTo.value)
}

async function signInWithGoogle() {
  googleLoading.value = true

  const { error } = await auth.signIn.social({
    provider: 'google',
    callbackURL: redirectTo.value
  })

  googleLoading.value = false

  if (error) {
    toast.add({
      title: 'Google sign-in failed',
      description: error.message,
      color: 'error'
    })
  }
}

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true

  const { error } = await auth.signIn.email({
    email: event.data.email,
    password: event.data.password,
    callbackURL: redirectTo.value
  })

  loading.value = false

  if (error) {
    toast.add({
      title: 'Sign-in failed',
      description: error.message,
      color: 'error'
    })
    return
  }

  await router.push(redirectTo.value)
}
</script>

<template>
  <div class="min-h-screen bg-(--ui-bg) px-4 py-10">
    <div class="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md items-center">
      <UCard class="w-full">
        <template #header>
          <div class="space-y-1">
            <p class="text-sm font-medium text-muted">
              Internal access only
            </p>
            <h1 class="text-2xl font-semibold text-highlighted">
              Sign in to continue
            </h1>
            <p class="text-sm text-muted">
              Use your approved Google account or your assigned email and password.
            </p>
          </div>
        </template>

        <div class="space-y-6">
          <UButton
            block
            color="neutral"
            icon="i-simple-icons-google"
            :loading="googleLoading"
            label="Continue with Google"
            @click="signInWithGoogle"
          />

          <div class="relative">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-default" />
            </div>
            <div class="relative flex justify-center">
              <span class="bg-default px-3 text-xs font-medium uppercase tracking-[0.2em] text-muted">
                Or
              </span>
            </div>
          </div>

          <UForm
            :schema="schema"
            :state="state"
            class="space-y-4"
            @submit="onSubmit"
          >
            <UFormField label="Email" name="email">
              <UInput
                v-model="state.email"
                class="w-full"
                autocomplete="email"
                type="email"
              />
            </UFormField>

            <UFormField label="Password" name="password">
              <UInput
                v-model="state.password"
                class="w-full"
                autocomplete="current-password"
                type="password"
              />
            </UFormField>

            <UButton
              block
              type="submit"
              :loading="loading"
              label="Sign in with password"
            />
          </UForm>
        </div>
      </UCard>
    </div>
  </div>
</template>
