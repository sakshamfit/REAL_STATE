/**
 * REAL_STATE — procedural GLB generator (photorealism rebuild).
 *
 * Every asset is authored from the systems in `scripts/glb/lib/`:
 *   trees     recursive irregular branching + alpha leaf cards (never blobs)
 *   vehicles  beveled body extrusions with tumblehome, revolved tyres
 *   buildings punched-window facades with real reveals, frames, sills, chajjas
 *   site      lattice cranes, scaffold bays, rebar, sacks, block stacks
 *
 * Textures are NOT baked: the React experience owns a physically based
 * material library and maps each GLB material name to a runtime PBR material.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Document, NodeIO } from '@gltf-transform/core'
import { prune, dedup } from '@gltf-transform/functions'
import { Builder, V, rng, tube } from './lib/geo.mjs'
import { buildTree, buildShrub, SPECIES } from './lib/tree.mjs'
import { buildVehicle } from './lib/vehicle.mjs'
import {
  acUnit,
  balcony,
  canopy,
  core,
  corrugated,
  lattice,
  parapet,
  punchedFacade,
  railing,
  scaffoldBay,
  slab,
  solarArray,
  waterTank,
} from './lib/building.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../..')
const OUT_DIR = path.join(ROOT, 'assets/raw')
fs.mkdirSync(OUT_DIR, { recursive: true })

/* ------------------------------------------------------------------ materials */

const MATERIALS = {
  concrete: [0.72, 0.70, 0.66],
  render: [0.86, 0.82, 0.75],
  renderWarm: [0.83, 0.77, 0.68],
  stone: [0.66, 0.62, 0.55],
  sand: [0.74, 0.66, 0.5],
  glass: [0.30, 0.36, 0.39, 0.5],
  glassDark: [0.16, 0.19, 0.21, 0.62],
  metal: [0.70, 0.71, 0.73],
  darkMetal: [0.24, 0.25, 0.26],
  rim: [0.58, 0.58, 0.60],
  rubber: [0.11, 0.11, 0.12],
  rust: [0.42, 0.24, 0.15],
  asphalt: [0.24, 0.24, 0.25],
  panelDark: [0.10, 0.13, 0.18],
  plastic: [0.36, 0.38, 0.36],
  paintA: [0.74, 0.75, 0.76],
  paintB: [0.22, 0.26, 0.26],
  paintC: [0.66, 0.36, 0.28],
  paintD: [0.86, 0.84, 0.78],
  light: [0.92, 0.92, 0.88],
  tail: [0.62, 0.16, 0.12],
  plate: [0.92, 0.90, 0.82],
  sack: [0.74, 0.72, 0.66],
  wood: [0.34, 0.26, 0.19],
  leaf: [0.30, 0.40, 0.20],
  leafB: [0.36, 0.44, 0.22],
  leafDry: [0.52, 0.48, 0.26],
  foliage: [0.28, 0.38, 0.19],
  foliageB: [0.34, 0.42, 0.21],
  terracotta: [0.62, 0.34, 0.22],
  paintMuted: [0.34, 0.42, 0.38],
  safety: [0.78, 0.60, 0.12],
  tarp: [0.30, 0.38, 0.42],
  gravel: [0.48, 0.44, 0.38],
  brick: [0.58, 0.34, 0.26],
}

async function writeAsset(name, buildFn) {
  const doc = new Document()
  const buffer = doc.createBuffer()
  const b = new Builder()
  buildFn(b)

  const materials = new Map()
  for (const [materialName, color] of Object.entries(MATERIALS)) {
    const material = doc
      .createMaterial(materialName)
      .setBaseColorFactor([color[0], color[1], color[2], color[3] ?? 1])
      .setRoughnessFactor(0.85)
      .setMetallicFactor(0.05)
    if (color[3] !== undefined && color[3] < 1) material.setAlphaMode('BLEND')
    materials.set(materialName, material)
  }

  const scene = doc.createScene(name)
  for (const [materialName, target] of b.targets) {
    const posAccessor = doc
      .createAccessor()
      .setType('VEC3')
      .setBuffer(buffer)
      .setArray(new Float32Array(target.positions))
    const normalAccessor = doc
      .createAccessor()
      .setType('VEC3')
      .setBuffer(buffer)
      .setArray(new Float32Array(target.normals))
    const uvAccessor = doc
      .createAccessor()
      .setType('VEC2')
      .setBuffer(buffer)
      .setArray(new Float32Array(target.uvs))
    const primitive = doc
      .createPrimitive()
      .setAttribute('POSITION', posAccessor)
      .setAttribute('NORMAL', normalAccessor)
      .setAttribute('TEXCOORD_0', uvAccessor)
      .setMaterial(materials.get(materialName))
    const mesh = doc.createMesh(`${materialName}-mesh`).addPrimitive(primitive)
    scene.addChild(doc.createNode(materialName).setMesh(mesh).setName(materialName))
  }
  doc.getRoot().setDefaultScene(scene)
  await doc.transform(dedup(), prune({ keepAttributes: true }))

  const io = new NodeIO()
  const file = path.join(OUT_DIR, `${name}.glb`)
  await io.write(file, doc)
  const tris = [...b.targets.values()].reduce((sum, t) => sum + t.positions.length / 9, 0)
  console.log(`${name.padEnd(22)} ${String(Math.round(tris)).padStart(7)} tris  ${fs.statSync(file).size.toLocaleString()} B`)
}

/* ------------------------------------------------------------------- helpers */

function baysFor(count, width, start, gap = 1.05) {
  const bays = []
  const step = width / count
  for (let i = 0; i < count; i++) {
    bays.push([start + i * step + gap * 0.5, start + (i + 1) * step - gap * 0.5])
  }
  return bays
}

/* ==================================================================== assets */

/**
 * HERO — RUDRA's own mixed-use tower.
 *
 * V11 massing redesign. The previous version had good detail hung on a bad
 * plan: podium, tower and crown were one 22×16 extrusion, so from any distance
 * where you could see the whole building it read as a single rectangular mass
 * with windows on it, and no amount of bevelling or texture noise fixes that.
 *
 * The fix is architectural, not decorative. Five moves, in plan and section:
 *
 *   1. The plan is an L, not a rectangle. A service wing runs back off the
 *      north-east corner, so the building has a re-entrant corner and two
 *      distinct elevations instead of four faces of the same box.
 *   2. The podium is genuinely wider than the tower and stops at level 2 with
 *      its own roof terrace, so the tower visibly lands on something.
 *   3. The tower is split into a lower and an upper block by a real setback at
 *      level 8 — the upper block loses 3.4 m of depth on the road side, which
 *      creates an occupied terrace and puts a hard horizontal shadow across
 *      the elevation.
 *   4. The road elevation is grouped: a 3-storey glazed lower zone, a 4-storey
 *      balcony zone, a recessed 2-storey band, then the setback and crown.
 *      Reading up the building you pass through changes, not repeats.
 *   5. The crown is a service floor that is deliberately different — deeper
 *      soffit, louvred plant, and the lift overrun standing proud of it.
 *
 * Everything is dimensioned so it could be built: slabs land on columns, the
 * setback happens at a floor line, the service wing shares the tower's grid.
 */
