import * as THREE from 'three'
import { concreteTextureSet, metalTextureSet, radialTexture } from './textures'

export const PALETTE = {
  black: '#080909',
  charcoal: '#111212',
  concrete: '#a5a29a',
  white: '#f2f0ea',
  muted: '#777773',
  metal: '#b8b4aa',
  accent: '#b99a63',
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
