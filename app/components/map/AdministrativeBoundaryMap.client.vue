<script setup lang="ts">
type LeafletMapInstance = {
  remove: () => void
  invalidateSize: () => void
  setView: (coordinates: [number, number], zoom: number) => LeafletMapInstance
  fitBounds: (bounds: LeafletBoundsInstance, options?: {
    padding?: [number, number]
    maxZoom?: number
  }) => LeafletMapInstance
}

type LeafletBoundsInstance = {
  isValid: () => boolean
}

type LeafletGeoJsonFeature = {
  type: string
  geometry: {
    type: string
    coordinates: unknown
  } | null
  properties?: Record<string, unknown>
}

type LeafletGeoJsonData = {
  type: string
  features?: LeafletGeoJsonFeature[]
  geometry?: {
    type: string
    coordinates: unknown
  }
  [key: string]: unknown
}

type LeafletGeoJsonLayerInstance = {
  addTo: (target: LeafletMapInstance) => LeafletGeoJsonLayerInstance
  remove: () => void
  getBounds: () => LeafletBoundsInstance
}

type LeafletPathStyle = {
  color?: string
  weight?: number
  opacity?: number
  fillColor?: string
  fillOpacity?: number
  dashArray?: string
}

type LeafletGeoJsonFeatureLayerInstance = {
  bindPopup: (content: string) => LeafletGeoJsonFeatureLayerInstance
  on: (event: string, handler: () => void) => LeafletGeoJsonFeatureLayerInstance
  setStyle: (style: LeafletPathStyle) => LeafletGeoJsonFeatureLayerInstance
  openPopup: () => LeafletGeoJsonFeatureLayerInstance
}