async function generateHeroBuilding() {
  await writeAsset('hero-building', (b) => {
    /* ------------------------------------------------------------- grid */
    const W = 22 // tower width, road elevation
    const D = 16 // tower depth
    const fh = 3.06 // floor to floor
    const podiumH = 7.4 // two commercial levels
    const lowerFloors = 6 // podium roof → setback
    const upperFloors = 5 // setback → crown
    const setbackDepth = 3.4 // how much the upper block loses on the road side
    const random = rng(11)

    const towerBase = podiumH
    const setbackY = towerBase + lowerFloors * fh
    const towerTop = setbackY + upperFloors * fh

    // Upper block: same width, shallower, and its road face steps back.
    const upperD = D - setbackDepth
    const upperZFront = D / 2 - setbackDepth

    // Service wing: an L off the back, half width, stopping below the setback.
    const wingW = 7.2
    const wingD = 6.4
    const wingX = W / 2 - wingW / 2
    const wingZ = -D / 2 - wingD / 2
    const wingTop = towerBase + 4 * fh

    /* ----------------------------------------------------------- podium */
    /**
     * The podium is 3 m wider and 2.6 m deeper than the tower on every side.
     * That overhang is the whole point: it is what the tower sits *on*, and it
     * is read instantly at 100 m as a base rather than as the bottom of a box.
     */
    const pW = W + 6.0
    const pD = D + 5.2

    b.chamfer(pW, podiumH, pD, { x: 0, y: podiumH / 2, z: 0 }, 'concrete', { bevel: 0.024 })
    // ground slab / plinth, stepped twice
    b.chamfer(pW + 1.2, 0.5, pD + 1.2, { x: 0, y: 0.25, z: 0 }, 'stone', { bevel: 0.018 })
    b.chamfer(pW + 0.6, 0.22, pD + 0.6, { x: 0, y: 0.62, z: 0 }, 'stone', { bevel: 0.014 })
    // podium cornice — a deep one, this is the line the tower lands behind
    b.chamfer(pW + 0.9, 0.42, pD + 0.9, { x: 0, y: podiumH + 0.21, z: 0 }, 'concrete', { bevel: 0.018 })
    b.chamfer(pW + 0.5, 0.14, pD + 0.5, { x: 0, y: podiumH + 0.49, z: 0 }, 'stone', { bevel: 0.012 })

    /**
     * Podium roof terrace. The tower is narrower than the podium, so the
     * leftover roof is a real occupied surface — paved, with a parapet and
     * planters. It is visible from the hero camera and from every upper floor,
     * and it is the reason the podium reads as a separate building element.
     */
    const terraceZ = D / 2 + (pD / 2 - D / 2) / 2
    b.box(pW - 0.8, 0.05, pD / 2 - D / 2 - 0.6, { x: 0, y: podiumH + 0.45, z: terraceZ }, 'stone')
    parapet(b, { w: pW - 0.3, d: pD - 0.3, y: podiumH + 0.42, height: 1.05, thickness: 0.22 })
    for (let i = 0; i < 5; i++) {
      const px = -pW / 2 + 2.4 + i * ((pW - 4.8) / 4)
      b.chamfer(1.5, 0.5, 0.85, { x: px, y: podiumH + 0.72, z: terraceZ + 0.3 }, 'stone', { bevel: 0.014 })
      b.box(1.34, 0.3, 0.7, { x: px, y: podiumH + 1.04, z: terraceZ + 0.3 }, 'foliage')
    }

    /**
     * Podium glazing — double height, mullioned, with a stall riser.
     *
     * A commercial podium in India is a glazed shopfront, not a punched wall.
     * This runs the full length of both long elevations in tall bays with deep
     * reveals, so the base is transparent and the mass above it reads as
     * heavier by contrast.
     */
    for (const side of [1, -1]) {
      const z = side * (pD / 2)
      for (let i = 0; i < 7; i++) {
        const x = -pW / 2 + 1.8 + i * ((pW - 3.6) / 6)
        const bw = (pW - 3.6) / 6 - 0.5
        // stall riser
        b.chamfer(bw + 0.4, 0.62, 0.22, { x, y: 0.93, z: z * 1.002 }, 'stone', { bevel: 0.014 })
        // two-storey glazed bay, recessed 0.22 into the podium face
        b.frame(bw, 5.1, 0.09, 0.14, { x, y: 3.86, z: z - side * 0.22 }, 'darkMetal', { bevel: 0.009 })
        b.box(bw - 0.12, 5.0, 0.07, { x, y: 3.86, z: z - side * 0.22 }, 'glassDark')
        // transom at the first floor line
        b.chamfer(bw, 0.16, 0.16, { x, y: 3.4, z: z - side * 0.14 }, 'darkMetal', { bevel: 0.01 })
        // mullion
        b.chamfer(0.11, 5.0, 0.19, { x, y: 3.86, z: z - side * 0.14 }, 'darkMetal', { bevel: 0.009 })
        // pier between bays
        b.chamfer(0.5, podiumH - 0.5, 0.42, { x: x + (pW - 3.6) / 12, y: (podiumH - 0.5) / 2 + 0.5, z: z - side * 0.06 }, 'concrete', { bevel: 0.016 })
      }
      // fascia band above the glazing
      b.chamfer(pW + 0.3, 0.5, 0.3, { x: 0, y: podiumH - 0.55, z: z * 1.004 }, 'render', { bevel: 0.014 })
    }
    // podium short ends: solid, with a service door and a louvre
    for (const sx of [-1, 1]) {
      const x = sx * (pW / 2)
      b.chamfer(0.42, 2.5, 1.5, { x: x - sx * 0.1, y: 1.25, z: -pD / 4 }, 'darkMetal', { bevel: 0.012 })
      for (let i = 0; i < 7; i++) {
        b.box(0.1, 0.1, 2.2, { x: x + sx * 0.05, y: 4.3 + i * 0.22, z: pD / 5 }, 'darkMetal')
      }
    }

    /* ------------------------------------------------- tower structure */
    // Columns run the full height and land on the podium — the frame is real.
    const colX = [-W / 2 + 0.45, -W / 2 + 7.3, W / 2 - 7.3, W / 2 - 0.45]
    for (const x of colX) {
      b.chamfer(0.82, setbackY - towerBase, D + 0.3, { x, y: (setbackY + towerBase) / 2, z: 0 }, 'concrete', { bevel: 0.016 })
      b.chamfer(0.74, towerTop - setbackY, upperD + 0.3, { x, y: (towerTop + setbackY) / 2, z: -D / 2 + upperD / 2 }, 'concrete', { bevel: 0.016 })
    }
    // end walls, lower and upper block
    for (const x of [-W / 2 + 0.1, W / 2 - 0.1]) {
      b.box(0.2, setbackY - towerBase, D, { x, y: (setbackY + towerBase) / 2, z: 0 }, 'renderWarm')
      b.box(0.2, towerTop - setbackY, upperD, { x, y: (towerTop + setbackY) / 2, z: -D / 2 + upperD / 2 }, 'renderWarm')
    }

    /* --------------------------------------------- road elevation: zones */
    /**
     * Zone A — lower tower, levels 2 to 7.
     *
     * Wide bays, deep reveals, a chajja over every opening, and balconies on
     * the outer bays only. This is the zone the camera passes closest to.
     */
    punchedFacade(b, {
      plane: 'z',
      from: -W / 2,
      length: W,
      z: D / 2,
      thickness: 0.34,
      baseY: towerBase,
      floors: lowerFloors,
      floorHeight: fh,
      bays: baysFor(5, W, -W / 2, 1.3),
      sill: 0.86,
      head: 2.42,
      recess: 0.34,
      wall: 'renderWarm',
      band: 'concrete',
      glass: 'glass',
      frame: 'metal',
      sillMaterial: 'stone',
      mullions: 1,
      chajja: 0.3,
      seed: 4,
      fins: 2,
      chamferTrim: true,
      frameBevel: 0.007,
    })

    /**
     * Zone B — upper tower, above the setback.
     *
     * Narrower bays, no balconies, a continuous vertical fin order instead.
     * Same building, different floor plan: this is where the apartments get
     * smaller, and the elevation says so.
     */
    punchedFacade(b, {
      plane: 'z',
      from: -W / 2,
      length: W,
      z: upperZFront,
      thickness: 0.32,
      baseY: setbackY,
      floors: upperFloors,
      floorHeight: fh,
      bays: baysFor(7, W, -W / 2, 0.95),
      sill: 0.95,
      head: 2.3,
      recess: 0.28,
      wall: 'render',
      band: 'concrete',
      glass: 'glass',
      frame: 'metal',
      sillMaterial: 'stone',
      mullions: 0,
      chajja: 0.2,
      seed: 17,
      fins: 3,
      chamferTrim: true,
      frameBevel: 0.007,
    })

    // rear elevation — service character, full height, smaller openings
    punchedFacade(b, {
      plane: 'z',
      from: -W / 2,
      length: W,
      z: -D / 2,
      thickness: 0.3,
      baseY: towerBase,
      floors: lowerFloors + upperFloors,
      floorHeight: fh,
      bays: baysFor(8, W, -W / 2, 0.85),
      sill: 1.0,
      head: 1.9,
      recess: 0.24,
      wall: 'render',
      band: 'concrete',
      glass: 'glassDark',
      frame: 'metal',
      sillMaterial: 'stone',
      mullions: 0,
      chajja: 0.14,
      seed: 9,
      chamferTrim: false,
    })

    /* ------------------------------------------------------- the setback */
    /**
     * The setback terrace at level 8.
     *
     * This is the move that changes the silhouette. The upper block steps back
     * 3.4 m, leaving an occupied terrace along the road elevation with a
     * planted edge and a solid balustrade. It casts a hard horizontal shadow
     * across the lower tower in afternoon sun, which is exactly the reading
     * the old single-mass version could never produce.
     */
    b.chamfer(W + 0.5, 0.34, setbackDepth + 0.5, { x: 0, y: setbackY + 0.17, z: upperZFront + setbackDepth / 2 }, 'concrete', { bevel: 0.018 })
    b.box(W - 0.4, 0.05, setbackDepth - 0.3, { x: 0, y: setbackY + 0.37, z: upperZFront + setbackDepth / 2 }, 'stone')
    // balustrade along the terrace edge
    b.chamfer(W + 0.5, 1.0, 0.2, { x: 0, y: setbackY + 0.84, z: D / 2 + 0.15 }, 'concrete', { bevel: 0.014 })
    b.chamfer(W + 0.62, 0.1, 0.3, { x: 0, y: setbackY + 1.39, z: D / 2 + 0.15 }, 'stone', { bevel: 0.011 })
    // returns at both ends
    for (const sx of [-1, 1]) {
      b.chamfer(0.2, 1.0, setbackDepth, { x: sx * (W / 2 + 0.15), y: setbackY + 0.84, z: upperZFront + setbackDepth / 2 }, 'concrete', { bevel: 0.014 })
    }
    // planters and a pergola on the terrace — it is used, not left over
    for (let i = 0; i < 4; i++) {
      const px = -W / 2 + 3.2 + i * ((W - 6.4) / 3)
      b.chamfer(1.7, 0.55, 0.9, { x: px, y: setbackY + 0.66, z: upperZFront + 1.0 }, 'stone', { bevel: 0.014 })
      b.box(1.5, 0.34, 0.74, { x: px, y: setbackY + 1.02, z: upperZFront + 1.0 }, 'foliage')
    }
    for (const px of [-6.5, 6.5]) {
      b.chamfer(0.16, 2.5, 0.16, { x: px, y: setbackY + 1.6, z: upperZFront + 2.3 }, 'metal', { bevel: 0.01 })
    }
    b.chamfer(14.5, 0.12, 0.16, { x: 0, y: setbackY + 2.82, z: upperZFront + 2.3 }, 'metal', { bevel: 0.009 })

    /* ------------------------------------------------------ service wing */
    /**
     * The L. A four-storey service wing off the north-east corner carrying the
     * secondary stair, the shafts and the back-of-house. It shares the tower
     * grid and stops well below the setback, so from the road the building has
     * a stepped profile in two directions rather than one flat side.
     */
    b.chamfer(wingW, wingTop, wingD, { x: wingX, y: wingTop / 2, z: wingZ }, 'render', { bevel: 0.018 })
    b.chamfer(wingW + 0.4, 0.3, wingD + 0.4, { x: wingX, y: wingTop + 0.15, z: wingZ }, 'concrete', { bevel: 0.014 })
    parapet(b, { w: wingW + 0.3, d: wingD + 0.3, y: wingTop + 0.3, height: 0.85, thickness: 0.2 })
    // stair landings read as a stack of small openings up the wing's outer face
    for (let f = 0; f < 4; f++) {
      const y = 1.4 + f * fh
      b.chamfer(1.5, 1.5, 0.24, { x: wingX + wingW / 2 - 0.02, y: y + 0.6, z: wingZ - 1.2 }, 'glassDark', { bevel: 0.01 })
      b.chamfer(1.7, 0.16, 0.34, { x: wingX + wingW / 2 - 0.02, y: y + 1.44, z: wingZ - 1.2 }, 'concrete', { bevel: 0.012 })
    }
    // service risers on the wing's back face
    for (const rz of [-1.6, 0.4]) {
      b.tube(
        [V(wingX + wingW / 2 + 0.14, wingTop - 0.3, wingZ + rz), V(wingX + wingW / 2 + 0.14, 0.3, wingZ + rz)],
        0.075,
        {},
        'darkMetal',
        { segments: 6, noise: 0.015, seed: 31, uvScale: 1 },
      )
    }

    /* -------------------------------------------------- corner articulation */
    // Corner piers, lower and upper block, so the elevation turns a corner.
    for (const x of [-W / 2, W / 2]) {
      for (const z of [-D / 2, D / 2]) {
        b.chamfer(0.66, setbackY - towerBase, 0.66, { x, y: (setbackY + towerBase) / 2, z }, 'concrete', { bevel: 0.016 })
      }
      for (const z of [-D / 2, upperZFront]) {
        b.chamfer(0.6, towerTop - setbackY, 0.6, { x, y: (towerTop + setbackY) / 2, z }, 'concrete', { bevel: 0.016 })
      }
    }

    /**
     * Zone C — the recessed band.
     *
     * The top two floors of the lower block get a shadow band: a horizontal
     * recess with the glazing pushed back and a deeper chajja above it. It
     * separates the balcony zone from the setback without adding a new volume,
     * and it stops the six lower floors reading as one run.
     */
    for (const z of [D / 2, -D / 2]) {
      const sgn = Math.sign(z)
      b.chamfer(W + 0.7, 0.3, 0.55, { x: 0, y: setbackY - 2 * fh + 0.2, z: z + sgn * 0.16 }, 'concrete', { bevel: 0.014 })
      b.chamfer(W + 0.4, 0.14, 0.36, { x: 0, y: setbackY - 2 * fh - 0.06, z: z + sgn * 0.12 }, 'stone', { bevel: 0.01 })
    }

    /* ---------------------------------------------------------- balconies */
    /**
     * Balconies on the outer bays of the lower block only, and every floor
     * rather than every other one — a continuous vertical stack of balconies
     * on each flank, which is what an Indian residential tower actually does,
     * and which frames the glazed centre bays.
     */
    for (let f = 0; f < lowerFloors; f++) {
      const y = towerBase + f * fh + fh * 0.18
      balcony(b, { x: -W / 2 + 3.6, y, z: D / 2 + 1.0, w: 5.4, d: 2.0, planter: f % 3 === 0 })
      balcony(b, { x: W / 2 - 3.6, y, z: D / 2 + 1.0, w: 5.4, d: 2.0, planter: f % 3 === 2 })
    }
    // upper block: shallow french balconies, a different element entirely
    for (let f = 0; f < upperFloors; f++) {
      const y = setbackY + f * fh + fh * 0.2
      for (const sx of [-1, 1]) {
        b.chamfer(4.6, 0.16, 0.6, { x: sx * 6.4, y, z: upperZFront + 0.3 }, 'concrete', { bevel: 0.014 })
        railing(b, { x0: sx * 6.4 - 2.3, x1: sx * 6.4 + 2.3, y: y + 0.08, z: upperZFront + 0.56, height: 1.0, posts: 5 })
      }
    }

    /* ------------------------------------------------------- side details */
    // AC units, on the side elevations of the lower block
    for (let f = 0; f < lowerFloors; f++) {
      const y = towerBase + f * fh + 2.2
      if (f % 2 === 0) acUnit(b, { x: -W / 2 - 0.24, y, z: -3.2, ry: Math.PI / 2 })
      if (f % 3 === 1) acUnit(b, { x: W / 2 + 0.24, y, z: 2.6, ry: -Math.PI / 2 })
    }
    for (let f = 0; f < upperFloors; f++) {
      const y = setbackY + f * fh + 2.2
      if (f % 2 === 1) acUnit(b, { x: -W / 2 - 0.22, y, z: -D / 2 + 3.0, ry: Math.PI / 2 })
    }
    // service band + fins on the end walls, lower block only
    for (const x of [-W / 2 - 0.22, W / 2 + 0.22]) {
      for (let f = 0; f < lowerFloors; f++) {
        b.chamfer(0.1, 0.18, D - 1, { x, y: towerBase + f * fh + 0.2, z: 0 }, 'concrete', { bevel: 0.01 })
      }
      for (let i = 0; i < 8; i++) {
        b.chamfer(0.22, setbackY - towerBase, 0.16, { x, y: (setbackY + towerBase) / 2, z: -D / 2 + 1.1 + i * 1.95 }, 'concrete', { bevel: 0.012 })
      }
    }

    // rainwater downpipes, road elevation, stepping in at the setback
    for (const x of [-W / 2 + 0.34, W / 2 - 0.34]) {
      b.tube(
        [
          V(x, towerTop - 0.4, upperZFront + 0.16),
          V(x, setbackY + 0.6, upperZFront + 0.16),
          V(x, setbackY - 0.4, D / 2 + 0.16),
          V(x, podiumH + 0.6, D / 2 + 0.16),
          V(x, 0.1, pD / 2 + 0.2),
        ],
        0.055,
        {},
        'darkMetal',
        { segments: 6, noise: 0.02, seed: 21, uvScale: 1 },
      )
      for (let f = 1; f < lowerFloors; f += 3) {
        b.box(0.14, 0.1, 0.14, { x, y: towerBase + f * fh, z: D / 2 + 0.16 }, 'concrete')
      }
    }

    /* ---------------------------------------------------------- entrance */
    /**
     * The entrance. §13 — this has to be one of the strongest places in the
     * world, so it gets a real sequence: forecourt paving, steps and a ramp,
     * columns carrying a canopy that is actually supported, a double-height
     * glazed lobby behind it, and doors with leaves and stiles.
     *
     * The whole composition sits forward of the podium face, on the podium's
     * own plinth, so nothing floats.
     */
    const eZ = pD / 2
    canopy(b, { x: 0, y: 5.4, z: eZ + 3.8, w: 11.5, d: 4.2, columns: 2 })
    // columns: square, with a base and a capital, standing on the plinth
    for (const s of [-1, 1]) {
      b.chamfer(0.72, 5.4, 0.72, { x: s * 4.9, y: 2.7, z: eZ + 5.4 }, 'stone', { bevel: 0.016 })
      b.chamfer(0.92, 0.16, 0.92, { x: s * 4.9, y: 0.08, z: eZ + 5.4 }, 'stone', { bevel: 0.012 })
      b.chamfer(0.88, 0.16, 0.88, { x: s * 4.9, y: 5.3, z: eZ + 5.4 }, 'stone', { bevel: 0.012 })
    }
    // forecourt paving
    b.box(15.0, 0.04, 7.0, { x: 0, y: 0.03, z: eZ + 4.4 }, 'stone')
    // steps, three treads across the centre
    for (let i = 0; i < 3; i++) {
      b.chamfer(10.5, 0.17, 0.9 + i * 0.34, { x: 0, y: 0.085 + i * 0.17, z: eZ + 1.5 + i * 0.3 }, 'stone', { bevel: 0.012 })
    }
    // accessible ramp to one side, with a handrail — a real building has one
    b.chamfer(2.6, 0.16, 6.2, { x: -7.4, y: 0.26, z: eZ + 3.4, rx: -0.082 }, 'stone', { bevel: 0.012 })
    railing(b, { x0: -8.6, x1: -6.2, y: 0.52, z: eZ + 0.5, height: 0.95, posts: 2 })
    for (let i = 0; i < 5; i++) {
      const rz = eZ + 0.9 + i * 1.3
      b.chamfer(0.05, 0.9, 0.05, { x: -6.2, y: 0.62 + i * 0.085, z: rz }, 'metal', { bevel: 0.007 })
    }
    b.tube(
      [V(-6.2, 1.06, eZ + 0.9), V(-6.2, 1.5, eZ + 6.1)],
      0.028,
      {},
      'metal',
      { segments: 6, noise: 0, seed: 3, uvScale: 1 },
    )

    // double-height lobby glazing, recessed into the podium
    b.frame(9.6, 5.6, 0.1, 0.16, { x: 0, y: 3.3, z: eZ - 0.18 }, 'darkMetal', { bevel: 0.009 })
    b.box(9.4, 5.5, 0.08, { x: 0, y: 3.3, z: eZ - 0.18 }, 'glassDark')
    // transom and mullions — a 9.6 m sheet of glass does not exist
    b.chamfer(9.6, 0.18, 0.22, { x: 0, y: 3.5, z: eZ - 0.1 }, 'darkMetal', { bevel: 0.011 })
    for (const mx of [-3.1, 3.1]) {
      b.chamfer(0.13, 5.5, 0.24, { x: mx, y: 3.3, z: eZ - 0.1 }, 'darkMetal', { bevel: 0.009 })
    }
    // doors: two pairs of leaves with meeting stiles and pull handles
    for (const s of [-1, 1]) {
      b.chamfer(1.45, 2.55, 0.07, { x: s * 1.5, y: 1.32, z: eZ - 0.12 }, 'darkMetal', { bevel: 0.008 })
      b.box(1.3, 2.4, 0.035, { x: s * 1.5, y: 1.32, z: eZ - 0.14 }, 'glassDark')
      b.cylinder(0.022, 0.022, 1.0, 6, { x: s * 0.92, y: 1.25, z: eZ - 0.04 }, 'metal')
    }
    b.chamfer(0.14, 2.55, 0.1, { x: 0, y: 1.32, z: eZ - 0.06 }, 'darkMetal', { bevel: 0.008 })
    // signage, mounted on the fascia over the canopy — on a bracket, not floating
    b.chamfer(8.0, 1.05, 0.18, { x: 0, y: 6.5, z: eZ + 5.7 }, 'render', { bevel: 0.012 })
    b.box(7.2, 0.62, 0.07, { x: 0, y: 6.5, z: eZ + 5.8 }, 'paintB')
    for (const sx of [-2.6, 2.6]) {
      b.box(0.1, 0.5, 0.5, { x: sx, y: 6.0, z: eZ + 5.5 }, 'darkMetal')
    }
    // bollards along the forecourt edge
    for (let i = 0; i < 6; i++) {
      b.cylinder(0.075, 0.085, 0.75, 8, { x: -6.5 + i * 2.6, y: 0.4, z: eZ + 7.4 }, 'darkMetal')
    }

    /* -------------------------------------------------------------- crown */
    /**
     * The crown is a service level, not a lid. It has a deeper soffit than the
     * floors below, louvred plant enclosures, and the lift overrun standing
     * proud — so the top of the building has a profile instead of an edge.
     */
    slab(b, { w: W + 1.2, d: upperD + 1.2, thickness: 0.38, edge: 0.28, position: [0, towerTop + 0.19, -D / 2 + upperD / 2] })
    b.chamfer(W + 1.6, 0.2, upperD + 1.6, { x: 0, y: towerTop - 0.16, z: -D / 2 + upperD / 2 }, 'stone', { bevel: 0.014 })
    parapet(b, { w: W + 1.2, d: upperD + 1.2, y: towerTop + 0.38, height: 1.15 })

    core(b, { x: -6.4, z: -D / 2 + 3.0, w: 5.4, d: 5.4, height: towerTop + 0.38 })
    waterTank(b, { x: 4.2, y: towerTop + 0.5, z: -D / 2 + 2.2 })
    waterTank(b, { x: 6.0, y: towerTop + 0.5, z: -D / 2 + 4.4, r: 0.55, h: 1.05 })
    solarArray(b, { x: 1.6, y: towerTop + 0.5, z: -D / 2 + upperD - 1.6, count: 4 })

    // lift machine room, standing proud of the crown
    b.chamfer(3.6, 2.9, 3.2, { x: 6.6, y: towerTop + 1.85, z: -D / 2 + upperD - 2.6 }, 'renderWarm', { bevel: 0.016 })
    b.chamfer(3.9, 0.22, 3.5, { x: 6.6, y: towerTop + 3.4, z: -D / 2 + upperD - 2.6 }, 'stone', { bevel: 0.014 })
    for (let i = 0; i < 6; i++) {
      b.box(2.7, 0.06, 0.05, { x: 6.6, y: towerTop + 1.0 + i * 0.14, z: -D / 2 + upperD - 1.02 }, 'darkMetal')
    }
    b.cylinder(0.04, 0.06, 4.4, 5, { x: -8.4, y: towerTop + 2.6, z: -D / 2 + upperD - 1.4 }, 'darkMetal')

    // rooftop pipework on supports
    const pipe = [
      V(-9, towerTop + 0.6, -D / 2 + upperD - 0.9),
      V(0, towerTop + 0.62, -D / 2 + upperD - 1.0),
      V(9, towerTop + 0.58, -D / 2 + upperD - 1.1),
    ]
    b.tube(pipe, 0.07, {}, 'metal', { segments: 6, noise: 0.03, seed: 7, uvScale: 1 })
    for (const px of [-9, -3, 3, 9]) {
      b.chamfer(0.12, 0.5, 0.12, { x: px, y: towerTop + 0.29, z: -D / 2 + upperD - 1.0 }, 'concrete', { bevel: 0.01 })
    }
    railing(b, { x0: -W / 2, x1: W / 2, y: towerTop + 0.38, z: -D / 2 - 0.4, height: 1.0, posts: 8 })

    // a few facade signs of occupation, so the tower is lived in
    for (let f = 0; f < lowerFloors; f++) {
      if (random() < 0.4) {
        const sx = random() < 0.5 ? -1 : 1
        b.box(1.5, 0.03, 0.5, { x: sx * (W / 2 - 4.2), y: towerBase + f * fh + 1.5, z: D / 2 + 1.85 }, random() < 0.5 ? 'paintC' : 'paintMuted')
      }
    }
  })
}

