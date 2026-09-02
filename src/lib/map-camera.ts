import * as THREE from 'three'
import gsap from 'gsap'
import { beatById, beatTimings } from './chapters'
import { INDIA_MAP } from './world'
import { clamp, damp, smoothstep } from './math'
import { runtime } from './store'

/**
 * The interactive India map owns the camera while its chapter is engaged.
 * Position is derived from an orbit around a focus point, so state-to-state
 * moves are continuous travel instead of a reset.
 */

export type MapCamera = {
  /** orbit target */
  center: THREE.Vector3
  radius: number
  theta: number
  phi: number
  /** parallax from pointer position */
  parallax: THREE.Vector2
  /** accumulated drag (consumed each frame) */
  drag: THREE.Vector2
  dragging: boolean
  /** resulting pose consumed by CameraRig */
  position: THREE.Vector3
  look: THREE.Vector3
  /** 0..1 — how much this controller overrides the journey camera */
  influence: number
  /** 0..1 — entry animation of the map itself */
  emergence: number
}

export const OVERVIEW = {
  radius: 38,
  phi: 0.95,
  theta: 0,
  center: new THREE.Vector3(INDIA_MAP.x, INDIA_MAP.y, INDIA_MAP.z),
}

export const mapCamera: MapCamera = {
  center: OVERVIEW.center.clone(),
  radius: OVERVIEW.radius,
  theta: OVERVIEW.theta,
  phi: OVERVIEW.phi,
  parallax: new THREE.Vector2(),
  drag: new THREE.Vector2(),
  dragging: false,
  position: new THREE.Vector3(0, 36, -969),
  look: new THREE.Vector3(0, INDIA_MAP.y, INDIA_MAP.z),
  influence: 0,
  emergence: 0,
}

const INDIA_TIMING = beatTimings.find((timing) => timing.beat.id === 'india') ?? beatTimings[0]

export function indiaBeatLocal(progress: number) {
  const span = INDIA_TIMING.end - INDIA_TIMING.start
  return span <= 0 ? 0 : (progress - INDIA_TIMING.start) / span
}

/** Focus the orbit on a point in world space. */
export function focusMap(target: { x: number; y: number; z: number }, radius: number, phi: number, duration = 1.8) {
  gsap.to(mapCamera.center, { x: target.x, y: target.y, z: target.z, duration, ease: 'power3.inOut', overwrite: true })
  gsap.to(mapCamera, { radius, phi, duration, ease: 'power3.inOut', overwrite: 'auto' })
}

export function resetMapView(duration = 1.5) {
  focusMap(
    { x: OVERVIEW.center.x, y: OVERVIEW.center.y, z: OVERVIEW.center.z },
    OVERVIEW.radius,
    OVERVIEW.phi,
    duration,
  )
  gsap.to(mapCamera, { theta: OVERVIEW.theta, duration, ease: 'power3.inOut', overwrite: 'auto' })
}

/** Called by CameraRig before it blends the pose in. */
export function updateMapCamera(dt: number, pointer: { x: number; y: number }, reducedMotion: boolean) {
  const local = indiaBeatLocal(runtime.progress)
  const beat = beatById.get('india')
  const [start, end] = beat?.mapWindow ?? [0.3, 0.86]

  const influence =
    smoothstep((local - start) / 0.07) * smoothstep((end - local) / 0.07) * (local > -0.2 && local < 1.2 ? 1 : 0)
  mapCamera.influence = damp(mapCamera.influence, influence, 6, dt)
  runtime.mapInfluence = mapCamera.influence

  // the map rises out of the ground as the chapter opens, and sinks back into
  // darkness as it closes
  const rise = smoothstep((local - 0.06) / 0.24) * smoothstep((0.98 - local) / 0.12)
  mapCamera.emergence = damp(mapCamera.emergence, rise, reducedMotion ? 12 : 4.5, dt)
  runtime.mapBeatProgress = local
  runtime.mapInteractive = mapCamera.influence > 0.55

  // pointer drag orbits within strict limits — the website keeps control
  if (mapCamera.drag.lengthSq() > 0) {
    mapCamera.theta -= mapCamera.drag.x * 0.0055
    mapCamera.phi = clamp(mapCamera.phi + mapCamera.drag.y * 0.004, 0.42, 1.28)
    mapCamera.drag.set(0, 0)
  }

  const parallaxAmount = reducedMotion ? 0 : 0.9
  mapCamera.parallax.x = damp(mapCamera.parallax.x, pointer.x * parallaxAmount, 2.4, dt)
  mapCamera.parallax.y = damp(mapCamera.parallax.y, pointer.y * parallaxAmount, 2.4, dt)

  const lambda = reducedMotion ? 14 : 5.5
  const sinPhi = Math.sin(mapCamera.phi)
  const targetX = mapCamera.center.x + mapCamera.radius * sinPhi * Math.sin(mapCamera.theta) + mapCamera.parallax.x
  const targetZ = mapCamera.center.z + mapCamera.radius * sinPhi * Math.cos(mapCamera.theta)
  const targetY = mapCamera.center.y + mapCamera.radius * Math.cos(mapCamera.phi) + mapCamera.parallax.y

  mapCamera.position.x = damp(mapCamera.position.x, targetX, lambda, dt)
  mapCamera.position.y = damp(mapCamera.position.y, targetY, lambda, dt)
  mapCamera.position.z = damp(mapCamera.position.z, targetZ, lambda, dt)
  mapCamera.look.x = damp(mapCamera.look.x, mapCamera.center.x, lambda, dt)
  mapCamera.look.y = damp(mapCamera.look.y, mapCamera.center.y, lambda, dt)
  mapCamera.look.z = damp(mapCamera.look.z, mapCamera.center.z, lambda, dt)

  return mapCamera
}
