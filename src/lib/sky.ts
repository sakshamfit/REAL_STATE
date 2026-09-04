/**
 * Procedural sky.
 *
 * One equirectangular HDR gradient (with a real sun disc and a haze band) is
 * used for the background *and* run through PMREM for `scene.environment`, so
 * every piece of glass and metal in the world reflects the sky the visitor
 * actually sees. A second, low-frequency cloud sheet adds photographic cloud
 * structure without the cotton-wool look of billboard sprite clouds.
 */

import * as THREE from 'three'
import { fbm2 } from './terrain'

export type SkyOptions = {
  sunDirection: THREE.Vector3
  zenith: THREE.Color
  horizon: THREE.Color
  ground: THREE.Color
  sunColor: THREE.Color
  turbidity: number
  cloudiness: number
}

/**
 * Late morning, ~11:30. The sun sits at 52° — high enough that horizontal
 * surfaces (the carriageway, the yard, every roof and every leaf) receive
 * about 0.79 of the direct beam instead of the 0.56 a low 34° sun gives them,
 * which is the difference between a road that reads as asphalt and one that
 * reads as a shadow. Bearing is kept off-camera-right so facades are front-lit
 * rather than silhouetted.
 */
export const DEFAULT_SKY: SkyOptions = {
  sunDirection: new THREE.Vector3(-0.31, 0.788, 0.532).normalize(),
  zenith: new THREE.Color('#2f7fd6'),
  horizon: new THREE.Color('#e2ebf4'),
  ground: new THREE.Color('#948268'),
  sunColor: new THREE.Color('#fff6e3'),
  turbidity: 3.1,
  cloudiness: 0.46,
}

/** 32-bit float equirectangular sky (HDR: the sun is much brighter than 1). */
export function buildSkyTexture(options: SkyOptions = DEFAULT_SKY, width = 512): THREE.DataTexture {
  const height = width / 2
  const data = new Float32Array(width * height * 4)
  const sun = options.sunDirection.clone().normalize()
  const dir = new THREE.Vector3()

  for (let y = 0; y < height; y++) {
    const theta = ((y + 0.5) / height) * Math.PI
    const sinT = Math.sin(theta)
    const cosT = Math.cos(theta)
    for (let x = 0; x < width; x++) {
      const phi = ((x + 0.5) / width) * Math.PI * 2
      dir.set(sinT * Math.sin(phi), cosT, sinT * Math.cos(phi))

      const i = (y * width + x) * 4
      let r: number
      let g: number
      let b: number

      if (dir.y >= -0.02) {
        // sky gradient: dense horizon haze opening up towards the zenith.
        // `dir.y` goes slightly negative inside this branch (down to -0.02),
        // and a negative base with a fractional exponent is NaN — one whole
        // row of NaN at the horizon. The map is the scene background *and* the
        // source for PMREM, so those NaNs propagate through the irradiance
        // convolution and the entire environment contribution dies with them.
        // Clamped at zero before the exponent, never after.
        const t = Math.pow(Math.max(0, Math.min(1, dir.y)), 0.42)
        const band = Math.pow(1 - Math.min(1, dir.y), 6) * 0.35
        r = THREE.MathUtils.lerp(options.horizon.r, options.zenith.r, t) * (1 + band)
        g = THREE.MathUtils.lerp(options.horizon.g, options.zenith.g, t) * (1 + band)
        b = THREE.MathUtils.lerp(options.horizon.b, options.zenith.b, t) * (1 + band * 0.8)

        // sun disc + forward scattering halo
        const cosAngle = dir.dot(sun)
        const disc = Math.pow(Math.max(0, cosAngle), 2200) * 60
        const halo = Math.pow(Math.max(0, cosAngle), 26) * 0.55 * options.turbidity * 0.3
        const glow = Math.pow(Math.max(0, cosAngle), 3) * 0.12
        r += options.sunColor.r * (disc + halo + glow)
        g += options.sunColor.g * (disc + halo * 0.94 + glow)
        b += options.sunColor.b * (disc + halo * 0.86 + glow * 0.9)
      } else {
        // below the horizon: dusty ground bounce, darkening into the nadir
        const t = Math.min(1, -dir.y * 3)
        const k = 0.55 * (1 - t * 0.5)
        r = options.ground.r * k
        g = options.ground.g * k
        b = options.ground.b * k
      }

      data[i] = r
      data[i + 1] = g
      data[i + 2] = b
      data[i + 3] = 1
    }
  }

  const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat, THREE.FloatType)
  texture.mapping = THREE.EquirectangularReflectionMapping
  texture.colorSpace = THREE.LinearSRGBColorSpace
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.needsUpdate = true
  return texture
}

/** Soft alpha cloud sheet (equirect, 8-bit is plenty forAlpha). */
export function buildCloudTexture(seed = 5, width = 1024, cloudiness = 0.55): THREE.DataTexture {
  const height = width / 2
  const data = new Uint8Array(width * height * 4)
  for (let y = 0; y < height; y++) {
    const v = y / height
    for (let x = 0; x < width; x++) {
      const u = x / width
      // stretch horizontally near the horizon so clouds flatten with distance
      const stretch = 1 + Math.pow(1 - Math.abs(v - 0.42) * 2, 3) * 2.4
      const base = fbm2(u * 6 * stretch, v * 9, seed, 5)
      const detail = fbm2(u * 18 * stretch, v * 26, seed + 31, 3)
      const cover = base * 0.72 + detail * 0.28
      const threshold = 1 - cloudiness * 0.62
      let alpha = Math.max(0, (cover - threshold) / Math.max(0.05, 1 - threshold))
      // fade out at the zenith and below the horizon
      alpha *= Math.min(1, Math.max(0, (0.5 - Math.abs(v - 0.46)) * 6))
      alpha = Math.pow(Math.min(1, alpha), 1.5)

      // sunlit cumulus: bright tops, soft bases, never grey
      const shade = 0.86 + detail * 0.34
      const i = (y * width + x) * 4
      data[i] = Math.round(Math.min(1, shade) * 255)
      data[i + 1] = Math.round(Math.min(1, shade * 0.99) * 255)
      data[i + 2] = Math.round(Math.min(1, shade * 1.0) * 255)
      data[i + 3] = Math.round(Math.min(1, alpha) * 255)
    }
  }
  const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat)
  texture.mapping = THREE.EquirectangularReflectionMapping
  texture.colorSpace = THREE.SRGBColorSpace
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.needsUpdate = true
  return texture
}
