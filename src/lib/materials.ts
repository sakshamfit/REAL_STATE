import * as THREE from 'three'
import { concreteTextureSet, metalTextureSet, radialTexture } from './textures'

export const PALETTE = {
  black: '#101312',
  charcoal: '#232624',
  concrete: '#b5b0a4',
  white: '#f6f1e7',
  muted: '#848078',
  metal: '#aaa79d',
  accent: '#a88579',
  stone: '#a59a85',
  render: '#e3d7c4',
  foliage: '#5d774f',
  foliageB: '#6f8757',
  wood: '#8a6544',
  terracotta: '#b36745',
  asphalt: '#3b3d3d',
  soil: '#6b5744',
  mutedPaint: '#72857d',
} as const

const cache = new Map<string, THREE.Material>()

function memo<T extends THREE.Material>(key: string, make: () => T): T {
  const hit = cache.get(key)
  if (hit) return hit as T
  const material = make()
  cache.set(key, material)
  return material
}

type Variant = 'dark' | 'mid' | 'light' | 'stone'

const CONCRETE_COLOR: Record<Variant, string> = {
  dark: '#22241f',
  mid: '#3a3d3a',
  light: '#6f6c65',
  stone: '#585550',
}

/**
 * Board-formed concrete. `repeat` controls how many times the procedural
 * texture tiles across the surface.
 */
export function concreteMaterial(variant: Variant = 'mid', repeat = 1, textureSize: 256 | 512 = 512) {
  return memo(`concrete-${variant}-${repeat}-${textureSize}`, () => {
    const { map, normalMap, roughnessMap } = concreteTextureSet(textureSize, 1, variant === 'light' ? 0.78 : 0.55)
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(CONCRETE_COLOR[variant]),
      map,
      normalMap,
      roughnessMap,
      roughness: 0.92,
      metalness: 0.06,
      envMapIntensity: 0.5,
    })
    applyRepeat(material, repeat)
    return material
  })
}

export function metalMaterial(variant: 'dark' | 'brushed' | 'accent' = 'brushed', repeat = 1, textureSize: 256 | 512 = 256) {
  return memo(`metal-${variant}-${repeat}-${textureSize}`, () => {
    const set = metalTextureSet(textureSize, 1, variant === 'dark' ? 0.4 : variant === 'accent' ? 0.62 : 0.78)
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(variant === 'accent' ? PALETTE.accent : variant === 'dark' ? '#2d2f30' : '#8d8981'),
      map: set.map,
      normalMap: set.normalMap,
      roughnessMap: set.roughnessMap,
      roughness: variant === 'brushed' ? 0.34 : 0.5,
      metalness: 0.86,
      envMapIntensity: 1.1,
    })
    applyRepeat(material, repeat)
    return material
  })
}

export function glassMaterial(tint = '#0e1416', opacity = 0.24) {
  return memo(`glass-${tint}-${opacity}`, () => {
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(tint),
      roughness: 0.08,
      metalness: 0.92,
      transparent: true,
      opacity,
      envMapIntensity: 1.6,
      side: THREE.DoubleSide,
    })
    return material
  })
}

export type MaterialKey =
  | 'concrete'
  | 'darkConcrete'
  | 'lightConcrete'
  | 'stone'
  | 'render'
  | 'wood'
  | 'metal'
  | 'darkMetal'
  | 'glass'
  | 'asphalt'
  | 'soil'
  | 'foliage'
  | 'foliageB'
  | 'terracotta'
  | 'mutedPaint'

function physicalMaterial(
  key: string,
  color: string,
  roughness: number,
  metalness: number,
  envMapIntensity = 0.55,
) {
  return memo(`physical-${key}`, () => {
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      roughness,
      metalness,
      envMapIntensity,
    })
    return material
  })
}

export function renderMaterial(textureSize: 256 | 512 = 512) {
  return memo(`render-${textureSize}`, () => {
    const { map, normalMap, roughnessMap } = concreteTextureSet(textureSize, 2, 0.9)
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(PALETTE.render),
      map,
      normalMap,
      roughnessMap,
      roughness: 0.76,
      metalness: 0.02,
      envMapIntensity: 0.45,
    })
    return material
  })
}

export function stoneMaterial(textureSize: 256 | 512 = 512) {
  return memo(`stone-${textureSize}`, () => {
    const { map, normalMap, roughnessMap } = concreteTextureSet(textureSize, 1.6, 0.72)
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(PALETTE.stone),
      map,
      normalMap,
      roughnessMap,
      roughness: 0.82,
      metalness: 0.04,
      envMapIntensity: 0.5,
    })
    return material
  })
}

export function asphaltMaterial(textureSize: 256 | 512 = 256) {
  return memo(`asphalt-${textureSize}`, () => {
    const { map, normalMap, roughnessMap } = concreteTextureSet(textureSize, 1, 0.22)
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(PALETTE.asphalt),
      map,
      normalMap,
      roughnessMap,
      roughness: 0.95,
      metalness: 0.02,
      envMapIntensity: 0.25,
    })
    return material
  })
}

