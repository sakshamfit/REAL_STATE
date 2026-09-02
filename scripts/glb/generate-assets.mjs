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

    // Floor slabs
    for (let f = 0; f < 10; f++) {
      const y = baseY + 5.8 + f * 3.02
      b.box(width + 1.0, 0.28, depth + 0.8, { x: 0, y, z: z0 + depth / 2 }, 'concrete')
      // window band
      b.box(width * 0.78, 1.35, depth + 0.12, { x: 0, y: y + 1.36, z: z0 + depth / 2 }, 'glass')
    }

    // Balconies on the south/road side
    for (let f = 0; f < 9; f++) {
      const y = baseY + 6.9 + f * 3.02
      const side = 6.2
      b.box(5.4, 0.24, 1.7, { x: side, y, z: z0 + depth + 0.72 }, 'stone')
      b.box(5.4, 1.0, 0.14, { x: side, y: y + 0.65, z: z0 + depth + 1.48 }, 'metal')
    }

    // Roof terrace + parapet + plant room
    b.box(width + 1.4, 0.5, depth + 1.2, { x: 0, y: baseY + 36.1, z: z0 + depth / 2 }, 'stone')
    for (const x of [-width / 2 - 0.3, width / 2 + 0.3]) {
      for (const z of [z0 - 0.2, z0 + depth + 0.2]) {
        b.box(0.3, 1.1, 0.3, { x, y: baseY + 36.85, z }, 'concrete')
      }
    }
    b.box(7, 3.4, 6, { x: -4.6, y: baseY + 38.2, z: z0 + 3.4 }, 'paintMuted')
    b.box(2.4, 2.8, 2.4, { x: 4.4, y: baseY + 37.9, z: z0 + 4.6 }, 'metal')

    // Entrance canopy + steps
    b.box(width * 0.46, 0.5, 3.6, { x: 0, y: baseY + 4.2, z: z0 + depth + 1.7 }, 'stone')
    b.box(width * 0.46, 0.2, 0.8, { x: 0, y: 0.1, z: z0 + depth + 0.4 }, 'stone')
    b.box(width * 0.46, 0.18, 0.8, { x: 0, y: 0.32, z: z0 + depth + 0.5 }, 'stone')
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
  // Neem / rain tree style: trunk + layered irregular canopy.
  await writeAsset('tree-a', (b) => {
    b.cylinder(0.16, 0.3, 4.2, 8, { x: 0, y: 2.1, z: 0, ry: 0.12 }, 'wood')
    const blobs = [
      [0, 5.0, 0, 1.5, 'foliage'],
      [1.0, 5.7, 0.4, 1.15, 'foliageB'],
      [-1.0, 5.5, 0.1, 1.05, 'foliage'],
      [0.2, 6.6, -0.4, 1.2, 'foliage'],
      [0.8, 6.8, 0.3, 0.95, 'foliageB'],
    ]
    for (const [x, y, z, r, mat] of blobs) {
      b.sphere(r, { x, y, z, sx: 1.35, sy: 0.95, sz: 1.3, ry: x * 0.3 }, mat)
    }
  })
}

async function generateTreeB() {
  // Palm / shisham style: slightly different canopy profile for variety.
  await writeAsset('tree-b', (b) => {
    b.cylinder(0.12, 0.32, 5.0, 8, { x: 0, y: 2.5, z: 0, ry: 0.2 }, 'wood')
    b.sphere(1.75, { x: 0, y: 5.5, z: 0, sx: 1.3, sy: 1.0, sz: 1.4 }, 'foliageB')
    b.sphere(1.25, { x: 1.4, y: 6.2, z: 0.2 }, 'foliage')
    b.sphere(1.05, { x: -1.2, y: 5.9, z: -0.2 }, 'foliage')
  })
}

