<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

import { appPermissions, hasAccessForRole } from '~~/auth/permissions'
import { authClient } from '~~/lib/auth-client'

const colorMode = useColorMode()
const router = useRouter()
const { data: currentUser } = await useCurrentUser()

const user = computed(() => ({
  name: currentUser.value?.user.name || 'Account',
  avatar: currentUser.value?.user.image
    ? {
        src: currentUser.value.user.image,
        alt: currentUser.value.user.name
      }
    : undefined
}))

async function signOut() {
  await authClient.signOut()
  await router.push('/login')
}

const items = computed<DropdownMenuItem[][]>(() => {
  const groups: DropdownMenuItem[][] = [[{
    type: 'label',
    label: user.value.name,
    avatar: user.value.avatar
  }]]

  if (hasAccessForRole(currentUser.value?.user.role, appPermissions.settingsRead)) {
    groups.push([{
      label: 'Settings',
      icon: 'i-lucide-settings-2',
      to: '/settings'
    }])
  }

  groups.push([{
    label: 'Appearance',
    icon: 'i-lucide-sun-moon',
    children: [{
      label: 'Light',
      icon: 'i-lucide-sun',
      type: 'checkbox',
      checked: colorMode.value === 'light',
      onSelect(event: Event) {
        event.preventDefault()
        colorMode.preference = 'light'
      }
    }, {
      label: 'Dark',
      icon: 'i-lucide-moon',
      type: 'checkbox',
      checked: colorMode.value === 'dark',
      onSelect(event: Event) {
        event.preventDefault()
        colorMode.preference = 'dark'
      }
    }]
  }], [{
    label: 'Log out',
    icon: 'i-lucide-log-out',
    onSelect: () => signOut()
  }])

  return groups
})
</script>

<template>
  <UDropdownMenu
    :items="items"
    :content="{ align: 'end', collisionPadding: 12 }"
    :ui="{ content: 'w-56 rounded-[var(--radius-panel)]' }"
  >
    <UButton
      v-bind="{
        ...user,
        label: user?.name,
        trailingIcon: 'i-lucide-chevrons-up-down'
      }"
      color="neutral"
      variant="ghost"
      size="sm"
      class="max-w-52 rounded-full px-2 data-[state=open]:bg-[var(--app-surface-muted)]"
      :ui="{
        trailingIcon: 'text-dimmed'
      }"
    />
  </UDropdownMenu>
</template>
