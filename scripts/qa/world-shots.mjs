/**
 * Offline world renderer — the live-site QA camera.
 *
 *   node --experimental-strip-types --import ./scripts/qa/ts-hook.mjs \
 *        scripts/qa/world-shots.mjs [beat-filter] [beat-filter...]
 *
 * It imports the *same* TypeScript modules the site runs (terrain, road
 * geometry, layout, chapter camera path) and rasterises the real composition
 * with `scripts/qa/raster.mjs`, then writes PNGs to `.qa/world/`.
 *
 * This is the only honest way to check the scene in a sandbox with no GPU and
 * no browser: what you see in these frames is the real geometry, the real
 * placement, the real sun angle and the real camera path.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as THREE from 'three'
import { loadGLB, Renderer } from './raster.mjs'

import { buildTerrain, terrainHeight } from '../../src/lib/terrain.ts'
import { buildRoadParts } from '../../src/lib/road-geometry.ts'
import {
  GRASS_LAYERS,
  boundaryWalls,
  grassPoints,
  parkedVehicles,
  shrubs,
  streetLights,
  trees,
  yardBarriers,
  yardProps,
} from '../../src/lib/layout.ts'
import { GATE, PLOT } from '../../src/lib/layout.ts'
import { HERO_BUILDING, SERVICE_WORLDS } from '../../src/lib/world.ts'
import { beatTimings } from '../../src/lib/chapters.ts'
import { sampleCamera } from '../../src/lib/camera-path.ts'
import {
  asphaltSurface,
  barkSurface,
  brickSurface,
  concreteSurface,
  grassSurface,
  leafAtlas,
  metalSurface,
  paintSurface,
  renderSurface,
  roadPaintSurface,
  soilSurface,
  stoneSurface,
} from '../../src/lib/surface/surfaces.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../..')
const GLB_DIR = path.join(ROOT, 'public/assets/glb')
const OUT_DIR = path.join(ROOT, '.qa/world')

const WIDTH = Number(process.env.WIDTH ?? 800)
const HEIGHT = Number(process.env.HEIGHT ?? 450)
const TIER = process.env.TIER ?? 'high'
const GRASS = process.env.GRASS === '1'
const FILTER = process.argv.slice(2)

/* ------------------------------------------------------------------ surfaces */

const S = 256

function surface(make, repeat = 1) {
  const surface = make(S)
  const roughness = new Uint8Array(surface.roughness.length)
  for (let i = 0; i < roughness.length; i++) {
    roughness[i] = Math.round(Math.min(1, Math.max(0, surface.roughness[i])) * 255)
  }
  return { albedo: surface.albedo, roughness, size: S, repeat }
}

const MATERIALS = {
  asphalt: surface(() => asphaltSurface(S, 11), 0.25),
  asphaltPatch: surface(() => asphaltSurface(S, 211), 0.33),
  roadPaint: surface(() => roadPaintSurface(S, 3), 0.33),
  soil: surface(() => soilSurface(S, 21, { gravel: 0.5, dry: 0.55 }), 0.16),
  soilDry: surface(() => soilSurface(S, 37, { gravel: 0.62, dry: 0.85 }), 0.2),
  gravel: surface(() => soilSurface(S, 53, { gravel: 1.1, dry: 0.9 }), 0.33),
  sand: surface(() => soilSurface(S, 59, { gravel: 0.2, dry: 1 }), 0.2),
  grass: surface(() => grassSurface(S, 33), 0.33),
  concrete: surface(() => concreteSurface(S, 61, { tint: 0.66 }), 0.33),
  render: surface(() => renderSurface(S, 71, { tint: 0.84, wear: 0.55 }), 0.4),
  stone: surface(() => stoneSurface(S, 83, { tint: 0.6 }), 0.4),
  brick: surface(() => brickSurface(S, 127), 0.4),
  metal: surface(() => metalSurface(S, 97, { brushed: 1 }), 0.66),
  rust: surface(() => metalSurface(S, 101, { rust: 0.7, brushed: 0.4 }), 0.5),
  bark: surface(() => barkSurface(S, 103), 0.83),
  paint: surface(() => paintSurface(S, 113), 0.5),
  leaf: surface(() => leafAtlas(S, 51), 1),
  leafDry: surface(() => leafAtlas(S, 83, { dry: 0.85 }), 1),
}