/**
 * Residential block — service world 02.
 *
 * V11: this must read as *housing*, not as the hero at 60 % scale (§14). Three
 * things distinguish an Indian apartment block from a commercial tower, and
 * none of them is size:
 *
 *   1. It is two wings around a stair core, not a single slab. Every flat gets
 *      a external wall on two sides, which is why real blocks are E, L or H
 *      shaped rather than rectangular.
 *   2. The balcony is the dominant facade element and it is continuous —
 *      floor after floor, the full width of the flat, with washing lines and
 *      planters — rather than an occasional accent.
 *   3. The ground floor is open stilt parking, which is what the setback rules
 *      produce all over urban India. It gives the block a light, open base
 *      that a commercial podium never has.
 */
async function generateResidentialBuilding() {
  await writeAsset('residential-building', (b) => {
    const W = 21
    const D = 12
    const floors = 7
    const fh = 3.0
    const stilt = 3.3 // open parking level
    const top = stilt + floors * fh
    const random = rng(21)

    // Two wings separated by a recessed core — the plan is a shallow H.
    const wingW = 7.6
    const wingX = W / 2 - wingW / 2
    const coreW = W - 2 * wingW
    const coreInset = 0.75

    /* ------------------------------------------------------------- base */
    b.chamfer(W + 1.4, 0.45, D + 1.4, { x: 0, y: 0.22, z: 0 }, 'stone', { bevel: 0.016 })
    b.chamfer(W + 0.8, 0.2, D + 0.8, { x: 0, y: 0.55, z: 0 }, 'stone', { bevel: 0.012 })

    /**
     * Stilt parking. Columns on a grid, a beam band at the first floor, and
     * nothing else — you can see straight through the building at ground
     * level, which is the single most recognisable thing about this building
     * type and something the hero deliberately does not do.
     */
    for (const cx of [-W / 2 + 0.8, -W / 4 - 1.2, W / 4 + 1.2, W / 2 - 0.8]) {
      for (const cz of [-D / 2 + 0.9, D / 2 - 0.9]) {
        b.chamfer(0.58, stilt, 0.58, { x: cx, y: stilt / 2 + 0.45, z: cz }, 'concrete', { bevel: 0.016 })
      }
    }
    /**
     * The stair core runs to the ground — it is the way into the building, and
     * a stair that starts at first-floor level is the sort of thing that makes
     * a render read as a model. It also visually plants the block: without it
     * the whole mass appears to hover on thin legs.
     */
    b.chamfer(coreW + 0.6, stilt + 0.5, D - coreInset * 2 - 0.4, { x: 0, y: (stilt + 0.5) / 2 + 0.45, z: 0 }, 'render', { bevel: 0.014 })
    // rear service wall closing the back of the stilt level
    b.chamfer(W - 1.0, stilt, 0.3, { x: 0, y: stilt / 2 + 0.45, z: -D / 2 + 0.35 }, 'render', { bevel: 0.012 })
    // parked scooters/blocks under the stilts read as occupation at a distance
    for (let i = 0; i < 5; i++) {
      const px = -W / 2 + 3.0 + i * ((W - 6) / 4)
      b.chamfer(1.5, 0.5, 0.7, { x: px, y: 0.7, z: -D / 2 + 2.4 }, random() < 0.5 ? 'paintMuted' : 'paintC', { bevel: 0.02 })
    }
    // first-floor transfer beam — the whole block above lands on this
    b.chamfer(W + 0.5, 0.62, D + 0.5, { x: 0, y: stilt + 0.76, z: 0 }, 'concrete', { bevel: 0.016 })

    /* ------------------------------------------------------------ wings */
    for (const sx of [-1, 1]) {
      b.chamfer(wingW, top - stilt - 1.07, D, { x: sx * wingX, y: (top + stilt + 1.07) / 2, z: 0 }, 'renderWarm', { bevel: 0.016 })
    }
    // recessed core between them, set back so the wings read as separate
    b.chamfer(coreW + 0.4, top - stilt - 1.07, D - coreInset * 2, { x: 0, y: (top + stilt + 1.07) / 2, z: 0 }, 'render', { bevel: 0.014 })

    /**
     * The stair core: a full-height slot of glass block and landings, rising
     * past the parapet into a head house. In a real block this is the one
     * vertical element in an otherwise horizontal composition.
     */
    b.chamfer(coreW - 0.6, top - stilt + 2.6, 2.4, { x: 0, y: (top + stilt + 2.6) / 2 - 0.5, z: -D / 2 + coreInset + 1.0 }, 'concrete', { bevel: 0.014 })
    for (let f = 0; f < floors; f++) {
      const y = stilt + 1.07 + f * fh
      // landing slab + a tall slot window at each half-landing
      b.chamfer(coreW - 0.8, 0.18, 2.2, { x: 0, y, z: -D / 2 + coreInset + 1.0 }, 'concrete', { bevel: 0.012 })
      b.box(1.5, 2.3, 0.1, { x: 0, y: y + 1.6, z: -D / 2 + coreInset - 0.16 }, 'glassDark')
      b.frame(1.66, 2.46, 0.07, 0.12, { x: 0, y: y + 1.6, z: -D / 2 + coreInset - 0.14 }, 'metal', { bevel: 0.008 })
    }
    b.chamfer(coreW + 0.2, 0.28, 2.8, { x: 0, y: top + 2.2, z: -D / 2 + coreInset + 1.0 }, 'stone', { bevel: 0.014 })

    /* --------------------------------------------------- wing elevations */
    /**
     * Punched windows on the wings, but narrow ones — a bedroom window, not a
     * commercial bay. The balconies in front of them carry the elevation.
     */
    for (const sx of [-1, 1]) {
      punchedFacade(b, {
        plane: 'z',
        from: sx * wingX - wingW / 2,
        length: wingW,
        z: D / 2,
        thickness: 0.28,
        baseY: stilt + 1.07,
        floors,
        floorHeight: fh,
        bays: baysFor(2, wingW, sx * wingX - wingW / 2, 1.5),
        sill: 0.92,
        head: 2.18,
        recess: 0.24,
        wall: 'renderWarm',
        band: 'concrete',
        glass: 'glass',
        frame: 'metal',
        sillMaterial: 'stone',
        mullions: 1,
        chajja: 0.24,
        seed: 21 + sx,
        chamferTrim: true,
        frameBevel: 0.007,
      })
      punchedFacade(b, {
        plane: 'z',
        from: sx * wingX - wingW / 2,
        length: wingW,
        z: -D / 2,
        thickness: 0.26,
        baseY: stilt + 1.07,
        floors,
        floorHeight: fh,
        bays: baysFor(2, wingW, sx * wingX - wingW / 2, 1.9),
        sill: 1.1,
        head: 1.85,
        recess: 0.2,
        wall: 'render',
        band: 'concrete',
        glass: 'glassDark',
        frame: 'metal',
        sillMaterial: 'stone',
        mullions: 0,
        chajja: 0.14,
        seed: 40 + sx,
        chamferTrim: false,
      })
      // side elevation: the kitchen/service side, small openings and a duct
      for (let f = 0; f < floors; f++) {
        const y = stilt + 1.07 + f * fh
        const x = sx * (W / 2 + 0.02)
        b.box(0.12, 1.15, 1.5, { x, y: y + 1.5, z: 2.4 }, 'glassDark')
        b.chamfer(0.2, 0.14, 1.7, { x: x + sx * 0.06, y: y + 2.18, z: 2.4 }, 'concrete', { bevel: 0.01 })
        if (f % 2 === 0) acUnit(b, { x: x + sx * 0.22, y: y + 1.4, z: -2.2, ry: sx * Math.PI / 2 })
      }
    }

    /* -------------------------------------------------------- balconies */
    /**
     * Continuous balconies, full width of each wing, every single floor.
     *
     * This is the block's defining move. Seven storeys of unbroken horizontal
     * slab and balustrade, with planters and the occasional washing line, so
     * the elevation is read as a stack of homes rather than a grid of windows.
     */
    for (let f = 0; f < floors; f++) {
      const y = stilt + 1.27 + f * fh
      for (const sx of [-1, 1]) {
        balcony(b, {
          x: sx * wingX,
          y,
          z: D / 2 + 1.05,
          w: wingW - 0.3,
          d: 2.1,
          planter: (f + (sx > 0 ? 1 : 0)) % 2 === 0,
        })
        // washing line — two posts and a couple of slack lines. Nothing says
        // "people live here" faster, and it is four boxes.
        if ((f + (sx > 0 ? 1 : 0)) % 3 === 1) {
          for (const px of [-1, 1]) {
            b.chamfer(0.05, 0.85, 0.05, { x: sx * wingX + px * (wingW / 2 - 0.9), y: y + 1.5, z: D / 2 + 1.5 }, 'metal', { bevel: 0.007 })
          }
          for (let l = 0; l < 2; l++) {
            b.box(wingW - 2.0, 0.02, 0.02, { x: sx * wingX, y: y + 1.72 + l * 0.22, z: D / 2 + 1.5 }, 'metal')
          }
        }
      }
    }

    /* ---------------------------------------------------------- entrance */
    // A modest entrance in the core recess — a canopy, steps and a glazed door.
    canopy(b, { x: 0, y: 3.0, z: D / 2 - coreInset + 1.8, w: 5.0, d: 2.4, columns: 2 })
    b.frame(3.4, 2.6, 0.07, 0.11, { x: 0, y: 1.75, z: D / 2 - coreInset + 0.1 }, 'darkMetal', { bevel: 0.008 })
    b.box(3.3, 2.5, 0.06, { x: 0, y: 1.75, z: D / 2 - coreInset + 0.1 }, 'glassDark')
    for (let i = 0; i < 2; i++) {
      b.chamfer(4.6, 0.16, 0.8 + i * 0.3, { x: 0, y: 0.53 + i * 0.16, z: D / 2 - coreInset + 1.1 + i * 0.26 }, 'stone', { bevel: 0.012 })
    }
    // letterboxes and a name plate beside the door — small, but it is a home
    b.chamfer(1.6, 0.7, 0.12, { x: -2.4, y: 1.5, z: D / 2 - coreInset + 0.12 }, 'darkMetal', { bevel: 0.01 })
    b.box(0.9, 0.4, 0.05, { x: 2.3, y: 2.2, z: D / 2 - coreInset + 0.14 }, 'paintB')

    /* ------------------------------------------------------------- roof */
    slab(b, { w: W + 0.5, d: D + 0.5, thickness: 0.28, edge: 0.22, position: [0, top + 0.14, 0] })
    parapet(b, { w: W + 0.5, d: D + 0.5, y: top + 0.28, height: 1.0 })
    // the water tank cluster — every Indian roof has one, usually several
    waterTank(b, { x: -5.4, y: top + 0.4, z: -2.2 })
    waterTank(b, { x: -3.6, y: top + 0.4, z: -3.6, r: 0.5, h: 0.95 })
    waterTank(b, { x: -3.9, y: top + 0.4, z: -0.6, r: 0.44, h: 0.86 })
    solarArray(b, { x: 5.0, y: top + 0.4, z: 1.8, count: 3 })
    // dish antennas and a vent stack, scattered not aligned
    for (const [dx, dz] of [[6.8, -3.2], [-7.6, 3.0], [2.2, -4.0]]) {
      b.cylinder(0.34, 0.34, 0.06, 10, { x: dx, y: top + 0.72, z: dz, rx: -0.6 }, 'metal')
      b.chamfer(0.07, 0.62, 0.07, { x: dx, y: top + 0.4, z: dz }, 'darkMetal', { bevel: 0.008 })
    }
    b.cylinder(0.1, 0.12, 1.1, 8, { x: 8.2, y: top + 0.85, z: 3.6 }, 'darkMetal')
  })
}

