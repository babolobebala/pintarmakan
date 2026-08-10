<script setup lang="ts">
import type { DashboardUtamaPayload } from '~~/shared/dashboard'

import IkpWidget from '../widgets/utama/IkpWidget.vue'
import PphKetersediaanWidget from '../widgets/utama/PphKetersediaanWidget.vue'
import PphKonsumsiWidget from '../widgets/utama/PphKonsumsiWidget.vue'
import StatusKetahananPanganWidget from '../widgets/utama/StatusKetahananPanganWidget.vue'

const props = defineProps<{
  payload: DashboardUtamaPayload
  pending?: boolean
}>()
</script>

<template>
  <div
    class="space-y-3"
    :class="pending ? 'opacity-75 transition-opacity' : ''"
  >
    <section class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      <IkpWidget :dataset="props.payload.datasets.IKP_TAHUNAN" />
      <PphKetersediaanWidget :dataset="props.payload.datasets.PPH_KETERSEDIAAN_TAHUNAN" />
      <PphKonsumsiWidget :dataset="props.payload.datasets.PPH_KONSUMSI_TAHUNAN" />
    </section>

    <section>
      <StatusKetahananPanganWidget :dataset="props.payload.datasets.STATUS_KETAHANAN_PANGAN_TAHUNAN" />
    </section>
  </div>
</template>
