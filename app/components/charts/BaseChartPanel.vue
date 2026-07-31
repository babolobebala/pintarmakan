<script setup lang="ts">
const props = defineProps<{
  title?: string
  description?: string
}>()
</script>

<template>
  <div class="space-y-4">
    <div
      v-if="props.title || props.description || !!$slots.actions"
      class="flex flex-wrap items-start justify-between gap-3"
    >
      <div class="space-y-1">
        <p v-if="props.title" class="text-sm font-medium text-highlighted">
          {{ props.title }}
        </p>
        <p v-if="props.description" class="text-sm text-muted">
          {{ props.description }}
        </p>
      </div>

      <slot name="actions" />
    </div>

    <div class="rounded-3xl border border-default bg-elevated/60 p-4 sm:p-5">
      <slot />
    </div>
  </div>
</template>
