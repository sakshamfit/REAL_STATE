/**
 * REAL_STATE — procedural GLB generator.
 *
 * This script creates production-ready `.glb` files for the primary
 * architectural assets. The geometry is authored with three.js primitives and
 * exported through @gltf-transform, so the assets are valid glTF 2.0 binary
 * files that any Blender/three.js/React-Three-Fiber pipeline can load.
 *
 * Textures are intentionally NOT baked into these assets. The React
 * experience owns the photorealistic PBR material library and maps a GLB's
 * material names to procedural concrete / stone / glass / metal / foliage
 * materials at runtime. This keeps every asset lightweight and makes it easy
 * to swap in a production Blender/Photogrammetry model later by dropping a GLB
 * into `public/assets/glb/` with the same material names.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as THREE from 'three'
import { Document, NodeIO } from '@gltf-transform/core'
import { prune } from '@gltf-transform/functions'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../..')
const OUT_DIR = path.join(ROOT, 'public/assets/glb/raw')

fs.mkdirSync(OUT_DIR, { recursive: true })

/** ------------------------------------------------------------------ helpers */

function matrix(transform = {}) {
  const m = new THREE.Matrix4()
  const p = new THREE.Vector3(transform.x ?? 0, transform.y ?? 0, transform.z ?? 0)
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(transform.rx ?? 0, transform.ry ?? 0, transform.rz ?? 0))
  const s = new THREE.Vector3(transform.sx ?? 1, transform.sy ?? 1, transform.sz ?? 1)
  m.compose(p, q, s)
  return m
}

function createAccessor(doc, buffer, array, type) {
  const accessor = doc.createAccessor().setType(type).setBuffer(buffer).setArray(array)
  return accessor
}

function makeGeometries(geometry, transform) {
  const g = geometry.clone()
  g.applyMatrix4(matrix(transform))
  const ng = g.toNonIndexed()
  g.dispose()
  geometry.dispose()
  return ng
}

/** Collect attributes per material, then build one glTF primitive per material. */
class Builder {
  constructor() {
    this.targets = new Map()
  }

  add(geometry, transform, materialName) {
    const g = makeGeometries(geometry, transform)
    const pos = g.getAttribute('position')
    const nor = g.getAttribute('normal')
    const uv = g.getAttribute('uv')
    let target = this.targets.get(materialName)
    if (!target) {
      target = { positions: [], normals: [], uvs: [] }
      this.targets.set(materialName, target)
    }
    for (let i = 0; i < pos.count; i++) {
      target.positions.push(pos.getX(i), pos.getY(i), pos.getZ(i))
      target.normals.push(nor.getX(i), nor.getY(i), nor.getZ(i))
      if (uv) target.uvs.push(uv.getX(i), uv.getY(i))
      else target.uvs.push(0, 0)
    }
    g.dispose()
  }

  box(sx, sy, sz, transform, material) {
    this.add(new THREE.BoxGeometry(sx, sy, sz), transform, material)
  }

  cylinder(rt, rb, h, segments, transform, material) {
    this.add(new THREE.CylinderGeometry(rt, rb, h, segments), transform, material)
  }

  cone(r, h, segments, transform, material) {
    this.add(new THREE.ConeGeometry(r, h, segments), transform, material)
  }

  sphere(r, transform, material, width = 12, height = 8) {
    this.add(new THREE.SphereGeometry(r, width, height), transform, material)
  }

  plane(w, h, transform, material) {
    this.add(new THREE.PlaneGeometry(w, h), transform, material)
  }

  ring(rOuter, rInner, transform, material, segments = 24) {
    this.add(new THREE.RingGeometry(rInner, rOuter, segments), transform, material)
  }
}

const MATERIALS = {
  concrete: { color: [0.62, 0.60, 0.56, 1], rough: 0.88, metal: 0.04 },
  stone: { color: [0.58, 0.52, 0.45, 1], rough: 0.82, metal: 0.03 },
  render: { color: [0.88, 0.83, 0.76, 1], rough: 0.72, metal: 0.01 },
  wood: { color: [0.4, 0.27, 0.16, 1], rough: 0.68, metal: 0.02 },
  metal: { color: [0.55, 0.55, 0.57, 1], rough: 0.34, metal: 0.88 },
  darkMetal: { color: [0.22, 0.22, 0.23, 1], rough: 0.42, metal: 0.8 },
  glass: { color: [0.42, 0.55, 0.62, 0.28], rough: 0.12, metal: 0.88, alpha: 'BLEND' },
  asphalt: { color: [0.16, 0.16, 0.17, 1], rough: 0.95, metal: 0.01 },
  soil: { color: [0.32, 0.24, 0.17, 1], rough: 1, metal: 0 },
  foliage: { color: [0.12, 0.2, 0.09, 1], rough: 0.82, metal: 0 },
  foliageB: { color: [0.16, 0.25, 0.1, 1], rough: 0.82, metal: 0 },
  terracotta: { color: [0.66, 0.36, 0.22, 1], rough: 0.78, metal: 0.02 },
  paintMuted: { color: [0.35, 0.43, 0.38, 1], rough: 0.74, metal: 0.02 },
}