/** Warehouse — service world 06. */
async function generateWarehouse() {
  await writeAsset('warehouse', (b) => {
    const W = 36
    const D = 26
    const H = 12.5
    const random = rng(51)

    b.chamfer(W + 3, 0.5, D + 3, { x: 0, y: 0.25, z: 0 }, 'concrete', { bevel: 0.018 })
    // ribbed metal walls, lapped every 2.4 m like real profile sheeting
    corrugated(b, { w: W, h: H, position: [0, H / 2 + 0.5, D / 2], material: 'metal', laps: 4 })
    corrugated(b, { w: W, h: H, position: [0, H / 2 + 0.5, -D / 2], material: 'metal', laps: 4 })
    corrugated(b, { w: D, h: H, position: [W / 2, H / 2 + 0.5, 0], rotation: [0, Math.PI / 2, 0], material: 'metal', laps: 4 })
    corrugated(b, { w: D, h: H, position: [-W / 2, H / 2 + 0.5, 0], rotation: [0, Math.PI / 2, 0], material: 'metal', laps: 4 })
    // a couple of replacement sheets that never matched — every industrial
    // building has them, and they are the cheapest possible way to stop a
    // 36 m elevation reading as one stamped panel
    b.box(2.4, 2.3, 0.06, { x: -11, y: 4.2, z: D / 2 + 0.06 }, 'metalRib')
    b.box(1.8, 2.3, 0.06, { x: 13.4, y: 7.6, z: D / 2 + 0.06 }, 'metalRib')

    // structural columns at the corners and mid bays — chamfered
    for (const x of [-W / 2, -W / 4, 0, W / 4, W / 2]) {
      for (const z of [-D / 2, D / 2]) {
        b.chamfer(0.7, H, 0.7, { x, y: H / 2 + 0.5, z: z + (z > 0 ? 0.32 : -0.32) }, 'concrete', { bevel: 0.014 })
      }
    }
    // eaves detail: gutter, purlin ends, and downpipes that land on the ground
    for (const z of [-D / 2, D / 2]) {
      const sgn = z > 0 ? 1 : -1
      b.chamfer(W + 2.6, 0.3, 0.42, { x: 0, y: H + 0.62, z: z + sgn * 0.7 }, 'darkMetal', { bevel: 0.012 })
      b.box(W + 2.6, 0.12, 0.5, { x: 0, y: H + 0.8, z: z + sgn * 0.72 }, 'metal')
    }
    for (const x of [-W / 2 + 1, -6, 6, W / 2 - 1]) {
      for (const z of [-D / 2, D / 2]) {
        const sgn = z > 0 ? 1 : -1
        b.cylinder(0.09, 0.09, H + 0.5, 6, { x, y: (H + 0.5) / 2, z: z + sgn * 0.78 }, 'darkMetal')
        for (let i = 1; i <= 3; i++) {
          b.box(0.16, 0.08, 0.16, { x, y: (H + 0.5) * (i / 4), z: z + sgn * 0.78 }, 'darkMetal')
        }
        // the pipe has to land on something
        b.chamfer(0.4, 0.16, 0.4, { x, y: 0.08, z: z + sgn * 0.78 }, 'concrete', { bevel: 0.012 })
      }
    }

    // roof: shallow slope, ridge vents, skylights, sheet ribs
    for (const side of [-1, 1]) {
      b.box(W + 2.4, 0.24, D / 2 + 0.6, { x: 0, y: H + 1.0, z: (side * D) / 4, rx: side * 0.055 }, 'metal')
      // purlins showing under the sheet at the eaves
      for (let i = 0; i < 7; i++) {
        b.box(W + 2.2, 0.14, 0.12, { x: 0, y: H + 0.86 + i * 0.14, z: side * (1.2 + i * (D / 2 - 1.4) / 6), rx: side * 0.055 }, 'darkMetal')
      }
      // rooflight panels
      for (const x of [-9, 0, 9]) {
        b.box(2.6, 0.06, 1.4, { x, y: H + 1.16 + (D / 4) * 0.055, z: side * 6.2, rx: side * 0.055 }, 'glassDark')
      }
    }
    b.chamfer(W + 2.4, 0.5, 0.6, { x: 0, y: H + 1.35, z: 0 }, 'darkMetal', { bevel: 0.014 })
    for (let i = 0; i < 5; i++) {
      const x = -W / 2 + 3 + i * ((W - 6) / 4)
      b.chamfer(2.2, 1.0, 1.6, { x, y: H + 1.9, z: -3 }, 'metal', { bevel: 0.012 })
      b.box(2.4, 0.12, 1.8, { x, y: H + 2.5, z: -3, rz: random() * 0.06 }, 'darkMetal')
    }
    // clerestory glazing
    b.box(W - 6, 1.6, 0.1, { x: 0, y: H + 0.1, z: D / 2 + 0.36 }, 'glassDark')
    b.box(W - 6, 1.6, 0.1, { x: 0, y: H + 0.1, z: -D / 2 - 0.36 }, 'glassDark')

    // loading dock: shutter, hood, dock leveller, bumpers, graded approach
    b.chamfer(7.4, 5.6, 0.3, { x: -4, y: 3.3, z: D / 2 + 0.4 }, 'darkMetal', { bevel: 0.012 })
    for (let i = 0; i < 12; i++) b.box(6.9, 0.16, 0.06, { x: -4, y: 0.9 + i * 0.44, z: D / 2 + 0.56 }, 'metal')
    b.chamfer(8.4, 0.3, 0.4, { x: -4, y: 6.05, z: D / 2 + 0.5 }, 'concrete', { bevel: 0.014 })
    b.box(9, 0.3, 5, { x: -4, y: 7.4, z: D / 2 + 2.8 }, 'metal')
    b.chamfer(0.3, 7.2, 0.3, { x: -7.8, y: 3.7, z: D / 2 + 4.9 }, 'concrete', { bevel: 0.012 })
    b.chamfer(0.3, 7.2, 0.3, { x: -0.2, y: 3.7, z: D / 2 + 4.9 }, 'concrete', { bevel: 0.012 })
    // dock leveller plate and the bumpers a reversing truck hits
    b.box(2.6, 0.06, 1.6, { x: -4, y: 1.14, z: D / 2 + 1.1 }, 'darkMetal')
    for (const x of [-6.4, -1.6]) {
      b.box(0.4, 0.5, 0.3, { x, y: 1.35, z: D / 2 + 1.9 }, 'rubber')
    }
    // drainage channel across the apron — a yard this size has to shed water
    b.box(W + 6, 0.02, 0.5, { x: 0, y: 0.14, z: D / 2 + 5.4 }, 'darkMetal')
    for (let i = 0; i < 12; i++) {
      b.box(0.06, 0.02, 0.48, { x: -W / 2 - 2.4 + i * 3.2, y: 0.16, z: D / 2 + 5.4 }, 'metal')
    }

    // pedestrian doors with real frames, windows, and a lintel over each
    for (const x of [8, 12]) {
      b.frame(1.3, 2.5, 0.06, 0.12, { x, y: 1.75, z: D / 2 + 0.46 }, 'darkMetal', { bevel: 0.008 })
      b.box(1.2, 2.4, 0.14, { x, y: 1.7, z: D / 2 + 0.42 }, 'paintMuted')
      b.chamfer(1.5, 0.18, 0.26, { x, y: 3.0, z: D / 2 + 0.5 }, 'concrete', { bevel: 0.012 })
    }
    for (const x of [-14, -8, 4, 10, 14]) {
      b.frame(3.5, 2.1, 0.055, 0.1, { x, y: 8.4, z: D / 2 + 0.46 }, 'metal', { bevel: 0.007 })
      b.box(3.4, 2.0, 0.1, { x, y: 8.4, z: D / 2 + 0.42 }, 'glassDark')
      b.chamfer(3.7, 0.14, 0.24, { x, y: 7.32, z: D / 2 + 0.48 }, 'concrete', { bevel: 0.012 })
    }

    // grade slab apron + kerb
    b.chamfer(W + 8, 0.14, 7, { x: 0, y: 0.07, z: D / 2 + 6 }, 'concrete', { bevel: 0.02 })
    b.chamfer(W + 8, 0.3, 0.5, { x: 0, y: 0.15, z: D / 2 + 9.4 }, 'stone', { bevel: 0.014 })
  })
}

