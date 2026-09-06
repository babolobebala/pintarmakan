<script setup lang="ts">
const props = defineProps<{
  title?: string
  description?: string
  source?: string
  icon?: string
  muted?: boolean
  interactive?: boolean
  activationLabel?: string
}>()

const emit = defineEmits<{
  activate: []
}>()

const slots = useSlots()

const hasHeader = computed(() => {
  return Boolean(
    props.title
    || props.description
    || props.source
    || props.icon
    || slots.header
    || slots.actions
  )
})

function activate() {
  if (props.interactive) {
    emit('activate')
  }
}

function activateFromKeyboard(event: KeyboardEvent) {
  if (!props.interactive || event.target !== event.currentTarget) {
    return
  }

  event.preventDefault()
  emit('activate')
}
</script>

<template>
  <section
    class="flex h-full flex-col gap-4 rounded-[calc(var(--radius-shell)-0.55rem)] border px-4 py-4 shadow-sm sm:px-5"
    :class="[
      muted
        ? 'border-[var(--app-border)] bg-[var(--app-surface-muted)]'
        : 'border-[var(--app-border)] bg-[var(--app-surface)]',
      interactive
        ? 'cursor-pointer transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-[var(--app-foreground-soft)] hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-foreground)]'
        : ''
    ]"
    :role="interactive ? 'button' : undefined"
    :tabindex="interactive ? 0 : undefined"
    :aria-label="interactive ? (activationLabel ?? title ?? 'Buka detail data') : undefined"
    @click="activate"
    @keydown.enter="activateFromKeyboard"
    @keydown.space="activateFromKeyboard"
  >
    <div v-if="hasHeader" class="flex flex-wrap items-start justify-between gap-3">
      <slot name="header">
        <div class="min-w-0 space-y-1.5">
          <div v-if="icon || title" class="flex items-center gap-2">
            <UIcon v-if="icon" :name="icon" class="size-4 shrink-0 text-[var(--app-foreground-soft)]" />
            <h2 v-if="title" class="text-sm font-semibold text-[var(--app-foreground)]">
              {{ title }}
            </h2>
          </div>

          <p
            v-if="source"
            class="text-[0.68rem] font-medium uppercase tracking-[0.18em] text-[var(--app-foreground-soft)]"
          >
            {{ source }}
          </p>

          <p v-if="description" class="text-sm leading-6 text-[var(--app-foreground-muted)]">
            {{ description }}
          </p>
        </div>
      </slot>

      <slot name="actions" />
    </div>

    <div class="min-h-0 flex-1">
      <slot />
    </div>

    <slot name="footer" />
  </section>
</template>
