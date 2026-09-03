/**
 * The daylight rig, in one place.
 *
 * Every number that decides how bright the world is lives here so that the
 * renderer, the composer and the offline QA script (`scripts/qa/daylight.mjs`)
 * all read the same values. When the site looks wrong, this is the file to
 * open — not three different copies of an exposure constant.
 */

import * as THREE from 'three'

/**
 * Exposure. Applied once, and used by both paths: three uploads
 * `toneMappingExposure` to every program that declares it, which includes the
 * tone-mapping effect material inside the composer, so the low tier (no
 * composer) and the high/mid tier (composer) are exposed identically.
 */
export const DAYLIGHT_EXPOSURE = 1.22

/** Direct sun irradiance, in three's units. */
export const SUN_INTENSITY = 5.2

/** Warm white daylight — 5500 K-ish, not golden hour. */
export const SUN_COLOR = new THREE.Color('#fff6e3')

/**
 * Sky fill. The hemisphere light and the image-based lighting do the same job
 * from different directions: the hemisphere is a cheap up/down gradient, the
 * IBL is the real sky convolved into irradiance. Together they keep the shadow
 * side of a facade readable without flattening the sun.
 */
export const FILL_SKY = new THREE.Color('#a8cbe8')
export const FILL_BOUNCE = new THREE.Color('#9a8b6d')
export const HEMI_INTENSITY = 0.95
export const AMBIENT_COLOR = new THREE.Color('#d2dde2')
export const AMBIENT_INTENSITY = 0.14

/** IBL and backdrop: the sky contributes more than 1:1 in bright daylight. */
export const ENVIRONMENT_INTENSITY = 1.15
export const BACKGROUND_INTENSITY = 1.05

/**
 * Sanity ranges. `scripts/qa/daylight.mjs` fails if the rig falls outside
 * these, so "someone lowered the sun for mood" cannot ship silently.
 */
export const DAYLIGHT_LIMITS = {
  exposure: [1.0, 1.6] as const,
  sunIntensity: [4.0, 8.0] as const,
  sunElevationDegrees: [40, 70] as const,
}