export function woodMaterial(textureSize: 256 | 512 = 256) {
  return memo(`wood-${textureSize}`, () => {
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(PALETTE.wood),
      roughness: 0.68,
      metalness: 0.02,
      envMapIntensity: 0.4,
    })
    return material
  })
}

export function foliageMaterial(color: string, textureSize: 256 | 512 = 256) {
  return memo(`foliage-${color}-${textureSize}`, () => {
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      roughness: 0.82,
      metalness: 0,
      envMapIntensity: 0.25,
    })
    return material
  })
}

export function terracottaMaterial(textureSize: 256 | 512 = 256) {
  return memo(`terracotta-${textureSize}`, () =>
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(PALETTE.terracotta),
      roughness: 0.76,
      metalness: 0.02,
      envMapIntensity: 0.4,
    }),
  )
}

export function mutedPaintMaterial(textureSize: 256 | 512 = 256) {
  return memo(`muted-paint-${textureSize}`, () =>
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(PALETTE.mutedPaint),
      roughness: 0.68,
      metalness: 0.08,
      envMapIntensity: 0.5,
    }),
  )
}

export function materialForKey(key: string, quality: { textureSize: 256 | 512; shade?: boolean }): THREE.Material {
  switch (key) {
    case 'render':
      return renderMaterial(quality.textureSize)
    case 'stone':
      return stoneMaterial(quality.textureSize)
    case 'concrete':
      return concreteMaterial('mid', 1.6, quality.textureSize)
    case 'darkConcrete':
      return concreteMaterial('dark', 1.8, quality.textureSize)
    case 'lightConcrete':
      return concreteMaterial('light', 1.4, quality.textureSize)
    case 'asphalt':
      return asphaltMaterial(quality.textureSize)
    case 'soil':
      return physicalMaterial('soil', PALETTE.soil, 1, 0)
    case 'wood':
      return woodMaterial(quality.textureSize)
    case 'metal':
      return metalMaterial('brushed', 2, quality.textureSize)
    case 'darkMetal':
      return metalMaterial('dark', 2, quality.textureSize)
    case 'glass':
      return glassMaterial('#34535b', 0.34)
    case 'foliage':
      return foliageMaterial(PALETTE.foliage, quality.textureSize)
    case 'foliageB':
      return foliageMaterial(PALETTE.foliageB, quality.textureSize)
    case 'terracotta':
      return terracottaMaterial(quality.textureSize)
    case 'mutedPaint':
      return mutedPaintMaterial(quality.textureSize)
    default:
      return concreteMaterial('mid', 1, quality.textureSize)
  }
}

export function emissiveMaterial(color: string, intensity = 1, opacity = 1) {
  return memo(`emissive-${color}-${intensity}-${opacity}`, () =>
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      emissive: new THREE.Color(color),
      emissiveIntensity: intensity,
      roughness: 0.4,
      metalness: 0,
      transparent: opacity < 1,
      opacity,
    }),
  )
}

/** Unlit flat material for silhouettes / far geometry. */
export function flatMaterial(color: string, opacity = 1) {
  return memo(`flat-${color}-${opacity}`, () =>
    new THREE.MeshBasicMaterial({ color: new THREE.Color(color), transparent: opacity < 1, opacity }),
  )
}

/** Soft radial blob used as a fake contact shadow or light pool. */
export function decalMaterial(color = '#000000', opacity = 0.5) {
  return memo(`decal-${color}-${opacity}`, () => {
    const texture = radialTexture(256, 2.4)
    return new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      alphaMap: texture,
      transparent: true,
      opacity,
      depthWrite: false,
    })
  })
}

/** Clone of the concrete base, safe to tint per instance / per state. */
export function stateBaseMaterial(textureSize: 256 | 512 = 512) {
  return memo(`state-base-${textureSize}`, () => {
    const { map, normalMap, roughnessMap } = concreteTextureSet(textureSize, 1, 0.5)
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#202324'),
      map,
      normalMap,
      roughnessMap,
      roughness: 0.78,
      metalness: 0.38,
      envMapIntensity: 0.75,
    })
    return material
  })
}

function applyRepeat(material: THREE.MeshStandardMaterial, repeat: number) {
  const textures = [material.map, material.normalMap, material.roughnessMap]
  textures.forEach((texture) => {
    if (!texture) return
    const clone = texture.clone()
    clone.needsUpdate = true
    clone.wrapS = THREE.RepeatWrapping
    clone.wrapT = THREE.RepeatWrapping
    clone.repeat.set(repeat, repeat)
    if (texture === material.map) material.map = clone
    else if (texture === material.normalMap) material.normalMap = clone
    else material.roughnessMap = clone
  })
}

export function disposeMaterials() {
  cache.forEach((material) => material.dispose())
  cache.clear()
}