/** Arch bridge — service world 03. */
async function generateBridge() {
  await writeAsset('bridge', (b) => {
    const span = 48
    const deckY = 15
    const width = 13
    const random = rng(77)

    // deck with camber and a wearing course, on a visible girder soffit: the
    // underside of a bridge is structure, not the bottom of a box
    b.chamfer(span, 1.3, width, { x: 0, y: deckY, z: 0 }, 'concrete', { bevel: 0.02 })
    for (const z of [-3.6, -1.2, 1.2, 3.6]) {
      b.chamfer(span, 0.9, 1.1, { x: 0, y: deckY - 1.05, z }, 'concrete', { bevel: 0.016 })
    }
    b.box(span, 0.12, width - 0.6, { x: 0, y: deckY + 0.7, z: 0 }, 'asphalt')

    // parapets with copings, chamfered, plus a pedestrian railing on the walkway
    for (const z of [-width / 2 + 0.4, width / 2 - 0.4]) {
      const inboard = z > 0 ? -1 : 1
      b.chamfer(span, 1.35, 0.55, { x: 0, y: deckY + 1.3, z }, 'concrete', { bevel: 0.015 })
      b.chamfer(span, 0.16, 0.72, { x: 0, y: deckY + 2.02, z }, 'stone', { bevel: 0.012 })
      // weep / scupper through the parapet, and a downpipe that lands on the deck
      for (let i = 0; i < 10; i++) {
        const x = -span / 2 + 2.4 + i * ((span - 4.8) / 9)
        b.box(0.16, 0.2, 0.6, { x, y: deckY + 0.82, z: z + inboard * 0.2 }, 'darkMetal')
      }
      // railing: posts and two rails, standing on the footpath behind the parapet
      const rz = z + inboard * 1.15
      railing(b, { x0: -span / 2 + 0.6, x1: span / 2 - 0.6, y: deckY + 0.99, z: rz, height: 1.1, posts: 22 })
    }
    // footpath + kerb
    for (const z of [-width / 2 + 1.9, width / 2 - 1.9]) {
      b.chamfer(span, 0.34, 2.4, { x: 0, y: deckY + 0.85, z }, 'concrete', { bevel: 0.014 })
      b.chamfer(span, 0.28, 0.3, { x: 0, y: deckY + 1.0, z: z + (z > 0 ? -1.2 : 1.2) }, 'stone', { bevel: 0.014 })
    }
    // piers with cutwaters, pier caps and bearings + abutments with wing walls
    for (const x of [-16, 16]) {
      b.chamfer(4.2, deckY - 1.2, 8, { x, y: (deckY - 1.2) / 2, z: 0 }, 'concrete', { bevel: 0.018 })
      b.chamfer(4.6, 0.8, 8.4, { x, y: 0.4, z: 0 }, 'stone', { bevel: 0.016 })
      b.cylinder(1.4, 2.0, deckY - 2, 10, { x, y: (deckY - 2) / 2, z: 4.2 }, 'concrete')
      // pier cap with a bearing shelf under each girder line
      b.chamfer(4.8, 0.4, 9, { x, y: deckY - 0.4, z: 0 }, 'concrete', { bevel: 0.014 })
      for (const z of [-3.6, -1.2, 1.2, 3.6]) {
        b.box(1.0, 0.34, 0.9, { x, y: deckY - 0.07, z }, 'darkMetal')
      }
    }
    for (const x of [-23.5, 23.5]) {
      const inward = x > 0 ? -1 : 1
      b.chamfer(5.4, deckY - 2, 12, { x, y: (deckY - 2) / 2, z: 0 }, 'stone', { bevel: 0.018 })
      b.chamfer(5.8, 0.7, 12.6, { x, y: 0.35, z: 0 }, 'stone', { bevel: 0.016 })
      // wing walls: the abutment has to retain the embankment beside it
      for (const z of [-6.4, 6.4]) {
        b.chamfer(4.2, deckY - 2.4, 0.7, { x: x + inward * 2.4, y: (deckY - 2.4) / 2, z, ry: inward * 0.5 }, 'stone', { bevel: 0.016 })
      }
      // bearing shelf
      for (const z of [-3.6, -1.2, 1.2, 3.6]) {
        b.box(1.2, 0.34, 0.9, { x, y: deckY - 0.07, z }, 'darkMetal')
      }
      // transition slab: where the road leaves the structure for the embankment
      b.chamfer(4.5, 0.6, width - 0.6, { x: x - inward * 3.2, y: deckY + 0.42, z: 0 }, 'concrete', { bevel: 0.016 })
    }
    // arch barrel
    const segments = 26
    for (let i = 0; i < segments; i++) {
      const t0 = i / segments
      const t1 = (i + 1) / segments
      const ax = -20 + t0 * 40
      const bx = -20 + t1 * 40
      const ay = 1.6 + Math.sin(t0 * Math.PI) * 9.4
      const by = 1.6 + Math.sin(t1 * Math.PI) * 9.4
      const cx = (ax + bx) / 2
      const cy = (ay + by) / 2
      const len = Math.hypot(bx - ax, by - ay) * 1.06
      const angle = Math.atan2(by - ay, bx - ax)
      for (const z of [-2.4, 2.4]) {
        b.box(len, 1.1, 1.9, { x: cx, y: cy, z, rz: angle }, 'concrete')
      }
      b.box(len, 1.0, 3.4, { x: cx, y: cy - 0.05, z: 0, rz: angle }, 'concrete')
    }
    // spandrel columns + hangers
    for (let x = -18; x <= 18; x += 3) {
      const archY = 1.6 + Math.sin(((x + 20) / 40) * Math.PI) * 9.4
      const h = deckY - 0.9 - archY
      if (h > 1.2) {
        b.chamfer(0.5, h, 0.5, { x, y: archY + h / 2, z: -4.6 }, 'concrete', { bevel: 0.012 })
        b.chamfer(0.5, h, 0.5, { x, y: archY + h / 2, z: 4.6 }, 'concrete', { bevel: 0.012 })
        b.box(0.6, 0.4, 9.6, { x, y: archY + h, z: 0 }, 'concrete')
      }
    }
    // expansion joints, lamp posts
    for (const x of [-7.5, 7.5]) {
      b.box(0.3, 1.4, width, { x, y: deckY + 0.7, z: 0 }, 'darkMetal')
      b.chamfer(0.5, 0.18, width, { x, y: deckY + 0.78, z: 0 }, 'concrete', { bevel: 0.012 })
    }
    for (const x of [-18, -6, 6, 18]) {
      for (const z of [-width / 2 + 1.2, width / 2 - 1.2]) {
        b.cylinder(0.09, 0.12, 8, 6, { x, y: deckY + 5, z }, 'darkMetal')
        b.box(0.6, 0.3, 0.4, { x: x + 0.4, y: deckY + 9, z: z + (z > 0 ? -0.2 : 0.2) }, 'darkMetal')

      }
    }
    /**
     * Approach embankments.
     *
     * These were a pair of featureless 12 × 15 × 19 m stone boxes — the single
     * largest untextured surface in the scene, and from the infrastructure
     * beat they filled half the frame as a blank white slab. A real approach
     * is an earth embankment held by a battered retaining wall, so that is
     * what this builds: a wall that leans back as it rises, counterfort ribs
     * at intervals, a coping that continues the parapet line off the deck, and
     * a graded verge where the earth meets the ground.
     */
    for (const side of [-1, 1]) {
      const ex = side * (span / 2 + 6)
      // carriageway continuing off the structure
      b.box(12, 0.6, width + 6, { x: ex, y: deckY - 0.3, z: 0, rz: side * 0.02 }, 'concrete')
      b.box(11.4, 0.1, width - 0.6, { x: ex, y: deckY + 0.06, z: 0, rz: side * 0.02 }, 'asphalt')

      // retaining walls, battered 1:12, one per side of the embankment
      for (const z of [-(width + 6) / 2, (width + 6) / 2]) {
        const inb = z > 0 ? -1 : 1
        b.chamfer(12, deckY - 0.6, 0.9, { x: ex, y: (deckY - 0.6) / 2, z: z + inb * 0.42, rx: inb * 0.082 }, 'stone', { bevel: 0.02 })
        // coping, carrying the deck parapet line onto the approach
        b.chamfer(12, 0.34, 1.3, { x: ex, y: deckY - 0.4, z: z + inb * 0.95 }, 'stone', { bevel: 0.014 })
        // counterfort ribs — a retaining wall this tall needs them, and they
        // break 12 m of blank face into a rhythm of light and shadow
        for (let i = 0; i < 5; i++) {
          const rx = ex - 4.8 + i * 2.4
          b.chamfer(0.6, deckY - 1.6, 0.55, { x: rx, y: (deckY - 1.6) / 2, z: z + inb * 1.0, rx: inb * 0.082 }, 'stone', { bevel: 0.016 })
        }
        // weep holes: the wall has to drain
        for (let i = 0; i < 4; i++) {
          b.box(0.22, 0.18, 0.3, { x: ex - 3.6 + i * 2.4, y: 1.3, z: z + inb * 0.85 }, 'darkMetal')
        }
      }

      // the fill itself, set inside the walls so only its top surface shows
      b.box(11.6, deckY - 0.8, width + 4.4, { x: ex, y: (deckY - 0.8) / 2, z: 0 }, 'soil')
      // graded verge where the embankment toe meets the ground
      for (const z of [-(width + 6) / 2 - 1.4, (width + 6) / 2 + 1.4]) {
        const inb = z > 0 ? -1 : 1
        b.chamfer(12.6, 0.9, 3.0, { x: ex, y: 0.3, z, rx: inb * 0.28 }, 'soil', { bevel: 0.05 })
      }
      // wing wall returning into the embankment at the outer end
      b.chamfer(0.8, deckY - 1.4, width + 5, { x: ex + side * 5.9, y: (deckY - 1.4) / 2, z: 0 }, 'stone', { bevel: 0.018 })
    }
    void random
  })
}

