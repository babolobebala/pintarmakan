<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

import { appPermissions, formatRoleLabel, hasAccessForRole } from '~~/auth/permissions'
import { authClient } from '~~/lib/auth-client'

const router = useRouter()
const { data: currentUser } = await useCurrentUser()

const user = computed(() => ({
  name: currentUser.value?.user.name || 'Account',
  label: currentUser.value?.user.roles[0]
    ? formatRoleLabel(currentUser.value.user.roles[0])
    : currentUser.value?.user.name || 'Account',
  avatar: currentUser.value?.user.image
    ? {
        src: currentUser.value.user.image,
        alt: currentUser.value.user.name
      }
    : undefined
}))

const canOpenPengaturan = computed(() => {
  return hasAccessForRole(currentUser.value?.user.role, appPermissions.settingsRead)
})

const canKelolaRole = computed(() => {
  return hasAccessForRole(currentUser.value?.user.role, appPermissions.membersRead)
})

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

  if (canOpenPengaturan.value) {
    const settingsItems: DropdownMenuItem[] = [{
      label: 'Pengaturan',
      icon: 'i-lucide-settings-2',
      to: '/pengaturan',
      exact: true
    }]

    if (canKelolaRole.value) {
      settingsItems.push({
        label: 'Manage Users',
        icon: 'i-lucide-users',
        to: '/kelola-user',
        exact: true
      })
    }

    groups.push(settingsItems)
  }

  groups.push([{
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
        label: user?.label,
        trailingIcon: 'i-lucide-chevrons-up-down'
      }"
      color="neutral"
      variant="ghost"
      size="sm"
      class="max-w-44 rounded-full px-2 data-[state=open]:bg-[var(--app-surface-muted)]"
      :ui="{
        trailingIcon: 'text-dimmed'
      }"
    />
  </UDropdownMenu>
</template>
