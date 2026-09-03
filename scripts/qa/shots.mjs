/**
 * Offline photo studio for GLB assets.
 *
 *   node scripts/qa/shots.mjs [filter]        # write .qa/shots/*.png
 *   ASCII=1 node scripts/qa/shots.mjs tree    # also print ASCII previews
 *
 * Cameras are auto-framed from each asset's bounding box, so silhouettes and
 * proportions can be compared honestly between BEFORE and AFTER builds.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadGLB, Renderer } from './raster.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../..')
const GLB_DIR = path.join(ROOT, 'public/assets/glb')
const OUT_DIR = path.join(ROOT, '.qa/shots')

/** azimuth (deg), elevation (deg), distance multiplier, look-height fraction */
const FRAMING = {
  'hero-building': [38, 16, 1.5, 0.45],
  'residential-building': [38, 14, 1.55, 0.45],
  warehouse: [40, 14, 1.55, 0.4],
  bridge: [42, 18, 1.35, 0.5],
  crane: [40, 12, 1.35, 0.45],
  default: [35, 14, 1.75, 0.45],
}

function bboxOf(prims) {
  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]
  for (const p of prims) {
    const arr = p.position
    for (let i = 0; i < p.count; i++) {
      for (let k = 0; k < 3; k++) {
        const v = arr[i * 3 + k]
        if (v < min[k]) min[k] = v
        if (v > max[k]) max[k] = v
      }
    }
  }
  return { min, max }
}

function autoCamera(prims, name) {
  const { min, max } = bboxOf(prims)
  const size = [max[0] - min[0], max[1] - min[1], max[2] - min[2]]
  const center = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2]
  const radius = Math.max(0.6, Math.hypot(size[0], size[1], size[2]) / 2)
  const [az, el, dist, lookY] = FRAMING[name] ?? FRAMING.default
  const a = (az * Math.PI) / 180
  const e = (el * Math.PI) / 180
  const d = radius * dist * 2.1
  const fov = 36
  // distance so the bounding sphere fits the vertical fov
  const fit = radius / Math.sin((fov * Math.PI) / 360)
  const distance = Math.max(d, fit * 1.05)
  return {
    position: [
      center[0] + Math.cos(a) * Math.cos(e) * distance,
      center[1] + Math.sin(e) * distance,
      center[2] + Math.sin(a) * Math.cos(e) * distance,
    ],
    look: [center[0], min[1] + size[1] * lookY, center[2]],
    fov,
    radius,
    center,
    min,
    size,
  }
}

function groundPrims(radius, y = -0.02) {
  const segments = 40
  const positions = []
  const normals = []
  const uvs = []
  const r = radius * 1.35
  for (let i = 0; i < segments; i++) {
    const a0 = (i / segments) * Math.PI * 2
    const a1 = ((i + 1) / segments) * Math.PI * 2
    positions.push(0, y, 0, Math.cos(a0) * r, y, Math.sin(a0) * r, Math.cos(a1) * r, y, Math.sin(a1) * r)
    for (let k = 0; k < 3; k++) normals.push(0, 1, 0)
    uvs.push(0.5, 0.5, Math.cos(a0) * 0.5 + 0.5, Math.sin(a0) * 0.5 + 0.5, Math.cos(a1) * 0.5 + 0.5, Math.sin(a1) * 0.5 + 0.5)
  }
  return [
    {
      name: 'ground',
      material: 'soil',
      tint: [0.42, 0.35, 0.26],
      position: new Float32Array(positions),
      normal: new Float32Array(normals),
      uv: new Float32Array(uvs),
      indices: null,
      count: positions.length / 3,
    },
  ]
}

async function main() {
  const filter = process.argv.slice(2).join(' ')
  fs.mkdirSync(OUT_DIR, { recursive: true })
  const names = fs
    .readdirSync(GLB_DIR)
    .filter((f) => f.endsWith('.glb'))
    .map((f) => f.replace('.glb', ''))
    .filter((name) => !filter || filter.split(' ').some((token) => name.includes(token)))

  const cols = Number(process.env.ASCII_COLS ?? 100)

  for (const name of names) {
    const file = path.join(GLB_DIR, `${name}.glb`)
    const { prims } = await loadGLB(file)
    const cam = autoCamera(prims, name)
    const renderer = new Renderer({
      width: 900,
      height: 620,
      shadowExtent: Math.max(6, cam.radius * 1.35),
      sunDir: [0.54, 0.62, 0.44],
      haze: 0.0006,
      background: [0.34, 0.4, 0.45],
    })
    renderer.add({ prims, position: [0, 0, 0] })
    renderer.add({ prims: groundPrims(cam.radius * 1.1), position: [0, -0.02, 0] })
    const out = path.join(OUT_DIR, `${name}.png`)
    renderer.save(out, cam)
    const tris = prims.reduce((sum, p) => sum + (p.indices ? p.indices.length : p.count) / 3, 0)
    console.log(
      `${name.padEnd(22)} tris=${String(Math.round(tris)).padStart(7)}  size=${cam.size
        .map((v) => v.toFixed(1))
        .join('x')}  -> ${path.relative(ROOT, out)}`,
    )
    if (process.env.ASCII) {
      console.log(`\n----- ${name} -----`)
      console.log(renderer.ascii(cam, cols))
      console.log('')
    }
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