/** Ground-mounted solar array unit. */
async function generateSolarPanel() {
  await writeAsset('solar-panel', (b) => {
    const rows = 3
    for (let r = 0; r < rows; r++) {
      const z = (r - 1) * 2.6
      // driven posts on concrete pads, with a front and back leg of different
      // heights so the tilt is structural rather than decorative
      for (const x of [-1.6, 0, 1.6]) {
        b.chamfer(0.34, 0.36, 0.34, { x, y: 0.18, z }, 'concrete', { bevel: 0.012 })
        b.chamfer(0.09, 1.2, 0.09, { x, y: 0.85, z: z - 0.55 }, 'metal', { bevel: 0.008 })
        b.chamfer(0.09, 1.86, 0.09, { x, y: 1.18, z: z + 0.55 }, 'metal', { bevel: 0.008 })
        b.box(0.16, 0.16, 2.3, { x, y: 1.5, z }, 'metal')
      }
      // torque tube
      b.cylinder(0.06, 0.06, 6.4, 6, { x: 0, y: 1.62, z, rz: Math.PI / 2 }, 'darkMetal')
      // modules: framed, clamped to the rails, with a visible gap between them
      for (let m = -2; m <= 2; m++) {
        const px = m * 1.42
        const tilt = -0.36 + (m % 2) * 0.01
        b.chamfer(1.3, 0.05, 2.3, { x: px, y: 1.72, z, rx: tilt }, 'panelDark', { bevel: 0.008 })
        b.chamfer(1.36, 0.04, 2.36, { x: px, y: 1.679, z, rx: tilt }, 'metal', { bevel: 0.007 })
        // mid clamp between adjacent modules
        if (m < 2) b.box(0.07, 0.06, 0.2, { x: px + 0.71, y: 1.71, z, rx: tilt }, 'darkMetal')
      }
      // rail tying the tops of the legs, and a cable run along it
      b.box(6.9, 0.05, 0.06, { x: 0, y: 1.95, z: z - 1.1 }, 'metal')
      b.tube(
        [V(-3.3, 1.9, z - 1.04), V(0, 1.86, z - 1.02), V(3.3, 1.9, z - 1.04)],
        0.025,
        {},
        'darkMetal',
        { segments: 5, noise: 0.05, seed: 5, uvScale: 0.4 },
      )
    }
    // inverter enclosure, conduit from the array to it, cable tray
    b.chamfer(1.4, 1.7, 0.9, { x: 4.6, y: 0.95, z: 0 }, 'metal', { bevel: 0.012 })
    b.chamfer(1.44, 0.3, 0.94, { x: 4.6, y: 1.95, z: 0 }, 'darkMetal', { bevel: 0.012 })
    b.chamfer(1.5, 0.12, 1.0, { x: 4.6, y: 0.06, z: 0 }, 'concrete', { bevel: 0.01 })
    for (let i = 0; i < 6; i++) {
      b.box(0.04, 0.1, 0.7, { x: 4.6, y: 0.5 + i * 0.2, z: 0.46 }, 'darkMetal')
    }
    b.box(0.5, 0.06, 8.6, { x: 3.4, y: 0.2, z: 0 }, 'darkMetal')
    b.tube([V(3.4, 0.26, -3.4), V(3.4, 0.5, -1.6), V(4.2, 0.6, -0.2)], 0.035, {}, 'darkMetal', { segments: 5, noise: 0.04, seed: 11, uvScale: 0.4 })
  })
}

/** Scaffolding module. */
async function generateScaffolding() {
  await writeAsset('scaffolding', (b) => {
    scaffoldBay(b, { x: 0, y: 0, z: 0, w: 4.8, d: 1.3, levels: 6, lift: 2 })
    scaffoldBay(b, { x: 4.8, y: 0, z: 0, w: 4.8, d: 1.3, levels: 6, lift: 2 })
    // toe boards + debris netting rails
    for (const x of [-2.4, 2.4, 7.2]) {
      b.box(0.06, 0.2, 1.3, { x, y: 12.2, z: 0 }, 'wood')
    }
    // ladder access
    for (let i = 0; i < 24; i++) {
      b.box(0.5, 0.04, 0.06, { x: -4.4, y: 0.6 + i * 0.5, z: 0.55 }, 'darkMetal')
    }
    b.box(0.06, 12, 0.06, { x: -4.65, y: 6, z: 0.55 }, 'darkMetal')
    b.box(0.06, 12, 0.06, { x: -4.15, y: 6, z: 0.55 }, 'darkMetal')
  })
}

/** Tower crane. */
async function generateCrane() {
  await writeAsset('crane', (b) => {
    const mast = 32
    const base = 0

    // foundation ballast
    b.box(6.4, 1.2, 6.4, { x: 0, y: base + 0.6, z: 0 }, 'concrete')
    b.box(7.2, 0.4, 7.2, { x: 0, y: base + 0.2, z: 0 }, 'concrete')
    for (const sx of [-2.6, 2.6]) {
      for (const sz of [-2.6, 2.6]) {
        b.box(0.5, 0.5, 0.5, { x: sx, y: base + 1.35, z: sz }, 'darkMetal')
      }
    }

    // lattice mast
    for (const [su, sv] of [
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ]) {
      const points = []
      for (let i = 0; i <= 4; i++) {
        points.push(V(su * 1.15, base + 1.2 + (i * (mast - 1.2)) / 4, sv * 1.15))
      }
      b.tube(points, 0.09, {}, 'metal', { segments: 6, noise: 0.04, seed: 3, uvScale: 2 })
    }
    const bays = 9
    for (let i = 0; i < bays; i++) {
      const y0 = base + 1.2 + (i * (mast - 1.2)) / bays
      const y1 = base + 1.2 + ((i + 1) * (mast - 1.2)) / bays
      for (const su of [-1, 1]) {
        b.tube([V(su * 1.15, y0, -1.15), V(su * 1.15, y1, 1.15)], 0.05, {}, 'darkMetal', { segments: 4, noise: 0.05, seed: i })
        b.tube([V(-1.15, y0, su * 1.15), V(1.15, y1, su * 1.15)], 0.05, {}, 'darkMetal', { segments: 4, noise: 0.05, seed: i + 30 })
      }
      for (const su of [-1, 1]) {
        for (const sv of [-1, 1]) {
          b.box(su > 0 ? 2.3 : 2.3, 0.07, 0.07, { x: 0, y: y0, z: sv * 1.15 }, 'darkMetal')
          b.box(0.07, 0.07, 2.3, { x: su * 1.15, y: y0, z: 0 }, 'darkMetal')
        }
      }
    }

    // slewing unit + cab. The cab gets the things an operator actually
    // touches: a framed screen, a wiper, a handrail and a step up to it.
    b.box(2.6, 1.6, 2.6, { x: 0, y: mast + 0.8, z: 0 }, 'safety')
    b.chamfer(2.2, 0.6, 2.2, { x: 0, y: mast + 1.8, z: 0 }, 'darkMetal', { bevel: 0.014 })
    b.chamfer(2.4, 2.4, 2.0, { x: 0, y: mast + 3.1, z: 1.6 }, 'safety', { bevel: 0.014 })
    b.frame(2.3, 1.6, 0.07, 0.09, { x: 0, y: mast + 3.4, z: 2.63 }, 'darkMetal', { bevel: 0.008 })
    b.box(2.2, 1.5, 0.08, { x: 0, y: mast + 3.4, z: 2.62 }, 'glass')
    b.box(0.05, 0.04, 0.9, { x: -0.5, y: mast + 4.02, z: 2.7, rz: 0.14 }, 'darkMetal')
    b.chamfer(2.3, 0.12, 2.1, { x: 0, y: mast + 4.35, z: 1.6 }, 'darkMetal', { bevel: 0.01 })
    // handrail and access step on the cab platform
    railing(b, { x0: -1.0, x1: 1.0, y: mast + 2.1, z: 2.5, height: 0.9, posts: 3 })
    b.chamfer(0.7, 0.1, 0.34, { x: 1.5, y: mast + 1.5, z: 2.3 }, 'darkMetal', { bevel: 0.01 })
    // hoist rope sheaves at the jib head and the trolley
    for (const x of [23.4, 16]) {
      b.cylinder(0.24, 0.24, 0.1, 10, { x, y: mast + 2.9, z: 0, rx: Math.PI / 2 }, 'darkMetal')
    }

    // jib (triangular truss)
    lattice(b, { x0: -2, y0: mast + 2.4, z0: 0, x1: 24, y1: mast + 2.4, z1: 0, size: 0.62, bays: 8, chord: 0.07 })
    lattice(b, { x0: -2, y0: mast + 2.4, z0: -0.9, x1: 24, y1: mast + 2.4, z1: -0.9, size: 0, bays: 8, chord: 0.05 })
    lattice(b, { x0: -2, y0: mast + 2.4, z0: 0.9, x1: 24, y1: mast + 2.4, z1: 0.9, size: 0, bays: 8, chord: 0.05 })
    // pendant tie bars from the apex
    b.tube([V(0, mast + 8.6, 0), V(11, mast + 4.2, 0), V(21, mast + 2.9, 0)], 0.05, {}, 'darkMetal', { segments: 5, seed: 8 })
    b.box(0.5, 6.4, 0.5, { x: 0, y: mast + 5.4, z: 0 }, 'safety')
    // trolley + hoist
    b.box(1.2, 0.5, 1.2, { x: 16, y: mast + 2.1, z: 0 }, 'darkMetal')
    b.tube([V(16, mast + 1.8, 0), V(16, mast - 8, 0)], 0.035, {}, 'darkMetal', { segments: 4, seed: 12 })
    b.box(0.9, 0.8, 0.6, { x: 16, y: mast - 8.6, z: 0 }, 'metal')
    b.tube([V(15.4, mast - 9.0, 0), V(16.6, mast - 9.6, 0.2)], 0.03, {}, 'darkMetal', { segments: 4, seed: 4 })

    // counter jib + counterweight slabs, stacked with the slight misalignment
    // of blocks that have been lifted into place and never lined up again
    lattice(b, { x0: -2.4, y0: mast + 2.4, z0: 0, x1: -11.5, y1: mast + 2.4, z1: 0, size: 0.55, bays: 4, chord: 0.06 })
    for (let i = 0; i < 4; i++) {
      b.chamfer(1.5, 1.2, 2.0, { x: -7.4 - i * 1.0, y: mast + 1.4 - i * 0.02, z: (i % 2) * 0.03, ry: (i - 1.5) * 0.012 }, 'concrete', { bevel: 0.014 })
    }
    b.box(0.4, 3.2, 2.1, { x: -11.6, y: mast + 2.0, z: 0 }, 'concrete')
    b.tube([V(-2, mast + 8.6, 0), V(-9.5, mast + 4.4, 0)], 0.05, {}, 'darkMetal', { segments: 4, seed: 15 })

    // warning light + ladder with stiles, and a rest platform part way up
    b.sphere(0.16, { x: 0, y: mast + 9.0, z: 0 }, 'tail', {}, 8, 6)
    for (let i = 0; i < 40; i++) {
      b.box(0.6, 0.04, 0.06, { x: 1.35, y: 2 + i * 0.78, z: 0 }, 'darkMetal')
    }
    for (const z of [-0.32, 0.32]) {
      b.cylinder(0.028, 0.028, mast, 5, { x: 1.35, y: 1 + mast / 2, z }, 'darkMetal')
    }
    b.chamfer(1.1, 0.08, 0.8, { x: 1.35, y: mast * 0.5, z: 0 }, 'metal', { bevel: 0.01 })
  })
}

