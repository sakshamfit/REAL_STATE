/**
 * Full asset pipeline:
 * generate → optimize → inspect → report.
 */

import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = path.dirname(fileURLToPath(import.meta.url))
const stage = (script) => {
  const result = spawnSync(process.execPath, [path.join(dir, script)], { stdio: 'inherit' })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

console.log('\n[1/3] GENERATE')
stage('generate-assets.mjs')
console.log('\n[2/3] OPTIMIZE')
stage('optimize-assets.mjs')
console.log('\n[3/3] INSPECT + VALIDATE')
stage('inspect-assets.mjs')
console.log('\n✔ Asset pipeline complete.')