async function writeAsset(name, buildFn) {
  const doc = new Document()
  const buffer = doc.createBuffer()
  const b = new Builder()
  buildFn(b)

  const materials = new Map()
  for (const [name, def] of Object.entries(MATERIALS)) {
    const material = doc
      .createMaterial(name)
      .setBaseColorFactor(def.color)
      .setRoughnessFactor(def.rough)
      .setMetallicFactor(def.metal)
    if (def.alpha) material.setAlphaMode(def.alpha)
    materials.set(name, material)
  }

  const scene = doc.createScene(name)
  for (const [materialName, target] of b.targets) {
    const posAccessor = createAccessor(doc, buffer, new Float32Array(target.positions), 'VEC3')
    const normalAccessor = createAccessor(doc, buffer, new Float32Array(target.normals), 'VEC3')
    const uvAccessor = createAccessor(doc, buffer, new Float32Array(target.uvs), 'VEC2')
    const primitive = doc
      .createPrimitive()
      .setAttribute('POSITION', posAccessor)
      .setAttribute('NORMAL', normalAccessor)
      .setAttribute('TEXCOORD_0', uvAccessor)
      .setMaterial(materials.get(materialName))
    const mesh = doc.createMesh(`${materialName}-mesh`).addPrimitive(primitive)
    const node = doc.createNode(`${materialName}`).setMesh(mesh).setName(materialName)
    scene.addChild(node)
  }
  doc.getRoot().setDefaultScene(scene)

  await doc.transform(prune({ keepAttributes: true }))

  const io = new NodeIO()
  const file = path.join(OUT_DIR, `${name}.glb`)
  await io.write(file, doc)
  const size = fs.statSync(file).size
  console.log(`${name}: ${size.toLocaleString()} bytes`)
}

/** ------------------------------------------------------------- asset library */

async function generateHeroBuilding() {
  // A believable ~12 storey Indian mixed-use building. Ground + podium, tower,
  // balconies, window bands, roof terrace, core, plant room.
  await writeAsset('hero-building', (b) => {
    const z0 = 0
    const z1 = 18
    const width = 18
    const depth = 14
    const baseY = 0

    // Podium
    b.box(width * 0.72, 4.4, depth, { x: 0, y: baseY + 2.2, z: z0 + depth / 2 }, 'render')
    b.box(width * 0.78, 0.7, depth + 0.5, { x: 0, y: baseY + 4.6, z: z0 + depth / 2 }, 'stone')
    b.box(width * 0.5, 3.2, depth * 0.72, { x: 0, y: baseY + 1.7, z: z0 + depth / 2 }, 'glass')

    // Tower mass
    b.box(width, 31, depth, { x: 0, y: baseY + 20.2, z: z0 + depth / 2 }, 'concrete')

    // Facade verticals / columns
    for (let i = -3; i <= 3; i++) {
      const x = i * 2.55
      b.box(0.4, 31, 0.5, { x, y: baseY + 20.2, z: z0 + 0.16 }, 'stone')
    }

    // Floor slabs + window bands + mullions
    for (let f = 0; f < 10; f++) {
      const y = baseY + 5.8 + f * 3.02
      b.box(width + 1.0, 0.28, depth + 0.8, { x: 0, y, z: z0 + depth / 2 }, 'concrete')
      b.box(width * 0.82, 1.6, depth + 0.12, { x: 0, y: y + 1.48, z: z0 + depth / 2 }, 'glass')
      // window sills + head
      b.box(width * 0.84, 0.12, depth + 0.18, { x: 0, y: y + 0.68, z: z0 + depth / 2 }, 'stone')
      b.box(width * 0.84, 0.12, depth + 0.18, { x: 0, y: y + 2.26, z: z0 + depth / 2 }, 'stone')
      // vertical mullions
      for (let m = -3; m <= 3; m++) {
        b.box(0.1, 1.5, depth + 0.16, { x: m * 2.1, y: y + 1.48, z: z0 + depth / 2 }, 'metal')
      }
    }

    // Balconies on the south/road side — slab, railing, planter
    for (let f = 0; f < 9; f++) {
      const y = baseY + 6.9 + f * 3.02
      const side = 6.2
      b.box(5.4, 0.24, 1.9, { x: side, y, z: z0 + depth + 0.82 }, 'stone')
      b.box(5.4, 0.12, 0.12, { x: side, y: y + 0.58, z: z0 + depth + 1.7 }, 'metal')
      b.box(5.4, 0.12, 0.12, { x: side, y: y + 0.62, z: z0 + depth + 0.38 }, 'metal')
      for (let r = -2; r <= 2; r++) {
        b.box(0.08, 0.66, 0.08, { x: side + r * 1.2, y: y + 0.34, z: z0 + depth + 1.7 }, 'metal')
      }
      b.box(1.4, 0.4, 0.5, { x: side + 1.7, y: y + 0.32, z: z0 + depth + 1.2 }, 'foliage')
    }

    // Ground floor doors / glazing / entrance columns
    b.box(width * 0.52, 3.5, 0.9, { x: 0, y: baseY + 1.75, z: z0 + depth + 0.1 }, 'glass')
    b.box(1.7, 3.1, 0.2, { x: -1.9, y: baseY + 1.55, z: z0 + depth + 0.28 }, 'darkMetal')
    b.box(1.7, 3.1, 0.2, { x: 1.9, y: baseY + 1.55, z: z0 + depth + 0.28 }, 'darkMetal')
    b.box(0.42, 4.0, 0.42, { x: -3.8, y: baseY + 2, z: z0 + depth + 1.6 }, 'stone')
    b.box(0.42, 4.0, 0.42, { x: 3.8, y: baseY + 2, z: z0 + depth + 1.6 }, 'stone')

    // Facade service boxes / vents — imperfect real detail
    for (let f = 0; f < 10; f += 2) {
      const y = baseY + 6.4 + f * 3.02
      b.box(0.7, 0.7, 0.28, { x: -7.2, y, z: z0 + 0.08 }, 'metal')
      b.box(0.5, 0.5, 0.18, { x: 7.3, y: y + 1.6, z: z0 + 0.04 }, 'darkMetal')
    }

    // Roof terrace + parapet + plant room + solar + water tanks
    b.box(width + 1.4, 0.5, depth + 1.2, { x: 0, y: baseY + 36.1, z: z0 + depth / 2 }, 'stone')
    for (const x of [-width / 2 - 0.3, width / 2 + 0.3]) {
      for (const z of [z0 - 0.2, z0 + depth + 0.2]) {
        b.box(0.3, 1.2, 0.3, { x, y: baseY + 36.95, z }, 'concrete')
        b.box(0.3, 1.2, 0.3, { x, y: baseY + 36.95, z }, 'concrete')
      }
    }
    b.box(7, 3.4, 6, { x: -4.6, y: baseY + 38.2, z: z0 + 3.4 }, 'paintMuted')
    b.box(2.4, 2.8, 2.4, { x: 4.4, y: baseY + 37.9, z: z0 + 4.6 }, 'metal')
    b.box(3.4, 0.22, 2.2, { x: 5.6, y: baseY + 36.7, z: z0 + 2.4, rx: -0.18 }, 'darkMetal')
    b.cylinder(0.7, 0.7, 1.6, 12, { x: -6.8, y: baseY + 36.75, z: z0 + 2.2 }, 'metal')

    // Entrance canopy + steps
    b.box(width * 0.46, 0.5, 3.8, { x: 0, y: baseY + 4.2, z: z0 + depth + 1.8 }, 'stone')
    b.box(width * 0.46, 0.2, 0.8, { x: 0, y: 0.1, z: z0 + depth + 0.4 }, 'stone')
    b.box(width * 0.46, 0.18, 0.8, { x: 0, y: 0.32, z: z0 + depth + 0.5 }, 'stone')
    b.box(width * 0.46, 0.18, 0.8, { x: 0, y: 0.54, z: z0 + depth + 0.6 }, 'stone')
  })
}