/** Excavator — the construction-equipment hero. */
async function generateExcavator() {
  await writeAsset('excavator', (b) => {
    const trackY = 0.52
    // track frames
    for (const z of [-1.35, 1.35]) {
      b.box(4.4, 0.62, 0.72, { x: -0.2, y: trackY, z }, 'darkMetal')
      b.cylinder(0.52, 0.52, 0.8, 12, { x: -2.1, y: trackY, z, rx: Math.PI / 2 }, 'darkMetal')
      b.cylinder(0.52, 0.52, 0.8, 12, { x: 1.9, y: trackY, z, rx: Math.PI / 2 }, 'darkMetal')
      // track shoes
      const shoes = 16
      for (let i = 0; i <= shoes; i++) {
        const t = i / shoes
        const x = -2.1 + t * 4.0
        const y = i < 3 ? trackY - 0.3 + t * 0.6 : i > shoes - 3 ? trackY - 0.3 : trackY - 0.52
        b.box(0.22, 0.08, 0.92, { x, y, z }, 'rubber')
      }
      for (let i = 0; i < 6; i++) {
        b.cylinder(0.13, 0.13, 0.86, 8, { x: -1.7 + i * 0.7, y: trackY - 0.32, z, rx: Math.PI / 2 }, 'darkMetal')
      }
    }
    // undercarriage + slew ring
    b.box(2.6, 0.4, 2.0, { x: -0.2, y: 0.9, z: 0 }, 'darkMetal')
    b.cylinder(1.0, 1.0, 0.24, 16, { x: -0.2, y: 1.2, z: 0 }, 'metal')

    // body
    b.box(3.2, 1.15, 2.6, { x: -0.9, y: 1.85, z: 0.3 }, 'safety')
    b.box(3.3, 0.4, 2.7, { x: -0.9, y: 2.55, z: 0.3 }, 'safety')
    b.box(1.6, 1.0, 2.4, { x: -2.4, y: 1.9, z: 0.2 }, 'darkMetal')
    // engine bay vents
    for (let i = 0; i < 7; i++) {
      b.box(0.06, 0.7, 2.2, { x: -2.0 + i * 0.12, y: 1.95, z: 0.2 }, 'darkMetal')
    }
    // counterweight
    b.box(0.9, 1.2, 2.4, { x: -2.9, y: 2.0, z: 0.1, rx: 0.06 }, 'darkMetal')

    // cab
    b.box(1.5, 1.6, 1.5, { x: 0.5, y: 3.0, z: 1.15 }, 'safety')
    b.box(1.3, 1.2, 0.06, { x: 0.5, y: 3.2, z: 1.9 }, 'glassDark')
    b.box(0.06, 1.2, 1.3, { x: 1.3, y: 3.2, z: 1.15 }, 'glassDark')
    b.box(1.6, 0.12, 1.6, { x: 0.5, y: 3.85, z: 1.15 }, 'darkMetal')
    b.box(0.1, 0.9, 0.1, { x: -0.32, y: 3.2, z: 1.9 }, 'darkMetal')

    // boom (two tapered sections) + arm + bucket
    b.box(4.6, 0.5, 0.44, { x: 2.6, y: 3.4, z: 0.55, rz: 0.52 }, 'safety')
    b.box(2.6, 0.42, 0.38, { x: 5.4, y: 5.0, z: 0.55, rz: 0.16 }, 'safety')
    b.cylinder(0.14, 0.14, 1.5, 8, { x: 2.0, y: 2.5, z: 0.55, rz: 0.9 }, 'metal')
    b.cylinder(0.12, 0.12, 1.2, 8, { x: 3.4, y: 4.5, z: 0.55, rz: 0.7 }, 'metal')
    b.box(3.0, 0.4, 0.34, { x: 6.9, y: 4.1, z: 0.55, rz: -0.7 }, 'safety')
    b.cylinder(0.13, 0.13, 1.3, 8, { x: 6.2, y: 5.2, z: 0.55, rz: 0.3 }, 'metal')
    // bucket
    const bucket = []
    for (let i = 0; i <= 6; i++) {
      const t = i / 6
      const a = -1.1 + t * 2.6
      bucket.push(V(8.0 + Math.sin(a) * 0.62, 3.3 - Math.cos(a) * 0.62, 0))
    }
    b.tube(bucket, 0.5, { z: 0.55 }, 'darkMetal', { segments: 4, noise: 0.03, seed: 5 })
    b.box(0.08, 0.9, 1.0, { x: 8.5, y: 3.4, z: 0.55 }, 'darkMetal')
    for (let i = 0; i < 4; i++) {
      b.box(0.3, 0.12, 1.02, { x: 8.7, y: 2.9 + i * 0.02, z: 0.55, rz: -0.5 }, 'metal')
    }
  })
}

/** Construction site props. */
async function generateSiteProps() {
  await writeAsset('rebar-stack', (b) => {
    const random = rng(91)
    // stacked rebar bundles on timber bearers
    for (const z of [-0.5, 0.5]) {
      b.box(3.4, 0.14, 0.24, { x: 0, y: 0.07, z: z * 1.9 }, 'wood')
    }
    for (let layer = 0; layer < 4; layer++) {
      const count = 9 - layer
      for (let i = 0; i < count; i++) {
        const x = -1.4 + (i * 2.8) / Math.max(1, count - 1) + (random() - 0.5) * 0.06
        const points = []
        for (let s = 0; s <= 4; s++) {
          points.push(V(x + (random() - 0.5) * 0.03, 0.18 + layer * 0.11, -1.7 + (s * 3.4) / 4))
        }
        b.tube(points, 0.024, {}, 'rust', { segments: 4, noise: 0.1, noiseScale: 8, seed: layer * 13 + i, uvScale: 0.4 })
      }
    }
    // binding wire coils
    for (const x of [-1.8, 1.8]) {
      b.cylinder(0.16, 0.16, 0.08, 10, { x, y: 0.62, z: 1.9 }, 'rust')
    }
  })

  await writeAsset('cement-bags', (b) => {
    const random = rng(41)
    const layers = 5
    for (let layer = 0; layer < layers; layer++) {
      const perRow = layer % 2 === 0 ? 3 : 2
      for (let i = 0; i < perRow; i++) {
        for (let d = 0; d < 2; d++) {
          const x = -0.55 + i * 0.62 + (layer % 2) * 0.3 + (random() - 0.5) * 0.05
          const z = -0.3 + d * 0.6 + (random() - 0.5) * 0.05
          b.box(0.62, 0.2, 0.44, { x, y: 0.1 + layer * 0.19, z, ry: (random() - 0.5) * 0.16 }, layer % 2 === 0 ? 'sack' : 'render')
          b.box(0.2, 0.06, 0.3, { x, y: 0.21 + layer * 0.19, z }, 'render')
        }
      }
    }
    // torn bag + spilled cement
    b.box(0.5, 0.12, 0.34, { x: 1.5, y: 0.06, z: 0.7, ry: 0.5 }, 'sack')
    b.box(1.2, 0.04, 0.9, { x: 2.2, y: 0.02, z: 0.9 }, 'render')
    // pallet
    b.box(2.4, 0.08, 1.6, { x: 0, y: 0.04, z: 0 }, 'wood')
  })

  await writeAsset('material-stack', (b) => {
    const random = rng(63)
    // brick stack, slightly irregular like a real site
    const rows = 9
    for (let r = 0; r < rows; r++) {
      const perRow = 6 - (r % 2)
      const y = 0.08 + r * 0.125
      for (let i = 0; i < perRow; i++) {
        const x = -1.0 + i * 0.46 + (r % 2) * 0.23 + (random() - 0.5) * 0.02
        b.box(0.44, 0.12, 0.22, { x, y, z: 0, ry: (random() - 0.5) * 0.05 }, 'brick')
      }
    }
    // concrete block stack
    for (let r = 0; r < 4; r++) {
      for (let i = 0; i < 3; i++) {
        b.box(0.6, 0.24, 0.4, { x: 2.2 + (r % 2) * 0.05, y: 0.12 + r * 0.25, z: -0.9 + i * 0.42, ry: (random() - 0.5) * 0.04 }, 'concrete')
      }
    }
    // sand heap
    b.sphere(1.5, { x: -2.6, y: 0.1, z: 1.4, sx: 1.2, sy: 0.42, sz: 1.0 }, 'sand', {}, 14, 8)
    // gravel heap
    b.sphere(1.1, { x: 2.9, y: 0.05, z: 1.6, sx: 1.1, sy: 0.36, sz: 0.9 }, 'gravel', {}, 12, 7)
    // pipes
    for (let i = 0; i < 3; i++) {
      b.cylinder(0.16, 0.16, 5.2, 10, { x: -1.2, y: 0.16 + i * 0.3, z: -2.4 + (i % 2) * 0.34, rx: Math.PI / 2 }, i === 1 ? 'rust' : 'metal')
    }
  })

  await writeAsset('barrier', (b) => {
    // steel barricade with a reflective stripe + a traffic cone
    b.cylinder(0.04, 0.04, 1.0, 6, { x: -1.4, y: 0.5, z: 0 }, 'metal')
    b.cylinder(0.04, 0.04, 1.0, 6, { x: 1.4, y: 0.5, z: 0 }, 'metal')
    for (const y of [0.55, 1.0]) {
      b.box(2.9, 0.12, 0.06, { x: 0, y, z: 0 }, y > 0.8 ? 'safety' : 'metal')
    }
    b.box(2.9, 0.1, 0.05, { x: 0, y: 0.78, z: 0 }, 'render')
    b.box(0.12, 1.1, 0.12, { x: -1.4, y: 0.55, z: 0 }, 'metal')
    b.box(0.12, 1.1, 0.12, { x: 1.4, y: 0.55, z: 0 }, 'metal')
    for (const x of [-1.4, 1.4]) b.box(0.5, 0.06, 0.5, { x, y: 0.03, z: 0 }, 'darkMetal')
    // cone
    b.cylinder(0.1, 0.28, 0.72, 12, { x: 2.6, y: 0.36, z: 0.4 }, 'safety')
    b.box(0.62, 0.05, 0.62, { x: 2.6, y: 0.03, z: 0.4 }, 'safety')
    b.cylinder(0.075, 0.095, 0.1, 12, { x: 2.6, y: 0.62, z: 0.4 }, 'render')
  })
}

