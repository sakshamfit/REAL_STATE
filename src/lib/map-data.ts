import type { Feature, MultiPolygon, Polygon } from 'geojson'

export type StateProperties = {
  id: string
  name: string
  code: string
  /** [lng, lat] */
  centroid: [number, number]
  bbox: [number, number, number, number]
}

export type StateFeature = Feature<Polygon | MultiPolygon, StateProperties>

export type IndiaGeoJSON = {
  type: 'FeatureCollection'
  bbox: [number, number, number, number]
  features: StateFeature[]
}

const DATA_URL = '/data/india-states.json'

let cached: IndiaGeoJSON | null = null
let inflight: Promise<IndiaGeoJSON> | null = null

/** Lazily fetch (and cache) the optimised state boundaries. */
export function loadIndiaData(): Promise<IndiaGeoJSON> {
  if (cached) return Promise.resolve(cached)
  if (inflight) return inflight
  inflight = fetch(DATA_URL)
    .then((response) => {
      if (!response.ok) throw new Error(`Failed to load map data (${response.status})`)
      return response.json() as Promise<IndiaGeoJSON>
    })
    .then((data) => {
      cached = data
      return data
    })
    .catch((error) => {
      inflight = null
      throw error
    })
  return inflight
}

export function getIndiaData() {
  return cached
}

export const stateLabel = (name: string) => name.toUpperCase()
