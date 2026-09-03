/**
 * Scene layout.
 *
 * Where everything stands. Keeping placement in one pure module means the
 * React scene and the offline QA rasteriser render the same world, and the
 * story beats in `chapters.ts` always frame something real.
 *
 * Coordinates are metres. `y` is resolved from the terrain (`terrainHeight`)
 * unless a prop is deliberately lifted onto something else.
 */

import { prng, scatter, terrainHeight } from './terrain'
import { HERO_BUILDING } from './world'

export type Placed = {
  id: string
  x: number
  z: number
  /** yaw in radians */
  rotation: number
  scale?: number
  /** non-uniform vertical scale: no two specimens share a silhouette */
  scaleY?: number
  y?: number
}

export type Patch = {
  surface: 'soil' | 'soilDry' | 'gravel' | 'asphalt' | 'asphaltPatch' | 'concrete' | 'sand'
  width: number
  length: number
  x: number
  z: number
  rotation: number
  seed: number
  dissolve: number
  strength: number
  opacity: number
}

/** The hero plot: a real walled compound west of the road. */
export const PLOT = { x0: -59, x1: -21, z0: -128, z1: -77 }
export const GATE = { x: -21, z: -92 }
export const ROAD_EDGE = 8.25
/** Left-hand traffic: northbound (-z) keeps to -x, southbound (+z) to +x. */
export const LANE = 1.9

const seat = (x: number, z: number, sink = 0) => terrainHeight(x, z) - sink

/* ----------------------------------------------------------- plot boundary */

/** Boundary wall segments around the hero compound. */
export function boundaryWalls(): Placed[] {
  const list: Placed[] = []
  const segment = 12

  const run = (fixed: number, from: number, to: number, along: 'x' | 'z') => {
    const steps = Math.max(1, Math.round((to - from) / segment))
    for (let i = 0; i < steps; i++) {
      const a = from + ((to - from) * i) / steps
      const b = from + ((to - from) * (i + 1)) / steps
      const centre = (a + b) / 2
      const length = Math.abs(b - a)
      const x = along === 'z' ? fixed : centre
      const z = along === 'z' ? centre : fixed
      list.push({
        id: 'boundary-wall',
        x,
        z,
        rotation: along === 'z' ? Math.PI / 2 : 0,
        scale: length / 12,
        y: seat(x, z),
      })
    }
  }

  // road frontage, with the entrance left open for the gate
  run(PLOT.x1, PLOT.z1, GATE.z - 6.2, 'z')
  run(PLOT.x1, GATE.z + 6.2, PLOT.z0, 'z')
  // rear and side boundaries
  run(PLOT.x0, PLOT.z0, PLOT.z1, 'z')
  run(PLOT.z0, PLOT.x0, PLOT.x1, 'x')
  run(PLOT.z1, PLOT.x0, PLOT.x1, 'x')
  return list
}

/* ------------------------------------------------------------ street lights */

export function streetLights(spacing = 46): Placed[] {
  const list: Placed[] = []
  for (let z = -8; z > -940; z -= spacing) {
    const side = Math.round(z / spacing) % 2 === 0 ? -1 : 1
    // no column where the site entrance meets the road
    if (side === -1 && z < -46 && z > -74) continue
    const x = side * (ROAD_EDGE - 0.6)
    list.push({ id: 'street-light', x, z, rotation: side < 0 ? 0 : Math.PI, y: seat(x, z) })
  }
  return list
}

/* --------------------------------------------------------------- site yard */

/** Working yard inside the compound: plant, materials, shed, barriers. */
export function yardProps(): Placed[] {
  const b = HERO_BUILDING
  const props: [string, number, number, number][] = [
    ['construction-shed', b.x - 15, b.z - 18, 0.42],
    ['material-stack', b.x - 15, b.z + 16, 0.9],
    ['cement-bags', b.x + 14, b.z + 20, -0.3],
    ['rebar-stack', b.x - 11, b.z - 16, 0.4],
    ['excavator', b.x + 9, b.z - 16, -1.1],
    ['truck-a', b.x + 14, b.z - 4, Math.PI / 2],
    // material stock staged along the corridor for the service worlds
    ['material-stack', -40, -318, 2.1],
    ['cement-bags', 46, -470, 1.4],
    ['rebar-stack', 44, -286, -0.7],
  ]
  return props.map(([id, x, z, rotation]) => ({ id, x, z, rotation, y: seat(x, z) }))
}

