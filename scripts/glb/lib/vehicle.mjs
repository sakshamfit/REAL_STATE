/**
 * Vehicle system.
 *
 * Bodies are beveled extrusions of a real side profile (bonnet, cowl, roof,
 * tail) with tumblehome, not stacks of boxes. Wheels are revolved tyre
 * cross-sections with sidewall bulge, dished rims and spokes. Lighting,
 * glazing, mirrors, panel gaps, wipers and registration plates give the
 * silhouette the small cues a viewer reads as "car".
 */

import * as THREE from 'three'
import { V, rng, tube } from './geo.mjs'

/** Narrow a geometry towards its top — tumblehome / roof taper. */
function taper(geometry, amount, axis = 'y') {
  const pos = geometry.getAttribute('position')
  let min = Infinity
  let max = -Infinity
  for (let i = 0; i < pos.count; i++) {
    const v = pos.getY(i)
    if (v < min) min = v
    if (v > max) max = v
  }
  const span = Math.max(1e-4, max - min)
  for (let i = 0; i < pos.count; i++) {
    const t = (pos.getY(i) - min) / span
    const k = 1 - amount * t * t
    if (axis === 'x' || axis === 'xz') pos.setX(i, pos.getX(i) * k)
    if (axis === 'z' || axis === 'xz') pos.setZ(i, pos.getZ(i) * k)
  }
  pos.needsUpdate = true
  geometry.computeVertexNormals()
  return geometry
}

export const VEHICLES = {
  sedan: {
    length: 4.42,
    width: 1.74,
    height: 1.42,
    clearance: 0.17,
    wheelRadius: 0.32,
    wheelWidth: 0.2,
    frontAxle: 1.32,
    rearAxle: -1.34,
    profile: [
      [-2.21, 0.24],
      [-2.24, 0.52],
      [-2.16, 0.7],
      [-1.72, 0.79],
      [-1.32, 0.94],
      [-1.02, 1.14],
      [-0.5, 1.4],
      [0.3, 1.44],
      [0.78, 1.36],
      [1.16, 1.02],
      [1.76, 0.87],
      [2.14, 0.76],
      [2.24, 0.56],
      [2.22, 0.26],
      [2.0, 0.2],
      [-2.0, 0.2],
    ],
    greenhouse: [
      [-1.06, 1.12],
      [-0.54, 1.36],
      [0.28, 1.4],
      [0.76, 1.32],
      [1.14, 1.0],
      [-1.04, 1.0],
    ],
    roofRails: false,
    bed: false,
  },
  suv: {
    length: 4.62,
    width: 1.86,
    height: 1.82,
    clearance: 0.24,
    wheelRadius: 0.38,
    wheelWidth: 0.24,
    frontAxle: 1.36,
    rearAxle: -1.38,
    profile: [
      [-2.31, 0.34],
      [-2.34, 0.72],
      [-2.28, 1.02],
      [-1.9, 1.24],
      [-1.4, 1.46],
      [-1.16, 1.72],
      [-0.4, 1.82],
      [0.5, 1.82],
      [0.98, 1.72],
      [1.2, 1.5],
      [1.86, 1.2],
      [2.22, 1.04],
      [2.32, 0.74],
      [2.3, 0.4],
      [2.02, 0.32],
      [-2.02, 0.32],
    ],
    greenhouse: [
      [-1.44, 1.44],
      [-1.2, 1.68],
      [-0.4, 1.76],
      [0.5, 1.76],
      [0.96, 1.66],
      [1.18, 1.46],
      [-1.42, 1.42],
    ],
    roofRails: true,
    bed: false,
  },
  hatch: {
    length: 3.72,
    width: 1.66,
    height: 1.5,
    clearance: 0.18,
    wheelRadius: 0.3,
    wheelWidth: 0.19,
    frontAxle: 1.16,
    rearAxle: -1.16,
    profile: [
      [-1.86, 0.26],
      [-1.88, 0.56],
      [-1.8, 0.8],
      [-1.5, 1.02],
      [-1.1, 1.3],
      [-0.5, 1.46],
      [0.32, 1.5],
      [0.72, 1.46],
      [1.06, 1.24],
      [1.5, 1.02],
      [1.78, 0.84],
      [1.88, 0.58],
      [1.86, 0.3],
      [1.6, 0.24],
      [-1.6, 0.24],
    ],
    greenhouse: [
      [-1.14, 1.28],
      [-0.52, 1.42],
      [0.3, 1.45],
      [0.7, 1.4],
      [1.04, 1.2],
      [-1.12, 1.18],
    ],
    roofRails: false,
    bed: false,
  },
  pickup: {
    length: 4.5,
    width: 1.78,
    height: 1.92,
    clearance: 0.24,
    wheelRadius: 0.36,
    wheelWidth: 0.22,
    frontAxle: 1.32,
    rearAxle: -1.42,
    profile: [
      [-2.25, 0.36],
      [-2.28, 0.86],
      [-2.2, 1.16],
      [-1.8, 1.28],
      [-1.1, 1.4],
      [-0.2, 1.44],
      [0.42, 1.86],
      [1.02, 1.86],
      [1.14, 1.5],
      [1.42, 1.14],
      [1.98, 0.96],
      [2.24, 0.8],
      [2.26, 0.44],
      [1.98, 0.36],
      [-1.98, 0.36],
    ],
    greenhouse: [
      [0.44, 1.8],
      [1.0, 1.8],
      [1.1, 1.48],
      [0.46, 1.48],
    ],
    roofRails: false,
    bed: true,
  },
}

