<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

import type { DashboardKey } from '~~/shared/dashboard'

const props = defineProps<{
  modelValue: DashboardKey
  options: typeof import('~~/shared/dashboard').dashboardOptions
  pending?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: DashboardKey]
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
      size="sm"
      :loading="pending"
      class="w-full justify-between rounded-[calc(var(--radius-panel)+0.05rem)] px-3 py-2 text-left shadow-sm sm:w-64"
      :ui="{
        base: 'justify-between',
        label: 'truncate'
      }"
    >
      <template #leading>
        <UIcon :name="activeOption.icon" class="size-4" />
      </template>

      <span class="truncate text-sm font-medium text-[var(--app-foreground)]">
        {{ activeOption.label }}
      </span>

      <template #trailing>
        <UIcon name="i-lucide-chevrons-up-down" class="size-4 text-[var(--app-foreground-soft)]" />
      </template>
    </UButton>
  </UDropdownMenu>
</template>
