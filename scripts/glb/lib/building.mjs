/**
 * Architectural system.
 *
 * Buildings are assembled from real components — structural frame, slab edges,
 * piers, spandrels, recessed glazing with frames and sills, balconies with
 * balustrades, parapets with copings, roof plant — instead of one box with a
 * texture. Windows have genuine depth: reveal, frame, sill, head, mullion.
 */

import * as THREE from 'three'
import { V, rng } from './geo.mjs'

/**
 * Curtain wall / punched-window facade on a plane.
 *
 * @param b         Builder
 * @param plane     'z' facade runs along X at fixed z, 'x' facade runs along Z
 */
/**
 * One window, built as a real opening rather than a dark rectangle.
 *
 * The sequence outward-in is: wall → reveal (jambs and head, so the opening
 * has thickness) → frame (a bevelled aluminium section standing 8 mm proud of
 * the reveal) → glass (set 100 mm behind the frame) → whatever the occupant has
 * done with it → the dark interior volume behind.
 *
 * `variant` is what stops twelve floors of six bays from reading as a copy of
 * one window: a curtain drawn across the top, a blind pulled down, a shutter
 * half open, a security grille, an opening that has been blocked up. It is
 * occupancy, not decoration — every one of these exists on a real block.
 *
 * @param place  (w, h, d, cx, cy, off, material, ry) => void  (off is +outward)
 * @param at     (cx, cy, off) => transform
 * @param cham   (w, h, d, cx, cy, off, material, bevel) => void
 */
export function windowOpening(b, {
  place, at, cham, cx, cy, w, h, recess = 0.28, wall = 'render', glass = 'glass',
  frame = 'metal', sillMaterial = 'stone', mullions = 1, chajja = 0.22,
  variant = 'clear', sillProjection = 0.06, frameBevel = 0, chamferTrim = false,
}) {
  const y = cy

  // reveal: jambs and head, so the wall has thickness at the opening
  for (const side of [-1, 1]) {
    place(0.07, h + 0.1, recess, cx + side * (w / 2 + 0.035), y, -recess / 2, wall)
  }
  place(w + 0.14, 0.1, recess, cx, y + h / 2 + 0.02, -recess / 2, wall)

  // frame: bevelled section standing at the mouth of the reveal
  b.frame(w + 0.09, h + 0.09, 0.05, 0.085, at(cx, y, -recess * 0.3), frame, { bevel: frameBevel })

  // glass, set well back inside the frame
  place(w, h, 0.04, cx, y, -recess * 0.62, glass)

  // mullions
  for (let m = 1; m <= mullions; m++) {
    const t = m / (mullions + 1)
    place(0.045, h, 0.05, cx - w / 2 + w * t, y, -recess * 0.5, frame)
  }

  // what the occupant did with it — between the glass and the room
  if (variant === 'curtain') {
    place(w * 0.97, h * 0.42, 0.015, cx, y + h * 0.29, -recess * 0.86, 'paintMuted')
  } else if (variant === 'blind') {
    place(w * 0.95, h * 0.55, 0.012, cx, y - h * 0.22, -recess * 0.86, 'paintA')
  } else if (variant === 'shutter') {
    for (const side of [-1, 1]) {
      place(w * 0.47, h * 0.97, 0.025, cx + side * w * 0.25, y, -recess * 0.16, 'paintMuted', side * 0.34)
    }
  } else if (variant === 'barred') {
    for (let i = 0; i < 4; i++) {
      place(0.022, h, 0.022, cx - w * 0.36 + (i * w * 0.72) / 3, y, -recess * 0.44, 'darkMetal')
    }
  } else if (variant === 'blocked') {
    // an opening that was filled in — a different pour, so a different tone
    place(w, h, 0.05, cx, cy, -recess * 0.55, 'renderOld')
  }

  // sill: chamfered, projecting, with a drip slot underneath. The projection
  // varies bay to bay, which is the cheapest way to break a grid.
  if (chamferTrim) cham(w + 0.42, 0.14, 0.24 + sillProjection, cx, y - h / 2 - 0.09, 0.1, sillMaterial, 0.012)
  else place(w + 0.42, 0.14, 0.24 + sillProjection, cx, y - h / 2 - 0.09, 0.1, sillMaterial)
  place(w + 0.3, 0.035, 0.06, cx, y - h / 2 - 0.17, 0.2, 'concrete')

  // chajja (sun shade) — the shadow it throws is the whole point of it
  if (chajja > 0.02) {
    if (chamferTrim) cham(w + 0.34, 0.1, chajja, cx, y + h / 2 + 0.06, chajja * 0.5, sillMaterial, 0.012)
    else place(w + 0.34, 0.1, chajja, cx, y + h / 2 + 0.06, chajja * 0.5, sillMaterial)
  }
}

