import * as THREE from 'three'
import { beatTimings } from './chapters'
import { clamp, flowEase } from './math'

/**
 * All beat keyframes flattened into one continuous camera spline.
 * Centripetal Catmull-Rom keeps the move smooth through every beat boundary —
 * the camera never stops dead, it only slows down on the beats.
 *
 * V12: asymmetric easing — the camera accelerates into approach shots
 * and decelerates into reveals, the way a real camera operator would.
 */

type Keyframe = { at: number; pos: THREE.Vector3; look: THREE.Vector3 }

export const keyframes: Keyframe[] = beatTimings.flatMap(({ beat, start, end }) =>
  beat.keys.map((key) => ({
    at: start + key.t * (end - start),
    pos: new THREE.Vector3(...key.pos),
    look: new THREE.Vector3(...key.look),
  })),
)

const posCurve = new THREE.CatmullRomCurve3(
  keyframes.map((key) => key.pos),
  false,
  'centripetal',
  0.5,
)

const lookCurve = new THREE.CatmullRomCurve3(
  keyframes.map((key) => key.look),
  false,
  'centripetal',
  0.5,
)

const LAST = keyframes.length - 1

function segmentAt(progress: number) {
  const p = clamp(progress)
  let i = 0
  while (i < LAST - 1 && keyframes[i + 1].at <= p) i++
  return i
}

export function sampleCamera(progress: number, outPos: THREE.Vector3, outLook: THREE.Vector3) {
  const p = clamp(progress)
  const i = segmentAt(p)
  const a = keyframes[i]
  const b = keyframes[i + 1] ?? a
  const span = Math.max(1e-6, b.at - a.at)
  const local = flowEase((p - a.at) / span)
  const u = clamp((i + local) / LAST)
  posCurve.getPoint(u, outPos)
  lookCurve.getPoint(u, outLook)
}

/** World position of a beat's camera key — used by the nav jump. */
export function beatAnchorProgress(index: number) {
  const timing = beatTimings[clamp(index, 0, beatTimings.length - 1)]
  return timing ? timing.start + (timing.end - timing.start) * 0.08 : 0
}
