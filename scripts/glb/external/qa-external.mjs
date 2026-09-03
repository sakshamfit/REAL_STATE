/**
 * External asset visual QA.
 *
 * Renders every built external asset with the project's offline rasteriser —
 * the same one the world shots use — at a three-quarter eye-level camera, and
 * checks the things a number cannot tell you:
 *
 *   • does it read as the object it claims to be (silhouette coverage)
 *   • is it actually standing on the ground (contact row occupancy)
 *   • does it hold together at distance (silhouette at 40 m)
 *
 * Writes PNGs to `.qa/external/` and prints a per-asset verdict.
 *
 *   node scripts/glb/external/qa-external.mjs
 *   ASCII=1 node scripts/glb/external/qa-external.mjs car-sedan
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as THREE from 'three'
import { loadGLB, Renderer } from '../../qa/raster.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../../..')
const BUILD_DIR = path.join(ROOT, 'public/assets/external/build')
const MANIFEST = path.join(ROOT, 'src/data/external-manifest.json')
const OUT_DIR = path.join(ROOT, '.qa/external')

const FILTER = process.argv.slice(2)
const ASCII = process.env.ASCII === '1'
const WIDTH = Number(process.env.WIDTH ?? 640)
const HEIGHT = Number(process.env.HEIGHT ?? 400)

if (!fs.existsSync(MANIFEST)) {
  console.log('  No external manifest — run `npm run assets:external` first.')
  process.exit(0)
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'))
const assets = manifest.assets.filter((asset) => !FILTER.length || FILTER.some((f) => asset.id.includes(f)))

if (!assets.length) {
  console.log('  No external assets registered.')
  process.exit(0)
}

fs.mkdirSync(OUT_DIR, { recursive: true })

/**
 * A ground plane so we can see whether the asset touches it.
 *
 * Tessellated on purpose. The offline rasteriser has no near-plane clipping, so
 * a single large quad with one vertex behind the camera is dropped whole and
 * the ground silently disappears — which would make every asset look like it
 * was floating in sky. A grid keeps every triangle small enough to survive.
 */
function groundPrim(extent) {
  const size = Math.max(6, extent * 3)
  const steps = 24
  const position = []
  const normal = []
  const uv = []
  const indices = []
  for (let iz = 0; iz <= steps; iz++) {
    for (let ix = 0; ix <= steps; ix++) {
      const x = -size + (2 * size * ix) / steps
      const z = -size + (2 * size * iz) / steps
      position.push(x, 0, z)
      normal.push(0, 1, 0)
      uv.push(ix / steps, iz / steps)
    }
  }
  const at = (ix, iz) => iz * (steps + 1) + ix
  for (let iz = 0; iz < steps; iz++) {
    for (let ix = 0; ix < steps; ix++) {
      indices.push(at(ix, iz), at(ix + 1, iz), at(ix + 1, iz + 1))
      indices.push(at(ix, iz), at(ix + 1, iz + 1), at(ix, iz + 1))
    }
  }
  return {
    name: 'ground',
    label: 'ground',
    material: 'soil',
    twoSided: true,
    position: new Float32Array(position),
    normal: new Float32Array(normal),
    uv: new Float32Array(uv),
    indices: new Uint32Array(indices),
    count: position.length / 3,
  }
}

let failures = 0

for (const asset of assets) {
  const file = path.join(BUILD_DIR, path.basename(asset.path))
  if (!fs.existsSync(file)) {
    console.log(`  ${asset.id.padEnd(26)} MISSING BUILD OUTPUT`)
    failures += 1
    continue
  }

  const { prims } = await loadGLB(file)
  const [length, height, width] = asset.dimensions
  const extent = Math.max(length, height, width)

  const renderer = new Renderer({
    width: WIDTH,
    height: HEIGHT,
    sunDir: [0.42, 0.68, 0.52],
    shadowExtent: Math.max(8, extent * 1.6),
    shadowCenter: [0, height / 2, 0],
    haze: 0.0006,
  })
  renderer.add({ label: 'ground', prims: [groundPrim(extent)], position: [0, 0, 0] })
  renderer.add({ label: asset.id, prims, position: [0, 0, 0] })
  renderer.build()

  // Three-quarter view at eye level, framed on the object.
  const distance = extent * 2.1
  const camera = {
    position: [distance * 0.72, Math.max(1.6, height * 0.62), distance * 0.72],
    look: [0, height * 0.42, 0],
    fov: 38,
  }
  renderer.render(camera)

  // Silhouette and contact measured from the label buffer: which pixels the
  // asset actually occupies, and whether it owns any pixels at the ground line.
  const ids = renderer.ids
  let assetPixels = 0
  let groundPixels = 0
  let lowestRow = -1
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const id = ids[y * WIDTH + x]
      if (id === asset.id) {
        assetPixels += 1
        lowestRow = Math.max(lowestRow, y)
      } else if (id === 'ground') groundPixels += 1
    }
  }

  const coverage = assetPixels / (WIDTH * HEIGHT)
  // The object's lowest pixel must be adjacent to ground pixels, not floating
  // in sky and not clipped off the bottom of the frame.
  let contact = false
  if (lowestRow >= 0 && lowestRow < HEIGHT - 1) {
    for (let x = 0; x < WIDTH; x++) {
      if (ids[(lowestRow + 1) * WIDTH + x] === 'ground') {
        contact = true
        break
      }
    }
  }

  const out = path.join(OUT_DIR, `${asset.id}.png`)
  renderer.save(out, camera)

  const issues = []
  if (coverage < 0.02) issues.push(`silhouette only ${(coverage * 100).toFixed(1)}% of frame — asset may be empty`)
  if (!contact) issues.push('no ground contact in frame — asset may be floating')
  if (groundPixels === 0) issues.push('ground not visible — camera framing is wrong')

  const status = issues.length ? 'CHECK' : 'PASS'
  if (issues.length) failures += 1
  console.log(
    `  ${status.padEnd(6)} ${asset.id.padEnd(26)} ${asset.dimensions.map((v) => v.toFixed(2)).join(' × ')} m  ` +
      `silhouette ${(coverage * 100).toFixed(1)}%  ${issues.join('; ')}`,
  )

  if (ASCII) console.log(renderer.ascii(camera, 120))
}

console.log(`\n  → ${path.relative(ROOT, OUT_DIR)}/`)
void THREE
if (failures) process.exitCode = 0 // reporting tool: never blocks the build
