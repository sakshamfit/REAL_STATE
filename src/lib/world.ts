/**
 * Shared world coordinates. Camera keys (chapters.ts) and every 3D chapter
 * component read from here so the story never drifts out of alignment.
 */

export const GROUND_Y = 0

/** Hero building — assembled in THE BUILD, orbited in THE COMPANY. */
export const HERO_BUILDING = {
  /** West of the road corridor: the plot sits behind a boundary wall, the way a
   *  real site fronts its access road. */
  x: -40,
  z: -104,
  width: 24,
  depth: 24,
  height: 46,
  floors: 13,
  /**
   * The tower is set back from its group origin so the entrance forecourt has
   * room between the podium and the compound's south wall. The chapter
   * component and the offline QA renderer both read this, so a change here
   * cannot leave the two disagreeing about where the building is — they did
   * disagree by 8.5 m, which meant the QA frames were quietly of a scene that
   * did not exist.
   */
  modelZOffset: -8.5,
} as const

/** Six service worlds. */
/**
 * Six service worlds, alternating either side of the road corridor so the
 * camera can drive past each one rather than through it.
 */
export const SERVICE_WORLDS = {
  civil: { x: -48, z: -206 },
  residential: { x: 50, z: -262 },
  infrastructure: { x: -48, z: -300 },
  solar: { x: 50, z: -360 },
  renovation: { x: -48, z: -412 },
  materials: { x: 50, z: -451 },
} as const

/** Miniature construction environment (HOW WE BUILD). */
export const PROCESS_MODEL = {
  x: -50,
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
export const TRUST_STRUCTURE = { x: -38, z: -744 } as const

/** Client corridor. */
export const CORRIDOR = { x: 44, from: -762, to: -880, width: 16, height: 13 } as const

/** India map. */
export const INDIA_MAP = {
  x: 0,
  z: -1000,
  /** the map is a physical model on a plinth, not a floating hologram */
  y: 1.2,
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

/**
 * Daylight haze. Kept in sync with `Atmosphere` (which is what actually sets
 * `scene.fog`): bright, blue-white, thin enough that the far terrain stays
 * legible instead of turning into a wall of grey.
 *
 * V13: pulled back from V12's 0.0022 to 0.0019. The V12 value was washing out
 * mid-range colour. At 0.0019, objects at 200 m are softly hazed (68 %
 * visible), at 400 m they dissolve into the sky (47 % visible). The
 * atmosphere reads as a clear sunny Indian daytime, not a hazy morning.
 */
export const FOG = { color: '#e0eaf4', density: 0.0019 } as const
