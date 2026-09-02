/**
 * Build pipeline: TopoJSON (India, state boundaries) -> optimised GeoJSON for the 3D map.
 *
 * Source data: https://github.com/udit-001/india-maps-data (topojson/india.json)
 * The raw topology is not committed; run `npm run data:india` after refreshing
 * `data/raw/india-topo.json`.
 *
 * Pipeline:
 *   TopoJSON  ->  presimplify  ->  simplify (min-weight)  ->  feature()  ->  clean + normalise
 *
 * The output keeps every state as an independent feature so that the 3D map can
 * extrude and select states individually.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as topojson from 'topojson-client'
import { presimplify, simplify } from 'topojson-simplify'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const RAW = path.join(ROOT, 'data/raw/india-topo.json')
const OUT_DIR = path.join(ROOT, 'public/data')
const OUT = path.join(OUT_DIR, 'india-states.json')

const MIN_WEIGHT = Number(process.env.MIN_WEIGHT ?? 0.0000045) // degrees², tuned for ~1km detail
const PRECISION = Number(process.env.PRECISION ?? 3) // decimal places (~110m)
const MIN_RING_AREA = Number(process.env.MIN_RING_AREA ?? 0.00012) // deg², drops slivers but keeps Delhi/Chandigarh

const raw = JSON.parse(fs.readFileSync(RAW, 'utf8'))

// --- 1. simplify the topology (shared arcs -> no gaps between neighbouring states)
let topo = presimplify(raw)
const before = countPoints(topo)
topo = simplify(topo, MIN_WEIGHT)
const after = countPoints(topo)

// --- 2. convert to GeoJSON
const collection = topojson.feature(topo, topo.objects.states)

// --- 3. normalise
const features = []
for (const feature of collection.features) {
  const name = normaliseName(feature.properties?.st_nm ?? feature.properties?.state ?? 'Unknown')
  if (!name) continue
  const geometry = cleanGeometry(feature.geometry)
  if (!geometry) continue
  const bbox = bboxOf(geometry)
  features.push({
    type: 'Feature',
    properties: {
      id: slug(name),
      name,
      code: String(feature.properties?.st_code ?? ''),
      bbox,
      centroid: centroidOf(geometry),
    },
    geometry,
  })
}

features.sort((a, b) => a.properties.name.localeCompare(b.properties.name))

const out = {
  type: 'FeatureCollection',
  generator: 'scripts/build-map-data.mjs',
  source: 'udit-001/india-maps-data (states topology)',
  bbox: raw.bbox,
  features,
}

fs.mkdirSync(OUT_DIR, { recursive: true })
fs.writeFileSync(OUT, JSON.stringify(out))
const bytes = fs.statSync(OUT).size

console.log(`points    : ${before} -> ${after} (${((after / before) * 100).toFixed(1)}% retained)`)
console.log(`states    : ${features.length}`)
console.log(`min-weight: ${MIN_WEIGHT}`)
console.log(`output    : ${path.relative(ROOT, OUT)}  ${(bytes / 1024).toFixed(1)} KB`)
const tiny = features.filter((f) => areaOf(f.geometry) < 0.02).map((f) => f.properties.name)
console.log(`smallest  : ${tiny.join(', ') || '(none under 0.02 deg²)'}`)

// ---------------------------------------------------------------- helpers

function countPoints(topology) {
  let n = 0
  for (const arc of topology.arcs) n += arc.length
  return n
}

/** Drop slivers, round coordinates, keep Polygon/MultiPolygon only. */
function cleanGeometry(geometry) {
  if (!geometry) return null
  const polygons = []
  const parts =
    geometry.type === 'Polygon'
      ? [geometry.coordinates]
      : geometry.type === 'MultiPolygon'
        ? geometry.coordinates
        : []

  for (const rings of parts) {
    const cleaned = rings
      .map((ring) => dedupeRing(ring.map(([lng, lat]) => [round(lng), round(lat)])))
      .filter((ring) => ring.length >= 4)
      .filter((ring, index) => index === 0 || Math.abs(ringArea(ring)) >= MIN_RING_AREA)
    if (cleaned.length && cleaned[0].length >= 4) polygons.push(cleaned)
  }
  if (!polygons.length) return null
  return polygons.length === 1
    ? { type: 'Polygon', coordinates: polygons[0] }
    : { type: 'MultiPolygon', coordinates: polygons }
}

function dedupeRing(ring) {
  const out = []
  for (const point of ring) {
    const prev = out[out.length - 1]
    if (!prev || prev[0] !== point[0] || prev[1] !== point[1]) out.push(point)
  }
  if (out.length > 1) {
    const first = out[0]
    const last = out[out.length - 1]
    if (first[0] !== last[0] || first[1] !== last[1]) out.push([first[0], first[1]])
  }
  return out
}

function round(n) {
  const f = 10 ** PRECISION
  return Math.round(n * f) / f
}

function eachRing(geometry, fn) {
  const parts =
    geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.type === 'MultiPolygon' ? geometry.coordinates : []
  for (const rings of parts) for (const ring of rings) fn(ring)
}

function ringArea(ring) {
  let area = 0
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    area += (ring[j][0] + ring[i][0]) * (ring[j][1] - ring[i][1])
  }
  return area / 2
}

function areaOf(geometry) {
  let total = 0
  eachRing(geometry, (ring) => (total += Math.abs(ringArea(ring))))
  return total
}

function bboxOf(geometry) {
  let [minX, minY, maxX, maxY] = [Infinity, Infinity, -Infinity, -Infinity]
  eachRing(geometry, (ring) => {
    for (const [x, y] of ring) {
      if (x < minX) minX = x
      if (y < minY) minY = y
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
    }
  })
  return [minX, minY, maxX, maxY]
}

/** Area weighted centroid of the largest ring — used for camera framing + labels. */
function centroidOf(geometry) {
  let best = null
  let bestArea = -Infinity
  eachRing(geometry, (ring) => {
    const area = Math.abs(ringArea(ring))
    if (area > bestArea) {
      bestArea = area
      best = ring
    }
  })
  if (!best) return [0, 0]
  let cx = 0
  let cy = 0
  let a = 0
  for (let i = 0, j = best.length - 1; i < best.length; j = i++) {
    const cross = best[j][0] * best[i][1] - best[i][0] * best[j][1]
    a += cross
    cx += (best[j][0] + best[i][0]) * cross
    cy += (best[j][1] + best[i][1]) * cross
  }
  if (Math.abs(a) < 1e-9) return [best[0][0], best[0][1]]
  return [round(cx / (3 * a)), round(cy / (3 * a))]
}

function normaliseName(name) {
  const value = String(name).trim().replace(/\s+/g, ' ')
  const map = {
    'Jammu and Kashmir': 'Jammu & Kashmir',
    'Andaman and Nicobar Islands': 'Andaman & Nicobar Islands',
    'Dadra and Nagar Haveli and Daman and Diu': 'Dadra & Nagar Haveli and Daman & Diu',
    Orissa: 'Odisha',
    Pondicherry: 'Puducherry',
    Uttaranchal: 'Uttarakhand',
  }
  return map[value] ?? value
}

function slug(name) {
  return name
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
