<script setup lang="ts">
import type { DashboardUtamaPayload } from '~~/shared/dashboard'

import IkpWidget from '../widgets/utama/IkpWidget.vue'
import PphKetersediaanWidget from '../widgets/utama/PphKetersediaanWidget.vue'
import PphKonsumsiWidget from '../widgets/utama/PphKonsumsiWidget.vue'
import StatusKetahananPanganWidget from '../widgets/utama/StatusKetahananPanganWidget.vue'

defineProps<{
  payload: DashboardUtamaPayload
  pending?: boolean
}>()
</script>

<template>
  <div
    class="space-y-4"
    :class="pending ? 'opacity-75 transition-opacity' : ''"
  >
    <section class="grid gap-4 xl:grid-cols-3">
      <IkpWidget :indicator="payload.ikp" />
      <PphKetersediaanWidget :indicator="payload.pphKetersediaan" />
      <PphKonsumsiWidget :indicator="payload.pphKonsumsi" />
    </section>

    <section>
      <StatusKetahananPanganWidget :indicator="payload.statusKetahananPangan" />
    </section>
  </div>
</template>