/** Site shed, boundary wall, gate, street light. */
async function generateSiteStructures() {
  await writeAsset('construction-shed', (b) => {
    const W = 7.2
    const D = 5.0
    const H = 3.4
    // plinth: chamfered, and set into a gravel strip so the shed meets the
    // ground instead of hovering on it
    b.chamfer(W + 1.4, 0.16, D + 1.4, { x: 0, y: 0.08, z: 0 }, 'gravel', { bevel: 0.02 })
    b.chamfer(W + 0.6, 0.4, D + 0.6, { x: 0, y: 0.32, z: 0 }, 'concrete', { bevel: 0.016 })
    b.chamfer(W, 0.5, D, { x: 0, y: 0.57, z: 0 }, 'concrete', { bevel: 0.014 })
    // walls: ribbed sheets with a lap, on a frame that is not just four corners
    for (const [w, pos, rot] of [
      [W, [0, 0.82 + (H - 0.4) / 2, D / 2], [0, 0, 0]],
      [W, [0, 0.82 + (H - 0.4) / 2, -D / 2], [0, 0, 0]],
      [D, [W / 2, 0.82 + (H - 0.4) / 2, 0], [0, Math.PI / 2, 0]],
      [D, [-W / 2, 0.82 + (H - 0.4) / 2, 0], [0, Math.PI / 2, 0]],
    ]) {
      corrugated(b, { w, h: H - 0.4, position: pos, rotation: rot, material: 'metal', laps: 1 })
    }
    // corner posts + intermediate studs at sheet joints
    for (const x of [-W / 2, -W / 2 + 2.4, W / 2 - 2.4, W / 2]) {
      for (const z of [-D / 2, D / 2]) {
        b.chamfer(0.13, H, 0.13, { x, y: H / 2 + 0.4, z }, 'darkMetal', { bevel: 0.01 })
      }
    }
    for (const z of [-D / 2 + 2.5, D / 2 - 2.5]) {
      for (const x of [-W / 2, W / 2]) {
        b.chamfer(0.11, H, 0.11, { x, y: H / 2 + 0.4, z }, 'darkMetal', { bevel: 0.009 })
      }
    }
    // roof: purlins, sheet, fascia and a gutter that drips somewhere
    for (let i = 0; i < 5; i++) {
      b.box(W + 0.9, 0.1, 0.1, { x: 0, y: H + 0.44, z: -D / 2 + 0.6 + i * ((D - 1.2) / 4) }, 'darkMetal')
    }
    b.chamfer(W + 1.0, 0.12, D + 1.0, { x: 0, y: H + 0.54, z: 0, rx: 0.03 }, 'metal', { bevel: 0.01 })
    b.chamfer(W + 1.1, 0.16, 0.14, { x: 0, y: H + 0.62, z: D / 2 + 0.5 }, 'darkMetal', { bevel: 0.01 })
    b.chamfer(W + 1.1, 0.14, 0.26, { x: 0, y: H + 0.5, z: D / 2 + 0.56 }, 'metal', { bevel: 0.01 })
    for (const x of [-W / 2 + 0.4, W / 2 - 0.4]) {
      b.cylinder(0.055, 0.055, H + 0.5, 6, { x, y: (H + 0.5) / 2, z: D / 2 + 0.72 }, 'darkMetal')
      b.chamfer(0.3, 0.12, 0.3, { x, y: 0.06, z: D / 2 + 0.72 }, 'concrete', { bevel: 0.01 })
    }
    // door in a real frame, with a step; window with a frame and a grille
    b.frame(1.34, 2.44, 0.06, 0.11, { x: -1.9, y: 1.9, z: D / 2 + 0.06 }, 'darkMetal', { bevel: 0.008 })
    b.box(1.2, 2.3, 0.1, { x: -1.9, y: 1.85, z: D / 2 + 0.02 }, 'paintMuted')
    b.box(1.34, 0.1, 0.14, { x: -1.9, y: 3.05, z: D / 2 + 0.04 }, 'darkMetal')
    b.frame(1.7, 1.2, 0.05, 0.1, { x: 1.5, y: 2.2, z: D / 2 + 0.06 }, 'metal', { bevel: 0.007 })
    b.box(1.6, 1.1, 0.06, { x: 1.5, y: 2.2, z: D / 2 + 0.02 }, 'glassDark')
    for (let i = 0; i < 5; i++) b.box(0.04, 1.1, 0.08, { x: 0.82 + i * 0.34, y: 2.2, z: D / 2 + 0.06 }, 'darkMetal')
    b.chamfer(1.5, 0.16, 0.62, { x: -1.9, y: 0.48, z: D / 2 + 0.3 }, 'concrete', { bevel: 0.012 })
    acUnit(b, { x: 2.8, y: 2.4, z: D / 2 + 0.2 })
    b.box(2.6, 0.62, 0.08, { x: 0, y: 3.78, z: D / 2 + 0.05 }, 'paintB')
    // water tank on a stand, and a drum
    waterTank(b, { x: -4.4, y: 0.4, z: 2.6, r: 0.45, h: 0.9 })
    b.cylinder(0.3, 0.3, 0.86, 12, { x: 4.3, y: 0.43, z: 2.4 }, 'plastic')
    b.chamfer(0.7, 0.1, 0.7, { x: 4.3, y: 0.05, z: 2.4 }, 'concrete', { bevel: 0.01 })
  })

  await writeAsset('boundary-wall', (b) => {
    const L = 12
    const H = 2.6
    // plinth, wall, coping, pilasters, weep holes
    b.box(L, 0.5, 0.5, { x: 0, y: 0.25, z: 0 }, 'stone')
    b.box(L, H - 0.5, 0.32, { x: 0, y: 0.5 + (H - 0.5) / 2, z: 0 }, 'render')
    b.box(L + 0.1, 0.12, 0.5, { x: 0, y: H + 0.06, z: 0 }, 'stone')
    for (let i = 0; i <= 3; i++) {
      const x = -L / 2 + (i * L) / 3
      b.box(0.44, H + 0.3, 0.44, { x, y: (H + 0.3) / 2, z: 0 }, 'render')
      b.box(0.52, 0.14, 0.52, { x, y: H + 0.42, z: 0 }, 'stone')
    }
    for (let i = 0; i < 6; i++) {
      b.box(0.16, 0.1, 0.36, { x: -L / 2 + 1 + i * 1.9, y: 0.72, z: 0 }, 'darkMetal')
    }
    // a little grime streak at the base — reads as a real compound wall
    b.box(L, 0.24, 0.34, { x: 0, y: 0.6, z: 0.02 }, 'render')
  })

  await writeAsset('entrance-gate', (b) => {
    const span = 9.6
    // stone-clad piers with copings and lamp housings
    for (const x of [-span / 2, span / 2]) {
      b.box(1.5, 0.5, 1.5, { x, y: 0.25, z: 0 }, 'stone')
      b.box(1.3, 3.6, 1.3, { x, y: 2.3, z: 0 }, 'render')
      b.box(1.5, 0.24, 1.5, { x, y: 4.2, z: 0 }, 'stone')
      b.box(1.56, 0.16, 1.56, { x, y: 0.62, z: 0 }, 'stone')
      b.box(0.5, 0.5, 0.5, { x, y: 4.6, z: 0 }, 'darkMetal')
      b.sphere(0.18, { x, y: 4.85, z: 0 }, 'light', {}, 8, 6)
      b.box(2.2, 0.9, 0.1, { x, y: 1.6, z: 0.7 }, 'stone')
    }
    // track and stop post stay with the static frame
    b.box(span * 0.7, 0.16, 0.5, { x: span * 0.1, y: 0.08, z: 0 }, 'metal')
    b.box(0.2, 1.2, 0.2, { x: -span * 0.42, y: 0.6, z: 0 }, 'safety')
    // name board
    b.box(7.6, 1.0, 0.16, { x: 0, y: 5.4, z: 0 }, 'render')
    b.box(7.0, 0.62, 0.06, { x: 0, y: 5.4, z: 0.12 }, 'paintB')
    for (const x of [-span / 2, span / 2]) b.box(0.12, 1.2, 0.12, { x, y: 5.4, z: 0 }, 'darkMetal')
    // guard room
    b.box(2.6, 2.6, 2.2, { x: span / 2 + 2.6, y: 1.3, z: 2.4 }, 'render')
    b.box(2.8, 0.2, 2.4, { x: span / 2 + 2.6, y: 2.7, z: 2.4 }, 'concrete')
    b.box(1.6, 1.1, 0.06, { x: span / 2 + 2.6, y: 1.7, z: 1.28 }, 'glassDark')
    b.box(0.9, 2.1, 0.08, { x: span / 2 + 2.6, y: 1.05, z: 3.52 }, 'paintMuted')
  })

  // the sliding leaf is its own asset so it can be animated open
  await writeAsset('entrance-gate-leaf', (b) => {
    const span = 9.6
    b.box(span * 0.96, 2.7, 0.14, { x: 0, y: 1.6, z: 0 }, 'darkMetal')
    for (let i = 0; i < 15; i++) {
      b.box(0.07, 2.3, 0.1, { x: -span / 2 + 0.5 + i * ((span - 1) / 14), y: 1.6, z: 0.1 }, 'metal')
    }
    for (const y of [0.85, 2.35]) b.box(span * 0.96, 0.12, 0.16, { x: 0, y, z: 0.1 }, 'metal')
    // bottom rail, rollers and a small keeper plate
    b.box(span * 0.96, 0.2, 0.18, { x: 0, y: 0.36, z: 0.08 }, 'darkMetal')
    for (const x of [-span * 0.4, 0, span * 0.4]) {
      b.cylinder(0.11, 0.11, 0.1, 10, { x, y: 0.16, z: 0.08, rx: Math.PI / 2 }, 'darkMetal')
    }
    b.box(0.3, 0.34, 0.1, { x: span * 0.46, y: 1.5, z: 0 }, 'safety')
  })

  await writeAsset('street-light', (b) => {
    // base plinth, octagonal pole, curved arm, luminaire, service door
    b.box(0.62, 0.3, 0.62, { x: 0, y: 0.15, z: 0 }, 'concrete')
    b.cylinder(0.075, 0.13, 7.4, 8, { x: 0, y: 3.8, z: 0 }, 'metal')
    b.cylinder(0.14, 0.14, 0.5, 8, { x: 0, y: 0.5, z: 0 }, 'darkMetal')
    b.box(0.16, 0.3, 0.06, { x: 0, y: 1.1, z: 0.07 }, 'darkMetal')
    // arm: a gentle curve built from a tube
    const arm = []
    for (let i = 0; i <= 6; i++) {
      const t = i / 6
      arm.push(V(t * 2.1, 7.3 + Math.sin(t * 1.2) * 0.45 - t * t * 0.5, 0))
    }
    b.tube(arm, (t) => 0.1 * (1 - t * 0.35), {}, 'metal', { segments: 7, noise: 0.03, seed: 6, uvScale: 0.7 })
    b.box(0.5, 0.1, 0.16, { x: 2.1, y: 7.05, z: 0 }, 'metal')
    b.box(0.86, 0.2, 0.42, { x: 2.34, y: 6.9, z: 0, rz: 0.05 }, 'darkMetal')
    b.box(0.78, 0.08, 0.34, { x: 2.34, y: 6.79, z: 0 }, 'light')
    b.box(0.9, 0.06, 0.46, { x: 2.34, y: 7.02, z: 0 }, 'darkMetal')
    // a small solar panel and a cable
    b.box(0.8, 0.05, 0.5, { x: -0.4, y: 7.6, z: 0, rx: -0.3 }, 'panelDark')
    b.tube([V(0.1, 0.2, 0.12), V(0.1, 7.0, 0.1)], 0.018, {}, 'darkMetal', { segments: 4, seed: 2 })
  })
}

/* --------------------------------------------------------------------- flora */

async function generateFlora() {
  const variants = [
    ['tree-a', 'a', 11, { leafMaterial: 'leaf' }],
    ['tree-b', 'b', 23, { leafMaterial: 'leafB' }],
    ['tree-c', 'c', 37, { leafMaterial: 'leaf' }],
    ['tree-d', 'd', 53, { leafMaterial: 'leafB' }],
    ['tree-e', 'e', 67, { leafMaterial: 'leaf' }],
  ]
  for (const [name, species, seed, options] of variants) {
    // LOD 1 — the default tree line asset
    await writeAsset(name, (b) => {
      buildTree(b, { species, seed, lod: 1, ...options })
    })
    // LOD 0 — hero distance: three-bladed leaf clusters give the crown real
    // volume, which is the difference between a tree and a billboard up close.
    await writeAsset(`${name}-close`, (b) => {
      buildTree(b, { species, seed, lod: 0, ...options })
    })
    // LOD 2 — the far tree line: fewer, larger blades, leaner skeleton
    await writeAsset(`${name}-far`, (b) => {
      buildTree(b, { species, seed, lod: 2, ...options })
    })
  }
  await writeAsset('bush', (b) => {
    buildShrub(b, { seed: 71, height: 1.4, spread: 1.7, leafMaterial: 'leaf' })
  })
  await writeAsset('shrub-dry', (b) => {
    buildShrub(b, { seed: 97, height: 1.05, spread: 1.3, leafMaterial: 'leafDry' })
    // dry grass tufts around the base
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2
      const r = 0.7
      b.strip(
        [V(Math.cos(a) * r * 0.3, 0.02, Math.sin(a) * r * 0.3), V(Math.cos(a) * r, 0.34, Math.sin(a) * r)],
        0.09,
        {},
        'leafDry',
      )
    }
  })
  await writeAsset('grass-tuft', (b) => {
    const random = rng(19)
    // a clump of blades: three crossed cards with varied heights
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + random() * 0.6
      const h = 0.3 + random() * 0.42
      const lean = 0.18 + random() * 0.3
      const dir = V(Math.cos(a), 0, Math.sin(a))
      const side = V(-dir.z, 0, dir.x)
      for (let blade = 0; blade < 4; blade++) {
        const off = (blade - 1.5) * 0.07
        const p0 = V(side.x * off - dir.x * 0.1, 0, side.z * off - dir.z * 0.1)
        const p1 = V(side.x * off + dir.x * 0.1, 0, side.z * off + dir.z * 0.1)
        const p2 = p1.clone().add(V(dir.x * lean, h, dir.z * lean)).add(V(side.x * 0.03, 0, side.z * 0.03))
        const p3 = p0.clone().add(V(dir.x * lean, h, dir.z * lean)).add(V(side.x * -0.03, 0, side.z * -0.03))
        b.quad(p0, p1, p2, p3, [0, 0, 1, 0, 1, 1, 0, 1], {}, 'leaf')
      }
    }
    void SPECIES
  })
}

async function generateVehicles() {
  await writeAsset('car-a', (b) => buildVehicle(b, { kind: 'sedan', seed: 5, paint: 'carA' }))
  await writeAsset('car-b', (b) => buildVehicle(b, { kind: 'suv', seed: 17, paint: 'carB' }))
  await writeAsset('car-c', (b) => buildVehicle(b, { kind: 'hatch', seed: 29, paint: 'carC' }))
  await writeAsset('truck-a', (b) => buildVehicle(b, { kind: 'pickup', seed: 43, paint: 'carD' }))
}

/* ---------------------------------------------------------------------- main */

async function main() {
  console.log('→ generating GLB assets (photorealism rebuild)')
  await generateHeroBuilding()
  await generateResidentialBuilding()
  await generateWarehouse()
  await generateBridge()
  await generateSolarPanel()
  await generateScaffolding()
  await generateCrane()
  await generateExcavator()
  await generateSiteProps()
  await generateSiteStructures()
  await generateVehicles()
  await generateFlora()
  console.log('→ done. Raw assets in assets/raw')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
