/**
 * Measure assets in world-space metres.
 *
 * Usage:
 *   node scripts/glb/measure-assets.mjs                 # every production GLB
 *   node scripts/glb/measure-assets.mjs assets/raw/tree-a.glb public/assets/glb/tree-a.glb
 *
 * The second form is the regression check that matters: a raw (float) GLB and
 * its optimised twin must measure identically. If they do not, either the
 * optimiser or `bounds.mjs` is wrong.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { boundsForFile } from './bounds.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../..')
const DEFAULT_DIR = path.join(ROOT, 'public/assets/glb')

const files =
  process.argv.slice(2).length > 0
    ? process.argv.slice(2)
    : fs.readdirSync(DEFAULT_DIR).filter((f) => f.endsWith('.glb')).sort().map((f) => path.join('public/assets/glb', f))

let bad = 0
for (const file of files) {
  const b = boundsForFile(file)
  if (!b) {
    console.log(`${file.padEnd(34)} — no geometry`)
    bad += 1
    continue
  }
  console.log(
    path.basename(file).padEnd(28),
    `${b.size[0].toFixed(2)} × ${b.size[1].toFixed(2)} × ${b.size[2].toFixed(2)} m`.padEnd(28),
    `min y ${b.min[1].toFixed(2).padStart(7)}`,
    b.nonFinite ? ' NON-FINITE' : '',
  )
  if (b.nonFinite) bad += 1
}
if (bad) process.exitCode = 1
