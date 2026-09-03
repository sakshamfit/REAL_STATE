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

  const place = (w, h, d, cx, cy, off, material, rot = 0) => {
    if (plane === 'z') b.box(w, h, d, { x: cx, y: cy, z: z + off * facing, ry: rot }, material)
    else b.box(d, h, w, { x: x + off * facing, y: cy, z: cx, ry: rot }, material)
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

  // structural piers between bays (full height, they read as the frame)
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
    place(w, height, thickness, (edges[i] + edges[i + 1]) / 2, baseY + height / 2, 0, wall)
  }

  for (let f = 0; f < floors; f++) {
    const fy = baseY + f * floorHeight

    // slab edge / floor band
    place(length, floorHeight * 0.16, thickness * 1.06, from + length / 2, fy + floorHeight * 0.08, -thickness * 0.02, band)

    for (const bay of bays) {
      const bx0 = bay[0]
      const bx1 = bay[1]
      const bw = bx1 - bx0

      // spandrel below the opening + header above it
      place(bw, sill, thickness * 0.86, (bx0 + bx1) / 2, fy + sill / 2, thickness * 0.07, wall)
      const headerHeight = Math.max(0.08, floorHeight - head)
      place(bw, headerHeight, thickness * 0.86, (bx0 + bx1) / 2, fy + head + headerHeight / 2, thickness * 0.07, wall)

      // the glazing itself, set back into the reveal
      const glassW = bw - 0.16
      const glassH = head - sill - 0.12
      place(glassW, glassH, 0.04, (bx0 + bx1) / 2, fy + (sill + head) / 2, -recess, glass)

      // reveal jambs so the opening has thickness
      for (const side of [-1, 1]) {
        place(0.07, glassH + 0.1, recess, (bx0 + bx1) / 2 + side * (glassW / 2 + 0.035), fy + (sill + head) / 2, -recess / 2, wall)
      }
      // head + sill of the opening
      place(glassW + 0.14, 0.1, recess, (bx0 + bx1) / 2, fy + head - 0.05, -recess / 2, wall)
      place(glassW + 0.3, 0.12, recess * 1.5, (bx0 + bx1) / 2, fy + sill + 0.04, -recess / 2 - chajja * 0.5, sillMaterial)
      // projecting chajja (sun shade) — very Indian, casts a real shadow
      if (chajja > 0.02) {
        place(glassW + 0.34, 0.09, chajja, (bx0 + bx1) / 2, fy + head + 0.02, chajja * 0.5, sillMaterial)
      }

      // mullions
      for (let m = 1; m <= mullions; m++) {
        const t = m / (mullions + 1)
        place(0.05, glassH, 0.05, bx0 + 0.08 + glassW * t, fy + (sill + head) / 2, -recess + 0.03, frame)
      }

      // a few windows are open / have grilles / an AC unit — real buildings vary
      const roll = random()
      if (roll < 0.14) {
        place(bw * 0.4, 0.5, 0.06, bx0 + bw * 0.3, fy + sill + 0.4, -recess + 0.06, frame)
      } else if (roll < 0.2) {
        place(0.5, 0.4, 0.32, bx0 + bw * 0.72, fy + sill + 0.3, -recess + 0.2, 'darkMetal')
      }
    }
  }
}

/** Slab with a dropped edge beam — reads as cast concrete, not a plane. */
export function slab(b, { w, d, thickness = 0.26, edge = 0.18, position = [0, 0, 0], material = 'concrete' }) {
  const [x, y, z] = position
  b.box(w, thickness, d, { x, y, z }, material)
  b.box(w + 0.08, edge, d + 0.08, { x, y: y - thickness / 2 - edge / 2 + 0.04, z }, material)
}

/** Balcony: cantilever slab, edge beam, balustrade, optional planter. */
export function balcony(b, { x, y, z, w = 4, d = 1.8, material = 'concrete', rail = 'metal', planter = false }) {
  b.box(w, 0.2, d, { x, y, z }, material)
  b.box(w + 0.1, 0.16, 0.1, { x, y: y + 0.12, z: z + d / 2 }, material)
  // balustrade
  const balusters = Math.max(3, Math.round(w / 0.32))
  b.box(w, 0.08, 0.08, { x, y: y + 1.06, z: z + d / 2 - 0.05 }, rail)
  b.box(w, 0.06, 0.06, { x, y: y + 0.62, z: z + d / 2 - 0.05 }, rail)
  for (let i = 0; i <= balusters; i++) {
    b.box(0.05, 1.0, 0.05, { x: x - w / 2 + (i * w) / balusters, y: y + 0.58, z: z + d / 2 - 0.05 }, rail)
  }
  for (const side of [-1, 1]) {
    b.box(0.06, 1.0, d, { x: x + side * (w / 2), y: y + 0.58, z }, rail)
  }
  if (planter) {
    b.box(w * 0.9, 0.34, 0.34, { x, y: y + 0.28, z: z + d / 2 - 0.3 }, 'stone')
    b.box(w * 0.84, 0.2, 0.28, { x, y: y + 0.5, z: z + d / 2 - 0.3 }, 'foliage')
  }
}

/** Parapet with coping and weep holes. */
export function parapet(b, { w, d, y, height = 1.0, thickness = 0.24, material = 'concrete', coping = 'stone' }) {
  for (const [sx, sz, ww, dd] of [
    [0, d / 2, w, thickness],
    [0, -d / 2, w, thickness],
    [w / 2, 0, thickness, d],
    [-w / 2, 0, thickness, d],
  ]) {
    b.box(ww, height, dd, { x: sx, y: y + height / 2, z: sz }, material)
    b.box(ww + 0.08, 0.1, dd + 0.08, { x: sx, y: y + height + 0.05, z: sz }, coping)
  }
}