async function generateEntranceGate() {
  // Indian compound entrance gate with two sliding leaves, stone piers, sign.
  await writeAsset('entrance-gate', (b) => {
    const span = 8.4
    const postZ = 0
    b.box(1.1, 3.9, 1.1, { x: -span, y: 1.95, z: postZ }, 'stone')
    b.box(1.1, 3.9, 1.1, { x: span, y: 1.95, z: postZ }, 'stone')
    b.box(1.3, 0.5, 1.3, { x: -span, y: 4.12, z: postZ }, 'stone')
    b.box(1.3, 0.5, 1.3, { x: span, y: 4.12, z: postZ }, 'stone')
    b.box(span * 2 + 1.2, 0.82, 0.82, { x: 0, y: 4.85, z: postZ }, 'metal')
    b.box(span * 2 + 0.2, 0.7, 0.7, { x: 0, y: 4.82, z: postZ }, 'darkMetal')

    // leaves
    for (const dir of [-1, 1]) {
      const cx = dir * span * 0.48
      b.box(span * 0.9, 2.9, 0.16, { x: cx, y: 1.55, z: 0 }, 'darkMetal')
      for (let i = 0; i < 5; i++) {
        b.box(0.1, 2.4, 0.18, { x: cx - span * 0.36 + i * span * 0.18, y: 1.55, z: 0.08 }, 'metal')
      }
      b.box(0.1, 0.1, 0.18, { x: cx, y: 3.0, z: 0.08 }, 'metal')
    }

    // name plate
    b.box(6.4, 0.28, 0.12, { x: 0, y: 6.12, z: 0 }, 'render')
  })
}

async function generateTreeA() {
  // Neem / rain tree style: trunk, main branches, layered irregular canopy.
  await writeAsset('tree-a', (b) => {
    b.cylinder(0.16, 0.3, 4.2, 8, { x: 0, y: 2.1, z: 0, ry: 0.12 }, 'wood')
    for (const [x, y, z, rot] of [
      [0.8, 3.5, 0.2, -0.8],
      [-0.7, 3.8, 0.1, 0.85],
      [0.1, 4.1, -0.5, 0.2],
    ]) {
      b.cylinder(0.08, 0.14, 1.7, 6, { x, y, z, rz: rot }, 'wood')
    }
    const blobs = [
      [0, 5.0, 0, 1.5, 'foliage'],
      [1.0, 5.7, 0.4, 1.15, 'foliageB'],
      [-1.0, 5.5, 0.1, 1.05, 'foliage'],
      [0.2, 6.6, -0.4, 1.2, 'foliage'],
      [0.8, 6.8, 0.3, 0.95, 'foliageB'],
      [-0.6, 6.9, 0.4, 0.8, 'foliage'],
      [1.7, 6.3, -0.3, 0.78, 'foliageB'],
    ]
    for (const [x, y, z, r, mat] of blobs) {
      b.sphere(r, { x, y, z, sx: 1.35, sy: 0.95, sz: 1.3, ry: x * 0.3 }, mat)
    }
  })
}

