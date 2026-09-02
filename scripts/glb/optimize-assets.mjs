/**
 * GLB optimization step.
 *
 * Reads the raw generated GLBs, welds duplicate vertices, flattens the node
 * graph, prunes unused data and writes the production files. The production
 * pipeline is intentionally non-destructive: raw files stay in `/raw` so the
 * QA report can always trace where an asset started.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { NodeIO } from '@gltf-transform/core'
import { flatten, weld, prune } from '@gltf-transform/functions'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../..')
const RAW_DIR = path.join(ROOT, 'public/assets/glb/raw')
const OUT_DIR = path.join(ROOT, 'public/assets/glb')

fs.mkdirSync(OUT_DIR, { recursive: true })

for (const file of fs.readdirSync(RAW_DIR).filter((f) => f.endsWith('.glb'))) {
  const io = new NodeIO()
  const input = path.join(RAW_DIR, file)
  const output = path.join(OUT_DIR, file)
  const doc = await io.read(input)
  const before = fs.statSync(input).size

  await doc.transform(flatten(), weld({ tolerance: 1e-4 }), prune({ keepAttributes: true }))

  await io.write(output, doc)
  const after = fs.statSync(output).size
  console.log(`${file}: ${before.toLocaleString()} → ${after.toLocaleString()} bytes`)
}
