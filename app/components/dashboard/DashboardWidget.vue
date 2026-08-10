<script setup lang="ts">
const props = defineProps<{
  title?: string
  description?: string
  source?: string
  icon?: string
  muted?: boolean
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
</script>

<template>
  <section
    class="flex h-full flex-col gap-5 rounded-[calc(var(--radius-shell)-0.55rem)] border px-5 py-5 shadow-sm sm:px-6"
    :class="muted
      ? 'border-[var(--app-border)] bg-[var(--app-surface-muted)]'
      : 'border-[var(--app-border)] bg-[var(--app-surface)]'"
  >
    <div v-if="hasHeader" class="flex flex-wrap items-start justify-between gap-4">
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
