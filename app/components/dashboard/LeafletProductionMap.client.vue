<script setup lang="ts">
const props = defineProps<{
  commodityLabel: string
  selectedKecamatan?: string | null
}>()
</script>

<template>
  <MapAdministrativeBoundaryMap
    :title="`Peta batas desa, kecamatan, dan kabupaten ${commodityLabel}`"
    description="Layer OSM dengan kabupaten sebagai latar, kecamatan sebagai batas tengah, dan desa sebagai layer klik utama."
    :selected-kecamatan="selectedKecamatan"
  />
</template>
