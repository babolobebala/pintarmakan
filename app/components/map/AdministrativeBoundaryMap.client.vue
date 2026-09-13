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
  bindTooltip: (content: string, options?: {
    direction?: string
    sticky?: boolean
    opacity?: number
    className?: string
  }) => LeafletGeoJsonFeatureLayerInstance
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
    style: LeafletPathStyle | ((feature: LeafletGeoJsonFeature) => LeafletPathStyle)
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
  readonly detailLines?: readonly {
    readonly label: string
    readonly value: string
  }[]
}

type BoundaryKecamatanValue = {
  readonly regionName: string
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
  kecamatanValues?: readonly BoundaryKecamatanValue[]
  valueColorMap?: Record<string, string>
  noDataColor?: string
  noDataLabel?: string
  popupYear?: string | number | null
  popupPeriodLabel?: string
  showDesaTooltips?: boolean
  /** Omits village geometry for Kecamatan-only overview maps. */
  showDesaLayer?: boolean
  stopInteractionPropagation?: boolean
  /** Presentation mode: camera framing remains programmatic while manual map navigation is disabled. */
  frozen?: boolean
}>(), {
  title: undefined,
  description: undefined,
  selectedKecamatan: null,
  mapHeight: '420px',
  kabupatenGeoJsonPath: '/json/kab.geojson',
  kecamatanGeoJsonPath: '/json/kec.geojson',
  desaGeoJsonPath: '/json/desa.geojson',
  desaValues: () => [],
  kecamatanValues: () => [],
  valueColorMap: () => ({}),
  noDataColor: '#e2e8f0',
  noDataLabel: 'Data belum tersedia',
  popupYear: null,
  popupPeriodLabel: 'Tahun',
  showDesaTooltips: false,
  showDesaLayer: true,
  stopInteractionPropagation: false,
  frozen: false
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

const kecamatanValueMap = computed(() => {
  return new Map(props.kecamatanValues.map(item => [normalizeName(item.regionName), item]))
})

const useDesaValueStyling = computed(() => {
  return props.desaValues.length > 0
    || Object.keys(props.valueColorMap).length > 0
    || props.popupYear !== null
})

const useKecamatanValueStyling = computed(() => props.kecamatanValues.length > 0)

const renderSignature = computed(() => {
  return JSON.stringify({
    selectedKecamatan: props.selectedKecamatan,
    popupYear: props.popupYear,
    popupPeriodLabel: props.popupPeriodLabel,
    desaValues: props.desaValues,
    kecamatanValues: props.kecamatanValues,
    valueColorMap: props.valueColorMap,
    noDataColor: props.noDataColor,
    noDataLabel: props.noDataLabel,
    showDesaTooltips: props.showDesaTooltips,
    showDesaLayer: props.showDesaLayer,
    frozen: props.frozen
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

function handleInteractionEvent(event: Event) {
  if (props.stopInteractionPropagation) {
    event.stopPropagation()
  }
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
  const fillColor = record?.valueKey
    ? props.valueColorMap[record.valueKey] ?? props.noDataColor
    : props.noDataColor
  const hasValueColor = Boolean(record?.valueKey && props.valueColorMap[record.valueKey])

  return {
    color: hasValueColor ? fillColor : '#94a3b8',
    weight: 1.05,
    opacity: 0.88,
    fillColor,
    fillOpacity: hasValueColor ? 0.62 : 0.35,
    dashArray: hasValueColor ? undefined : '4 4'
  }
}

function getKecamatanStyle(feature: LeafletGeoJsonFeature): LeafletPathStyle {
  if (!useKecamatanValueStyling.value) {
    return {
      color: '#111111',
      weight: 1.6,
      opacity: 0.9,
      fillOpacity: 0
    }
  }

  const record = kecamatanValueMap.value.get(normalizeName(getKecamatanName(feature)))
  const fillColor = record?.valueKey
    ? props.valueColorMap[record.valueKey] ?? props.noDataColor
    : props.noDataColor
  const hasValueColor = Boolean(record?.valueKey && props.valueColorMap[record.valueKey])

  return {
    color: hasValueColor ? '#15803d' : '#94a3b8',
    weight: 1.3,
    opacity: 0.9,
    fillColor,
    fillOpacity: hasValueColor ? 0.76 : 0.35,
    dashArray: hasValueColor ? undefined : '4 4'
  }
}

function buildKecamatanPopupContent(feature: LeafletGeoJsonFeature) {
  const kecamatanName = getKecamatanName(feature)
  const record = kecamatanValueMap.value.get(normalizeName(kecamatanName))
  const yearLine = props.popupYear ? `<div><strong>${props.popupPeriodLabel}:</strong> ${props.popupYear}</div>` : ''

  return `
    <div style="min-width: 170px; font-family: sans-serif; line-height: 1.45;">
      <strong>${kecamatanName}</strong>
      <div>${record?.valueLabel ?? props.noDataLabel}</div>
      ${yearLine}
    </div>
  `
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
  const valueColor = record?.valueKey
    ? props.valueColorMap[record.valueKey] ?? props.noDataColor
    : props.noDataColor
  const detailLines = record?.detailLines
    ?.map(line => `<div><strong>${line.label}:</strong> ${line.value}</div>`)
    .join('') ?? ''
  const yearLine = props.popupYear ? `<div><strong>${props.popupPeriodLabel}:</strong> ${props.popupYear}</div>` : ''

  return `
    <div style="min-width: 190px; font-family: sans-serif; line-height: 1.45;">
      <div><strong>Desa:</strong> ${popupDesaName}</div>
      <div><strong>Kecamatan:</strong> ${popupKecamatanName}</div>
      <div><strong>Prioritas:</strong> <span style="display: inline-block; border-radius: 999px; background: ${valueColor}; padding: 1px 7px;">${valueLabel}</span></div>
      ${detailLines}
      ${yearLine}
    </div>
  `
}

function getHoverStyle(feature: LeafletGeoJsonFeature): LeafletPathStyle {
  const baseStyle = getDesaStyle(feature)

  return {
    ...baseStyle,
    weight: (baseStyle.weight ?? 1.1) + 0.75,
    opacity: 1,
    fillOpacity: Math.min((baseStyle.fillOpacity ?? 0) + 0.16, 0.82)
  }
}

function getKecamatanHoverStyle(feature: LeafletGeoJsonFeature): LeafletPathStyle {
  const baseStyle = getKecamatanStyle(feature)

  return {
    ...baseStyle,
    weight: (baseStyle.weight ?? 1.6) + 0.7,
    opacity: 1,
    fillOpacity: Math.min((baseStyle.fillOpacity ?? 0) + 0.12, 0.88)
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
      scrollWheelZoom: !props.frozen,
      attributionControl: true,
      dragging: !props.frozen,
      doubleClickZoom: !props.frozen,
      touchZoom: !props.frozen,
      boxZoom: !props.frozen,
      keyboard: !props.frozen
    }).setView([-8.8, 116.78], 10)

    if (!props.frozen) {
      L.control.zoom({
        position: 'topleft'
      }).addTo(map)
    }

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map)
  }

  try {
    const [kabupatenData, desaData, kecamatanData] = await Promise.all([
      loadKabupatenGeoJson(),
      props.showDesaLayer ? loadDesaGeoJson() : Promise.resolve(null),
      loadKecamatanGeoJson()
    ])
    const filteredDesaData = desaData ? filterGeoJsonByKecamatan(desaData, props.selectedKecamatan) : null
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
      style: getKecamatanStyle,
      onEachFeature(feature, layer) {
        layer.bindPopup(useKecamatanValueStyling.value
          ? buildKecamatanPopupContent(feature)
          : `<div style="min-width: 180px; font-family: sans-serif;"><strong>Kecamatan ${getKecamatanName(feature)}</strong></div>`)

        if (useKecamatanValueStyling.value) {
          layer.bindTooltip(buildKecamatanPopupContent(feature), {
            direction: 'top',
            sticky: true,
            opacity: 0.96,
            className: 'administrative-boundary-tooltip'
          })
        }

        layer.on('mouseover', () => {
          layer.setStyle(getKecamatanHoverStyle(feature))
        })

        layer.on('mouseout', () => {
          layer.setStyle(getKecamatanStyle(feature))
        })
      }
    }).addTo(map)

    desaLayer = filteredDesaData
      ? L.geoJSON(filteredDesaData, {
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

            if (props.showDesaTooltips) {
              layer.bindTooltip(buildDesaPopupContent(feature), {
                direction: 'top',
                sticky: true,
                opacity: 0.96,
                className: 'administrative-boundary-tooltip'
              })
            }

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
      : null

    if (!hasFittedBoundary) {
      const bounds = props.selectedKecamatan || !props.showDesaLayer
        ? kecamatanLayer.getBounds()
        : kabupatenLayer.getBounds()

      if (bounds.isValid()) {
        map.fitBounds(bounds, {
          padding: props.showDesaLayer ? [16, 16] : [8, 8],
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
  <div
    class="space-y-4"
    @click="handleInteractionEvent"
    @mousedown="handleInteractionEvent"
    @pointerdown="handleInteractionEvent"
    @dblclick="handleInteractionEvent"
    @touchstart="handleInteractionEvent"
    @wheel="handleInteractionEvent"
    @keydown="handleInteractionEvent"
  >
    <div v-if="title || description" class="flex flex-wrap items-center justify-between gap-3">
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