type LeafletNamespace = {
  map: (id: string, options: {
    zoomControl: boolean
    scrollWheelZoom: boolean
    attributionControl: boolean
    dragging: boolean
    doubleClickZoom: boolean
    touchZoom: boolean
    boxZoom: boolean
    keyboard: boolean
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
  geoJSON: (data: LeafletGeoJsonData, options: {
    style: LeafletPathStyle
    onEachFeature?: (
      feature: LeafletGeoJsonFeature,
      layer: LeafletGeoJsonFeatureLayerInstance
    ) => void
  }) => LeafletGeoJsonLayerInstance
}

type BoundaryDesaValue = {
  readonly regionId: string
  readonly label?: string | null
  readonly parentLabel?: string | null
  readonly valueKey?: string | null
  readonly valueLabel?: string | null
}

const props = withDefaults(defineProps<{
  title?: string
  description?: string
  selectedKecamatan?: string | null
  mapHeight?: string
  kabupatenGeoJsonPath?: string
  kecamatanGeoJsonPath?: string
  desaGeoJsonPath?: string
  desaValues?: readonly BoundaryDesaValue[]
  valueColorMap?: Record<string, string>
  noDataColor?: string
  noDataLabel?: string
  popupYear?: string | number | null
}>(), {
  title: 'Peta batas administrasi',
  description: 'Layer OSM dengan kabupaten sebagai latar, kecamatan sebagai batas tengah, dan desa sebagai layer klik utama.',
  selectedKecamatan: null,
  mapHeight: '420px',
  kabupatenGeoJsonPath: '/json/kab.geojson',
  kecamatanGeoJsonPath: '/json/kec.geojson',
  desaGeoJsonPath: '/json/desa.geojson',
  desaValues: () => [],
  valueColorMap: () => ({}),
  noDataColor: '#e2e8f0',
  noDataLabel: 'Data belum tersedia',
  popupYear: null
})

const mapEl = useTemplateRef('mapEl')
const mapId = `leaflet-map-${Math.random().toString(36).slice(2)}`

let map: LeafletMapInstance | null = null
let kabupatenLayer: LeafletGeoJsonLayerInstance | null = null
let desaLayer: LeafletGeoJsonLayerInstance | null = null
let kecamatanLayer: LeafletGeoJsonLayerInstance | null = null
let kabupatenDataPromise: Promise<LeafletGeoJsonData> | null = null
let desaDataPromise: Promise<LeafletGeoJsonData> | null = null
let kecamatanDataPromise: Promise<LeafletGeoJsonData> | null = null
let hasFittedBoundary = false

const desaValueMap = computed(() => {
  return new Map(props.desaValues.map(item => [item.regionId.trim(), item]))
})

const useDesaValueStyling = computed(() => {
  return props.desaValues.length > 0
    || Object.keys(props.valueColorMap).length > 0
    || props.popupYear !== null
})

const renderSignature = computed(() => {
  return JSON.stringify({
    selectedKecamatan: props.selectedKecamatan,
    popupYear: props.popupYear,
    desaValues: props.desaValues,
    valueColorMap: props.valueColorMap,
    noDataColor: props.noDataColor,
    noDataLabel: props.noDataLabel
  })
})

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
  return (window as unknown as { L?: LeafletNamespace }).L
}

function normalizeName(value: string | null | undefined) {
  return value?.trim().toUpperCase() ?? ''
}

function normalizeRegionId(value: unknown) {
  return typeof value === 'string' && value.trim()
    ? value.trim()
    : ''
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

function loadDesaGeoJson() {
  desaDataPromise ||= $fetch<LeafletGeoJsonData>(props.desaGeoJsonPath)
  return desaDataPromise
}

function loadKabupatenGeoJson() {
  kabupatenDataPromise ||= $fetch<LeafletGeoJsonData>(props.kabupatenGeoJsonPath)
  return kabupatenDataPromise
}

function loadKecamatanGeoJson() {
  kecamatanDataPromise ||= $fetch<LeafletGeoJsonData>(props.kecamatanGeoJsonPath)
  return kecamatanDataPromise
}

function getDesaName(feature: LeafletGeoJsonFeature) {
  const properties = feature.properties
  const value = properties?.nmdesa

  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : 'Desa tidak diketahui'
}

function getKecamatanName(feature: LeafletGeoJsonFeature) {
  const properties = feature.properties
  const value = properties?.nmkec

  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : 'Kecamatan tidak diketahui'
}

function getFeatureRegionId(feature: LeafletGeoJsonFeature) {
  return normalizeRegionId(feature.properties?.iddesa)
}

function filterGeoJsonByKecamatan(data: LeafletGeoJsonData, selectedKecamatan: string | null | undefined) {
  if (!selectedKecamatan || !data.features) {
    return data
  }

  const expectedName = normalizeName(selectedKecamatan)
  const filteredFeatures = data.features.filter((feature) => {
    const featureName = feature.properties?.nmkec
    return typeof featureName === 'string' && normalizeName(featureName) === expectedName
  })

  if (filteredFeatures.length === 0) {
    return data
  }

  return {
    ...data,
    features: filteredFeatures
  }
}

function getDesaStyle(feature: LeafletGeoJsonFeature): LeafletPathStyle {
  if (!useDesaValueStyling.value) {
    return {
      color: '#111111',
      weight: 1.1,
      opacity: 0.7,
      fillOpacity: 0
    }
  }

  const featureRegionId = getFeatureRegionId(feature)
  const record = desaValueMap.value.get(featureRegionId)
  const fillColor = record?.valueKey ? props.valueColorMap[record.valueKey] : props.noDataColor

  return {
    color: record?.valueKey ? '#334155' : '#94a3b8',
    weight: 1.05,
    opacity: 0.88,
    fillColor,
    fillOpacity: record?.valueKey ? 0.62 : 0.35,
    dashArray: record?.valueKey ? undefined : '4 4'
  }
}

function buildDesaPopupContent(feature: LeafletGeoJsonFeature) {
  const desaName = getDesaName(feature)
  const kecamatanName = getKecamatanName(feature)

  if (!useDesaValueStyling.value) {
    return `
      <div style="min-width: 160px; font-family: sans-serif;">
        <strong>${desaName}</strong>
      </div>
    `
  }

  const featureRegionId = getFeatureRegionId(feature)
  const record = desaValueMap.value.get(featureRegionId)
  const popupDesaName = record?.label || desaName
  const popupKecamatanName = record?.parentLabel || kecamatanName
  const valueLabel = record?.valueLabel || props.noDataLabel
  const yearLine = props.popupYear ? `<div><strong>Tahun:</strong> ${props.popupYear}</div>` : ''

  return `
    <div style="min-width: 190px; font-family: sans-serif; line-height: 1.45;">
      <div><strong>Desa:</strong> ${popupDesaName}</div>
      <div><strong>Kecamatan:</strong> ${popupKecamatanName}</div>
      <div><strong>Prioritas:</strong> ${valueLabel}</div>
      ${yearLine}
    </div>
  `
}

function getHoverStyle(feature: LeafletGeoJsonFeature): LeafletPathStyle {
  const baseStyle = getDesaStyle(feature)

  return {
    ...baseStyle,
    color: '#0f172a',
    weight: (baseStyle.weight ?? 1.1) + 0.45,
    opacity: 1,
    fillOpacity: Math.min((baseStyle.fillOpacity ?? 0) + 0.08, 0.82)
  }
}

async function renderMap() {
  const L = await ensureLeaflet()

  if (!mapEl.value) {
    return
  }

  if (!map) {
    map = L.map(mapId, {
      zoomControl: false,
      scrollWheelZoom: true,
      attributionControl: true,
      dragging: true,
      doubleClickZoom: true,
      touchZoom: true,
      boxZoom: true,
      keyboard: true
    }).setView([-8.8, 116.78], 10)

    L.control.zoom({
      position: 'topleft'
    }).addTo(map)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map)
  }

  try {
    const [kabupatenData, desaData, kecamatanData] = await Promise.all([
      loadKabupatenGeoJson(),
      loadDesaGeoJson(),
      loadKecamatanGeoJson()
    ])
    const filteredDesaData = filterGeoJsonByKecamatan(desaData, props.selectedKecamatan)
    const filteredKecamatanData = filterGeoJsonByKecamatan(kecamatanData, props.selectedKecamatan)

    if (kabupatenLayer) {
      kabupatenLayer.remove()
    }

    if (desaLayer) {
      desaLayer.remove()
    }

    if (kecamatanLayer) {
      kecamatanLayer.remove()
    }

    kabupatenLayer = L.geoJSON(kabupatenData, {
      style: {
        color: '#ffffff',
        weight: 1,
        opacity: 0.95,
        fillOpacity: 0.18
      }
    }).addTo(map)

    kecamatanLayer = L.geoJSON(filteredKecamatanData, {
      style: {
        color: '#111111',
        weight: 1.6,
        opacity: 0.9,
        fillOpacity: 0
      },
      onEachFeature(feature, layer) {
        const kecamatanName = getKecamatanName(feature)

        layer.bindPopup(`
          <div style="min-width: 180px; font-family: sans-serif;">
            <strong>Kecamatan ${kecamatanName}</strong>
          </div>
        `)

        layer.on('mouseover', () => {
          layer.setStyle({
            color: '#000000',
            weight: 2.2,
            opacity: 1,
            fillOpacity: 0.04
          })
        })

        layer.on('mouseout', () => {
          layer.setStyle({
            color: '#111111',
            weight: 1.6,
            opacity: 0.9,
            fillOpacity: 0
          })
        })
      }
    }).addTo(map)

    desaLayer = L.geoJSON(filteredDesaData, {
      style: {
        color: '#111111',
        weight: 1.1,
        opacity: 0.7,
        fillOpacity: 0
      },
      onEachFeature(feature, layer) {
        const baseStyle = getDesaStyle(feature)

        layer.setStyle(baseStyle)
        layer.bindPopup(buildDesaPopupContent(feature))

        layer.on('mouseover', () => {
          layer.setStyle(getHoverStyle(feature))
        })

        layer.on('mouseout', () => {
          layer.setStyle(getDesaStyle(feature))
        })

        layer.on('click', () => {
          layer.openPopup()
        })
      }
    }).addTo(map)

    if (!hasFittedBoundary) {
      const bounds = props.selectedKecamatan
        ? kecamatanLayer.getBounds()
        : kabupatenLayer.getBounds()

      if (bounds.isValid()) {
        map.fitBounds(bounds, {
          padding: [16, 16],
          maxZoom: 11
        })
        hasFittedBoundary = true
      }
    }
  } catch (error) {
    console.error('Gagal memuat batas administrasi GeoJSON.', error)
  }

  map.invalidateSize()
}

onMounted(async () => {
  await renderMap()
})

watch(renderSignature, async () => {
  if (!import.meta.client) {
    return
  }

  hasFittedBoundary = false
  await renderMap()
})

onBeforeUnmount(() => {
  if (kabupatenLayer) {
    kabupatenLayer.remove()
    kabupatenLayer = null
  }

  if (desaLayer) {
    desaLayer.remove()
    desaLayer = null
  }

  if (kecamatanLayer) {
    kecamatanLayer.remove()
    kecamatanLayer = null
  }

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
          {{ title }}
        </p>
        <p class="text-sm text-muted">
          {{ description }}
        </p>
      </div>
    </div>

    <div
      :id="mapId"
      ref="mapEl"
      class="leaflet-map rounded-3xl border border-default"
      :style="{ height: mapHeight }"
    />
  </div>
</template>

<style scoped>
.leaflet-map {
  overflow: hidden;
  background:
    linear-gradient(180deg, rgba(14, 165, 233, 0.08), rgba(34, 197, 94, 0.06)),
    #f8fafc;
}
</style>
