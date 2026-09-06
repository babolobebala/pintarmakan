<script setup lang="ts">
defineProps<{
  source: string | null
}>()
</script>

<template>
  <p class="text-xs text-[var(--app-foreground-muted)]">
    Sumber: {{ source ?? 'Sumber belum tersedia' }}
  </p>
</template>