async function generateTreeB() {
  // Palm / shisham style: twisted trunk, branch spurs, wider loose canopy.
  await writeAsset('tree-b', (b) => {
    b.cylinder(0.12, 0.32, 5.0, 8, { x: 0, y: 2.5, z: 0, ry: 0.2, rz: 0.06 }, 'wood')
    b.cylinder(0.07, 0.12, 1.5, 6, { x: 1.1, y: 3.4, z: 0.2, rz: -0.7 }, 'wood')
    b.cylinder(0.07, 0.12, 1.4, 6, { x: -1.0, y: 3.8, z: -0.1, rz: 0.7 }, 'wood')
    b.sphere(1.75, { x: 0, y: 5.5, z: 0, sx: 1.3, sy: 1.0, sz: 1.4 }, 'foliageB')
    b.sphere(1.25, { x: 1.4, y: 6.2, z: 0.2 }, 'foliage')
    b.sphere(1.05, { x: -1.2, y: 5.9, z: -0.2 }, 'foliage')
    b.sphere(0.85, { x: 0.7, y: 7.0, z: -0.3 }, 'foliageB')
    b.sphere(0.72, { x: -0.6, y: 7.1, z: 0.3 }, 'foliage')
  })
}

async function generateBush() {
  // Compound shrub — irregular clusters, sits on the ground.
  await writeAsset('bush', (b) => {
    const clumps = [
      [0, 0.5, 0, 0.62, 'foliage'],
      [0.44, 0.35, 0.18, 0.45, 'foliageB'],
      [-0.38, 0.38, -0.12, 0.42, 'foliage'],
      [0.12, 0.72, -0.2, 0.4, 'foliageB'],
    ]
    for (const [x, y, z, r, mat] of clumps) {
      b.sphere(r, { x, y, z, sx: 1.25, sy: 0.9, sz: 1.2 }, mat)
    }
  })
}

async function generateCarA() {
  // Indian sedan with believable massing: body shell, cabin greenhouse,
  // bumpers, wheels with tyres + rims, mirrors, lights, panel gaps.
  await writeAsset('car-a', (b) => {
    const paint = { r: 0.16, g: 0.22, b: 0.25 }

    // lower body + wheel arches + bonnet
    b.box(4.35, 0.5, 1.76, { x: 0, y: 0.58, z: 0 }, 'paintMuted')
    b.box(4.35, 0.36, 1.68, { x: 0, y: 0.92, z: 0 }, 'paintMuted')
    b.box(1.0, 0.16, 1.6, { x: 1.42, y: 1.02, z: 0 }, 'paintMuted')
    // cabin greenhouse + pillars
    b.box(2.2, 0.62, 1.58, { x: -0.2, y: 1.38, z: 0 }, 'paintMuted')
    b.box(2.06, 0.52, 1.6, { x: -0.2, y: 1.4, z: 0 }, 'glass')
    for (const [x, z] of [
      [-1.22, -0.7],
      [-1.22, 0.7],
      [0.78, -0.7],
      [0.78, 0.7],
    ]) {
      b.box(0.08, 0.58, 0.08, { x, y: 1.36, z }, 'darkMetal')
    }
    // roof
    b.box(2.2, 0.16, 1.6, { x: -0.2, y: 1.72, z: 0 }, 'paintMuted')

    // bumpers + rocker skirt
    b.box(0.24, 0.26, 1.76, { x: 2.12, y: 0.56, z: 0 }, 'darkMetal')
    b.box(0.24, 0.26, 1.76, { x: -2.12, y: 0.56, z: 0 }, 'darkMetal')
    b.box(4.0, 0.14, 1.7, { x: 0, y: 0.38, z: 0 }, 'darkMetal')

    // wheels: tyre + rim + hub
    for (const x of [-1.3, 1.3]) {
      for (const z of [-0.82, 0.82]) {
        b.cylinder(0.34, 0.34, 0.18, 14, { x, y: 0.34, z, rz: Math.PI / 2 }, 'darkMetal')
        b.cylinder(0.18, 0.18, 0.2, 12, { x, y: 0.34, z, rz: Math.PI / 2 }, 'metal')
        b.cylinder(0.06, 0.06, 0.22, 8, { x, y: 0.34, z, rz: Math.PI / 2 }, 'metal')
      }
    }

    // mirrors
    b.box(0.12, 0.14, 0.24, { x: 0.85, y: 1.26, z: -0.9 }, 'paintMuted')
    b.box(0.12, 0.14, 0.24, { x: 0.85, y: 1.26, z: 0.9 }, 'paintMuted')
    // headlights + taillights
    b.box(0.08, 0.12, 0.42, { x: 2.16, y: 0.84, z: -0.48 }, 'glass')
    b.box(0.08, 0.12, 0.42, { x: 2.16, y: 0.84, z: 0.48 }, 'glass')
    b.box(0.06, 0.12, 0.36, { x: -2.18, y: 0.84, z: -0.48 }, 'terracotta')
    b.box(0.06, 0.12, 0.36, { x: -2.18, y: 0.84, z: 0.48 }, 'terracotta')
    void paint
  })
}

