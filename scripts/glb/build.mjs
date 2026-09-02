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

console.log('\n[1/5] GENERATE')
stage('generate-assets.mjs')
console.log('\n[2/5] OPTIMIZE')
stage('optimize-assets.mjs')
console.log('\n[3/5] INSPECT')
stage('inspect-assets.mjs')
console.log('\n[4/5] VALIDATE')
stage('validate-assets.mjs')
console.log('\n[5/5] VISUAL QA')
stage('visual-qa.mjs')
console.log('\n✔ Asset pipeline complete.')
