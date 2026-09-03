/**
 * Full asset pipeline:
 * generate → optimize → external → inspect → validate → visual QA.
 *
 * The external stage is where developer-supplied GLBs enter the world. It runs
 * after the project's own assets are built and before QA, so a dropped asset is
 * inspected, normalised and registered by the same command that builds
 * everything else:
 *
 *     DROP REAL GLB → npm run assets:build → USE
 */

import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = path.dirname(fileURLToPath(import.meta.url))
const stage = (script) => {
  const result = spawnSync(process.execPath, [path.join(dir, script)], { stdio: 'inherit' })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

console.log('\n[1/7] GENERATE')
stage('generate-assets.mjs')
console.log('\n[2/7] OPTIMIZE')
stage('optimize-assets.mjs')
console.log('\n[3/7] EXTERNAL')
stage('external/build-external.mjs')
console.log('\n[4/7] INSPECT')
stage('inspect-assets.mjs')
console.log('\n[5/7] VALIDATE')
stage('validate-assets.mjs')
console.log('\n[6/7] VISUAL QA')
stage('visual-qa.mjs')
console.log('\n[7/7] EXTERNAL VISUAL QA')
stage('external/qa-external.mjs')
console.log('\n✔ Asset pipeline complete.')
