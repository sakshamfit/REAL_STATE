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

import { HALF as ROAD_HALF, SHOULDER as ROAD_SHOULDER, carriagewayHeight } from './road-geometry'
import { fbm2, prng, scatter, terrainHeight } from './terrain'
import { HERO_BUILDING } from './world'
import { resolveAssetIds, stageByRealism } from '@/data/assets'

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
/**
 * Outer edge of the road reserve — the boundary of the highway land, where
 * street furniture and boundary walls line up.
 *
 * This is NOT the edge of the road surface. The carriageway ends at
 * `ROAD_HALF` (3.75 m) and the metalled shoulder at 5.65 m; everything beyond
 * that is grass verge. Anything that is supposed to stand on the road — a
 * parked vehicle, a cone, a barrier — must be placed against `SHOULDER_EDGE`,
 * not against this. Parked cars used to sit at x = ±6.6 and were a metre out
 * on the grass with their far wheels in the drain.
 */
export const ROAD_EDGE = 8.25

/** Edge of the metalled surface: the last x a wheel can rest on. */
export const SHOULDER_EDGE = ROAD_HALF + ROAD_SHOULDER
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

/**
 * Street lighting along the corridor.
 *
 * The pool may hold more than one column type once the developer drops an
 * external lamp in. Real roads are not re-lit all at once, so an older or
 * heritage column appears occasionally among the standard ones rather than
 * replacing the whole run — that is what `augment` means in the asset registry,
 * and it is the difference between "we added a nice model" and "every lamp on
 * this Indian arterial road is Victorian".
 */
export function streetLights(spacing = 46): Placed[] {
  const pool = resolveAssetIds({ external: ['infrastructure-lamp'], project: ['street-light'] })
  const primary = pool[0]
  const alternates = pool.slice(1)
  const list: Placed[] = []
  let index = 0

  for (let z = -8; z > -940; z -= spacing) {
    const side = Math.round(z / spacing) % 2 === 0 ? -1 : 1
    // no column where the site entrance meets the road
    if (side === -1 && z < -46 && z > -74) continue
    const x = side * (ROAD_EDGE - 0.6)
    // roughly one column in five is an older survivor
    const id =
      alternates.length && index % 5 === 3 ? alternates[Math.floor(index / 5) % alternates.length] : primary
    list.push({ id, x, z, rotation: side < 0 ? 0 : Math.PI, y: seat(x, z) })
    index += 1
  }
  return list
}

/* --------------------------------------------------------------- site yard */