async function generateCrane() {
  // Tower crane with lattice mast, jib, counter-jib, cables, hooks.
  await writeAsset('crane', (b) => {
    const mastH = 30
    b.box(1.2, mastH, 1.2, { x: 0, y: mastH / 2, z: 0 }, 'metal')
    // lattice mast cross bracing
    for (let y = 2; y < mastH; y += 3.2) {
      b.box(0.08, 3.2, 0.08, { x: 0.62, y, z: 0.62, rz: 0.45 }, 'darkMetal')
      b.box(0.08, 3.2, 0.08, { x: -0.62, y, z: -0.62, rz: -0.45 }, 'darkMetal')
      b.box(0.08, 3.2, 0.08, { x: 0.62, y, z: -0.62, rz: -0.45 }, 'darkMetal')
      b.box(0.08, 3.2, 0.08, { x: -0.62, y, z: 0.62, rz: 0.45 }, 'darkMetal')
      b.box(1.3, 0.08, 0.08, { x: 0, y, z: 0.62 }, 'darkMetal')
      b.box(1.3, 0.08, 0.08, { x: 0, y, z: -0.62 }, 'darkMetal')
      b.box(0.08, 0.08, 1.3, { x: 0.62, y, z: 0 }, 'darkMetal')
      b.box(0.08, 0.08, 1.3, { x: -0.62, y, z: 0 }, 'darkMetal')
    }
    // base + slewing unit + cab
    b.box(2.2, 0.5, 2.2, { x: 0, y: 0.25, z: 0 }, 'concrete')
    b.box(1.8, 1.4, 1.4, { x: 0, y: mastH + 0.7, z: 0 }, 'darkMetal')
    b.box(1.7, 1.8, 1.3, { x: 0, y: mastH + 1.6, z: 0.3 }, 'metal')
    b.box(1.58, 1.2, 1.14, { x: 0, y: mastH + 1.62, z: 0.34 }, 'glass')
    // jib + counter-jib
    b.box(19, 0.6, 0.85, { x: 6.5, y: mastH + 1.7, z: 0 }, 'metal')
    b.box(6.6, 0.7, 0.85, { x: -5.7, y: mastH + 1.7, z: 0 }, 'metal')
    // jib lattice
    for (let x = -3; x <= 15; x += 3) {
      b.box(0.09, 0.9, 0.09, { x, y: mastH + 3.2, z: -0.35, rx: 0.55 }, 'darkMetal')
      b.box(0.09, 0.9, 0.09, { x, y: mastH + 3.2, z: 0.35, rx: -0.55 }, 'darkMetal')
      b.box(3, 0.09, 0.09, { x: x + 1.5, y: mastH + 3.5, z: -0.35 }, 'darkMetal')
      b.box(3, 0.09, 0.09, { x: x + 1.5, y: mastH + 3.5, z: 0.35 }, 'darkMetal')
    }
    // counterweight blocks
    b.box(2.2, 1.3, 1.1, { x: -7.4, y: mastH + 1.0, z: 0 }, 'concrete')
    b.box(2.2, 1.3, 1.1, { x: -8.0, y: mastH + 0.55, z: 0 }, 'concrete')
    // hoist cables + hook block
    b.cylinder(0.045, 0.045, 14, 6, { x: 16.2, y: mastH - 4.8, z: 0 }, 'darkMetal')
    b.box(0.8, 0.9, 0.5, { x: 16.2, y: mastH - 12.7, z: 0 }, 'metal')
    b.box(0.6, 0.4, 0.35, { x: 16.2, y: mastH - 13.5, z: 0 }, 'darkMetal')
  })
}

async function generateBoundaryWall() {
  // Compound wall segment with pilasters, coping and a recessed gate face.
  await writeAsset('boundary-wall', (b) => {
    b.box(12, 2.0, 0.36, { x: 0, y: 1.0, z: 0 }, 'render')
    b.box(12.2, 0.28, 0.52, { x: 0, y: 2.05, z: 0 }, 'stone')
    // sloped double coping adds believable capstone geometry
    b.box(12.3, 0.12, 0.32, { x: 0, y: 2.22, z: -0.1, rx: -0.18 }, 'stone')
    b.box(12.3, 0.12, 0.32, { x: 0, y: 2.22, z: 0.1, rx: 0.18 }, 'stone')
    for (let i = -5; i <= 5; i++) {
      if (i === 0) continue
      b.box(0.5, 2.55, 0.6, { x: i, y: 1.27, z: 0 }, 'stone')
      b.box(0.5, 0.1, 0.72, { x: i, y: 2.6, z: 0, rz: i * 0.03 }, 'stone')
    }
    b.box(0.38, 0.5, 0.74, { x: 0, y: 2.25, z: 0 }, 'stone')
    b.box(0.3, 1.0, 0.2, { x: 6.0, y: 1.1, z: 0.18 }, 'render')
    b.box(0.3, 0.5, 0.16, { x: 6.0, y: 0.72, z: 0.2, rx: 0.06 }, 'stone')
  })
}

