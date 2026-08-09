<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

import type { DashboardIndicatorKey } from '~~/shared/dashboard'

const props = defineProps<{
  modelValue: DashboardIndicatorKey
  options: typeof import('~~/shared/dashboard').dashboardIndicatorOptions
  pending?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: DashboardIndicatorKey]
}>()

const activeOption = computed(() => {
  return props.options.find(option => option.key === props.modelValue) ?? props.options[0]
})

const items = computed<DropdownMenuItem[][]>(() => ([props.options.map(option => ({
  label: option.label,
  icon: option.icon,
  type: 'checkbox',
  checked: option.key === props.modelValue,
  onSelect(event: Event) {
    event.preventDefault()
    emit('update:modelValue', option.key)
  }
}))]))
</script>

<template>
  <UDropdownMenu
    :items="items"
    :content="{ align: 'start', side: 'bottom', sideOffset: 10 }"
    :ui="{ content: 'w-72 rounded-[var(--radius-panel)]' }"
  >
    <UButton
      color="neutral"
      variant="subtle"
      size="lg"
      :loading="pending"
      class="w-full justify-between rounded-[calc(var(--radius-panel)+0.1rem)] px-4 py-3 text-left shadow-sm sm:w-72"
      :ui="{
        base: 'justify-between',
        label: 'truncate'
      }"
    >
      <template #leading>
        <UIcon :name="activeOption.icon" class="size-4" />
      </template>

      <div class="min-w-0 text-left">
        <p class="cobalt-kicker text-[0.66rem] text-[var(--app-foreground-soft)]">
          Indikator global
        </p>
        <p class="truncate text-sm font-semibold text-[var(--app-foreground)]">
          {{ activeOption.label }}
        </p>
      </div>

      <template #trailing>
        <UIcon name="i-lucide-chevrons-up-down" class="size-4 text-[var(--app-foreground-soft)]" />
      </template>
    </UButton>
  </UDropdownMenu>
</template>