/** Stair / lift core with a head house. */
export function core(b, { x, z, w = 5, d = 5, height, material = 'concrete', roof = 'concrete' }) {
  b.box(w, height, d, { x, y: height / 2, z }, material)
  // ventilation slots break up the mass
  for (let i = 0; i < Math.floor(height / 3); i++) {
    b.box(0.12, 1.2, d * 0.6, { x: x + w / 2 + 0.02, y: 3 + i * 3, z }, 'darkMetal')
  }
  b.box(w + 0.4, 0.3, d + 0.4, { x, y: height + 0.15, z }, roof)
  b.box(w * 0.6, 2.6, d * 0.6, { x, y: height + 1.6, z }, roof)
  b.box(w * 0.68, 0.24, d * 0.68, { x, y: height + 3.05, z }, 'stone')
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
  b.box(r * 1.9, 0.14, r * 1.9, { x, y: y - 0.06, z }, 'concrete')
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

/** Corrugated / ribbed metal sheet — walls and roofs of sheds and warehouses. */
export function corrugated(b, { w, h, position, rotation = [0, 0, 0], pitch = 0.16, depth = 0.06, material = 'metal', ribs = true }) {
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
}

/** Steel railing / handrail with posts. */
export function railing(b, { x0, x1, y, z, height = 1.1, material = 'metal', posts = 4 }) {
  const w = x1 - x0
  b.box(w, 0.06, 0.06, { x: (x0 + x1) / 2, y: y + height, z }, material)
  b.box(w, 0.05, 0.05, { x: (x0 + x1) / 2, y: y + height * 0.55, z }, material)
  for (let i = 0; i <= posts; i++) {
    b.box(0.06, height, 0.06, { x: x0 + (i * w) / posts, y: y + height / 2, z }, material)
  }
}

/** Entrance canopy with columns and a fascia. */
export function canopy(b, { x, y, z, w = 6, d = 3.4, material = 'concrete', columns = 2 }) {
  b.box(w, 0.28, d, { x, y, z }, material)
  b.box(w + 0.16, 0.14, d + 0.16, { x, y: y + 0.2, z }, 'stone')
  for (let i = 0; i < columns; i++) {
    const cx = x - w / 2 + (w * (i + 0.5)) / columns
    b.box(0.36, y, 0.36, { x: cx, y: y / 2, z: z + d / 2 - 0.3 }, material)
    b.box(0.44, 0.12, 0.44, { x: cx, y: 0.06, z: z + d / 2 - 0.3 }, 'stone')
  }
}

/** Rooftop solar array on a frame. */
export function solarArray(b, { x, y, z, count = 3, tilt = -0.32, spacing = 1.5 }) {
  for (let i = 0; i < count; i++) {
    const px = x + (i - (count - 1) / 2) * spacing
    b.box(0.08, 0.5, 0.08, { x: px - 0.6, y: y + 0.25, z: z - 0.5 }, 'metal')
    b.box(0.08, 0.5, 0.08, { x: px + 0.6, y: y + 0.25, z: z + 0.5 }, 'metal')
    b.box(1.3, 0.06, 1.7, { x: px, y: y + 0.5, z, rx: tilt }, 'panelDark')
    b.box(1.34, 0.04, 1.74, { x: px, y: y + 0.46, z, rx: tilt }, 'metal')
  }
}

/** Scaffold frame module. */
export function scaffoldBay(b, { x, y, z, w = 2.4, d = 1.2, levels = 5, lift = 2, material = 'metal', board = 'wood' }) {
  for (const sx of [-w / 2, w / 2]) {
    for (const sz of [-d / 2, d / 2]) {
      b.cylinder(0.024, 0.024, levels * lift, 6, { x: x + sx, y: y + (levels * lift) / 2, z: z + sz }, material)
    }
  }
  for (let l = 0; l <= levels; l++) {
    const ly = y + l * lift
    for (const sz of [-d / 2, d / 2]) {
      b.cylinder(0.02, 0.02, w, 6, { x, y: ly, z: z + sz, rz: Math.PI / 2 }, material)
    }
    for (const sx of [-w / 2, w / 2]) {
      b.cylinder(0.02, 0.02, d, 6, { x: x + sx, y: ly, z, rx: Math.PI / 2 }, material)
    }
    // working platform every other lift
    if (l % 2 === 1 && l < levels) {
      b.box(w, 0.05, d * 0.9, { x, y: ly + 0.03, z }, board)
      b.box(w, 0.12, 0.04, { x, y: ly + 0.1, z: z + d / 2 }, board)
    }
  }
  // diagonal braces
  for (const sz of [-d / 2, d / 2]) {
    for (let l = 0; l < levels; l += 2) {
      const dir = l % 4 === 0 ? 1 : -1
      b.box(Math.hypot(w, lift * 2) * 0.98, 0.03, 0.03, {
        x,
        y: y + l * lift + lift,
        z: z + sz,
        rz: dir * Math.atan2(lift * 2, w),
      }, 'darkMetal')
    }
  }
  // base plates
  for (const sx of [-w / 2, w / 2]) {
    for (const sz of [-d / 2, d / 2]) {
      b.box(0.14, 0.02, 0.14, { x: x + sx, y: y + 0.01, z: z + sz }, 'darkMetal')
    }
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