/** Working yard inside the compound: plant, materials, shed, barriers. */
export function yardProps(): Placed[] {
  const b = HERO_BUILDING
  // Construction plant and site props are exactly the objects the brief (§11)
  // says benefit most from real modelling, so external assets win these slots
  // whenever the developer has supplied one.
  const [plant] = resolveAssetIds({ external: ['construction-plant', 'construction-backhoe'], project: ['excavator'] })
  const [lorry] = truckPool()

  /**
   * The yard sits in the gap between the building and the compound wall.
   *
   * The hero's V11 podium is 29 m × 33 m — far wider than the tower it
   * replaced — so these props are placed against the *plot* boundary rather
   * than offset from the building centre. Anchoring them to `b` the way the
   * old layout did now buries them inside the podium: a stack of rebar
   * embedded in a shopfront reads as broken geometry, not as a working site.
   *
   * Keep-out is the podium footprint (±14.6 x, −14.6…+18.5 z about the
   * building origin) plus a metre of working clearance.
   */
  /**
   * Yard layout, set out against the two clear bands the podium leaves.
   *
   * The V11 hero occupies x −54.6…−25.4 and z −118.6…−85.5 in world space, on
   * a plot of x −59…−21, z −128…−77. That leaves a 9 m band across the back of
   * the site and an 8 m band across the front, and strips down each flank too
   * narrow to stand anything in. Every position below is checked by
   * `scripts/qa/placement.mjs` against the assets' real measured footprints —
   * the previous layout offset props from the building centre, which put four
   * of them inside the podium once it grew.
   */
  /**
   * The yard occupies the front of the plot, between the podium and the gate.
   *
   * The hero sits hard against the back wall (its podium runs to z = −127.1
   * against a boundary at −128), so the whole working area is the 17 m band
   * across the front — which is where a site compound puts it anyway: inside
   * the gate, in sight of the entrance, where a lorry can turn.
   *
   * The entrance forecourt runs down the centreline to z = −94, so the stores
   * are ranged along the two flanks and the middle is left open for the
   * approach. Verified by `npm run qa:placement`.
   */
  const props: [string, number, number, number][] = [
    // West flank: the excavator stands nose-in to the wall, tracks parallel to
    // it, which is how a machine is left at the end of a shift.
    [plant, -48.3, -84.0, Math.PI / 2],
    ['rebar-stack', -53.7, -89.6, 0.35],
    // Centre-west: the site office, turned to face the gate.
    ['construction-shed', -41.0, -81.2, 0],
    // East flank: deliveries and consumables, nearest the gate at x = −21.
    ['material-stack', -31.5, -81.6, 0.06],
    [lorry, -25.8, -90.5, Math.PI / 2],
    ['cement-bags', -24.2, -79.6, -0.3],
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

/**
 * Loose site props scattered around the gate and the yard edge.
 *
 * Only rendered when the developer has actually supplied an external prop —
 * cones, drums, pallets. There is no procedural fallback here on purpose: an
 * invented box on the verge adds nothing, whereas a real cone reads instantly
 * as a working site (brief §11, §16).
 */
export function externalSiteProps(): { id: string; items: Placed[] }[] {
  const pool = resolveAssetIds({ external: ['construction-prop'], project: [] })
  if (!pool.length) return []

  // Cones and drums line the open edge of the compound and taper away from the
  // gate, the way a real site marks its working boundary.
  const spots: [number, number][] = [
    [PLOT.x1 - 1.5, GATE.z - 8.4],
    [PLOT.x1 - 1.1, GATE.z - 5.1],
    [PLOT.x1 - 1.3, GATE.z + 5.6],
    [PLOT.x1 - 1.7, GATE.z + 8.9],
    [-13.2, GATE.z - 12.5],
    [-13.6, GATE.z + 13.1],
    [HERO_BUILDING.x + 16.5, HERO_BUILDING.z - 9],
    [HERO_BUILDING.x + 16.8, HERO_BUILDING.z + 6],
  ]

  const random = prng(9311)
  const groups = new Map<string, Placed[]>()
  spots.forEach(([x, z], index) => {
    const id = pool[index % pool.length]
    const item: Placed = {
      id,
      x: x + (random() - 0.5) * 0.8,
      z: z + (random() - 0.5) * 0.8,
      rotation: random() * Math.PI * 2,
      // knocked-about site kit is never uniform
      scale: 0.9 + random() * 0.25,
      y: seat(x, z),
    }
    const bucket = groups.get(id) ?? []
    bucket.push(item)
    groups.set(id, bucket)
  })
  return [...groups.entries()].map(([id, items]) => ({ id, items }))
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

/**
 * The car pool, resolved through the asset priority ladder.
 *
 *     real external GLB  →  existing project GLB  →  procedural geometry
 *
 * When the developer has dropped a realistic car into
 * `public/assets/external/`, the parked and moving traffic use it. When they
 * have not, the project's own `car-a` / `car-b` / `car-c` fill the same slots
 * and nothing about the scene changes. No component needs to know which
 * happened (brief §1, §7, §13).
 */
export function carPool(): string[] {
  /**
   * Ordered for staged placement (§4): the most convincing model first, so
   * bays nearest the camera path get it and the least representative model
   * ends up furthest away.
   */
  return stageByRealism(
    resolveAssetIds({
      external: ['vehicle-car', 'vehicle-suv'],
      project: ['car-a', 'car-b', 'car-c'],
    }),
  )
}

/** Larger vehicles for the yard and the freight end of the corridor. */
export function truckPool(): string[] {
  return resolveAssetIds({ external: ['vehicle-truck'], project: ['truck-a'] })
}

/**
 * Kerbside parking.
 *
 * Positions are fixed so the offline QA renderer and the browser agree, but
 * which model stands in each bay is drawn from the pool, and the orientation
 * jitters a little either side of square: cars parked by people are never all
 * at exactly the same angle (brief §8).
 */
export function parkedVehicles(): { id: string; items: Placed[] }[] {
  const pool = carPool()

  /**
   * Parking bays, measured off the metalled edge rather than the reserve.
   *
   * A parked car's centreline sits about one half-width inside the shoulder
   * edge, so the near wheels are on tarmac and the body overhangs nothing.
   * These were previously at ±6.6, which is a metre out on the grass verge —
   * the car looked like it had been abandoned in a field.
   */
  const bay = SHOULDER_EDGE - 1.25
  const bays: [number, number][] = [
    [-34, -bay],
    [-96, bay],
    [-150, bay + 0.2],
    [-292, -bay + 0.1],
    [-402, -bay],
    [-640, bay],
    [-676, bay + 0.3],
  ]

  const random = prng(7717)
  const groups = new Map<string, Placed[]>()

  /**
   * Assign models by how exposed the bay is, not by array order.
   *
   * The camera travels down the corridor from z = 0, so bays nearest the top
   * of the run are seen closest and for longest. `carPool()` is ordered best
   * first, so pairing sorted bays with the pool in order puts the most
   * convincing vehicle where it gets the most scrutiny and the least typical
   * one at the far end of the road (§4).
   */
  const byExposure = bays
    .map((b, i) => ({ b, i }))
    .sort((p, q) => Math.abs(q.b[0]) - Math.abs(p.b[0]))
    .reverse()
  const modelFor = new Map<number, string>()
  byExposure.forEach(({ i }, rank) => modelFor.set(i, pool[rank % pool.length]))

  bays.forEach(([z, x], index) => {
    const id = modelFor.get(index) ?? pool[index % pool.length]
    const facing = x < 0 ? Math.PI / 2 : -Math.PI / 2
    const px = x + (random() - 0.5) * 0.5
    const pz = z + (random() - 0.5) * 2.4
    const item: Placed = {
      id,
      x: px,
      z: pz,
      // ±5° of slop: nobody parks perfectly parallel to a kerb
      rotation: facing + (random() - 0.5) * 0.17,
      // Sit the tyres on the road surface, which is cambered and graded —
      // parking at y = 0 floats the car above the crown or sinks it into the
      // shoulder depending on where along the corridor the bay falls (§5).
      y: carriagewayHeight(Math.min(Math.abs(px), ROAD_HALF) * Math.sign(px), pz),
    }
    const bucket = groups.get(id) ?? []
    bucket.push(item)
    groups.set(id, bucket)
  })

  return [...groups.entries()].map(([id, items]) => ({ id, items }))
}

/* ------------------------------------------------------------------ traffic */

export type TrafficCar = {
  id: string
  /** -1 travels north (-z) in the -x lane, +1 travels south (+z) */
  direction: -1 | 1
  speed: number
  start: number
  laneOffset: number
}

/**
 * Live traffic.
 *
 * The lane discipline, speeds and spacing are fixed; the models are drawn from
 * the car pool so external vehicles take over automatically when present. Four
 * slots are cycled through however many models exist, so a single dropped car
 * still works and three dropped cars produce no visible repeat within a shot.
 */
const TRAFFIC_SLOTS: Omit<TrafficCar, 'id'>[] = [
  { direction: -1, speed: 12.5, start: -20, laneOffset: 0 },
  { direction: 1, speed: 10.5, start: -220, laneOffset: 0.1 },
  { direction: -1, speed: 14, start: -430, laneOffset: -0.15 },
  { direction: 1, speed: 11.5, start: -640, laneOffset: 0.05 },
]

export function traffic(): TrafficCar[] {
  const pool = carPool()
  return TRAFFIC_SLOTS.map((slot, index) => ({ ...slot, id: pool[index % pool.length] }))
}

/** Back-compatible eager view, for callers that only read the list once. */
export const TRAFFIC: TrafficCar[] = traffic()

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

const TREE_SPECIES = ['tree-a', 'tree-b', 'tree-c', 'tree-d', 'tree-e']

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
    /**
     * Where trees actually grow: in stands, along the verge where nothing
     * else is planted, and against the boundary where seed gets dropped.
     * Not at even intervals across an open field.
     */
    density: (x, z) => {
      const stand = Math.pow(fbm2(x * 0.019, z * 0.019, 907, 3), 1.7) * 1.45
      const verge = Math.max(0, 1 - Math.abs(Math.abs(x) - 13) / 16) * 0.4
      const boundary = Math.max(0, 1 - Math.abs(Math.abs(x) - 104) / 22) * 0.35
      return Math.min(1, stand + verge + boundary + 0.06)
    },
  })

  const buckets = new Map<string, Placed[]>()
  for (const point of points) {
    const id = TREE_SPECIES[Math.floor(random() * TREE_SPECIES.length)]
    const base = id === 'tree-b' ? 1.16 : id === 'tree-d' ? 0.78 : id === 'tree-c' ? 1.06 : id === 'tree-e' ? 0.86 : 0.94
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