/**
 * Punched-window facade on a plane.
 *
 * @param b         Builder
 * @param plane     'z' facade runs along X at fixed z, 'x' facade runs along Z
 */
export function punchedFacade(b, opts) {
  const {
    length,
    from,
    z = 0,
    x = 0,
    plane = 'z',
    thickness = 0.3,
    baseY = 0,
    floors = 8,
    floorHeight = 3.1,
    bays = [],
    sill = 0.9,
    head = 2.35,
    recess = 0.28,
    wall = 'render',
    band = 'concrete',
    glass = 'glass',
    frame = 'metal',
    sillMaterial = 'stone',
    mullions = 1,
    seed = 1,
    chajja = 0.22,
    fins = 0,
    frameBevel = 0,
    chamferTrim = false,
  } = opts

  const random = rng(seed)
  const height = floors * floorHeight

  /**
   * Which way the facade looks. Every offset below is authored as "negative is
   * into the building", which is only true when the outward normal points +z.
   * A facade on the far side of the building (z < 0) faces the other way, and
   * without this sign its glazing projects proud of the wall while its sun
   * shades grow into the rooms — a mirrored facade.
   */
  const facing = plane === 'z' ? (z < 0 ? -1 : 1) : x < 0 ? -1 : 1

  const at = (cx, cy, off) =>
    plane === 'z' ? { x: cx, y: cy, z: z + off * facing } : { x: x + off * facing, y: cy, z: cx }

  const place = (w, h, d, cx, cy, off, material, ry = 0) => {
    if (plane === 'z') b.box(w, h, d, { x: cx, y: cy, z: z + off * facing, ry }, material)
    else b.box(d, h, w, { x: x + off * facing, y: cy, z: cx, ry }, material)
  }

  const cham = (w, h, d, cx, cy, off, material, bevel = 0.014) => {
    const [cw, ch, cd] = plane === 'z' ? [w, h, d] : [d, h, w]
    b.chamfer(cw, ch, cd, at(cx, cy, off), material, { bevel: Math.min(bevel, Math.min(cw, ch, cd) / 2.5) })
  }

  /**
   * The room behind the glass.
   *
   * A punched opening with nothing behind it is a hole: you look through the
   * building and see the sky on the other side, which instantly reads as a
   * hollow CGI shell. Real windows are dark — the interior is several stops
   * below the sunlit facade — so every facade gets a solid, near-black volume
   * behind the reveal. It is one box, but it is the difference between a
   * window and a hole.
   *
   * Two constraints fix its size. It must never be larger than the facade
   * itself, or it shows as a black fin past the building corner; and it must
   * be deep enough that a glancing view down the reveal lands on it rather
   * than past it, or the oblique angles stay hollow. Exactly the facade's
   * footprint, 1.6 m deep.
   */
  place(length, height, 1.6, from + length / 2, baseY + height / 2, -(thickness * 0.5 + recess + 0.8), 'interior')

  // structural piers between bays (full height, they read as the frame).
  // Chamfered: the vertical arris is what gives the facade its shadow lines.
  const edges = []
  edges.push(from)
  for (const bay of bays) {
    edges.push(bay[0], bay[1])
  }
  edges.push(from + length)
  edges.sort((a, b2) => a - b2)
  for (let i = 0; i < edges.length - 1; i++) {
    const w = edges[i + 1] - edges[i]
    if (w <= 0.02) continue
    cham(w, height, thickness, (edges[i] + edges[i + 1]) / 2, baseY + height / 2, 0, wall, 0.014)
  }

  // vertical fins: two or three full-height projections that break the
  // horizontal banding and read as sun breakers
  if (fins > 0) {
    for (let i = 1; i <= fins; i++) {
      const fx = from + (length * i) / (fins + 1)
      cham(0.2, height, 0.34, fx, baseY + height / 2, 0.14, 'concrete', 0.012)
    }
  }

  /**
   * Occupancy states, dealt from a seeded deck rather than one roll per
   * opening, so a floor is not all-curtains or all-clear. Roughly: a third
   * dressed, a third partly dressed, a third clear, with a couple of blocked
   * and barred openings per elevation.
   */
  const deck = []
  for (let i = 0; i < bays.length * floors; i++) {
    const r = random()
    deck.push(
      r < 0.16 ? 'curtain' : r < 0.30 ? 'blind' : r < 0.36 ? 'shutter' : r < 0.40 ? 'barred' :
      r < 0.43 ? 'blocked' : 'clear',
    )
  }

  let n = 0
  for (let f = 0; f < floors; f++) {
    const fy = baseY + f * floorHeight

    // slab edge / floor band — chamfered, so every floor line has an arris
    cham(length, floorHeight * 0.16, thickness * 1.06, from + length / 2, fy + floorHeight * 0.08, -thickness * 0.02, band, 0.012)

    // ground floor gets taller openings: a piano nobile, and it stops the
    // elevation from being twelve identical storeys
    const ground = f === 0
    const sillH = ground ? 0.5 : sill
    const headH = ground ? floorHeight - 0.28 : head

    for (const bay of bays) {
      const bx0 = bay[0]
      const bx1 = bay[1]
      const bw = bx1 - bx0
      const cx = (bx0 + bx1) / 2

      // spandrel below the opening + header above it
      place(bw, sillH, thickness * 0.86, cx, fy + sillH / 2, thickness * 0.07, wall)
      const headerHeight = Math.max(0.08, floorHeight - headH)
      place(bw, headerHeight, thickness * 0.86, cx, fy + headH + headerHeight / 2, thickness * 0.07, wall)

      const gw = bw - 0.16
      const gh = headH - sillH - 0.12
      if (gw < 0.2 || gh < 0.2) { n++; continue }

      windowOpening(b, {
        place,
        at,
        cham,
        cx,
        cy: fy + (sillH + headH) / 2,
        w: gw,
        h: gh,
        recess,
        wall,
        glass,
        frame,
        sillMaterial,
        mullions,
        chajja: ground ? chajja * 0.4 : chajja,
        frameBevel,
        chamferTrim,
        variant: deck[n],
        // real sills are not all the same projection; 40–90 mm of variation is
        // invisible as a rule and fatal to the grid
        sillProjection: 0.04 + random() * 0.05,
      })
      n++
    }
  }
}

