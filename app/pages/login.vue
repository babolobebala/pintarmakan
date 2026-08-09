<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { authClient } from '~~/lib/auth-client'

definePageMeta({
  layout: false,
  public: true
})

const router = useRouter()
const route = useRoute()
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
const showPassword = ref(false)
const shellReady = ref(false)
const brandName = computed(() => appConfig.appName || 'Internal Dashboard')

const googleErrorMessage = computed(() => {
  if (
    route.query.provider !== 'google'
    || typeof route.query.error !== 'string'
  ) {
    return null
  }

  if (route.query.error === 'signup_disabled') {
    return {
      title: 'Google sign-in blocked',
      description:
        'This Google email is not provisioned yet. Ask an administrator to create your account first.'
    }
  }

  return {
    title: 'Google sign-in failed',
    description:
      typeof route.query.error_description === 'string'
        ? route.query.error_description
        : route.query.error.replaceAll('_', ' ')
  }
})

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

if (googleErrorMessage.value) {
  toast.add({
    title: googleErrorMessage.value.title,
    description: googleErrorMessage.value.description,
    color: 'error'
  })

  const {
    error: _error,
    error_description: _errorDescription,
    provider: _provider,
    ...query
  } = route.query

  await router.replace({
    query
  })
}

async function signInWithGoogle() {
  googleLoading.value = true

  const { error } = await authClient.signIn.social({
    provider: 'google',
    callbackURL: redirectTo.value,
    errorCallbackURL: '/login?provider=google'
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

onMounted(() => {
  requestAnimationFrame(() => {
    shellReady.value = true
  })
})
</script>

<template>
  <div
    class="min-h-screen overflow-x-clip bg-[radial-gradient(circle_at_top_left,color-mix(in_oklch,var(--app-accent)_10%,transparent),transparent_30%),radial-gradient(circle_at_bottom_right,color-mix(in_oklch,var(--app-accent)_6%,transparent),transparent_36%),linear-gradient(180deg,var(--app-background)_0%,color-mix(in_oklch,var(--app-background-muted)_84%,var(--app-blend-base))_100%)] px-4 py-4 text-[var(--app-foreground)] sm:px-6 lg:px-8"
  >
    <div class="mx-auto flex min-h-[calc(100vh-2rem)] max-w-6xl items-center">
      <UCard
        variant="outline"
        class="w-full shadow-[0_30px_80px_-52px_color-mix(in_oklch,var(--app-accent)_18%,transparent)]"
        :ui="{
          root: 'overflow-hidden rounded-[calc(var(--radius-shell)+0.75rem)] bg-[var(--app-surface)] ring ring-inset ring-[var(--app-border)] shadow-none',
          body: 'p-0',
          header: 'p-0',
          footer: 'p-0'
        }"
      >
        <div class="grid lg:grid-cols-[minmax(0,25rem)_minmax(0,1fr)]">
          <section
            :class="[
              'translate-y-3 px-6 py-8 opacity-0 transition-[opacity,transform] duration-[360ms] ease-[var(--ease-out)] motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:transition-none sm:px-8 lg:px-12 lg:py-12',
              shellReady && 'translate-y-0 opacity-100'
            ]"
          >
            <div class="flex min-h-full flex-col justify-between gap-8">
              <div class="items-center">
                <div class="min-w-0">
                  <img
                    src="/icons/logo_name.png"
                    :alt="brandName"
                    class="h-60 w-auto"
                  >
                </div>

                <UForm
                  :schema="schema"
                  :state="state"
                  class="space-y-5"
                  @submit="onSubmit"
                >
                  <UFormField name="email" label="Email address" required>
                    <UInput
                      v-model="state.email"
                      class="w-full"
                      size="xl"
                      color="neutral"
                      variant="outline"
                      name="email"
                      placeholder="name@agency.gov"
                      autocomplete="email"
                      type="email"
                      leading-icon="i-lucide-mail"
                      autofocus
                      :ui="{
                        leadingIcon: 'text-[var(--app-foreground-soft)]'
                      }"
                    />
                  </UFormField>

                  <UFormField name="password" label="Password" required>
                    <UInput
                      v-model="state.password"
                      class="w-full"
                      size="xl"
                      color="neutral"
                      variant="outline"
                      name="password"
                      :type="showPassword ? 'text' : 'password'"
                      placeholder="Enter your password"
                      autocomplete="current-password"
                      enter-key-hint="go"
                      leading-icon="i-lucide-lock-keyhole"
                      trailing
                      :ui="{
                        leadingIcon: 'text-[var(--app-foreground-soft)]'
                      }"
                    >
                      <template #trailing>
                        <UButton
                          type="button"
                          size="sm"
                          square
                          color="neutral"
                          variant="ghost"
                          class="border border-transparent text-[var(--app-foreground-soft)] transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-[var(--ease-out)] hover:border-[color-mix(in_oklch,var(--app-accent)_18%,var(--app-border-strong))] hover:bg-[color-mix(in_oklch,var(--app-accent)_8%,var(--app-surface))] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-focus)] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-[0.55] motion-reduce:transition-none"
                          :icon="
                            showPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'
                          "
                          :aria-label="
                            showPassword ? 'Hide password' : 'Show password'
                          "
                          @click="showPassword = !showPassword"
                        />
                      </template>
                    </UInput>
                  </UFormField>

                  <UButton
                    block
                    size="xl"
                    color="primary"
                    variant="solid"
                    type="submit"
                    class="cursor-pointer border border-transparent whitespace-nowrap shadow-[0_22px_44px_-28px_color-mix(in_oklch,var(--app-accent)_34%,transparent)] transition-[border-color,color,box-shadow,transform] duration-200 ease-[var(--ease-out)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-focus)] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-[0.55] motion-reduce:transition-none"
                    :loading="loading"
                    :disabled="googleLoading"
                    label="Login"
                  />

                  <div class="flex items-center gap-3.5">
                    <span
                      aria-hidden="true"
                      class="h-px flex-1 bg-[linear-gradient(90deg,transparent,var(--app-border-strong),transparent)]"
                    />
                    <span
                      class="font-mono text-[0.66rem] leading-none tracking-[0.16em] text-[var(--app-foreground-soft)] uppercase"
                    >atau</span>
                    <span
                      aria-hidden="true"
                      class="h-px flex-1 bg-[linear-gradient(90deg,transparent,var(--app-border-strong),transparent)]"
                    />
                  </div>

                  <UButton
                    block
                    size="xl"
                    color="neutral"
                    variant="outline"
                    icon="i-simple-icons-google"
                    type="button"
                    class="cursor-pointer border-[var(--app-border)] bg-[color-mix(in_oklch,var(--app-surface-muted)_70%,var(--app-blend-base))] whitespace-nowrap text-[var(--app-foreground)] transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-[var(--ease-out)] hover:border-[color-mix(in_oklch,var(--app-accent)_18%,var(--app-border-strong))] hover:bg-[color-mix(in_oklch,var(--app-accent)_8%,var(--app-surface))] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-focus)] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-[0.55] motion-reduce:transition-none"
                    :loading="googleLoading"
                    :disabled="loading"
                    label="Lanjutkan dengan Google"
                    @click="signInWithGoogle"
                  />
                </UForm>
              </div>

              <p
                class="border-t border-[color-mix(in_oklch,var(--app-accent)_14%,var(--app-border))] pt-4 text-sm leading-7 text-[var(--app-foreground-muted)]"
              >
                Silahkan menghubungi Admin jika mengalami masalah saat login
              </p>
            </div>
          </section>

          <aside
            class="border-t border-[var(--app-border)] bg-[linear-gradient(180deg,color-mix(in_oklch,var(--app-surface)_45%,var(--app-background-muted))_0%,color-mix(in_oklch,var(--app-surface-muted)_90%,var(--app-blend-base))_100%)] lg:border-t-0 lg:border-l"
          >
            <section
              :class="[
                'translate-y-3 px-6 py-8 opacity-0 transition-[opacity,transform] duration-[360ms] ease-[var(--ease-out)] motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:transition-none sm:px-8 lg:px-12 lg:py-12 lg:[transition-delay:90ms]',
                shellReady && 'translate-y-0 opacity-100'
              ]"
            >
              <div
                class="flex h-full min-h-full flex-col justify-between gap-10"
              >
                <div class="space-y-5 lg:max-w-2xl">
                  <h2
                    class="min-w-0 font-display text-4xl leading-[1.02] font-semibold tracking-[-0.06em] text-balance [overflow-wrap:anywhere] text-[var(--app-foreground)] sm:text-5xl"
                  >
                    Selamat Datang di SmartFood KSB
                  </h2>

                  <p
                    class="max-w-xl text-sm leading-7 text-[var(--app-foreground-muted)]"
                  >
                    Oleh Dinas Ketahanan Pangan Kabupaten Sumbawa Barat
                  </p>
                </div>

                <div
                  class="relative min-h-[16rem] overflow-hidden lg:min-h-[19rem]"
                >
                  <div class="absolute inset-0" aria-hidden="true">
                    <img
                      src="/icons/dashboard_depan.png"
                      :alt="brandName"
                      class="h-60 w-auto"
                    >
                  </div>

                  <div
                    class="absolute inset-x-[8%] bottom-0 border-t border-[color-mix(in_oklch,var(--app-accent)_14%,var(--app-border))] pt-4"
                  />
                </div>
              </div>
            </section>
          </aside>
        </div>
      </UCard>
    </div>
  </div>
</template>
