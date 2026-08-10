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

const triggerLabel = computed(() => `Open account menu for ${user.value.label}`)

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

  const settingsItems: DropdownMenuItem[] = [{
    label: 'Pengaturan',
    icon: 'i-lucide-settings-2',
    to: '/pengaturan',
    exact: true
  }]

  if (canKelolaRole.value) {
    settingsItems.push({
      label: 'Kelola User',
      icon: 'i-lucide-users',
      to: '/kelola-user',
      exact: true
    })
  }

  groups.push(settingsItems)

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
    <button
      type="button"
      :aria-label="triggerLabel"
      class="flex h-10 max-w-52 cursor-pointer items-center gap-2 rounded-full bg-[color-mix(in_oklch,var(--app-surface)_90%,white)] py-1 pl-3 pr-1.5 shadow-[0_14px_30px_-26px_color-mix(in_oklch,var(--app-accent)_22%,transparent)] transition-[background-color,box-shadow,transform] duration-200 ease-[var(--ease-out)] hover:-translate-y-px hover:bg-[color-mix(in_oklch,var(--app-accent)_5%,white)] hover:shadow-[0_18px_36px_-26px_color-mix(in_oklch,var(--app-accent)_28%,transparent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-focus)] data-[state=open]:bg-[color-mix(in_oklch,var(--app-accent)_7%,white)] data-[state=open]:shadow-[0_18px_38px_-28px_color-mix(in_oklch,var(--app-accent)_28%,transparent)] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      <span class="truncate text-sm font-medium text-[var(--app-foreground)]">
        {{ user.name }}
      </span>
      <UAvatar
        v-bind="user.avatar"
        :alt="user.name"
        :text="user.name.slice(0, 1)"
        size="md"
        class="ring-1 ring-[color-mix(in_oklch,var(--app-accent)_8%,var(--app-border))]"
      />
    </button>
  </UDropdownMenu>
</template>