/**
 * Slab with a dropped edge beam — reads as cast concrete, not a plane.
 *
 * Chamfered, because a slab edge is the single most backlit line on a building
 * and a mathematically sharp 90° arris renders as an aliasing staircase. The
 * chamfer is 20 mm: invisible as shape, unmistakable as a highlight.
 */
export function slab(b, { w, d, thickness = 0.26, edge = 0.18, position = [0, 0, 0], material = 'concrete', bevel = 0.02 }) {
  const [x, y, z] = position
  b.chamfer(w, thickness, d, { x, y, z }, material, { bevel: Math.min(bevel, thickness / 2.5) })
  b.chamfer(w + 0.08, edge, d + 0.08, { x, y: y - thickness / 2 - edge / 2 + 0.04, z }, material, {
    bevel: Math.min(bevel, edge / 2.5),
  })
}

/**
 * Balcony: cantilever slab, edge beam with a drip rebate, balustrade, floor
 * screed, wall connection, optional planter.
 *
 * The rebate between slab and edge beam is the detail that makes a balcony
 * read as constructed rather than extruded: it is the shadow line a real
 * drip groove casts, and it stops the slab edge being one flat face.
 */
export function balcony(b, { x, y, z, w = 4, d = 1.8, material = 'concrete', rail = 'metal',
  planter = false, railHeight = 1.05 }) {
  // structural slab, cantilevered off the wall
  b.chamfer(w, 0.18, d, { x, y, z }, material, { bevel: 0.016 })
  // edge beam, set back 30 mm from the slab face so the drip groove reads
  b.chamfer(w, 0.16, d - 0.06, { x, y: y - 0.15, z: z - 0.03 }, material, { bevel: 0.014 })
  // floor screed, slightly inset — a separate pour, so a separate plane
  b.box(w - 0.1, 0.035, d - 0.1, { x, y: y + 0.105, z }, 'stone')
  // wall connection: a small chamfered fillet where slab meets the wall
  b.chamfer(w, 0.1, 0.09, { x, y: y + 0.13, z: z - d / 2 + 0.045 }, material, { bevel: 0.012 })

  // balustrade: solid upstand with a metal handrail on top
  b.chamfer(w, 0.52, 0.11, { x, y: y + 0.35, z: z + d / 2 - 0.055 }, material, { bevel: 0.014 })
  b.chamfer(w + 0.04, 0.07, 0.15, { x, y: y + 0.645, z: z + d / 2 - 0.055 }, 'stone', { bevel: 0.01 })
  for (const side of [-1, 1]) {
    b.chamfer(0.12, 0.52, d, { x: x + side * (w / 2 - 0.06), y: y + 0.35, z }, material, { bevel: 0.014 })
  }
  // handrail: chamfered top rail on posts — a square hollow section, which is
  // what Indian residential balustrades actually use
  const posts = Math.max(3, Math.round(w / 0.52))
  for (let i = 0; i <= posts; i++) {
    const px = x - w / 2 + (i * w) / posts
    if (i > 0 && i < posts && planter) continue
    // plain section for the balusters: eleven of them per balcony is 11 × 52
    // triangles of arris nobody can resolve, and the rails carry the highlight
    b.box(0.05, railHeight - 0.62, 0.05, { x: px, y: y + 0.68 + (railHeight - 0.62) / 2, z: z + d / 2 - 0.055 }, rail)
  }
  b.chamfer(w, 0.06, 0.06, { x, y: y + railHeight, z: z + d / 2 - 0.055 }, rail, { bevel: 0.008 })
  b.chamfer(w, 0.045, 0.045, { x, y: y + railHeight * 0.55, z: z + d / 2 - 0.055 }, rail, { bevel: 0.007 })

  if (planter) {
    b.chamfer(w * 0.86, 0.36, 0.3, { x: x + w * 0.02, y: y + 0.27, z: z + d / 2 - 0.2 }, 'stone', { bevel: 0.012 })
    b.box(w * 0.8, 0.22, 0.24, { x: x + w * 0.02, y: y + 0.5, z: z + d / 2 - 0.2 }, 'foliage')
  }
}

