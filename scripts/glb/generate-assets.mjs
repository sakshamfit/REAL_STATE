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

/** HERO — a real 13 storey Indian mixed-use building. */
async function generateHeroBuilding() {
  await writeAsset('hero-building', (b) => {
    const W = 22
    const D = 16
    const floors = 12
    const fh = 3.06
    const podium = 5.6
    const towerBase = podium
    const towerTop = towerBase + floors * fh
    const random = rng(11)

    /* ------------------------------------------------------------ podium */
    b.box(W + 2.4, podium, D + 2.4, { x: 0, y: podium / 2, z: 0 }, 'concrete')
    b.box(W + 3.2, 0.5, D + 3.2, { x: 0, y: 0.25, z: 0 }, 'stone')
    b.box(W + 2.8, 0.34, D + 2.8, { x: 0, y: podium + 0.17, z: 0 }, 'stone')
    // plinth course + damp proof course line
    b.box(W + 2.6, 0.22, D + 2.6, { x: 0, y: 0.62, z: 0 }, 'stone')

    // shopfront glazing with frames and a stall riser
    for (const side of ['front', 'back']) {
      const z = side === 'front' ? D / 2 + 1.2 : -D / 2 - 1.2
      for (let i = 0; i < 5; i++) {
        const x = -W / 2 + 1.4 + i * ((W - 2.8) / 4)
        b.box(3.0, 0.5, 0.16, { x, y: 0.85, z }, 'stone')
        b.box(2.9, 2.7, 0.06, { x, y: 2.42, z: z + 0.14 * (side === 'front' ? 1 : -1) }, 'glassDark')
        b.box(3.2, 0.16, 0.2, { x, y: 3.85, z: z + 0.1 * (side === 'front' ? 1 : -1) }, 'darkMetal')
        for (const s of [-1, 1]) {
          b.box(0.1, 2.9, 0.16, { x: x + s * 1.5, y: 2.45, z: z + 0.06 * (side === 'front' ? 1 : -1) }, 'darkMetal')
        }
        if (i % 2 === 0) {
          b.box(3.0, 0.5, 0.06, { x, y: 4.4, z: z + 0.16 * (side === 'front' ? 1 : -1) }, random() < 0.5 ? 'paintC' : 'paintMuted')
        }
      }
    }

    /* ------------------------------------------------------------ tower */
    // structural frame: corner columns + mid columns read through the facade
    for (const x of [-W / 2 + 0.4, -W / 2 + 5.6, -W / 2 + 11, W / 2 - 5.6, W / 2 - 0.4]) {
      b.box(0.8, towerTop - towerBase, D + 0.4, { x, y: (towerTop + towerBase) / 2, z: 0 }, 'concrete')
    }
    // tower end walls
    for (const x of [-W / 2 + 0.1, W / 2 - 0.1]) {
      b.box(0.2, towerTop - towerBase, D, { x, y: (towerTop + towerBase) / 2, z: 0 }, 'renderWarm')
    }

    // front facade — punched windows with chajjas, balconies on alternate floors
    punchedFacade(b, {
      plane: 'z',
      from: -W / 2,
      length: W,
      z: D / 2,
      thickness: 0.34,
      baseY: towerBase,
      floors,
      floorHeight: fh,
      bays: baysFor(6, W, -W / 2, 1.1),
      sill: 0.92,
      head: 2.36,
      recess: 0.3,
      wall: 'renderWarm',
      band: 'concrete',
      glass: 'glass',
      frame: 'metal',
      sillMaterial: 'stone',
      mullions: 1,
      chajja: 0.26,
      seed: 4,
    })

    // rear facade — smaller openings, service character
    punchedFacade(b, {
      plane: 'z',
      from: -W / 2,
      length: W,
      z: -D / 2,
      thickness: 0.3,
      baseY: towerBase,
      floors,
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
    })

    // balconies on the road elevation
    for (let f = 1; f < floors; f += 2) {
      const y = towerBase + f * fh + fh * 0.18
      balcony(b, { x: -5.4, y, z: D / 2 + 1.0, w: 5.2, d: 2.0, planter: f % 4 === 1 })
      balcony(b, { x: 5.4, y, z: D / 2 + 1.0, w: 5.2, d: 2.0, planter: f % 4 === 3 })
    }
    // AC units on the side elevations
    for (let f = 0; f < floors; f++) {
      const y = towerBase + f * fh + 2.2
      if (f % 2 === 0) acUnit(b, { x: -W / 2 - 0.24, y, z: -3.2, ry: Math.PI / 2 })
      if (f % 3 === 1) acUnit(b, { x: W / 2 + 0.24, y, z: 2.6, ry: -Math.PI / 2 })
    }

    // horizontal service band + vertical fins on the end walls
    for (const x of [-W / 2 - 0.22, W / 2 + 0.22]) {
      for (let f = 0; f < floors; f++) {
        b.box(0.1, 0.18, D - 1, { x, y: towerBase + f * fh + 0.2, z: 0 }, 'concrete')
      }
      for (let i = 0; i < 9; i++) {
        b.box(0.22, towerTop - towerBase, 0.16, { x, y: (towerTop + towerBase) / 2, z: -D / 2 + 1 + i * 1.75 }, 'concrete')
      }
    }

    /* ------------------------------------------------------- entrance */
    canopy(b, { x: 0, y: 4.9, z: D / 2 + 3.4, w: 9, d: 3.6, columns: 2 })
    for (const s of [-1, 1]) {
      b.box(0.7, 4.9, 0.7, { x: s * 4.2, y: 2.45, z: D / 2 + 4.9 }, 'stone')
    }
    // steps
    for (let i = 0; i < 4; i++) {
      b.box(9 - i * 0.0, 0.16, 1.0 + i * 0.5, { x: 0, y: 0.08 + i * 0.16, z: D / 2 + 2.2 + i * 0.24 }, 'stone')
    }
    // revolving door lobby glazing
    b.box(5.2, 3.2, 0.08, { x: 0, y: 2.4, z: D / 2 + 1.28 }, 'glassDark')
    b.box(5.6, 0.2, 0.3, { x: 0, y: 4.1, z: D / 2 + 1.3 }, 'darkMetal')
    // signage band above the canopy
    b.box(7.2, 0.9, 0.14, { x: 0, y: 5.9, z: D / 2 + 4.6 }, 'render')
    b.box(6.6, 0.5, 0.06, { x: 0, y: 5.9, z: D / 2 + 4.7 }, 'paintB')

    /* ---------------------------------------------------------- roof */
    slab(b, { w: W + 0.6, d: D + 0.6, thickness: 0.3, edge: 0.22, position: [0, towerTop + 0.15, 0] })
    parapet(b, { w: W + 0.6, d: D + 0.6, y: towerTop + 0.3, height: 1.1 })
    core(b, { x: -6.4, z: -2.4, w: 5.4, d: 5.4, height: towerTop + 0.3 })
    waterTank(b, { x: 4.6, y: towerTop + 0.4, z: -3.6 })
    waterTank(b, { x: 6.4, y: towerTop + 0.4, z: -1.4, r: 0.55, h: 1.05 })
    solarArray(b, { x: 2.4, y: towerTop + 0.4, z: 3.6, count: 4 })
    // lift machine room + antenna
    b.box(3.4, 2.6, 3.0, { x: 6.6, y: towerTop + 1.6, z: 3.4 }, 'renderWarm')
    b.box(3.6, 0.2, 3.2, { x: 6.6, y: towerTop + 3.0, z: 3.4 }, 'stone')
    b.cylinder(0.04, 0.06, 4.4, 5, { x: -8.4, y: towerTop + 2.5, z: 4.6 }, 'darkMetal')
    // rooftop clothes line / pipework
    const pipe = [V(-9, towerTop + 0.5, 5.6), V(9, towerTop + 0.48, 5.4)]
    b.tube(pipe, 0.07, {}, 'metal', { segments: 6, noise: 0.03, seed: 7, uvScale: 1 })
    railing(b, { x0: -W / 2, x1: W / 2, y: towerTop + 0.3, z: -D / 2 - 0.4, height: 1.0, posts: 8 })
  })
}

