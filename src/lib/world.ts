/**
 * Shared world coordinates. Camera keys (chapters.ts) and every 3D chapter
 * component read from here so the story never drifts out of alignment.
 */

export const GROUND_Y = 0

/** Hero building — assembled in THE BUILD, orbited in THE COMPANY. */
export const HERO_BUILDING = {
  x: 0,
  z: -74,
  width: 24,
  depth: 24,
  height: 46,
  floors: 13,
} as const

/** Six service worlds. */
export const SERVICE_WORLDS = {
  civil: { x: 0, z: -206 },
  residential: { x: 32, z: -262 },
  infrastructure: { x: -26, z: -300 },
  solar: { x: 28, z: -360 },
  renovation: { x: -46, z: -412 },
  materials: { x: -14, z: -451 },
} as const

/** Miniature construction environment (HOW WE BUILD). */
export const PROCESS_MODEL = {
  x: 0,
  zFrom: -498,
  zTo: -552,
  width: 36,
} as const

export const PROCESS_STAGE_Z = [-500, -510, -520, -530, -540] as const

/** Macro material gates (MATERIAL WORLD). */
export const MATERIAL_GATES = [
  { z: -580, material: 'concrete', label: 'CONCRETE' },
  { z: -600, material: 'steel', label: 'STEEL' },
  { z: -620, material: 'glass', label: 'GLASS' },
  { z: -640, material: 'stone', label: 'STONE' },
] as const

/** Trust structure. */
export const TRUST_STRUCTURE = { x: 0, z: -744 } as const

/** Client corridor. */
export const CORRIDOR = { from: -762, to: -880, width: 16, height: 13 } as const

/** India map. */
export const INDIA_MAP = {
  x: 0,
  z: -1000,
  y: 14,
  /** Baked extrusion depth; each state scales this for its thickness. */
  depth: 1.45,
  baseDepthScale: 0.17,
  activeDepthScale: 0.9,
  hoverDepthScale: 0.34,
  lift: 0.9,
  hoverLift: 0.32,
} as const

/** Futuristic building (THE FUTURE). */
export const FUTURE_BUILDING = { x: 0, z: -1150, width: 30, depth: 30, height: 58 } as const

export const FOG = { color: '#c9d6d6', density: 0.0061 } as const