/** Parapet with a projecting chamfered coping that drips clear of the wall. */
export function parapet(b, { w, d, y, height = 1.0, thickness = 0.24, material = 'concrete', coping = 'stone' }) {
  for (const [sx, sz, ww, dd] of [
    [0, d / 2, w, thickness],
    [0, -d / 2, w, thickness],
    [w / 2, 0, thickness, d],
    [-w / 2, 0, thickness, d],
  ]) {
    b.chamfer(ww, height, dd, { x: sx, y: y + height / 2, z: sz }, material, { bevel: 0.014 })
    // coping overhangs by 50 mm and has its own arris, so the top of the
    // building catches a second highlight line instead of a flat slab edge
    b.chamfer(ww + 0.1, 0.11, dd + 0.1, { x: sx, y: y + height + 0.055, z: sz }, coping, { bevel: 0.012 })
    // drip groove under the coping overhang
    b.box(ww + 0.06, 0.03, dd + 0.06, { x: sx, y: y + height - 0.02, z: sz }, 'concrete')
  }
}

/** Stair / lift core with a head house. */
export function core(b, { x, z, w = 5, d = 5, height, material = 'concrete', roof = 'concrete' }) {
  b.chamfer(w, height, d, { x, y: height / 2, z }, material, { bevel: 0.02 })
  // ventilation slots break up the mass
  for (let i = 0; i < Math.floor(height / 3); i++) {
    b.box(0.12, 1.2, d * 0.6, { x: x + w / 2 + 0.02, y: 3 + i * 3, z }, 'darkMetal')
  }
  b.chamfer(w + 0.4, 0.3, d + 0.4, { x, y: height + 0.15, z }, roof, { bevel: 0.016 })
  b.chamfer(w * 0.6, 2.6, d * 0.6, { x, y: height + 1.6, z }, roof, { bevel: 0.018 })
  b.chamfer(w * 0.68, 0.26, d * 0.68, { x, y: height + 3.05, z }, 'stone', { bevel: 0.012 })
  // the head house roof needs an outlet it drains to, or it reads as a lid
  b.chamfer(w * 0.72, 0.05, d * 0.72, { x, y: height + 3.2, z }, 'stone', { bevel: 0.01 })
}