async function generateCarA() {
  // Simplified Indian sedan: body, cabin, wheels, glass, lights.
  await writeAsset('car-a', (b) => {
    const paint = { r: 0.16, g: 0.22, b: 0.25 }
    b.box(4.2, 0.62, 1.78, { x: 0, y: 0.62, z: 0 }, 'paintMuted')
    b.box(2.3, 0.72, 1.58, { x: -0.14, y: 1.28, z: 0 }, 'paintMuted')
    b.box(2.16, 0.52, 1.6, { x: -0.14, y: 1.32, z: 0 }, 'glass')
    b.box(4.18, 0.16, 1.74, { x: 0, y: 0.36, z: 0 }, 'darkMetal')
    for (const x of [-1.28, 1.28]) {
      for (const z of [-0.82, 0.82]) {
        b.cylinder(0.34, 0.34, 0.18, 12, { x, y: 0.36, z, rz: Math.PI / 2 }, 'darkMetal')
      }
    }
    b.box(0.22, 0.18, 0.8, { x: 2.06, y: 0.74, z: 0 }, 'glass')
    b.box(0.12, 0.2, 0.35, { x: -2.12, y: 0.75, z: -0.52 }, 'terracotta')
    void paint
  })
}

async function generateCrane() {
  // Tower crane with mast, jib, counter-jib, cab, hook.
  await writeAsset('crane', (b) => {
    const mastH = 30
    b.box(1.4, mastH, 1.4, { x: 0, y: mastH / 2, z: 0 }, 'metal')
    b.box(1.8, 1.0, 0.6, { x: 0, y: mastH + 0.5, z: 0 }, 'darkMetal')
    b.box(20, 0.55, 0.8, { x: 6.4, y: mastH + 1.4, z: 0 }, 'metal')
    b.box(6.4, 0.7, 0.8, { x: -5.6, y: mastH + 1.2, z: 0 }, 'metal')
    b.box(2.0, 1.2, 1.0, { x: -7.5, y: mastH + 1.0, z: 0 }, 'concrete')
    b.box(1.4, 1.4, 1.4, { x: 1.0, y: mastH + 2.2, z: 0 }, 'darkMetal')
    b.cylinder(0.08, 0.08, 13, 6, { x: 15.6, y: mastH - 5.5, z: 0 }, 'metal')
    b.box(1.0, 0.3, 0.6, { x: 15.6, y: mastH - 12, z: 0 }, 'metal')
  })
}

async function generateBoundaryWall() {
  // Compound wall segment with pilasters and coping.
  await writeAsset('boundary-wall', (b) => {
    b.box(12, 2.0, 0.36, { x: 0, y: 1.0, z: 0 }, 'render')
    b.box(12.2, 0.28, 0.52, { x: 0, y: 2.05, z: 0 }, 'stone')
    for (let i = -5; i <= 5; i++) {
      b.box(0.5, 2.55, 0.6, { x: i, y: 1.27, z: 0 }, 'stone')
    }
  })
}

async function generateStreetLight() {
  // Indian street light: pole, arm, head.
  await writeAsset('street-light', (b) => {
    b.cylinder(0.11, 0.14, 7.4, 8, { x: 0, y: 3.7, z: 0 }, 'darkMetal')
    b.box(2.6, 0.1, 0.12, { x: 1.1, y: 7.05, z: 0 }, 'darkMetal')
    b.box(0.7, 0.24, 0.28, { x: 2.1, y: 6.92, z: 0 }, 'metal')
  })
}

async function generateConstructionShed() {
  // Steel-frame site shed with blue-tarp roof — Indian site reality.
  await writeAsset('construction-shed', (b) => {
    b.box(6, 3.6, 4.6, { x: 0, y: 1.8, z: 0 }, 'metal')
    b.box(6.4, 0.18, 5.0, { x: 0, y: 3.68, z: 0 }, 'darkMetal')
    for (const x of [-2.8, 0, 2.8]) {
      for (const z of [-2.1, 2.1]) {
        b.box(0.18, 3.6, 0.18, { x, y: 1.8, z }, 'metal')
      }
    }
    b.box(4.8, 0.16, 1.4, { x: 0, y: 3.35, z: 1.2 }, 'metal')
  })
}

async function main() {
  console.log('→ generating GLB assets (procedural, PBR-ready)')
  await Promise.all([
    generateHeroBuilding(),
    generateEntranceGate(),
    generateTreeA(),
    generateTreeB(),
    generateCarA(),
    generateCrane(),
    generateBoundaryWall(),
    generateStreetLight(),
    generateConstructionShed(),
  ])
  console.log('→ done. Raw assets in public/assets/glb/raw')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