/** GLB material name → rasteriser surface key. */
const MATERIAL_KEY = {
  concrete: 'concrete',
  darkConcrete: 'concrete',
  lightConcrete: 'concrete',
  render: 'render',
  renderWarm: 'render',
  renderOld: 'render',
  stone: 'stone',
  stoneBlock: 'stone',
  brick: 'brick',
  asphalt: 'asphalt',
  asphaltPatch: 'asphaltPatch',
  roadPaint: 'roadPaint',
  soil: 'soil',
  soilDry: 'soilDry',
  gravel: 'gravel',
  sand: 'sand',
  grass: 'grass',
  wood: 'bark',
  bark: 'bark',
  metal: 'metal',
  darkMetal: 'metal',
  rim: 'metal',
  rust: 'rust',
  glass: 'glass',
  glassDark: 'glass',
  panelDark: 'metal',
  plastic: 'plastic',
  paintA: 'paint',
  paintB: 'paint',
  paintC: 'paint',
  paintD: 'paint',
  paintMuted: 'paint',
  safety: 'safety',
  rubber: 'rubber',
  light: 'light',
  tail: 'tail',
  plate: 'paint',
  sack: 'paint',
  tarp: 'plastic',
  terracotta: 'brick',
  leaf: 'leaf',
  leafB: 'leaf',
  leafWarm: 'leaf',
  leafDry: 'leafDry',
  foliage: 'leaf',
  foliageB: 'leaf',
}

/* ------------------------------------------------------------------ model io */

const glbCache = new Map()

async function prims(id) {
  if (!glbCache.has(id)) {
    const file = path.join(GLB_DIR, `${id}.glb`)
    if (!fs.existsSync(file)) {
      glbCache.set(id, [])
      return glbCache.get(id)
    }
    const { prims: loaded } = await loadGLB(file)
    glbCache.set(
      id,
      loaded.map((prim) => ({
        ...prim,
        material: MATERIAL_KEY[prim.material] ?? prim.material,
        alphaTest: ['leaf', 'leafDry'].includes(MATERIAL_KEY[prim.material] ?? '') ? 0.5 : 0,
      })),
    )
  }
  return glbCache.get(id)
}

/* -------------------------------------------------------------- scene build */

function terrainPrims(cell) {
  const { soil, grass } = buildTerrain({ width: 460, length: 1180, centerZ: -450, cell })
  const toPrim = (geometry, material) => ({
    name: material,
    label: material,
    material,
    position: geometry.getAttribute('position').array,
    normal: geometry.getAttribute('normal').array,
    uv: geometry.getAttribute('uv').array,
    indices: geometry.getIndex().array,
    count: geometry.getAttribute('position').count,
  })
  return [{ prims: [toPrim(soil, 'soil'), toPrim(grass, 'grass')] }]
}

async function roadInstances() {
  const parts = buildRoadParts(6, 'high')
  const out = []
  for (const part of parts) {
    if (part.key === 'film') continue // the rasteriser has no blending
    const material =
      part.key === 'gravel'
        ? 'gravel'
        : part.key === 'soil'
          ? 'soilDry'
          : part.key === 'paint'
            ? 'roadPaint'
            : part.key === 'patch'
              ? 'asphaltPatch'
              : part.key === 'kerb' || part.key === 'drain'
                ? 'concrete'
                : 'asphalt'
    const geometry = part.geometry
    out.push({
      label: `road-${part.key}`,
      prims: [
        {
          name: material,
          label: part.key === 'asphalt' ? 'asphalt' : material,
          material,
          position: geometry.getAttribute('position').array,
          normal: geometry.getAttribute('normal').array,
          uv: geometry.getAttribute('uv').array,
          indices: geometry.getIndex() ? geometry.getIndex().array : null,
          count: geometry.getAttribute('position').count,
        },
      ],
    })
  }
  return out
}

