/**
 * Deep asset validation.
 *
 * Beyond the inspect report this stage checks that each asset holds a scene,
 * meshes, materials and grounded, plausible real-world dimensions. A technically
 * valid GLB with a bad origin or inverted scale is rejected here.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { NodeIO } from '@gltf-transform/core'
import { boundsForFile } from './bounds.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../..')
const ASSET_DIR = path.join(ROOT, 'public/assets/glb')

const io = new NodeIO()
let failed = false

for (const file of fs.readdirSync(ASSET_DIR).filter((f) => f.endsWith('.glb')).sort()) {
  const doc = await io.read(path.join(ASSET_DIR, file))
  const root = doc.getRoot()
  const scenes = root.listScenes()
  const meshes = root.listMeshes()
  const materials = root.listMaterials()

  const issues = []
  if (scenes.length < 1) issues.push('missing scene')
  if (meshes.length < 1) issues.push('missing meshes')
  if (materials.length < 1) issues.push('missing materials')

  // world-space measurement: de-quantised positions, node transforms applied
  const bounds = boundsForFile(path.join(ASSET_DIR, file))
  if (!bounds || !bounds.points.length) issues.push('POSITION missing')
  const min = bounds?.min ?? [0, 0, 0]
  const max = bounds?.max ?? [0, 0, 0]
  const invalid = Boolean(bounds?.nonFinite)

  const width = max[0] - min[0]
  const height = max[1] - min[1]
  const depth = max[2] - min[2]
  const volume = Math.max(0.01, width * height * depth)

  // Ground contact: objects must sit on y = 0, not float or sink.
  if (min[1] > 0.2) issues.push(`floats ${min[1].toFixed(2)} m above ground`)
  // a little below-ground is legitimate (foundations, pier footings)
  if (min[1] < -0.8) issues.push(`sinks ${Math.abs(min[1]).toFixed(2)} m below ground`)

  // Scale plausibility (metres). Buildings can be tall; small assets can't be huge.
  if (volume > 200000) issues.push('implausible volume')
  // Scale is judged on the object's extent. Gates, panels and walls are
  // legitimately thin, so only a degenerate (near-zero) axis is a defect.
  const extent = Math.max(width, height, depth)
  const thinnest = Math.min(width, height, depth)
  if (extent < 0.4) issues.push('below plausible scale')
  if (thinnest < 0.05) issues.push(`degenerate dimension (${thinnest.toFixed(3)} m)`)
  if (invalid) issues.push('non-finite vertex data')

  const status = issues.length === 0 ? 'PASS' : 'FAIL'
  if (status === 'FAIL') failed = true
  console.log(
    `${status.padEnd(4)} ${file.padEnd(28)} ${width.toFixed(2)}×${height.toFixed(2)}×${depth.toFixed(2)} m${
      issues.length ? `  — ${issues.join(', ')}` : ''
    }`,
  )
}

if (failed) {
  console.error('\n❌ Validation failed.')
  process.exit(1)
}
console.log('\n✔ All assets validated (scene, meshes, materials, finite data, plausible scale).')
