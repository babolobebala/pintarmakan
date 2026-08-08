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
const shellClass = 'min-h-screen overflow-x-clip px-4 py-4 text-[var(--app-foreground)] sm:px-6 lg:px-8 bg-[radial-gradient(circle_at_top_left,color-mix(in_oklch,var(--app-accent)_10%,transparent),transparent_30%),radial-gradient(circle_at_bottom_right,color-mix(in_oklch,var(--app-accent)_6%,transparent),transparent_36%),linear-gradient(180deg,var(--app-background)_0%,color-mix(in_oklch,var(--app-background-muted)_84%,var(--app-blend-base))_100%)]'
const cardClass = 'w-full shadow-[0_30px_80px_-52px_color-mix(in_oklch,var(--app-accent)_18%,transparent)]'
const cardUi = {
  root: 'overflow-hidden rounded-[calc(var(--radius-shell)+0.75rem)] bg-[var(--app-surface)] ring ring-inset ring-[var(--app-border)] shadow-none',
  body: 'p-0',
  header: 'p-0',
  footer: 'p-0'
}
const panelClass = 'px-6 py-8 opacity-0 translate-y-3 transition-[opacity,transform] duration-[360ms] ease-[var(--ease-out)] motion-reduce:opacity-100 motion-reduce:translate-y-0 motion-reduce:transition-none sm:px-8 lg:px-12 lg:py-12'
const delayedPanelClass = `${panelClass} lg:[transition-delay:90ms]`
const readyClass = 'opacity-100 translate-y-0'
const inputUi = {
  leadingIcon: 'text-[var(--app-foreground-soft)]'
}
const kickerClass = 'font-mono text-[0.72rem] leading-none tracking-[0.16em] uppercase'
const headingClass = 'min-w-0 text-balance font-display text-4xl font-semibold leading-[1.02] tracking-[-0.06em] text-[var(--app-foreground)] [overflow-wrap:anywhere] sm:text-5xl'
const iconButtonClass = 'border border-transparent text-[var(--app-foreground-soft)] transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-[var(--ease-out)] hover:border-[color-mix(in_oklch,var(--app-accent)_18%,var(--app-border-strong))] hover:bg-[color-mix(in_oklch,var(--app-accent)_8%,var(--app-surface))] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-focus)] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-[0.55] motion-reduce:transition-none'
const primaryButtonClass = 'cursor-pointer whitespace-nowrap border border-transparent shadow-[0_22px_44px_-28px_color-mix(in_oklch,var(--app-accent)_34%,transparent)] transition-[border-color,color,box-shadow,transform] duration-200 ease-[var(--ease-out)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-focus)] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-[0.55] motion-reduce:transition-none'
const secondaryButtonClass = 'whitespace-nowrap border-[var(--app-border)] bg-[color-mix(in_oklch,var(--app-surface-muted)_70%,var(--app-blend-base))] text-[var(--app-foreground)] transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-[var(--ease-out)] hover:border-[color-mix(in_oklch,var(--app-accent)_18%,var(--app-border-strong))] hover:bg-[color-mix(in_oklch,var(--app-accent)_8%,var(--app-surface))] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-focus)] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-[0.55] motion-reduce:transition-none'
const dividerRuleClass = 'h-px flex-1 bg-[linear-gradient(90deg,transparent,var(--app-border-strong),transparent)]'
const asideClass = 'border-t border-[var(--app-border)] bg-[linear-gradient(180deg,color-mix(in_oklch,var(--app-surface)_45%,var(--app-background-muted))_0%,color-mix(in_oklch,var(--app-surface-muted)_90%,var(--app-blend-base))_100%)] lg:border-t-0 lg:border-l'
const logoRuleClass = 'h-px w-14 bg-[color-mix(in_oklch,var(--app-accent)_22%,var(--app-border))]'
const leadClass = 'max-w-xl text-sm leading-7 text-[var(--app-foreground-muted)]'
const factLabelClass = 'font-mono text-[0.66rem] leading-none tracking-[0.16em] uppercase text-[var(--app-foreground-soft)]'
const factValueClass = 'text-sm leading-6 text-[var(--app-foreground)]'
const stemClass = 'absolute w-px rounded-full bg-[linear-gradient(180deg,color-mix(in_oklch,var(--app-accent)_10%,transparent),color-mix(in_oklch,var(--app-accent)_38%,transparent))]'
const leafClass = 'absolute h-9 w-[4.25rem] rounded-[100%_0] border border-[color-mix(in_oklch,var(--app-accent)_24%,var(--app-border))] bg-[color-mix(in_oklch,var(--app-accent)_8%,var(--app-blend-soft))]'
const ornamentNoteClass = 'border-t border-[color-mix(in_oklch,var(--app-accent)_14%,var(--app-border))] pt-4 text-sm leading-7 text-[var(--app-foreground-muted)]'
const reassuranceItems = [
  { label: 'Access', text: 'Provisioned account only' },
  { label: 'Google', text: 'Social sign-in tersedia' },
  { label: 'Return', text: 'Kembali ke halaman tujuan setelah login' }
] as const

