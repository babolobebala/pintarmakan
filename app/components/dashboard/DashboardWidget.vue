<script setup lang="ts">
defineProps<{
  title: string
  description?: string
  icon?: string
  muted?: boolean
}>()
</script>

<template>
  <section
    class="flex h-full flex-col gap-5 rounded-[calc(var(--radius-shell)-0.55rem)] border px-5 py-5 shadow-sm sm:px-6"
    :class="muted
      ? 'border-[var(--app-border)] bg-[var(--app-surface-muted)]'
      : 'border-[var(--app-border)] bg-[var(--app-surface)]'"
  >
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div class="space-y-1">
        <div class="flex items-center gap-2">
          <UIcon v-if="icon" :name="icon" class="size-4 text-[var(--app-foreground-soft)]" />
          <h2 class="text-sm font-semibold text-[var(--app-foreground)]">
            {{ title }}
          </h2>
        </div>
        <p v-if="description" class="text-sm leading-6 text-[var(--app-foreground-muted)]">
          {{ description }}
        </p>
      </div>

      <slot name="actions" />
    </div>

    <div class="min-h-0 flex-1">
      <slot />
    </div>

    <slot name="footer" />
  </section>
</template>