async function generateStreetLight() {
  // Indian concrete/metal street light: base, pole, curved-ish arm, head.
  await writeAsset('street-light', (b) => {
    b.box(0.42, 0.22, 0.42, { x: 0, y: 0.11, z: 0 }, 'concrete')
    b.cylinder(0.1, 0.16, 6.8, 10, { x: 0, y: 3.5, z: 0 }, 'darkMetal')
    b.cylinder(0.09, 0.09, 2.7, 8, { x: 1.1, y: 6.9, z: 0, rz: Math.PI / 2.8 }, 'darkMetal')
    // angled stay braces give the head a believable mechanical connection
    b.box(0.07, 0.8, 0.07, { x: 0.7, y: 6.5, z: 0, rz: 0.6 }, 'darkMetal')
    b.box(0.07, 0.8, 0.07, { x: 1.4, y: 6.9, z: 0, rz: -0.6 }, 'darkMetal')
    b.box(0.42, 0.16, 0.34, { x: 2.15, y: 6.9, z: 0 }, 'metal')
    b.box(0.5, 0.28, 0.4, { x: 2.32, y: 6.82, z: 0 }, 'glass')
    b.box(0.54, 0.06, 0.44, { x: 2.32, y: 6.98, z: 0 }, 'darkMetal')
    b.box(0.58, 0.08, 0.5, { x: 2.32, y: 6.9, z: 0, rz: 0.08 }, 'metal')
  })
}

async function generateConstructionShed() {
  // Steel-frame site shed with corrugated roof sheeting, door, window, vents.
  await writeAsset('construction-shed', (b) => {
    b.box(6, 3.6, 4.6, { x: 0, y: 1.8, z: 0 }, 'metal')
    b.box(6.4, 0.18, 5.0, { x: 0, y: 3.68, z: 0 }, 'darkMetal')
    for (const x of [-2.8, 0, 2.8]) {
      for (const z of [-2.1, 2.1]) {
        b.box(0.18, 3.6, 0.18, { x, y: 1.8, z }, 'metal')
      }
    }
    // corrugated roof ridges
    for (let x = -2.7; x <= 2.7; x += 0.45) {
      b.box(0.18, 0.12, 4.9, { x, y: 3.72, z: 0, rx: x * 0.06 }, 'darkMetal')
    }
    // roof purlins
    for (let x = -2.2; x <= 2.2; x += 0.9) {
      b.box(0.1, 0.14, 4.9, { x, y: 3.58, z: 0 }, 'darkMetal')
    }
    // door + frame on the wall face
    b.box(1.4, 2.4, 0.08, { x: -1.3, y: 1.35, z: 2.34 }, 'darkMetal')
    b.box(1.5, 0.08, 0.1, { x: -1.3, y: 2.58, z: 2.34 }, 'metal')
    // window + grille
    b.box(1.6, 1.1, 0.06, { x: 1.2, y: 1.9, z: 2.34 }, 'glass')
    b.box(0.1, 1.2, 0.08, { x: 1.2, y: 1.9, z: 2.37 }, 'metal')
    b.box(1.7, 0.1, 0.08, { x: 1.2, y: 1.9, z: 2.37 }, 'metal')
    // vents near roof
    b.box(0.5, 0.6, 0.12, { x: 0.2, y: 3.0, z: 2.36 }, 'metal')
    b.box(0.5, 0.5, 0.1, { x: 0.2, y: 3.1, z: 2.4, rz: 0.12 }, 'darkMetal')
    // steps + sign board
    b.box(1.6, 0.16, 0.7, { x: -1.3, y: 0.1, z: 2.6 }, 'concrete')
    b.box(1.2, 0.5, 0.08, { x: 0.2, y: 0.28, z: 2.44 }, 'render')
  })
}