/** Sintex-style ribbed plastic water tank — ubiquitous on Indian roofs. */
export function waterTank(b, { x, y, z, r = 0.62, h = 1.2, material = 'plastic' }) {
  b.lathe(
    [
      [0, 0],
      [r * 0.72, 0],
      [r * 0.96, h * 0.12],
      [r, h * 0.3],
      [r * 0.98, h * 0.72],
      [r * 0.86, h * 0.94],
      [r * 0.36, h],
      [r * 0.2, h * 1.04],
      [0, h * 1.04],
    ],
    14,
    { x, y, z },
    material,
  )
  for (let i = 1; i <= 3; i++) {
    b.cylinder(r * 1.005, r * 1.005, 0.05, 14, { x, y: y + h * (0.2 + i * 0.22), z }, material)
  }
  b.chamfer(r * 1.9, 0.14, r * 1.9, { x, y: y - 0.06, z }, 'concrete', { bevel: 0.014 })
}

/** Window AC / condensor unit with a bracket. */
export function acUnit(b, { x, y, z, ry = 0, w = 0.72, h = 0.5, d = 0.28 }) {
  b.box(w, h, d, { x, y, z, ry }, 'metal')
  b.box(w * 0.86, h * 0.62, 0.03, { x, y, z: z + d / 2 + 0.015, ry }, 'darkMetal')
  for (let i = 0; i < 6; i++) {
    b.box(w * 0.78, 0.02, 0.03, { x, y: y - h * 0.3 + i * 0.08, z: z + d / 2 + 0.03, ry }, 'darkMetal')
  }
  b.box(w * 0.9, 0.06, 0.22, { x, y: y - h / 2 - 0.05, z: z - d * 0.2, ry }, 'darkMetal')
}

/**
 * Corrugated / ribbed metal sheet — walls and roofs of sheds and warehouses.
 *
 * `laps` puts a horizontal end-lap every `lapHeight` metres. Profile sheets are
 * made in fixed lengths and joined with a lap, so a wall built from one
 * continuous sheet from ground to eaves is not a wall of sheets at all: the lap
 * lines are the first thing that tells you the scale of the cladding.
 */
