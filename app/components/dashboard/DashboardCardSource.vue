<script setup lang="ts">
defineProps<{
  source: string | null
}>()
</script>

<template>
  <p class="truncate text-[0.68rem] leading-4 text-[var(--app-foreground-muted)]" :title="source ?? 'Sumber belum tersedia'">
    {{ source ? `Sumber: ${source}` : 'Sumber belum tersedia' }}
  </p>
</template>
