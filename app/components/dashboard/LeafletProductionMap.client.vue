<script setup lang="ts">
type ProductionLocation = {
  name: string
  lat: number
  lng: number
  harvestArea: number
  production: number
}

type LeafletMapInstance = {
  remove: () => void
  invalidateSize: () => void
  setView: (coordinates: [number, number], zoom: number) => LeafletMapInstance
}

type LeafletLayerGroupInstance = {
  addTo: (target: LeafletMapInstance) => void
  remove: () => void
}

type LeafletCircleMarkerInstance = {
  bindPopup: (content: string) => LeafletCircleMarkerInstance
  addTo: (target: LeafletLayerGroupInstance) => void
}

type LeafletNamespace = {
  map: (id: string, options: {
    zoomControl: boolean
    scrollWheelZoom: boolean
    attributionControl: boolean
  }) => LeafletMapInstance
  control: {
    zoom: (options: {
      position: string
    }) => {
      addTo: (target: LeafletMapInstance) => void
    }
  }
  tileLayer: (url: string, options: {
    maxZoom: number
    attribution: string
  }) => {
    addTo: (target: LeafletMapInstance) => void
  }
  layerGroup: () => LeafletLayerGroupInstance
  circleMarker: (coordinates: [number, number], options: {
    radius: number
    color: string
    weight: number
    fillColor: string
    fillOpacity: number
  }) => LeafletCircleMarkerInstance
}

const props = defineProps<{
  commodityLabel: string
  unitLabel: string
  locations: ProductionLocation[]
}>()

const mapEl = useTemplateRef('mapEl')
const mapId = `leaflet-map-${Math.random().toString(36).slice(2)}`

let map: LeafletMapInstance | null = null
let markersLayer: LeafletLayerGroupInstance | null = null

useHead({
  link: [{
    rel: 'stylesheet',
    href: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
  }],
  script: [{
    src: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
    defer: true
  }]
})

function getLeaflet() {
  return (window as Window & { L?: LeafletNamespace }).L
}

async function ensureLeaflet(): Promise<LeafletNamespace> {
  const existing = getLeaflet()
  if (existing) {
    return existing
  }

  await new Promise<void>((resolve, reject) => {
    let elapsed = 0
    const timer = window.setInterval(() => {
      const L = getLeaflet()
      elapsed += 100

      if (L) {
        window.clearInterval(timer)
        resolve()
        return
      }

      if (elapsed >= 5000) {
        window.clearInterval(timer)
        reject(new Error('Leaflet gagal dimuat.'))
      }
    }, 100)
  })

  const loaded = getLeaflet()

  if (!loaded) {
    throw new Error('Leaflet gagal dimuat.')
  }

  return loaded
}

function circleColor(value: number, max: number) {
  const ratio = max > 0 ? value / max : 0

  if (ratio >= 0.8) {
    return '#15803d'
  }

  if (ratio >= 0.6) {
    return '#65a30d'
  }

  if (ratio >= 0.4) {
    return '#d97706'
  }

  return '#dc2626'
}

async function renderMap() {
  const L = await ensureLeaflet()

  if (!mapEl.value) {
    return
  }

  if (!map) {
    map = L.map(mapId, {
      zoomControl: false,
      scrollWheelZoom: false,
      attributionControl: true
    }).setView([-8.8, 116.78], 10)

    L.control.zoom({
      position: 'bottomright'
    }).addTo(map)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map)
  }

  if (markersLayer) {
    markersLayer.remove()
  }

  markersLayer = L.layerGroup()
  const maxProduction = Math.max(...props.locations.map(item => item.production), 1)

  for (const location of props.locations) {
    const color = circleColor(location.production, maxProduction)
    const radius = 10 + ((location.production / maxProduction) * 24)

    L.circleMarker([location.lat, location.lng], {
      radius,
      color,
      weight: 2,
      fillColor: color,
      fillOpacity: 0.28
    })
      .bindPopup(`
        <div style="min-width: 180px; font-family: sans-serif;">
          <strong>${location.name}</strong><br/>
          Luas panen: ${location.harvestArea.toLocaleString('id-ID')} ha<br/>
          Produksi: ${location.production.toLocaleString('id-ID')} ${props.unitLabel}
        </div>
      `)
      .addTo(markersLayer)
  }

  markersLayer.addTo(map)
  map.invalidateSize()
}

watch(() => props.locations, async () => {
  if (!import.meta.client) {
    return
  }

  await renderMap()
}, { deep: true })

onMounted(async () => {
  await renderMap()
})

onBeforeUnmount(() => {
  if (map) {
    map.remove()
    map = null
  }
})
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p class="text-sm font-medium text-highlighted">
          Peta sebaran {{ commodityLabel }}
        </p>
        <p class="text-sm text-muted">
          Layer OSM + marker ukuran produksi per kecamatan.
        </p>
      </div>

      <div class="flex flex-wrap gap-2 text-xs">
        <span class="rounded-full bg-red-50 px-3 py-1 text-red-700">Rendah</span>
        <span class="rounded-full bg-amber-50 px-3 py-1 text-amber-700">Menengah</span>
        <span class="rounded-full bg-lime-50 px-3 py-1 text-lime-700">Tinggi</span>
        <span class="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">Sangat tinggi</span>
      </div>
    </div>

    <div :id="mapId" ref="mapEl" class="leaflet-map rounded-3xl border border-default" />
  </div>
</template>

<style scoped>
.leaflet-map {
  height: 420px;
  overflow: hidden;
  background:
    linear-gradient(180deg, rgba(14, 165, 233, 0.08), rgba(34, 197, 94, 0.06)),
    #f8fafc;
}
</style>
