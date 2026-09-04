/**
 * Boring-Shot Detector — V12 QA
 *
 *   node --experimental-strip-types --import ./scripts/qa/ts-hook.mjs \
 *        scripts/qa/boring-shots.mjs
 *
 * Samples the camera path at regular intervals and flags segments where
 * the camera barely moves (position delta < threshold) or the look target
 * barely changes. These are the "dead zones" that make the experience feel
 * like a scrolling PowerPoint rather than a cinematic walkthrough.
 *
 * Thresholds (tuned for a 42° FOV architectural walkthrough):
 *   - Position delta < 3 m over a beat span → BORING (camera is static)
 *   - Look delta < 2° over a beat span → BORING (camera is staring)
 *   - Height range < 1.5 m across all keyframes → MONOTONOUS
 *
 * Exit code: 0 if all beats pass, 1 if any beat is flagged.
 */
import * as THREE from 'three'
import { beats, beatTimings } from '../../src/lib/chapters.ts'
import { sampleCamera } from '../../src/lib/camera-path.ts'

const POS_THRESHOLD = 3 // metres — minimum camera travel per beat
const LOOK_THRESHOLD = 2 // degrees — minimum look-target travel per beat
const HEIGHT_THRESHOLD = 1.5 // metres — minimum height range within a beat

/**
 * Beats that are intentionally flat or slow — these are cinematic choices,
 * not bugs. The ground beat is a ground-level approach (camera at eye height);
 * the map beat holds a high establishing shot for interactive exploration.
 */
const INTENTIONAL_EXCEPTIONS = new Set(['ground', 'india'])

const SAMPLES_PER_BEAT = 40

function rad2deg(r) {
  return (r * 180) / Math.PI
}

const pos = new THREE.Vector3()
const look = new THREE.Vector3()

let failed = false

console.log('V12 Boring-Shot Analysis')
console.log('========================\n')

for (const timing of beatTimings) {
  const { beat, start, end } = timing
  const span = end - start

  // sample camera path across the beat
  const positions = []
  const looks = []
  for (let i = 0; i <= SAMPLES_PER_BEAT; i++) {
    const t = i / SAMPLES_PER_BEAT
    const progress = start + t * span
    sampleCamera(progress, pos, look)
    positions.push(pos.clone())
    looks.push(look.clone())
  }

  // compute total position travel
  let totalTravel = 0
  for (let i = 1; i < positions.length; i++) {
    totalTravel += positions[i].distanceTo(positions[i - 1])
  }

  // compute total look travel (in degrees)
  let totalLookTravel = 0
  for (let i = 1; i < looks.length; i++) {
    const a = positions[Math.min(i, positions.length - 1)]
    const dirA = looks[i - 1].clone().sub(a).normalize()
    const dirB = looks[i].clone().sub(a).normalize()
    totalLookTravel += rad2deg(dirA.angleTo(dirB))
  }

  // compute height range
  const heights = positions.map((p) => p.y)
  const heightMin = Math.min(...heights)
  const heightMax = Math.max(...heights)
  const heightRange = heightMax - heightMin

  // compute camera speed profile (min, max, avg)
  const speeds = []
  for (let i = 1; i < positions.length; i++) {
    speeds.push(positions[i].distanceTo(positions[i - 1]))
  }
  const minSpeed = Math.min(...speeds)
  const maxSpeed = Math.max(...speeds)
  const avgSpeed = totalTravel / speeds.length

  // flag issues (skip for intentional exceptions)
  const flags = []
  if (totalTravel < POS_THRESHOLD) flags.push(`STATIC (${totalTravel.toFixed(1)}m < ${POS_THRESHOLD}m)`)
  if (totalLookTravel < LOOK_THRESHOLD) flags.push(`STARING (${totalLookTravel.toFixed(1)}° < ${LOOK_THRESHOLD}°)`)
  if (heightRange < HEIGHT_THRESHOLD) flags.push(`FLAT (${heightRange.toFixed(1)}m < ${HEIGHT_THRESHOLD}m)`)

  const isException = INTENTIONAL_EXCEPTIONS.has(beat.id)
  const status = flags.length ? (isException ? '⚠️ ' : '❌') : '✅'
  if (flags.length && !isException) failed = true

  console.log(
    `${status} ${beat.id.padEnd(22)} ${(beat.span + 'vh').padStart(6)}  ` +
      `travel=${totalTravel.toFixed(1).padStart(5)}m  ` +
      `look=${totalLookTravel.toFixed(1).padStart(5)}°  ` +
      `height=${heightMin.toFixed(1)}–${heightMax.toFixed(1)}m  ` +
      `speed=${avgSpeed.toFixed(2)}m/frame`,
  )
  if (flags.length) {
    const note = isException ? '  (intentional — cinematic choice)' : ''
    console.log(`   ${flags.join('  |  ')}${note}`)
  }
}

console.log('')
if (failed) {
  console.log('❌ Some beats are flagged as boring — see above.')
  process.exit(1)
} else {
  console.log('✅ All beats have sufficient camera movement.')
}