function tyreProfile(radius, width) {
  const r = radius
  const w = width / 2
  return [
    [r * 0.62, -w * 0.86],
    [r * 0.78, -w],
    [r * 0.92, -w * 0.98],
    [r * 0.995, -w * 0.78],
    [r, -w * 0.5],
    [r, w * 0.5],
    [r * 0.995, w * 0.78],
    [r * 0.92, w * 0.98],
    [r * 0.78, w],
    [r * 0.62, w * 0.86],
    [r * 0.6, -w * 0.86],
  ]
}

function rimProfile(radius, dish) {
  return [
    [0.0, -dish * 0.5],
    [radius * 0.34, -dish * 0.34],
    [radius * 0.5, -dish * 0.1],
    [radius * 0.62, dish * 0.1],
    [radius * 0.66, dish * 0.5],
    [radius * 0.6, dish * 0.62],
    [radius * 0.42, dish * 0.5],
    [0.0, dish * 0.36],
  ]
}

export function buildVehicle(b, options = {}) {
  const kind = options.kind ?? 'sedan'
  const spec = VEHICLES[kind]
  const random = rng(options.seed ?? 5)
  const paint = options.paint ?? 'paintA'
  const halfWidth = spec.width / 2

  /* ---------------------------------------------------------------- body */
  const bodyGeometry = b.makeExtrude(spec.profile, spec.width * 0.94, {
    bevelThickness: 0.07,
    bevelSize: 0.07,
    bevelSegments: 2,
    curveSegments: 2,
  })
  taper(bodyGeometry, 0.055, 'x')
  b.add(bodyGeometry, { y: spec.clearance }, paint)

  // chassis / underside block so nothing reads as hollow
  b.box(spec.length * 0.86, 0.16, spec.width * 0.86, { y: spec.clearance + 0.02 }, 'darkMetal')

  /* --------------------------------------------------------- greenhouse */
  const greenhouse = b.makeExtrude(spec.greenhouse, spec.width * 0.9, {
    bevelThickness: 0.035,
    bevelSize: 0.035,
    bevelSegments: 1,
    curveSegments: 2,
  })
  taper(greenhouse, 0.16, 'z')
  b.add(greenhouse, { y: spec.clearance }, 'glass')

  // window frame / pillar trim
  const gh = spec.greenhouse
  for (let i = 0; i < gh.length; i++) {
    const a = gh[i]
    const c = gh[(i + 1) % gh.length]
    const dx = c[0] - a[0]
    const dy = c[1] - a[1]
    const len = Math.hypot(dx, dy)
    if (len < 0.12) continue
    const angle = Math.atan2(dy, dx)
    for (const side of [-1, 1]) {
      b.box(len, 0.035, 0.035, {
        x: (a[0] + c[0]) / 2,
        y: spec.clearance + (a[1] + c[1]) / 2,
        z: side * halfWidth * 0.87,
        rz: angle,
      }, 'darkMetal')
    }
  }

  /* -------------------------------------------------------------- wheels */
  const wheelZ = halfWidth * 0.94
  for (const x of [spec.frontAxle, spec.rearAxle]) {
    for (const side of [-1, 1]) {
      const wheelCentre = { x, y: spec.wheelRadius, z: side * wheelZ }
      const tyre = b.makeLathe(tyreProfile(spec.wheelRadius, spec.wheelWidth), 18)
      b.add(tyre, { ...wheelCentre, rx: Math.PI / 2 }, 'rubber')
      const rim = b.makeLathe(rimProfile(spec.wheelRadius * 0.68, spec.wheelWidth * 0.5), 14)
      b.add(rim, { x: wheelCentre.x, y: wheelCentre.y, z: wheelCentre.z + side * 0.012, rx: Math.PI / 2 }, 'rim')
      // spokes
      const spokes = 5
      for (let s = 0; s < spokes; s++) {
        const a = (s / spokes) * Math.PI * 2 + random() * 0.1
        b.box(spec.wheelRadius * 0.62, 0.055, 0.03, {
          x: wheelCentre.x + Math.cos(a) * spec.wheelRadius * 0.3,
          y: wheelCentre.y + Math.sin(a) * spec.wheelRadius * 0.3,
          z: wheelCentre.z + side * 0.05,
          rz: a,
        }, 'rim')
      }
      b.cylinder(0.055, 0.055, 0.06, 8, {
        x: wheelCentre.x,
        y: wheelCentre.y,
        z: wheelCentre.z + side * 0.06,
        rx: Math.PI / 2,
      }, 'rim')

      // wheel arch flare
      const archSegments = 12
      const archPoints = []
      for (let s = 0; s <= archSegments; s++) {
        const a = Math.PI * (s / archSegments)
        archPoints.push(
          V(x + Math.cos(a) * spec.wheelRadius * 1.32, spec.clearance + 0.04 + Math.sin(a) * spec.wheelRadius * 1.24, 0),
        )
      }
      b.tube(archPoints, 0.045, { z: side * (halfWidth - 0.01) }, 'darkMetal', { segments: 5, noise: 0.05, seed: 3 })
    }
  }

  /* ------------------------------------------------------------- details */
  const nose = spec.length / 2
  const tail = -spec.length / 2

  // bumpers
  b.box(0.2, 0.24, spec.width * 0.96, { x: nose + 0.06, y: spec.clearance + 0.3, z: 0 }, 'plastic')
  b.box(0.2, 0.22, spec.width * 0.96, { x: tail - 0.06, y: spec.clearance + 0.3, z: 0 }, 'plastic')

  // grille + intake
  b.box(0.08, 0.2, 0.9, { x: nose + 0.02, y: spec.clearance + 0.62, z: 0 }, 'darkMetal')
  for (let i = 0; i < 4; i++) {
    b.box(0.05, 0.022, 0.86, { x: nose + 0.05, y: spec.clearance + 0.54 + i * 0.06, z: 0 }, 'rim')
  }
  b.box(0.06, 0.1, 0.5, { x: nose + 0.02, y: spec.clearance + 0.2, z: 0 }, 'plastic')

  // head lights
  for (const side of [-1, 1]) {
    b.box(0.14, 0.16, 0.42, { x: nose - 0.02, y: spec.clearance + 0.68, z: side * halfWidth * 0.6 }, 'light')
    b.box(0.1, 0.14, 0.32, { x: tail + 0.02, y: spec.clearance + 0.66, z: side * halfWidth * 0.62 }, 'tail')
  }

  // mirrors + stalks
  for (const side of [-1, 1]) {
    b.box(0.1, 0.05, 0.14, { x: spec.greenhouse[spec.greenhouse.length - 3]?.[0] ?? 0.9, y: spec.clearance + 1.06, z: side * (halfWidth + 0.02) }, 'paint')
    b.box(0.13, 0.11, 0.07, {
      x: (spec.greenhouse[spec.greenhouse.length - 3]?.[0] ?? 0.9) - 0.03,
      y: spec.clearance + 1.08,
      z: side * (halfWidth + 0.1),
    }, 'plastic')
  }

  // door panel gaps + handles
  const doors = kind === 'hatch' ? 2 : kind === 'pickup' ? 1 : 2
  for (let d = 0; d <= doors; d++) {
    const x = -1.1 + d * (2.0 / Math.max(1, doors))
    for (const side of [-1, 1]) {
      b.box(0.02, 0.72, 0.02, {
        x,
        y: spec.clearance + 0.62,
        z: side * (halfWidth - 0.012),
        rx: 0.04,
      }, 'darkMetal')
      b.box(0.16, 0.05, 0.04, { x: x + 0.24, y: spec.clearance + 0.86, z: side * (halfWidth + 0.005) }, 'rim')
    }
  }

  // side skirt
  for (const side of [-1, 1]) {
    b.box(spec.length * 0.6, 0.09, 0.06, { y: spec.clearance + 0.14, z: side * (halfWidth - 0.02) }, 'plastic')
  }

  // wipers
  b.box(0.05, 0.03, 1.0, { x: 1.0, y: spec.clearance + (spec.greenhouse.at(-1)?.[1] ?? 1.2) + 0.02, z: 0, rz: 0.12 }, 'darkMetal')

  // registration plates
  b.box(0.03, 0.16, 0.42, { x: nose + 0.14, y: spec.clearance + 0.34, z: 0 }, 'plate')
  b.box(0.03, 0.16, 0.42, { x: tail - 0.14, y: spec.clearance + 0.34, z: 0 }, 'plate')

  // antenna
  b.cylinder(0.008, 0.012, 0.6, 5, { x: -0.6, y: spec.clearance + 1.6, z: halfWidth * 0.5 }, 'darkMetal')

  if (spec.roofRails) {
    for (const side of [-1, 1]) {
      b.box(2.0, 0.06, 0.08, { x: -0.1, y: spec.clearance + spec.height - 0.08, z: side * 0.62 }, 'darkMetal')
      b.box(0.06, 0.07, 0.08, { x: -1.0, y: spec.clearance + spec.height - 0.12, z: side * 0.62 }, 'darkMetal')
      b.box(0.06, 0.07, 0.08, { x: 0.8, y: spec.clearance + spec.height - 0.12, z: side * 0.62 }, 'darkMetal')
    }
  }

  if (spec.bed) {
    // cargo deck: floor, side boards, headboard, ribbed tailgate
    const deckY = spec.clearance + 0.46
    b.box(2.6, 0.1, spec.width * 0.94, { x: -1.05, y: deckY, z: 0 }, 'darkMetal')
    for (const side of [-1, 1]) {
      b.box(2.6, 0.42, 0.07, { x: -1.05, y: deckY + 0.26, z: side * halfWidth * 0.93 }, 'paint')
      for (let i = 0; i < 5; i++) {
        b.box(0.07, 0.4, 0.09, { x: -2.2 + i * 0.58, y: deckY + 0.26, z: side * halfWidth * 0.93 }, 'darkMetal')
      }
    }
    b.box(0.08, 0.5, spec.width * 0.94, { x: 0.28, y: deckY + 0.3, z: 0 }, 'paint')
    b.box(0.06, 0.4, spec.width * 0.94, { x: -2.36, y: deckY + 0.25, z: 0 }, 'paint')
    // load in the bed: sacks and pipes so the truck reads as a site vehicle
    for (let i = 0; i < 4; i++) {
      b.box(0.44, 0.2, 0.34, { x: -1.8 + i * 0.4, y: deckY + 0.15, z: -0.4 + (i % 2) * 0.7, ry: random() * 0.5 }, 'sack')
    }
    const pipePoints = [V(-2.1, deckY + 0.14, 0.5), V(-0.2, deckY + 0.13, 0.46)]
    b.tube(pipePoints, 0.06, {}, 'metal', { segments: 7, noise: 0.04, seed: 9, uvScale: 0.6 })
  }

  return { kind }
}