async function sceneInstances() {
  const instances = [...terrainPrims(7), ...(await roadInstances())]

  // vegetation
  for (const group of [...trees(TIER), ...shrubs(TIER)]) {
    const model = await prims(group.id)
    for (const item of group.items) {
      instances.push({
        label: group.id,
        prims: model,
        position: [item.x, item.y ?? 0, item.z],
        rotation: [0, item.rotation, 0],
        scale: [item.scale ?? 1, item.scaleY ?? item.scale ?? 1, item.scale ?? 1],
      })
    }
  }

  // street furniture
  const placed = [
    ...streetLights(46).map((item) => ({ ...item, id: 'street-light' })),
    ...boundaryWalls().map((item) => ({ ...item, id: 'boundary-wall' })),
    ...yardBarriers().map((item) => ({ ...item, id: 'barrier' })),
    ...yardProps(),
    ...parkedVehicles().flatMap((group) => group.items.map((item) => ({ ...item, id: group.id }))),
    { id: 'hero-building', x: HERO_BUILDING.x, z: HERO_BUILDING.z, rotation: 0, y: 0 },
    { id: 'entrance-gate', x: GATE.x, z: GATE.z, rotation: Math.PI / 2, y: 0 },
    { id: 'crane', x: HERO_BUILDING.x + 15, z: HERO_BUILDING.z + 8, rotation: -0.4, y: 0 },
    { id: 'residential-building', x: SERVICE_WORLDS.residential.x, z: SERVICE_WORLDS.residential.z, rotation: -Math.PI / 2, y: 0 },
    { id: 'bridge', x: SERVICE_WORLDS.infrastructure.x, z: SERVICE_WORLDS.infrastructure.z, rotation: 0, y: 0 },
    { id: 'warehouse', x: SERVICE_WORLDS.materials.x, z: SERVICE_WORLDS.materials.z, rotation: -Math.PI / 2, y: 0 },
    { id: 'solar-panel', x: SERVICE_WORLDS.solar.x, z: SERVICE_WORLDS.solar.z, rotation: Math.PI / 2, y: 0 },
  ]

  for (const item of placed) {
    const model = await prims(item.id)
    if (!model.length) continue
    instances.push({
      label: item.id,
      prims: model,
      position: [item.x, item.y ?? 0, item.z],
      rotation: [0, item.rotation, 0],
      scale: [item.scale ?? 1, item.scale ?? 1, item.scale ?? 1],
    })
  }

  if (GRASS) {
    for (const spec of GRASS_LAYERS) {
      const points = grassPoints(spec, 0.22)
      const geometry = grassTuft(spec)
      const model = [
        {
          name: spec.dry ? 'leafDry' : 'leaf',
          material: spec.dry ? 'leafDry' : 'leaf',
          position: geometry.position,
          normal: geometry.normal,
          uv: geometry.uv,
          indices: geometry.indices,
          count: geometry.position.length / 3,
          alphaTest: 0.5,
        },
      ]
      for (const point of points) {
        instances.push({
          label: 'grass',
          prims: model,
          position: [point.x, terrainHeight(point.x, point.z) + 0.01, point.z],
          rotation: [0, (point.r ?? 0) * Math.PI * 2, 0],
          scale: [1, 1, 1],
        })
      }
    }
  }

  return instances
}

function grassTuft(spec) {
  const positions = []
  const uvs = []
  const normals = []
  const indices = []
  let vertex = 0
  let seed = spec.seed
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }
  for (const quad of spec.quadrants) {
    const u0 = (quad % 2) * 0.5
    const v0 = Math.floor(quad / 2) * 0.5
    const angle = (quad / spec.quadrants.length) * Math.PI + rand() * 0.7
    const height = 0.34 + rand() * 0.3
    const width = 0.2 + rand() * 0.16
    const lean = 0.12 + rand() * 0.2
    const dx = Math.cos(angle)
    const dz = Math.sin(angle)
    const sx = -dz
    const sz = dx
    const cx = (rand() - 0.5) * 0.08
    const cz = (rand() - 0.5) * 0.08
    const b0 = [cx - sx * width * 0.5, 0, cz - sz * width * 0.5]
    const b1 = [cx + sx * width * 0.5, 0, cz + sz * width * 0.5]
    const tip = [cx + dx * lean, height * 0.62, cz + dz * lean]
    const tip2 = [cx + dx * lean, height, cz + dz * lean]
    for (const p of [b0, b1, tip, tip, tip2, b0]) {
      positions.push(p[0], p[1], p[2])
      normals.push(0, 1, 0)
    }
    uvs.push(u0, v0, u0 + 0.5, v0, u0 + 0.5, v0 + 0.5, u0 + 0.5, v0 + 0.5, u0, v0 + 0.5, u0, v0)
    indices.push(vertex, vertex + 1, vertex + 2, vertex + 3, vertex + 4, vertex + 5)
    vertex += 6
  }
  return { position: new Float32Array(positions), normal: new Float32Array(normals), uv: new Float32Array(uvs), indices }
}

/* ---------------------------------------------------------------- sky + sun */

const SUN_DIR = new THREE.Vector3(-0.42, 0.56, 0.72).normalize()
const HORIZON = new THREE.Color('#cfd8d6')
const ZENITH = new THREE.Color('#5b8fc4')
const SUN_COLOR = new THREE.Color('#fff3dc')

function skyFn(dir) {
  if (dir.y >= -0.02) {
    const t = Math.pow(Math.min(1, dir.y), 0.42)
    const c = HORIZON.clone().lerp(ZENITH, t)
    const cos = Math.max(0, dir.dot(SUN_DIR))
    const halo = Math.pow(cos, 26) * 0.5 + Math.pow(cos, 3) * 0.1
    return [c.r + SUN_COLOR.r * halo, c.g + SUN_COLOR.g * halo * 0.94, c.b + SUN_COLOR.b * halo * 0.9]
  }
  const ground = new THREE.Color('#7a6c56').multiplyScalar(0.45)
  return [ground.r, ground.g, ground.b]
}