/** Residential block — service world 02. */
async function generateResidentialBuilding() {
  await writeAsset('residential-building', (b) => {
    const W = 20
    const D = 13
    const floors = 7
    const fh = 3.0
    const base = 0.6
    const top = base + floors * fh

    b.box(W + 1.6, base, D + 1.6, { x: 0, y: base / 2, z: 0 }, 'concrete')
    b.box(W + 2.0, 0.28, D + 2.0, { x: 0, y: base + 0.14, z: 0 }, 'stone')
    b.box(W, top - base, D, { x: 0, y: (top + base) / 2, z: 0 }, 'renderWarm')
    // vertical stair tower
    b.box(4.6, top - base + 2.4, D * 0.62, { x: -W / 2 - 1.6, y: (top - base + 2.4) / 2, z: 0 }, 'concrete')
    b.box(5.0, 0.3, D * 0.66, { x: -W / 2 - 1.6, y: top + 1.3, z: 0 }, 'stone')

    punchedFacade(b, {
      plane: 'z',
      from: -W / 2,
      length: W,
      z: D / 2,
      thickness: 0.28,
      baseY: base,
      floors,
      floorHeight: fh,
      bays: baysFor(5, W, -W / 2, 1.2),
      sill: 0.9,
      head: 2.3,
      recess: 0.26,
      wall: 'renderWarm',
      band: 'concrete',
      glass: 'glass',
      frame: 'metal',
      sillMaterial: 'stone',
      mullions: 1,
      chajja: 0.22,
      seed: 21,
    })
    punchedFacade(b, {
      plane: 'z',
      from: -W / 2,
      length: W,
      z: -D / 2,
      thickness: 0.26,
      baseY: base,
      floors,
      floorHeight: fh,
      bays: baysFor(6, W, -W / 2, 0.9),
      sill: 1.0,
      head: 1.95,
      recess: 0.22,
      wall: 'render',
      band: 'concrete',
      glass: 'glassDark',
      frame: 'metal',
      sillMaterial: 'stone',
      mullions: 0,
      chajja: 0.12,
      seed: 33,
    })

    // balconies with planters — the lived-in Indian block
    for (let f = 1; f < floors; f++) {
      const y = base + f * fh + 0.2
      balcony(b, { x: -5.6, y, z: D / 2 + 1.0, w: 6.0, d: 1.9, planter: f % 2 === 0 })
      balcony(b, { x: 5.6, y, z: D / 2 + 1.0, w: 6.0, d: 1.9, planter: f % 3 === 1 })
    }
    // ground floor parking / entrance
    for (let i = 0; i < 4; i++) {
      const x = -W / 2 + 2.4 + i * ((W - 4.8) / 3)
      b.box(2.6, 2.6, 0.1, { x, y: base + 1.4, z: D / 2 + 0.02 }, 'darkMetal')
      b.box(2.8, 0.16, 0.24, { x, y: base + 2.8, z: D / 2 + 0.06 }, 'concrete')
    }
    canopy(b, { x: 0, y: 4.2, z: D / 2 + 2.6, w: 6.4, d: 3.0 })

    slab(b, { w: W + 0.4, d: D + 0.4, thickness: 0.26, edge: 0.2, position: [0, top + 0.13, 0] })
    parapet(b, { w: W + 0.4, d: D + 0.4, y: top + 0.26, height: 0.95 })
    waterTank(b, { x: -3.2, y: top + 0.36, z: -2.2 })
    waterTank(b, { x: -1.2, y: top + 0.36, z: -3.8, r: 0.5, h: 0.95 })
    solarArray(b, { x: 4.2, y: top + 0.36, z: 2.2, count: 3 })
    for (let f = 0; f < floors; f += 2) acUnit(b, { x: W / 2 + 0.2, y: base + f * fh + 2.1, z: -3.4, ry: -Math.PI / 2 })
  })
}