export function corrugated(b, { w, h, position, rotation = [0, 0, 0], pitch = 0.16, depth = 0.06, material = 'metal', ribs = true, laps = 0, lapHeight = 2.4, lapMaterial = 'darkMetal' }) {
  const segments = Math.max(6, Math.round(w / pitch))
  const profile = []
  for (let i = 0; i <= segments; i++) {
    const x = -w / 2 + (i * w) / segments
    const y = ribs ? (i % 2 === 0 ? depth : -depth) * 0.5 : 0
    profile.push([x, y])
  }
  for (let i = segments; i >= 0; i--) {
    const x = -w / 2 + (i * w) / segments
    const y = (ribs ? (i % 2 === 0 ? depth : -depth) * 0.5 : 0) - 0.035
    profile.push([x, y])
  }
  const geometry = b.makeExtrude(profile, h, { bevel: false, bevelThickness: 0, bevelSize: 0, curveSegments: 1 })
  b.add(geometry, { x: position[0], y: position[1], z: position[2], rx: rotation[0], ry: rotation[1], rz: rotation[2] }, material)

  if (laps > 0) {
    const normal = Math.abs(rotation[1]) > 0.1 ? [1, 0, 0] : [0, 0, 1]
    for (let l = 1; l <= laps; l++) {
      const ly = position[1] - h / 2 + (l * h) / (laps + 1)
      b.add(
        b.makePanel(w, 0.05, 0.05, { radius: 0.01 }),
        {
          x: position[0] + normal[0] * 0.05,
          y: ly,
          z: position[2] + normal[2] * 0.05,
          ry: rotation[1],
        },
        lapMaterial,
      )
    }
  }
}

/** Steel railing / handrail with posts — square hollow section, chamfered. */
export function railing(b, { x0, x1, y, z, height = 1.1, material = 'metal', posts = 4 }) {
  const w = x1 - x0
  b.chamfer(w, 0.06, 0.06, { x: (x0 + x1) / 2, y: y + height, z }, material, { bevel: 0.007 })
  b.chamfer(w, 0.05, 0.05, { x: (x0 + x1) / 2, y: y + height * 0.55, z }, material, { bevel: 0.006 })
  for (let i = 0; i <= posts; i++) {
    b.chamfer(0.055, height, 0.055, { x: x0 + (i * w) / posts, y: y + height / 2, z }, material, { bevel: 0.007 })
  }
}

/**
 * Entrance canopy. The slab is chamfered and the columns get a base and a
 * capital, because a column that is one prism from ground to soffit is the
 * classic CG tell — real columns change section where they meet things.
 */
export function canopy(b, { x, y, z, w = 6, d = 3.4, material = 'concrete', columns = 2 }) {
  b.chamfer(w, 0.28, d, { x, y, z }, material, { bevel: 0.018 })
  b.chamfer(w + 0.16, 0.14, d + 0.16, { x, y: y + 0.2, z }, 'stone', { bevel: 0.012 })
  // fascia / drip edge on the front
  b.chamfer(w + 0.2, 0.1, 0.08, { x, y: y - 0.16, z: z + d / 2 - 0.04 }, 'stone', { bevel: 0.01 })
  for (let i = 0; i < columns; i++) {
    const cx = x - w / 2 + (w * (i + 0.5)) / columns
    const cz = z + d / 2 - 0.3
    b.chamfer(0.34, y - 0.32, 0.34, { x: cx, y: (y - 0.32) / 2 + 0.12, z: cz }, material, { bevel: 0.014 })
    b.chamfer(0.44, 0.12, 0.44, { x: cx, y: 0.06, z: cz }, 'stone', { bevel: 0.012 })
    // capital where the column meets the soffit
    b.chamfer(0.44, 0.14, 0.44, { x: cx, y: y - 0.21, z: cz }, 'stone', { bevel: 0.012 })
  }
}

/** Rooftop solar array on a frame — rails, feet and a framed panel. */
export function solarArray(b, { x, y, z, count = 3, tilt = -0.32, spacing = 1.5 }) {
  for (let i = 0; i < count; i++) {
    const px = x + (i - (count - 1) / 2) * spacing
    // legs, front and back, so the tilt has a reason
    b.chamfer(0.07, 0.5, 0.07, { x: px - 0.6, y: y + 0.25, z: z - 0.5 }, 'metal', { bevel: 0.008 })
    b.chamfer(0.07, 0.5, 0.07, { x: px + 0.6, y: y + 0.25, z: z + 0.5 }, 'metal', { bevel: 0.008 })
    // feet
    b.box(0.14, 0.03, 0.14, { x: px - 0.6, y: y + 0.015, z: z - 0.5 }, 'darkMetal')
    b.box(0.14, 0.03, 0.14, { x: px + 0.6, y: y + 0.015, z: z + 0.5 }, 'darkMetal')
    // panel with an aluminium frame
    b.chamfer(1.3, 0.05, 1.7, { x: px, y: y + 0.5, z, rx: tilt }, 'panelDark', { bevel: 0.008 })
    b.chamfer(1.36, 0.035, 1.76, { x: px, y: y + 0.455, z, rx: tilt }, 'metal', { bevel: 0.007 })
  }
  // a run of rail tying the legs together
  b.chamfer((count - 1) * spacing + 1.4, 0.05, 0.05, { x, y: y + 0.44, z: z - 0.5 }, 'metal', { bevel: 0.007 })
}