/* -------------------------------------------------------------------- shots */

const OVERRIDE = process.env.CAM
  ? (() => {
      const [x, y, z, lx, ly, lz] = process.env.CAM.split(',').map(Number)
      return [{ id: 'custom', label: 'CUSTOM', progress: 0, camera: { position: [x, y, z], look: [lx, ly, lz] } }]
    })()
  : null

const SHOTS = beatTimings.map((timing) => ({
  id: timing.beat.id,
  label: timing.beat.label,
  progress: timing.start + (timing.end - timing.start) * 0.55,
}))

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true })
  const shots = OVERRIDE ?? SHOTS
  const instances = await sceneInstances()
  console.log(`→ ${instances.length} instances`)

  const pos = new THREE.Vector3()
  const look = new THREE.Vector3()

  for (const shot of shots) {
    if (!OVERRIDE && FILTER.length && !FILTER.some((f) => shot.id.includes(f))) continue
    if (shot.camera) {
      pos.set(...shot.camera.position)
      look.set(...shot.camera.look)
    } else {
      sampleCamera(shot.progress, pos, look)
    }

    // only what the camera could possibly see: keeps the software raster honest
    // about cost without changing what appears in frame
    const near = instances.filter((instance) => {
      const p = instance.position ?? [0, 0, 0]
      const distance = Math.hypot(p[0] - pos.x, p[2] - pos.z)
      return distance < 620
    })

    const renderer = new Renderer({
      width: WIDTH,
      height: HEIGHT,
      materials: MATERIALS,
      sunDir: [SUN_DIR.x, SUN_DIR.y, SUN_DIR.z],
      sunColor: [SUN_COLOR.r, SUN_COLOR.g, SUN_COLOR.b],
      sunEnergy: 2.9,
      skyColor: [0.42, 0.52, 0.62],
      groundColor: [0.44, 0.38, 0.29],
      haze: 0.0016,
      hazeColor: [HORIZON.r, HORIZON.g, HORIZON.b],
      shadowMapSize: 2048,
      shadowExtent: 70,
      shadowCenter: [look.x, 0, look.z],
      exposure: 1.0,
      sky: skyFn,
    })
    for (const instance of near) renderer.add(instance)

    const camera = { position: [pos.x, pos.y, pos.z], look: [look.x, look.y, look.z], fov: 42 }
    const triangles = renderer.build().length
    // Draw calls: one per distinct material bucket per instance, which is what
    // `InstancedAsset` produces (geometry merged per material key). Prims share
    // a material name once MATERIAL_KEY has collapsed them, so a Set is right.
    let drawCalls = 0
    const perAsset = new Map()
    for (const instance of near) {
      const materials = new Set(instance.prims.map((prim) => prim.material))
      drawCalls += materials.size
      // the app draws one instanced mesh per asset per material bucket, not
      // one per instance — this is the number the browser actually issues
      const bucket = perAsset.get(instance.label) ?? new Set()
      materials.forEach((material) => bucket.add(material))
      perAsset.set(instance.label, bucket)
    }
    let instanced = 0
    for (const bucket of perAsset.values()) instanced += bucket.size
    console.log(
      `\n=== ${shot.id} (${shot.label})  cam ${pos.x.toFixed(0)},${pos.y.toFixed(0)},${pos.z.toFixed(0)} → look ${look.x.toFixed(0)},${look.y.toFixed(0)},${look.z.toFixed(0)}  ${triangles.toLocaleString()} tris / ${near.length} instances / ~${instanced} draw calls (instanced) / ${drawCalls} if drawn per-instance`,
    )
    if (process.env.HIST === '1') {
      renderer.render(camera)
      const tally = new Map()
      for (const id of renderer.ids) tally.set(id, (tally.get(id) ?? 0) + 1)
      console.log([...tally.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${v}`).join('  '))
    }
    if (process.env.LABELS === '1') {
      console.log(renderer.labels(camera, Number(process.env.COLS ?? 120)))
    } else {
      const file = path.join(OUT_DIR, `${String(SHOTS.indexOf(shot)).padStart(2, '0')}-${shot.id}.png`)
      renderer.save(file, camera)
      console.log(`    wrote ${path.relative(ROOT, file)}`)
      if (process.env.ASCII === '1') console.log(renderer.ascii(camera, 130))
    }
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