async function generateResidentialBuilding() {
  // Compact Indian modern residential block used by the Residential service.
  await writeAsset('residential-building', (b) => {
    const w = 18
    const d = 12
    b.box(w, 0.6, d, { x: 0, y: 0.3, z: 0 }, 'concrete')
    // two volumes
    b.box(w, 10, d, { x: 0, y: 5.3, z: 0 }, 'render')
    b.box(w * 0.82, 1.3, d + 1, { x: 0, y: 6.9, z: 0 }, 'concrete')
    b.box(w * 0.86, 10, d * 0.9, { x: 0, y: 10.6, z: 0 }, 'render')
    b.box(w * 0.9, 1.4, d * 0.94, { x: 0, y: 12.4, z: 0 }, 'stone')
    // openings: metallic windows / glass
    for (let f = 0; f < 3; f++) {
      const y = 2.6 + f * 3.3
      b.box(w * 0.58, 1.4, d + 0.2, { x: -1.2, y, z: 0 }, 'glass')
      b.box(w * 0.6, 0.14, d + 0.26, { x: -1.2, y: y - 0.75, z: 0 }, 'stone')
      b.box(w * 0.6, 0.14, d + 0.26, { x: -1.2, y: y + 0.75, z: 0 }, 'stone')
      for (let m = -2; m <= 2; m++) {
        b.box(0.08, 1.45, d + 0.28, { x: -1.2 + m * 1.7, y, z: 0 }, 'metal')
      }
    }
    // balconies
    for (let f = 0; f < 2; f++) {
      const y = 5.4 + f * 3.3
      b.box(5.4, 0.22, 2, { x: 5.4, y, z: d / 2 + 0.9 }, 'stone')
      b.box(5.4, 0.1, 0.1, { x: 5.4, y: y + 0.6, z: d / 2 + 1.8 }, 'metal')
      for (let r = -2; r <= 2; r++) {
        b.box(0.07, 0.62, 0.07, { x: 5.4 + r * 1.2, y: y + 0.3, z: d / 2 + 1.8 }, 'metal')
      }
    }
    // parapet + roof equipment
    b.box(w + 0.6, 0.6, d + 0.6, { x: 0, y: 16.0, z: 0 }, 'stone')
    b.box(3, 2, 2.4, { x: -4, y: 17.3, z: -1 }, 'paintMuted')
    b.cylinder(0.55, 0.55, 1.3, 12, { x: 4.4, y: 16.7, z: 1 }, 'metal')
    // external stair / service shaft
    b.box(2, 16, 3, { x: -8.4, y: 8, z: 3.2 }, 'concrete')
  })
}

async function generateBridge() {
  // Arch bridge for the Infrastructure service: deck, piers, arch, hangers.
  await writeAsset('bridge', (b) => {
    const span = 44
    const yDeck = 14
    b.box(span, 1.2, 12, { x: 0, y: yDeck, z: 0 }, 'concrete')
    b.box(span, 1.4, 0.6, { x: 0, y: yDeck + 1, z: -5.5 }, 'concrete')
    b.box(span, 1.4, 0.6, { x: 0, y: yDeck + 1, z: 5.5 }, 'concrete')
    // piers + abutments
    b.box(3.4, yDeck, 7, { x: -15, y: yDeck / 2, z: 0 }, 'concrete')
    b.box(3.4, yDeck, 7, { x: 15, y: yDeck / 2, z: 0 }, 'concrete')
    b.box(5, yDeck, 10, { x: -21, y: yDeck / 2, z: 0 }, 'stone')
    b.box(5, yDeck, 10, { x: 21, y: yDeck / 2, z: 0 }, 'stone')
    // arch segments
    const segments = 20
    for (let i = 0; i < segments; i++) {
      const t0 = i / segments
      const t1 = (i + 1) / segments
      const ax = -19 + t0 * 38
      const bx = -19 + t1 * 38
      const ay = 1 + Math.sin(t0 * Math.PI) * 8.4
      const by = 1 + Math.sin(t1 * Math.PI) * 8.4
      const cx = (ax + bx) / 2
      const cy = (ay + by) / 2
      const len = Math.hypot(bx - ax, by - ay) * 1.08
      b.box(len, 0.9, 1.2, { x: cx, y: cy, z: 0, rz: Math.atan2(by - ay, bx - ax) }, 'concrete')
    }
    // vertical hangers
    for (let x = -15; x <= 15; x += 3) {
      const archY = 1 + Math.sin(((x + 19) / 38) * Math.PI) * 8.4
      const h = yDeck - archY - 0.4
      if (h > 0.8) b.box(0.16, h, 0.16, { x, y: archY + h / 2 + 0.2, z: 0 }, 'metal')
    }
    // railings top
    b.box(span, 0.1, 0.08, { x: 0, y: yDeck + 1.9, z: -5.5 }, 'metal')
    b.box(span, 0.1, 0.08, { x: 0, y: yDeck + 1.9, z: 5.5 }, 'metal')
  })
}

async function generateSolarPanel() {
  // One solar tracker unit: post, frame, panels, inverter enclosure.
  await writeAsset('solar-panel', (b) => {
    b.box(0.18, 1.4, 0.18, { x: 0, y: 0.7, z: 0 }, 'metal')
    b.box(3.8, 0.16, 2.3, { x: 0, y: 1.45, z: 0 }, 'darkMetal')
    // multiple angled modules with varied pitch
    for (let i = -2; i <= 2; i++) {
      b.box(0.6, 0.05, 1.9, { x: i * 0.68, y: 1.58, z: 0, rx: -0.42 - i * 0.015 }, 'darkMetal')
      b.box(0.08, 0.5, 1.9, { x: i * 0.68, y: 1.56, z: 0, rx: -0.42 - i * 0.015 }, 'metal')
    }
    // angled support brackets
    b.box(0.06, 0.9, 0.06, { x: -1.2, y: 1.05, z: -0.6, rz: 0.45 }, 'metal')
    b.box(0.06, 0.9, 0.06, { x: 1.2, y: 1.05, z: 0.6, rz: -0.45 }, 'metal')
    b.box(1.1, 0.8, 0.8, { x: 2.4, y: 0.4, z: 0.6 }, 'metal')
    b.box(1.15, 0.4, 0.85, { x: 2.4, y: 0.95, z: 0.6 }, 'darkMetal')
  })
}

