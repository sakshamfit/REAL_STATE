/**
 * Runtime texture layer.
 *
 * Wraps the procedural surfaces in `src/lib/surface/` as three.js
 * DataTextures. Generation is lazy and chunked so the browser never blocks on
 * a 500 ms texture build while the world is on screen.
 */

import * as THREE from 'three'
import {
  asphaltSurface,
  barkSurface,
  brickSurface,
  concreteSurface,
  grassSurface,
  leafAtlas,
  metalSurface,
  paintSurface,
  renderSurface,
  roadPaintSurface,
  soilSurface,
  stoneSurface,
  type Surface,
  type SurfaceSize,
} from './surface/surfaces'

export type TextureSet = {
  map: THREE.Texture
  normalMap: THREE.Texture
  roughnessMap: THREE.Texture
}

type SurfaceFactory = (size: SurfaceSize) => Surface

/**
 * Surface registry. `tile` is the world size one repeat covers in metres; the
 * GLB generator bakes the same texel density into every asset's UVs.
 */
export const SURFACES: Record<string, { make: SurfaceFactory; tile: number }> = {
  asphalt: { make: (s) => asphaltSurface(s, 11), tile: 4 },
  roadPaint: { make: (s) => roadPaintSurface(s, 3), tile: 3 },
  asphaltPatch: { make: (s) => asphaltSurface(s, 211), tile: 3 },
  soil: { make: (s) => soilSurface(s, 21, { gravel: 0.5, dry: 0.55 }), tile: 6 },
  soilDry: { make: (s) => soilSurface(s, 37, { gravel: 0.62, dry: 0.85 }), tile: 5 },
  gravel: { make: (s) => soilSurface(s, 53, { gravel: 1.1, dry: 0.9 }), tile: 3 },
  grass: { make: (s) => grassSurface(s, 33), tile: 3 },
  leaf: { make: (s) => leafAtlas(s, 51), tile: 1 },
  leafWarm: { make: (s) => leafAtlas(s, 67, { hue: 0.12 }), tile: 1 },
  leafDry: { make: (s) => leafAtlas(s, 83, { dry: 0.85 }), tile: 1 },
  blades: { make: (s) => leafAtlas(s, 137, { blade: true }), tile: 1 },
  bladesDry: { make: (s) => leafAtlas(s, 149, { blade: true, dry: 0.9 }), tile: 1 },
  concrete: { make: (s) => concreteSurface(s, 61, { tint: 0.66 }), tile: 3 },
  concreteDark: { make: (s) => concreteSurface(s, 71, { tint: 0.42, pore: 0.7, streak: 0.7 }), tile: 3 },
  concreteLight: { make: (s) => concreteSurface(s, 79, { tint: 0.78, pore: 0.35, streak: 0.4 }), tile: 3 },
  render: { make: (s) => renderSurface(s, 71, { tint: 0.84, wear: 0.55 }), tile: 2.5 },
  renderWarm: { make: (s) => renderSurface(s, 89, { tint: 0.8, wear: 0.7 }), tile: 2.5 },
  renderOld: { make: (s) => renderSurface(s, 97, { tint: 0.66, wear: 1 }), tile: 2.5 },
  stone: { make: (s) => stoneSurface(s, 83, { tint: 0.6 }), tile: 2.5 },
  stoneBlock: { make: (s) => stoneSurface(s, 91, { tint: 0.58, blocks: 1 }), tile: 4 },
  metal: { make: (s) => metalSurface(s, 97, { brushed: 1 }), tile: 1.5 },
  metalRust: { make: (s) => metalSurface(s, 101, { rust: 0.7, brushed: 0.4 }), tile: 2 },
  metalDark: { make: (s) => metalSurface(s, 103, { rust: 0.25, brushed: 0.6 }), tile: 1.5 },
  bark: { make: (s) => barkSurface(s, 103), tile: 1.2 },
  paint: { make: (s) => paintSurface(s, 113), tile: 2 },
  brick: { make: (s) => brickSurface(s, 127), tile: 2.5 },
}

const surfaceCache = new Map<string, Surface>()
const textureCache = new Map<string, TextureSet>()

let defaultSize: SurfaceSize = 256

export function setSurfaceSize(size: SurfaceSize) {
  defaultSize = size
}

function getSurface(name: string, size: SurfaceSize): Surface | null {
  const key = `${name}-${size}`
  const hit = surfaceCache.get(key)
  if (hit) return hit
  const entry = SURFACES[name]
  if (!entry) return null
  const surface = entry.make(size)
  surfaceCache.set(key, surface)
  return surface
}

function dataTexture(data: Uint8Array, size: number, srgb: boolean, alpha: boolean): THREE.DataTexture {
  const texture = new THREE.DataTexture(data as unknown as Uint8Array<ArrayBuffer>, size, size, THREE.RGBAFormat)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace
  texture.magFilter = THREE.LinearFilter
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.generateMipmaps = true
  texture.anisotropy = 8
  texture.needsUpdate = true
  return texture
}

/** Memoised texture triple for a surface (albedo / roughness / normal). */
export function surfaceTextures(name: string, size: SurfaceSize = defaultSize): TextureSet | null {
  const key = `${name}-${size}`
  const hit = textureCache.get(key)
  if (hit) return hit
  const surface = getSurface(name, size)
  if (!surface) return null
  const set: TextureSet = {
    map: dataTexture(surface.albedo, surface.size, true, true),
    roughnessMap: dataTexture(surface.roughness, surface.size, false, false),
    normalMap: dataTexture(surface.normal, surface.size, false, false),
  }
  textureCache.set(key, set)
  return set
}

/** World size (metres) covered by one texture tile — used for UV generation. */
export function surfaceTile(name: string): number {
  return SURFACES[name]?.tile ?? 2
}

export const SURFACE_NAMES = Object.keys(SURFACES)

/**
 * Builds the surfaces that must exist before the first frame, yielding to the
 * browser between each one so the preloader keeps animating.
 */
export async function warmSurfaces(names: string[], size: SurfaceSize, onProgress?: (t: number) => void) {
  for (let i = 0; i < names.length; i++) {
    surfaceTextures(names[i], size)
    onProgress?.((i + 1) / names.length)
    // let the browser breathe between textures
    await new Promise((resolve) => setTimeout(resolve, 0))
  }
}

export function disposeTextureCache() {
  textureCache.forEach((set) => {
    set.map.dispose()
    set.normalMap.dispose()
    set.roughnessMap.dispose()
  })
  textureCache.clear()
  surfaceCache.clear()
}

/** Soft radial sprite — dust motes and light haze. */
let dust: THREE.Texture | null = null
export function dustSprite(): THREE.Texture {
  if (dust) return dust
  const size = 64
  const data = new Uint8Array(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x / size) * 2 - 1
      const dy = (y / size) * 2 - 1
      const d = Math.min(1, Math.sqrt(dx * dx + dy * dy))
      const a = Math.pow(1 - d, 2.6)
      const i = (y * size + x) * 4
      data[i] = 255
      data[i + 1] = 252
      data[i + 2] = 244
      data[i + 3] = Math.round(a * 255)
    }
  }
  dust = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
  dust.colorSpace = THREE.SRGBColorSpace
  dust.needsUpdate = true
  return dust
}
