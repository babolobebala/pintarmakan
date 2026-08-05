<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { authClient } from '~~/lib/auth-client'

definePageMeta({
  layout: false,
  public: true
})

const router = useRouter()
const toast = useToast()
const appConfig = useAppConfig()
const redirectCookie = useCookie<string | null>('auth_redirect', {
  sameSite: 'lax',
  path: '/'
})

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
const brandName = computed(() => appConfig.appName || 'Internal Dashboard')

const redirectTo = computed(() => {
  const redirect = redirectCookie.value
  return typeof redirect === 'string' && redirect.startsWith('/')
    ? redirect
    : '/'
})

const { data: session } = await authClient.useSession(useFetch)

if (session.value?.user) {
  const target = redirectTo.value
  redirectCookie.value = null
  await navigateTo(target)
}

async function signInWithGoogle() {
  googleLoading.value = true

  const { error } = await authClient.signIn.social({
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

  const { error } = await authClient.signIn.email({
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

  const target = redirectTo.value
  redirectCookie.value = null
  await router.push(target)
}
</script>

<template>
  <div class="min-h-screen bg-zinc-100 px-4 py-8 text-zinc-950 transition-colors dark:bg-[#1f1f21] dark:text-white">
    <div class="mx-auto flex min-h-[calc(100vh-4rem)] max-w-sm items-center justify-center">
      <UCard
        class="w-full rounded-[2rem] border border-zinc-200/80 bg-white/95 px-6 py-8 shadow-[0_24px_80px_-36px_rgba(15,23,42,0.35)] dark:border-white/10 dark:bg-[#2a2a2d] dark:shadow-[0_28px_80px_-32px_rgba(0,0,0,0.7)]"
        :ui="{
          root: 'overflow-hidden',
          body: 'p-0',
          header: 'p-0',
          footer: 'p-0'
        }"
      >
        <div class="space-y-7">
          <div class="space-y-5 text-center">
            <div class="mx-auto flex size-16 items-center justify-center rounded-full border border-zinc-200 bg-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] dark:border-white/10 dark:bg-white/5 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <UIcon name="i-lucide-sparkles" class="size-6 text-zinc-800 dark:text-white" />
            </div>

            <h1 class="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-white">
              {{ brandName }}
            </h1>
          </div>

          <UForm
            :schema="schema"
            :state="state"
            class="space-y-4"
            @submit="onSubmit"
          >
            <UFormField name="email">
              <UInput
                v-model="state.email"
                class="w-full"
                size="xl"
                color="neutral"
                variant="soft"
                placeholder="Email"
                autocomplete="email"
                type="email"
                :ui="{
                  base: 'rounded-xl border border-zinc-200 bg-zinc-50/90 dark:border-white/12 dark:bg-white/[0.06]',
                  leadingIcon: 'text-zinc-400'
                }"
              />
            </UFormField>

            <UFormField name="password">
              <UInput
                v-model="state.password"
                class="w-full"
                size="xl"
                color="neutral"
                variant="soft"
                placeholder="Password"
                autocomplete="current-password"
                type="password"
                :ui="{
                  base: 'rounded-xl border border-zinc-200 bg-zinc-50/90 dark:border-white/12 dark:bg-white/[0.06]',
                  leadingIcon: 'text-zinc-400'
                }"
              />
            </UFormField>

            <UButton
              block
              size="xl"
              color="neutral"
              variant="soft"
              type="submit"
              :loading="loading"
              label="Sign in"
              class="mt-2 rounded-xl"
            />
          </UForm>

          <UButton
            block
            size="xl"
            color="neutral"
            variant="soft"
            icon="i-simple-icons-google"
            :loading="googleLoading"
            label="Sign in with Google"
            class="rounded-xl"
            @click="signInWithGoogle"
          />

          <p class="text-center text-sm text-zinc-500 dark:text-zinc-400">
            Account access is managed by your administrator.
          </p>
        </div>
      </UCard>
    </div>
  </div>
</template>
