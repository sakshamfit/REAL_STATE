'use client'

import * as THREE from 'three'
import { materialForKey } from './materials'
import type { ExternalMaterialRule } from '@/data/assets'

/**
 * External asset material handling.
 *
 * The project's own GLBs are authored bare and get their whole surface from the
 * procedural material library. External assets are the opposite: they usually
 * arrive with real, photographed PBR that is better than anything we would
 * substitute.
 *
 * So the rule is *preserve first*:
 *
 *   textured external material  → keep it, correct only measurable defects
 *   untextured external material → substitute the project material library
 *
 * The defects corrected here are the ones the asset brief names: excessive
 * plastic appearance, wrong metalness, extreme roughness, broken transparency
 * and unrealistic colour. Each correction is numeric and conservative — the
 * point is to make an external object belong to the same physical world as the
 * hero building, not to restyle it.
 */

/** Materials already corrected, so a cloned scene never pays twice. */
const corrected = new WeakSet<THREE.Material>()

const isStandard = (material: THREE.Material): material is THREE.MeshStandardMaterial =>
  (material as THREE.MeshStandardMaterial).isMeshStandardMaterial === true

/**
 * Bring an external material into the project's lighting model.
 *
 * The scene is tone-mapped ACES under a single strong sun with a physical sky
 * environment. Materials authored for a neutral studio HDRI tend to read too
 * dark and too shiny in it, so the corrections below are mostly about matching
 * that response rather than changing the artist's intent.
 */
function correctStandard(material: THREE.MeshStandardMaterial, rule: ExternalMaterialRule, textureSize: 256 | 512) {
  const { corrections } = rule

  if (typeof corrections.metalness === 'number') material.metalness = corrections.metalness
  if (typeof corrections.roughness === 'number') material.roughness = corrections.roughness

  if (corrections.alphaMode === 'BLEND') {
    material.transparent = true
    material.depthWrite = false
  } else if (corrections.alphaMode === 'OPAQUE') {
    material.transparent = false
    material.opacity = 1
    material.depthWrite = true
  }

  if (corrections.clampColor) {
    const [lo, hi] = corrections.clampColor
    material.color.setRGB(
      THREE.MathUtils.clamp(material.color.r, lo, hi),
      THREE.MathUtils.clamp(material.color.g, lo, hi),
      THREE.MathUtils.clamp(material.color.b, lo, hi),
    )
  }

  // Colour-space and filtering hygiene: an external GLB may have been written
  // by a tool that got these wrong, and the symptom (washed-out albedo, mushy
  // normal maps at grazing angles) reads as "CGI" more than anything else.
  if (material.map) {
    material.map.colorSpace = THREE.SRGBColorSpace
    material.map.anisotropy = textureSize >= 512 ? 8 : 4
  }
  for (const map of [material.roughnessMap, material.metalnessMap, material.normalMap, material.aoMap] as const) {
    if (map) {
      map.colorSpace = THREE.NoColorSpace
      map.anisotropy = textureSize >= 512 ? 8 : 4
    }
  }
  if (material.emissiveMap) material.emissiveMap.colorSpace = THREE.SRGBColorSpace

  // Nothing in an outdoor daylight scene is a perfect mirror or perfectly matte.
  material.roughness = THREE.MathUtils.clamp(material.roughness, 0.045, 0.985)

  // Environment response: the scene supplies a physical sky, and external
  // assets should sample it as strongly as the project's own materials do.
  material.envMapIntensity = 1

  material.needsUpdate = true
}

/**
 * Apply one asset's external material policy to a loaded scene graph.
 *
 * @param root          the cloned GLB scene
 * @param rules         material name → rule, from the build manifest
 * @param textureSize   quality tier texture budget
 * @param tint          optional per-instance body-paint colour (brief §8)
 */
export function applyExternalMaterials(
  root: THREE.Object3D,
  rules: Record<string, ExternalMaterialRule>,
  textureSize: 256 | 512,
  options: { shadows: boolean; tint?: THREE.Color },
) {
  root.traverse((object) => {
    const mesh = object as THREE.Mesh
    if (!mesh.isMesh) return

    const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    const next = list.map((material) => {
      if (!material) return material
      const name = material.name ?? ''
      const rule = rules[name]

      // Unknown material: leave it exactly as the artist shipped it. Guessing
      // is what makes an integrated asset look pasted in.
      if (!rule) {
        if (isStandard(material)) material.envMapIntensity = 1
        return material
      }

      // Untextured and flagged as plastic — the project library genuinely has a
      // better version of this surface.
      if (rule.corrections.substitute && !rule.preserve) {
        return materialForKey(rule.key, { textureSize })
      }

      if (!isStandard(material)) return material

      // Per-instance body colour, where the asset's paint material is a flat
      // colour we can safely drive (brief §8: vary colour where permitted).
      if (rule.paintSlot && options.tint) {
        const clone = corrected.has(material) ? material.clone() : material
        clone.color.copy(options.tint)
        correctStandard(clone, rule, textureSize)
        corrected.add(clone)
        return clone
      }

      if (!corrected.has(material)) {
        correctStandard(material, rule, textureSize)
        corrected.add(material)
      }
      return material
    })

    mesh.material = Array.isArray(mesh.material) ? next : next[0]
    mesh.castShadow = options.shadows
    mesh.receiveShadow = options.shadows
  })
}

/**
 * Deterministic body-colour for a vehicle instance.
 *
 * Derived from where the car stands, so it never changes between reloads or
 * between the browser and the offline QA renderer. The palette is the muted
 * white / silver / grey / dark-blue / maroon spread you actually see on an
 * Indian arterial road, not a showroom rainbow.
 */
const BODY_COLOURS = ['#d8d9d6', '#b6bab9', '#7d8385', '#3d4650', '#2b3138', '#6e3b34', '#26343d', '#8d9095'] as const

export function bodyColourFor(x: number, z: number): THREE.Color {
  const hash = Math.abs(Math.sin(x * 12.9898 + z * 78.233) * 43758.5453)
  const index = Math.floor((hash - Math.floor(hash)) * BODY_COLOURS.length) % BODY_COLOURS.length
  return new THREE.Color(BODY_COLOURS[index])
}