async function generateWarehouse() {
  // Materials warehouse for the Building Materials service.
  await writeAsset('warehouse', (b) => {
    const w = 34
    const d = 24
    b.box(w, 0.6, d, { x: 0, y: 0.3, z: 0 }, 'concrete')
    b.box(w, 12, d, { x: 0, y: 6.6, z: 0 }, 'render')
    // roof slab + sloped coping + clerestory
    b.box(w + 1.4, 0.9, d + 1.4, { x: 0, y: 13.6, z: 0 }, 'stone')
    b.box(w + 1.5, 0.12, 0.4, { x: 0, y: 14.15, z: -d / 2 - 0.1, rx: -0.16 }, 'stone')
    b.box(w + 1.5, 0.12, 0.4, { x: 0, y: 14.15, z: d / 2 + 0.1, rx: 0.16 }, 'stone')
    b.box(w * 0.9, 1.6, d * 0.96, { x: 0, y: 12.4, z: 0 }, 'glass')
    // columns along facade
    for (const x of [-14, -7, 0, 7, 14]) {
      b.box(0.5, 12, 0.5, { x, y: 6.6, z: d / 2 + 0.1 }, 'concrete')
    }
    // openings
    b.box(6, 4.6, 0.2, { x: 0, y: 2.6, z: d / 2 + 0.05 }, 'darkMetal')
    b.box(6.4, 0.2, 0.2, { x: 0, y: 4.9, z: d / 2 + 0.1 }, 'metal')
    // side windows with a subtle reflective angle
    for (const x of [-10, -4, 4, 10]) {
      b.box(4.4, 2.2, 0.12, { x, y: 8.8, z: d / 2 + 0.08 }, 'glass')
      b.box(4.4, 0.08, 0.16, { x, y: 7.7, z: d / 2 + 0.12, rz: 0.02 }, 'metal')
    }
    // roof vents
    for (const x of [-8, 0, 8]) {
      b.box(2, 1.2, 2, { x, y: 14.4, z: -4 }, 'metal')
      b.box(2.1, 0.1, 2.1, { x, y: 15.05, z: -4, rz: x * 0.004 }, 'darkMetal')
    }
  })
}

async function generateScaffolding() {
  // Construction scaffolding module: standards, ledgers, platforms, ties.
  await writeAsset('scaffolding', (b) => {
    const height = 12
    const bay = 3
    for (const x of [-0.5, 0.5]) {
      for (let y = 1; y <= height; y += 2) {
        b.box(bay, 0.08, 0.08, { x: 0, y, z: x }, 'metal')
        b.box(0.08, 0.08, 1.6, { x: -bay / 2 + 0.0, y, z: 0 }, 'metal')
        b.box(0.08, 0.08, 1.6, { x: bay / 2, y, z: 0 }, 'metal')
      }
    }
    for (const x of [-bay / 2, 0, bay / 2]) {
      for (const z of [-0.5, 0.5]) {
        b.box(0.08, height, 0.08, { x, y: height / 2, z }, 'metal')
      }
    }
    // diagonal braces
    for (const x of [-bay / 2, 0, bay / 2]) {
      b.box(0.08, 4.5, 0.08, { x, y: 2.2, z: -0.5, rx: 0.8 }, 'darkMetal')
      b.box(0.08, 4.5, 0.08, { x, y: 7.5, z: 0.5, rx: -0.8 }, 'darkMetal')
    }
    // boards
    b.box(bay, 0.12, 1.4, { x: 0, y: 2.0, z: 0 }, 'wood')
    b.box(bay, 0.12, 1.4, { x: 0, y: 4.0, z: 0 }, 'wood')
    b.box(bay, 0.12, 1.4, { x: 0, y: 6.0, z: 0 }, 'wood')
    b.box(bay, 0.12, 1.4, { x: 0, y: 8.0, z: 0 }, 'wood')
    b.box(bay, 0.12, 1.4, { x: 0, y: 10.0, z: 0 }, 'wood')
    // ladder
    b.box(0.6, 12, 0.08, { x: bay / 2, y: 6, z: 0.7 }, 'darkMetal')
    for (let y = 0.8; y < 12; y += 1.2) {
      b.box(0.6, 0.06, 0.1, { x: bay / 2, y, z: 0.7 }, 'darkMetal')
    }
  })
}

async function main() {
  console.log('→ generating GLB assets (procedural, PBR-ready)')
  await Promise.all([
    generateHeroBuilding(),
    generateEntranceGate(),
    generateTreeA(),
    generateTreeB(),
    generateBush(),
    generateCarA(),
    generateCrane(),
    generateBoundaryWall(),
    generateStreetLight(),
    generateConstructionShed(),
    generateResidentialBuilding(),
    generateBridge(),
    generateSolarPanel(),
    generateWarehouse(),
    generateScaffolding(),
  ])
  console.log('→ done. Raw assets in public/assets/glb/raw')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