const googleErrorMessage = computed(() => {
  if (route.query.provider !== 'google' || typeof route.query.error !== 'string') {
    return null
  }

  if (route.query.error === 'signup_disabled') {
    return {
      title: 'Google sign-in blocked',
      description: 'This Google email is not provisioned yet. Ask an administrator to create your account first.'
    }
  }

  return {
    title: 'Google sign-in failed',
    description: typeof route.query.error_description === 'string'
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

  const { error: _error, error_description: _errorDescription, provider: _provider, ...query } = route.query

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
  <div :class="shellClass">
    <div class="mx-auto flex min-h-[calc(100vh-2rem)] max-w-6xl items-center">
      <UCard
        variant="outline"
        :class="cardClass"
        :ui="cardUi"
      >
        <div class="grid lg:grid-cols-[minmax(0,25rem)_minmax(0,1fr)]">
          <section
            :class="[
              panelClass,
              shellReady && readyClass
            ]"
          >
            <div class="flex min-h-full flex-col justify-between gap-8">
              <div class="space-y-10">
                <div class="flex items-center gap-4">
                  <span aria-hidden="true" :class="logoRuleClass" />
                  <div class="min-w-0">
                    <img
                      src="/icons/logo_name.png"
                      :alt="brandName"
                      class="h-[1.55rem] w-auto sm:h-[1.9rem]"
                    >
                  </div>
                </div>

                <div class="space-y-4">
                  <p :class="kickerClass">
                    Welcome back
                  </p>
                  <h1 :class="headingClass">
                    Continue to your dashboard
                  </h1>
                  <p :class="leadClass">
                    Sign in with your provisioned email account or continue with Google.
                  </p>
                </div>

                <UForm
                  :schema="schema"
                  :state="state"
                  class="space-y-5"
                  @submit="onSubmit"
                >
                  <UFormField
                    name="email"
                    label="Email address"
                    required
                  >
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
                      :ui="inputUi"
                    />
                  </UFormField>

                  <UFormField
                    name="password"
                    label="Password"
                    required
                  >
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
                      :ui="inputUi"
                    >
                      <template #trailing>
                        <UButton
                          type="button"
                          size="sm"
                          square
                          color="neutral"
                          variant="ghost"
                          :class="iconButtonClass"
                          :icon="showPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                          :aria-label="showPassword ? 'Hide password' : 'Show password'"
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
                    :class="primaryButtonClass"
                    :loading="loading"
                    :disabled="googleLoading"
                    label="Sign in"
                  />

                  <div class="flex items-center gap-3.5">
                    <span aria-hidden="true" :class="dividerRuleClass" />
                    <span class="font-mono text-[0.66rem] leading-none tracking-[0.16em] uppercase text-[var(--app-foreground-soft)]">atau</span>
                    <span aria-hidden="true" :class="dividerRuleClass" />
                  </div>

                  <UButton
                    block
                    size="xl"
                    color="neutral"
                    variant="outline"
                    icon="i-simple-icons-google"
                    type="button"
                    :class="secondaryButtonClass"
                    :loading="googleLoading"
                    :disabled="loading"
                    label="Continue with Google"
                    @click="signInWithGoogle"
                  />
                </UForm>
              </div>

              <p :class="ornamentNoteClass">
                Silahkan menghubungi Admin jika mengalami masalah saat login
              </p>
            </div>
          </section>

          <aside :class="asideClass">
            <section
              :class="[
                delayedPanelClass,
                shellReady && readyClass
              ]"
            >
              <div class="flex h-full min-h-full flex-col justify-between gap-10">
                <div class="space-y-5 lg:max-w-2xl">
                  <p :class="kickerClass">
                    Protected access
                  </p>
                  <h2 :class="headingClass">
                    Securely access your important application data with {{ brandName }}.
                  </h2>

                  <p :class="leadClass">
                    Use the sign-in method that fits your account, then return to the page you originally requested after authentication.
                  </p>
                </div>

                <div class="grid gap-4 border-y border-[color-mix(in_oklch,var(--app-accent)_14%,var(--app-border))] py-5 sm:grid-cols-3">
                  <div
                    v-for="item in reassuranceItems"
                    :key="item.label"
                    class="space-y-2"
                  >
                    <p :class="factLabelClass">
                      {{ item.label }}
                    </p>
                    <p :class="factValueClass">
                      {{ item.text }}
                    </p>
                  </div>
                </div>

                <div class="relative min-h-[16rem] overflow-hidden lg:min-h-[19rem]">
                  <div class="absolute inset-0" aria-hidden="true">
                    <span class="absolute left-1/2 top-3 -translate-x-1/2 text-[4.5rem] leading-none text-[color-mix(in_oklch,var(--app-accent)_24%,var(--app-border-strong))]">
                      ❦
                    </span>
                    <span :class="[stemClass, 'left-[16%] top-[18%] h-40 [transform:rotate(-18deg)] lg:h-48']" />
                    <span :class="[stemClass, 'right-[18%] top-[20%] h-36 [transform:rotate(24deg)] lg:h-44']" />
                    <span :class="[leafClass, 'left-[9%] top-[26%] [transform:rotate(-28deg)]']" />
                    <span :class="[leafClass, 'left-[18%] top-[44%] [transform:rotate(10deg)] lg:w-[4.75rem]']" />
                    <span :class="[leafClass, 'right-[12%] top-[34%] [transform:rotate(24deg)_scaleX(-1)] lg:w-[4.9rem]']" />
                    <span :class="[leafClass, 'right-[20%] top-[54%] [transform:rotate(-12deg)_scaleX(-1)]']" />
                    <span class="absolute bottom-3 right-[16%] h-52 w-52 rounded-full bg-[radial-gradient(circle,var(--app-bloom)_0%,transparent_70%)]" />
                  </div>

                  <div class="absolute inset-x-[8%] bottom-0 border-t border-[color-mix(in_oklch,var(--app-accent)_14%,var(--app-border))] pt-4">
                    <p :class="leadClass">
                      The login flow stays minimal: clear credentials, quiet guidance, and no extra distractions around the primary action.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </UCard>
    </div>
  </div>
</template>