export function yardBarriers(): Placed[] {
  return [-1, 0, 1].map((i) => {
    const x = PLOT.x1 + 2.6
    const z = GATE.z + i * 3.2
    return { id: 'barrier', x, z, rotation: -Math.PI / 2, scale: 0.92, y: seat(x, z) }
  })
}

/** Ground patches: compacted yard, spill marks, dust drift. */
export function groundPatches(): Patch[] {
  return [
    {
      surface: 'soilDry',
      width: 40,
      length: 44,
      x: HERO_BUILDING.x - 2,
      z: HERO_BUILDING.z + 18,
      rotation: 0.08,
      seed: 21,
      dissolve: 0.85,
      strength: 0.95,
      opacity: 0.7,
    },
    {
      surface: 'gravel',
      width: 26,
      length: 16,
      x: HERO_BUILDING.x + 16,
      z: HERO_BUILDING.z + 26,
      rotation: -0.2,
      seed: 33,
      dissolve: 0.9,
      strength: 0.8,
      opacity: 0.55,
    },
    {
      surface: 'soilDry',
      width: 16,
      length: 14,
      x: -6.5,
      z: GATE.z,
      rotation: 0.1,
      seed: 41,
      dissolve: 1,
      strength: 0.85,
      opacity: 0.5,
    },
  ]
}

/* --------------------------------------------------------- parked vehicles */

export function parkedVehicles(): { id: string; items: Placed[] }[] {
  const carsA = [-34, -150, -402, -676].map((z, index) => ({
    id: 'car-a',
    x: index % 2 === 0 ? -6.6 : 6.8,
    z,
    rotation: index % 2 === 0 ? Math.PI / 2 : -Math.PI / 2,
    y: 0,
  }))
  const carsB = [-96, -292, -640].map((z, index) => ({
    id: 'car-c',
    x: index % 2 === 0 ? 6.6 : -6.5,
    z,
    rotation: index % 2 === 0 ? -Math.PI / 2 : Math.PI / 2,
    y: 0,
  }))
  return [
    { id: 'car-a', items: carsA },
    { id: 'car-c', items: carsB },
  ]
}

/* ------------------------------------------------------------------ traffic */

export type TrafficCar = {
  id: 'car-b' | 'car-c'
  /** -1 travels north (-z) in the -x lane, +1 travels south (+z) */
  direction: -1 | 1
  speed: number
  start: number
  laneOffset: number
}

export const TRAFFIC: TrafficCar[] = [
  { id: 'car-b', direction: -1, speed: 12.5, start: -20, laneOffset: 0 },
  { id: 'car-c', direction: 1, speed: 10.5, start: -220, laneOffset: 0.1 },
  { id: 'car-b', direction: -1, speed: 14, start: -430, laneOffset: -0.15 },
  { id: 'car-c', direction: 1, speed: 11.5, start: -640, laneOffset: 0.05 },
]

/* --------------------------------------------------------------- vegetation */

const TIER = {
  low: { trees: 22, shrubs: 26, minDistance: 13 },
  mid: { trees: 48, shrubs: 50, minDistance: 9.5 },
  high: { trees: 86, shrubs: 92, minDistance: 7.5 },
} as const

/** Chapter plots, pads and structures: nothing may grow through them. */
const KEEP_CLEAR: [number, number, number][] = [
  [-40, -104, 34],
  [-48, -206, 40],
  [50, -262, 34],
  [-48, -300, 42],
  [50, -360, 40],
  [-48, -412, 34],
  [50, -451, 40],
  [-50, -520, 30],
  [-38, -744, 26],
  [44, -820, 22],
  [0, -1000, 74],
  [0, -1150, 40],
]