/**
 * Tube-and-fitting scaffold bay.
 *
 * Scaffolding assembled from identical tubes reads as a diagram of
 * scaffolding. What makes the real thing legible is the *fittings*: right-angle
 * couplers at every ledger-to-standard node, swivel couplers on the braces,
 * base plates on sole boards, putlogs under the boards, and three different
 * tube gauges doing three different jobs. It also means the boards are laid as
 * individual planks rather than one deck, and that a working lift has a guard
 * rail, an intermediate rail and a toe board, because it is a place of work.
 */
export function scaffoldBay(b, { x, y, z, w = 2.4, d = 1.2, levels = 5, lift = 2, material = 'metal', board = 'wood' }) {
  const R_STANDARD = 0.026 // verticals: the load path to the ground
  const R_LEDGER = 0.022 // horizontals along the run
  const R_TRANSOM = 0.018 // horizontals across, they carry the boards
  const R_BRACE = 0.013 // diagonals, they carry nothing until something moves
  const top = levels * lift
  const random = rng(Math.round((x + z) * 17) + 5)

  /** Right-angle coupler: two clamps bolted through the middle. */
  const coupler = (cx, cy, cz, ry = 0) => {
    b.box(0.075, 0.075, 0.075, { x: cx, y: cy, z: cz, ry }, 'darkMetal')
    b.box(0.05, 0.05, 0.095, { x: cx, y: cy, z: cz, ry }, 'darkMetal')
  }

  // ground: sole boards spread the load, base plates sit on them
  for (const sx of [-w / 2, w / 2]) {
    b.box(0.24, 0.045, 0.62, { x: x + sx, y: y + 0.022, z }, board)
    for (const sz of [-d / 2, d / 2]) {
      b.box(0.15, 0.022, 0.15, { x: x + sx, y: y + 0.056, z: z + sz }, 'darkMetal')
    }
  }

  // standards
  for (const sx of [-w / 2, w / 2]) {
    for (const sz of [-d / 2, d / 2]) {
      b.cylinder(R_STANDARD, R_STANDARD, top, 7, { x: x + sx, y: y + top / 2, z: z + sz }, material)
    }
  }

  for (let l = 0; l <= levels; l++) {
    const ly = y + l * lift
    // ledgers along the run, one per face, with a coupler at every standard
    for (const sz of [-d / 2, d / 2]) {
      b.cylinder(R_LEDGER, R_LEDGER, w, 6, { x, y: ly, z: z + sz, rz: Math.PI / 2 }, material)
      for (const sx of [-w / 2, w / 2]) coupler(x + sx, ly, z + sz)
    }
    // transoms across, sitting slightly higher so the boards bear on them
    for (const sx of [-w / 2, w / 2]) {
      b.cylinder(R_TRANSOM, R_TRANSOM, d, 6, { x: x + sx, y: ly + 0.03, z, rx: Math.PI / 2 }, material)
      coupler(x + sx, ly + 0.03, z, Math.PI / 2)
    }

    // working lift: boards, toe board, guard rail and intermediate rail
    if (l > 0 && l < levels && l % 2 === 1) {
      const span = Math.max(2, Math.round((d + 0.24) / 0.3))
      for (let i = 0; i < span; i++) {
        const pz = z - d / 2 + 0.15 + (i * (d - 0.3)) / Math.max(1, span - 1)
        b.box(w + 0.1, 0.038, 0.26, { x, y: ly + 0.06, z: pz, rz: (random() - 0.5) * 0.02 }, board)
      }
      for (const sz of [-d / 2, d / 2]) {
        b.box(w, 0.22, 0.04, { x, y: ly + 0.17, z: z + sz }, board) // toe board
      }
      b.cylinder(R_LEDGER, R_LEDGER, w, 6, { x, y: ly + 0.95, z: z + d / 2, rz: Math.PI / 2 }, material)
      b.cylinder(R_BRACE, R_BRACE, w, 5, { x, y: ly + 0.52, z: z + d / 2, rz: Math.PI / 2 }, material)
      for (const sx of [-w / 2, w / 2]) coupler(x + sx, ly + 0.95, z + d / 2)
    }
  }

  // diagonal braces, alternating direction up the run, on both faces
  for (const sz of [-d / 2, d / 2]) {
    for (let l = 0; l < levels; l += 2) {
      const dir = ((l / 2) % 2 === 0) === sz > 0 ? 1 : -1
      const len = Math.hypot(w, lift * 2)
      // A cylinder is built along +Y, so laying it diagonally needs the
      // complement of the angle a box would use. Getting this the wrong way
      // round puts the brace nearly upright and the bay grows by two metres.
      b.cylinder(R_BRACE, R_BRACE, len, 5, {
        x, y: y + l * lift + lift, z: z + sz, rz: -dir * Math.atan2(w, lift * 2),
      }, 'darkMetal')
      for (const sx of [-w / 2, w / 2]) coupler(x + sx, y + l * lift + (dir > 0 ? 0 : lift * 2), z + sz)
    }
  }

  // plan bracing at the top lift so the frame cannot rack. Flat, in the XZ
  // plane: rz lays the tube down, ry then swings it across the bay.
  for (const sx of [-w / 2, w / 2]) {
    b.cylinder(R_BRACE, R_BRACE, Math.hypot(d, w), 5, {
      x, y: y + top - 0.06, z, ry: Math.atan2(d, w) * (sx > 0 ? 1 : -1), rz: Math.PI / 2,
    }, 'darkMetal')
  }
}