/** Warehouse — service world 06. */
async function generateWarehouse() {
  await writeAsset('warehouse', (b) => {
    const W = 36
    const D = 26
    const H = 12.5
    const random = rng(51)

    b.box(W + 3, 0.5, D + 3, { x: 0, y: 0.25, z: 0 }, 'concrete')
    // ribbed metal walls
    corrugated(b, { w: W, h: H, position: [0, H / 2 + 0.5, D / 2], material: 'metal' })
    corrugated(b, { w: W, h: H, position: [0, H / 2 + 0.5, -D / 2], material: 'metal' })
    corrugated(b, { w: D, h: H, position: [W / 2, H / 2 + 0.5, 0], rotation: [0, Math.PI / 2, 0], material: 'metal' })
    corrugated(b, { w: D, h: H, position: [-W / 2, H / 2 + 0.5, 0], rotation: [0, Math.PI / 2, 0], material: 'metal' })
    // structural columns at the corners and mid bays
    for (const x of [-W / 2, -W / 4, 0, W / 4, W / 2]) {
      for (const z of [-D / 2, D / 2]) {
        b.box(0.7, H, 0.7, { x, y: H / 2 + 0.5, z: z + (z > 0 ? 0.32 : -0.32) }, 'concrete')
      }
    }
    // roof: shallow slope, ridge vents, sheet ribs
    for (const side of [-1, 1]) {
      b.box(W + 2.4, 0.24, D / 2 + 0.6, { x: 0, y: H + 0.5 + 0.5, z: (side * D) / 4, rx: side * 0.055 }, 'metal')
    }
    b.box(W + 2.4, 0.5, 0.6, { x: 0, y: H + 1.35, z: 0 }, 'darkMetal')
    for (let i = 0; i < 5; i++) {
      const x = -W / 2 + 3 + i * ((W - 6) / 4)
      b.box(2.2, 1.0, 1.6, { x, y: H + 1.9, z: -3 }, 'metal')
      b.box(2.4, 0.12, 1.8, { x, y: H + 2.5, z: -3, rz: random() * 0.06 }, 'darkMetal')
    }
    // clerestory glazing
    b.box(W - 6, 1.6, 0.1, { x: 0, y: H + 0.1, z: D / 2 + 0.36 }, 'glassDark')
    b.box(W - 6, 1.6, 0.1, { x: 0, y: H + 0.1, z: -D / 2 - 0.36 }, 'glassDark')

    // main roller shutter + canopy
    b.box(7, 5.4, 0.3, { x: -4, y: 3.2, z: D / 2 + 0.4 }, 'darkMetal')
    for (let i = 0; i < 12; i++) b.box(6.9, 0.16, 0.06, { x: -4, y: 0.9 + i * 0.44, z: D / 2 + 0.56 }, 'metal')
    b.box(8.4, 0.3, 0.4, { x: -4, y: 6.05, z: D / 2 + 0.5 }, 'concrete')
    b.box(9, 0.3, 5, { x: -4, y: 7.4, z: D / 2 + 2.8 }, 'metal')
    b.box(0.3, 7.2, 0.3, { x: -7.8, y: 3.7, z: D / 2 + 4.9 }, 'concrete')
    b.box(0.3, 7.2, 0.3, { x: -0.2, y: 3.7, z: D / 2 + 4.9 }, 'concrete')

    // pedestrian doors, windows, downpipes
    for (const x of [8, 12]) {
      b.box(1.2, 2.4, 0.14, { x, y: 1.7, z: D / 2 + 0.42 }, 'paintMuted')
      b.box(1.4, 0.16, 0.24, { x, y: 2.95, z: D / 2 + 0.5 }, 'concrete')
    }
    for (const x of [-14, -8, 4, 10, 14]) {
      b.box(3.4, 2.0, 0.1, { x, y: 8.4, z: D / 2 + 0.42 }, 'glassDark')
      b.box(3.6, 0.12, 0.2, { x, y: 7.4, z: D / 2 + 0.46 }, 'metal')
    }
    for (const x of [-W / 2 + 1, 0, W / 2 - 1]) {
      b.cylinder(0.09, 0.09, H + 0.5, 6, { x, y: (H + 0.5) / 2, z: D / 2 + 0.55 }, 'darkMetal')
    }
    // grade slab apron + kerb
    b.box(W + 8, 0.14, 7, { x: 0, y: 0.07, z: D / 2 + 6 }, 'concrete')
    b.box(W + 8, 0.3, 0.5, { x: 0, y: 0.15, z: D / 2 + 9.4 }, 'stone')
  })
}