export function nearKeepClear(x: number, z: number, pad = 16) {
  return KEEP_CLEAR.some(([px, pz, r]) => {
    const dx = x - px
    const dz = z - pz
    return dx * dx + dz * dz < (r + pad) * (r + pad)
  })
}

const TREE_SPECIES = ['tree-a', 'tree-b', 'tree-c', 'tree-d']

export function trees(tier: 'low' | 'mid' | 'high'): { id: string; items: Placed[] }[] {
  const settings = TIER[tier]
  const random = prng(401)
  const points = scatter(401, {
    count: settings.trees,
    xRange: [-112, 112],
    zRange: [-940, 30],
    minDistance: settings.minDistance,
    avoid: (x, z) => {
      if (Math.abs(x) < 9.5) return true // road reserve
      if (x > -62 && x < -18 && z > -132 && z < -74) return true // hero compound
      if (Math.abs(x) < 14 && z > -20 && z < 40) return true // gate approach
      return nearKeepClear(x, z)
    },
  })

  const buckets = new Map<string, Placed[]>()
  for (const point of points) {
    const id = TREE_SPECIES[Math.floor(random() * TREE_SPECIES.length)]
    const base = id === 'tree-b' ? 1.16 : id === 'tree-d' ? 0.78 : id === 'tree-c' ? 1.06 : 0.94
    const scale = base * (0.76 + random() * 0.56)
    const item: Placed = {
      id,
      x: point.x,
      z: point.z,
      rotation: random() * Math.PI * 2,
      scale,
      scaleY: scale * (0.9 + random() * 0.26),
      y: seat(point.x, point.z, 0.06),
    }
    const bucket = buckets.get(id)
    if (bucket) bucket.push(item)
    else buckets.set(id, [item])
  }
  return [...buckets.entries()].map(([id, items]) => ({ id, items }))
}

export function shrubs(tier: 'low' | 'mid' | 'high'): { id: string; items: Placed[] }[] {
  const settings = TIER[tier]
  const random = prng(577)
  const points = scatter(577, {
    count: settings.shrubs,
    xRange: [-78, 78],
    zRange: [-940, 30],
    minDistance: 3.6,
    avoid: (x, z) => Math.abs(x) < 7.2 || nearKeepClear(x, z, 3),
  })

  const buckets = new Map<string, Placed[]>()
  for (const point of points) {
    const id = random() < 0.6 ? 'bush' : 'shrub-dry'
    const scale = 0.66 + random() * 1.0
    const item: Placed = {
      id,
      x: point.x,
      z: point.z,
      rotation: random() * Math.PI * 2,
      scale,
      scaleY: scale * (0.82 + random() * 0.3),
      y: seat(point.x, point.z, 0.04),
    }
    const bucket = buckets.get(id)
    if (bucket) bucket.push(item)
    else buckets.set(id, [item])
  }
  return [...buckets.entries()].map(([id, items]) => ({ id, items }))
}

/* ------------------------------------------------------------------- grass */

export type GrassLayerSpec = {
  seed: number
  count: number
  dry: boolean
  scaleRange: [number, number]
  xRange: [number, number]
  quadrants: number[]
}

export const GRASS_LAYERS: GrassLayerSpec[] = [
  // short grazed grass, densest beside the carriageway
  { seed: 811, count: 9000, dry: false, scaleRange: [0.75, 1.45], xRange: [-30, 30], quadrants: [0, 1, 2] },
  // taller weeds and forbs further out
  { seed: 821, count: 6000, dry: false, scaleRange: [1.15, 2.35], xRange: [-74, 74], quadrants: [2, 3, 0] },
  // dry stubble on the bare, dusty ground
  { seed: 831, count: 4200, dry: true, scaleRange: [0.9, 1.9], xRange: [-74, 74], quadrants: [1, 3, 2] },
]

export function grassPoints(spec: GrassLayerSpec, density: number) {
  return scatter(spec.seed, {
    count: Math.max(40, Math.round(spec.count * density)),
    xRange: spec.xRange,
    zRange: [-940, 30],
    minDistance: 0,
    avoid: (x, z) => Math.abs(x) < 5.6 || nearKeepClear(x, z, 2),
  })
}