/** Lattice tower mast / crane jib truss segment. */
export function lattice(b, { x0, y0, z0, x1, y1, z1, size = 1, bays = 4, chord = 0.05, material = 'metal', brace = 'darkMetal' }) {
  const dir = new THREE.Vector3(x1 - x0, y1 - y0, z1 - z0)
  const length = dir.length()
  dir.normalize()
  const up = Math.abs(dir.y) > 0.9 ? V(1, 0, 0) : V(0, 1, 0)
  const right = new THREE.Vector3().crossVectors(up, dir).normalize()
  const forward = new THREE.Vector3().crossVectors(dir, right).normalize()
  const at = (t, u, v) => new THREE.Vector3(x0, y0, z0).addScaledVector(dir, t * length).addScaledVector(right, u).addScaledVector(forward, v)

  for (const [su, sv] of [
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ]) {
    const a = at(0, su * size, sv * size)
    const c = at(1, su * size, sv * size)
    const mid = new THREE.Vector3().addVectors(a, c).multiplyScalar(0.5)
    b.tube([a, mid, c], chord, {}, material, { segments: 5, noise: 0.04, seed: 3, uvScale: 1 })
  }
  for (let i = 0; i < bays; i++) {
    const t0 = i / bays
    const t1 = (i + 1) / bays
    for (const [su, sv] of [
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ]) {
      const a = at(t0, su * size, sv * size)
      const c = at(t1, su * size, sv * size)
      b.tube([a, c], chord * 0.6, {}, brace, { segments: 4, noise: 0.05, seed: i + 5, uvScale: 1 })
    }
    // diagonals on two faces
    for (const sv of [1, -1]) {
      const a = at(t0, -size, sv * size)
      const c = at(t1, size, sv * size)
      const mid = new THREE.Vector3().addVectors(a, c).multiplyScalar(0.5)
      b.tube([a, mid, c], chord * 0.5, {}, brace, { segments: 4, noise: 0.06, seed: i + 11, uvScale: 1 })
    }
  }
}
