<script setup lang="ts">
defineProps<{
  kicker: string
  title: string
  description: string
}>()
</script>

<template>
  <section
    class="rounded-[var(--radius-shell)] border border-[var(--app-border)] bg-[var(--app-surface)] px-5 py-5 shadow-sm sm:px-6"
  >
    <div class="space-y-2">
      <p class="cobalt-kicker text-[var(--app-foreground-soft)]">
        {{ kicker }}
      </p>
      <div class="space-y-1">
        <h1
          class="text-2xl font-semibold tracking-tight text-[var(--app-foreground)]"
        >
          {{ title }}
        </h1>
        <p class="text-sm leading-6 text-[var(--app-foreground-muted)]">
          {{ description }}
        </p>
      </div>
    </div>
  </section>
</template>
