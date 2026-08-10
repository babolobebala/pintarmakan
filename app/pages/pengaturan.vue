<script setup lang="ts">
import AppPageIntro from '~/components/AppPageIntro.vue'
import PwaInstallCard from '~/components/settings/PwaInstallCard.vue'
import PushNotificationsCard from '~/components/settings/PushNotificationsCard.vue'
</script>

<template>
  <div
    class="mx-auto flex w-full max-w-[1800px] flex-col gap-4 sm:gap-6 lg:gap-8"
  >
    <AppPageIntro
      kicker="Pengaturan aplikasi"
      title="Pengaturan"
      description="Kelola preferensi akun dan aplikasi untuk perangkat ini."
    />

    <div class="space-y-6">
      <UPageCard>
        <div class="space-y-6 text-sm">
          <PushNotificationsCard />

          <USeparator />

          <PwaInstallCard />
        </div>
      </UPageCard>
    </div>
  </div>
</template>