/** Arch bridge — service world 03. */
async function generateBridge() {
  await writeAsset('bridge', (b) => {
    const span = 48
    const deckY = 15
    const width = 13
    const random = rng(77)

    // deck with camber and a wearing course
    b.box(span, 1.3, width, { x: 0, y: deckY, z: 0 }, 'concrete')
    b.box(span, 0.12, width - 0.6, { x: 0, y: deckY + 0.7, z: 0 }, 'asphalt')
    // parapets with copings
    for (const z of [-width / 2 + 0.4, width / 2 - 0.4]) {
      b.box(span, 1.35, 0.55, { x: 0, y: deckY + 1.3, z }, 'concrete')
      b.box(span, 0.16, 0.72, { x: 0, y: deckY + 2.02, z }, 'stone')
      for (let i = 0; i < 12; i++) {
        b.box(0.12, 0.5, 0.06, { x: -span / 2 + 2 + i * ((span - 4) / 11), y: deckY + 1.35, z: z + (z > 0 ? -0.3 : 0.3) }, 'darkMetal')
      }
    }
    // footpath + kerb
    for (const z of [-width / 2 + 1.9, width / 2 - 1.9]) {
      b.box(span, 0.34, 2.4, { x: 0, y: deckY + 0.85, z }, 'concrete')
      b.box(span, 0.28, 0.3, { x: 0, y: deckY + 1.0, z: z + (z > 0 ? -1.2 : 1.2) }, 'stone')
    }
    // piers with cutwaters + abutments
    for (const x of [-16, 16]) {
      b.box(4.2, deckY - 1.2, 8, { x, y: (deckY - 1.2) / 2, z: 0 }, 'concrete')
      b.box(4.6, 0.8, 8.4, { x, y: 0.4, z: 0 }, 'stone')
      b.cylinder(1.4, 2.0, deckY - 2, 10, { x, y: (deckY - 2) / 2, z: 4.2 }, 'concrete')
      b.box(4.8, 0.4, 9, { x, y: deckY - 0.4, z: 0 }, 'concrete')
    }
    for (const x of [-23.5, 23.5]) {
      b.box(5.4, deckY - 2, 12, { x, y: (deckY - 2) / 2, z: 0 }, 'stone')
      b.box(5.8, 0.7, 12.6, { x, y: 0.35, z: 0 }, 'stone')
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
        b.box(0.5, h, 0.5, { x, y: archY + h / 2, z: -4.6 }, 'concrete')
        b.box(0.5, h, 0.5, { x, y: archY + h / 2, z: 4.6 }, 'concrete')
        b.box(0.6, 0.4, 9.6, { x, y: archY + h, z: 0 }, 'concrete')
      }
    }
    // expansion joints, drains, lamp posts
    for (const x of [-7.5, 7.5]) {
      b.box(0.3, 1.4, width, { x, y: deckY + 0.7, z: 0 }, 'darkMetal')
    }
    for (const x of [-18, -6, 6, 18]) {
      for (const z of [-width / 2 + 1.2, width / 2 - 1.2]) {
        b.cylinder(0.09, 0.12, 8, 6, { x, y: deckY + 5, z }, 'darkMetal')
        b.box(0.6, 0.3, 0.4, { x: x + 0.4, y: deckY + 9, z: z + (z > 0 ? -0.2 : 0.2) }, 'darkMetal')
      }
    }
    // approach ramps + embankment
    for (const side of [-1, 1]) {
      b.box(12, 0.6, width + 6, { x: side * (span / 2 + 6), y: deckY - 0.3, z: 0, rz: side * 0.02 }, 'concrete')
      b.box(12, deckY, width + 6, { x: side * (span / 2 + 6), y: (deckY) / 2 - 0.6, z: 0 }, 'stone')
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
      for (const x of [-1.6, 0, 1.6]) {
        b.cylinder(0.07, 0.09, 1.5, 6, { x, y: 0.75, z }, 'metal')
        b.box(0.16, 0.16, 2.3, { x, y: 1.5, z }, 'metal')
      }
      // torque tube
      b.cylinder(0.06, 0.06, 6.4, 6, { x: 0, y: 1.62, z, rz: Math.PI / 2 }, 'darkMetal')
      // modules with a slight tilt and per-module variation
      for (let m = -2; m <= 2; m++) {
        const px = m * 1.42
        b.box(1.3, 0.06, 2.3, { x: px, y: 1.72, z, rx: -0.36 + (m % 2) * 0.01 }, 'panelDark')
        b.box(1.34, 0.05, 2.34, { x: px, y: 1.68, z, rx: -0.36 }, 'metal')
      }
      b.box(6.9, 0.05, 0.06, { x: 0, y: 1.95, z: z - 1.1 }, 'metal')
    }
    // inverter enclosure + cable trays
    b.box(1.4, 1.7, 0.9, { x: 4.6, y: 0.85, z: 0 }, 'metal')
    b.box(1.44, 0.3, 0.94, { x: 4.6, y: 1.85, z: 0 }, 'darkMetal')
    b.box(0.5, 0.06, 8.6, { x: 3.4, y: 0.2, z: 0 }, 'darkMetal')
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

    // slewing unit + cab
    b.box(2.6, 1.6, 2.6, { x: 0, y: mast + 0.8, z: 0 }, 'safety')
    b.box(2.2, 0.6, 2.2, { x: 0, y: mast + 1.8, z: 0 }, 'darkMetal')
    b.box(2.4, 2.4, 2.0, { x: 0, y: mast + 3.1, z: 1.6 }, 'safety')
    b.box(2.2, 1.5, 0.08, { x: 0, y: mast + 3.4, z: 2.62 }, 'glass')
    b.box(2.3, 0.12, 2.1, { x: 0, y: mast + 4.35, z: 1.6 }, 'darkMetal')

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

    // counter jib + counterweight slabs
    lattice(b, { x0: -2.4, y0: mast + 2.4, z0: 0, x1: -11.5, y1: mast + 2.4, z1: 0, size: 0.55, bays: 4, chord: 0.06 })
    for (let i = 0; i < 4; i++) {
      b.box(1.5, 1.2, 2.0, { x: -7.4 - i * 1.0, y: mast + 1.4 - i * 0.02, z: 0 }, 'concrete')
    }
    b.box(0.4, 3.2, 2.1, { x: -11.6, y: mast + 2.0, z: 0 }, 'concrete')
    b.tube([V(-2, mast + 8.6, 0), V(-9.5, mast + 4.4, 0)], 0.05, {}, 'darkMetal', { segments: 4, seed: 15 })

    // warning light + ladder
    b.sphere(0.16, { x: 0, y: mast + 9.0, z: 0 }, 'tail', {}, 8, 6)
    for (let i = 0; i < 40; i++) {
      b.box(0.6, 0.04, 0.06, { x: 1.35, y: 2 + i * 0.78, z: 0 }, 'darkMetal')
    }
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
    b.box(W + 0.6, 0.4, D + 0.6, { x: 0, y: 0.2, z: 0 }, 'concrete')
    // walls: ribbed sheets with a plinth
    b.box(W, 0.5, D, { x: 0, y: 0.45, z: 0 }, 'concrete')
    corrugated(b, { w: W, h: H - 0.4, position: [0, 0.7 + (H - 0.4) / 2, D / 2], material: 'metal' })
    corrugated(b, { w: W, h: H - 0.4, position: [0, 0.7 + (H - 0.4) / 2, -D / 2], material: 'metal' })
    corrugated(b, { w: D, h: H - 0.4, position: [W / 2, 0.7 + (H - 0.4) / 2, 0], rotation: [0, Math.PI / 2, 0], material: 'metal' })
    corrugated(b, { w: D, h: H - 0.4, position: [-W / 2, 0.7 + (H - 0.4) / 2, 0], rotation: [0, Math.PI / 2, 0], material: 'metal' })
    // corner posts
    for (const x of [-W / 2, W / 2]) {
      for (const z of [-D / 2, D / 2]) {
        b.box(0.14, H, 0.14, { x, y: H / 2 + 0.4, z }, 'darkMetal')
      }
    }
    // roof with an overhang
    b.box(W + 1.0, 0.14, D + 1.0, { x: 0, y: H + 0.5, z: 0, rx: 0.03 }, 'metal')
    b.box(W + 1.1, 0.1, 0.14, { x: 0, y: H + 0.62, z: D / 2 + 0.5 }, 'darkMetal')
    // door, window, grille, sign, step, AC
    b.box(1.2, 2.3, 0.1, { x: -1.9, y: 1.85, z: D / 2 + 0.02 }, 'paintMuted')
    b.box(1.34, 0.1, 0.14, { x: -1.9, y: 3.05, z: D / 2 + 0.04 }, 'darkMetal')
    b.box(1.6, 1.1, 0.06, { x: 1.5, y: 2.2, z: D / 2 + 0.02 }, 'glassDark')
    for (let i = 0; i < 5; i++) b.box(0.04, 1.1, 0.08, { x: 0.82 + i * 0.34, y: 2.2, z: D / 2 + 0.06 }, 'darkMetal')
    b.box(2.4, 0.6, 0.08, { x: 0, y: 3.75, z: D / 2 + 0.05 }, 'paintB')
    b.box(1.4, 0.16, 0.6, { x: -1.9, y: 0.48, z: D / 2 + 0.3 }, 'concrete')
    acUnit(b, { x: 2.8, y: 2.4, z: D / 2 + 0.2 })
    // water tank + drum outside
    waterTank(b, { x: -4.4, y: 0.4, z: 2.6, r: 0.45, h: 0.9 })
    b.cylinder(0.3, 0.3, 0.86, 12, { x: 4.3, y: 0.43, z: 2.4 }, 'plastic')
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
  await writeAsset('car-a', (b) => buildVehicle(b, { kind: 'sedan', seed: 5, paint: 'paintA' }))
  await writeAsset('car-b', (b) => buildVehicle(b, { kind: 'suv', seed: 17, paint: 'paintB' }))
  await writeAsset('car-c', (b) => buildVehicle(b, { kind: 'hatch', seed: 29, paint: 'paintC' }))
  await writeAsset('truck-a', (b) => buildVehicle(b, { kind: 'pickup', seed: 43, paint: 'paintD' }))
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
