/**
 * Ground decals.
 *
 * Dust drift, spill marks, compacted yards and patch repairs are drawn as thin
 * soft-edged patches that sit a few millimetres above the ground. The edges are
 * dissolved with a noise field and carried in the vertex alpha, so a patch
 * fades into the terrain instead of ending on a hard rectangular line — the
 * single biggest giveaway of a "3D website" ground plane.
 */

import * as THREE from 'three'
import { fbm2, prng } from './terrain'

export type PatchOptions = {
  width: number
  length: number
  seed?: number
  /** 0 = rectangular slab, 1 = fully dissolved blob */
  dissolve?: number
  /** subdivisions per 4 metres */
  detail?: number
  /** overall opacity multiplier baked into the vertex alpha */
  strength?: number
}

/**
 * Flat patch in the XZ plane with an RGBA vertex-colour attribute. The colour
 * is white; the alpha carries the falloff.
 */
export function patchGeometry({
  width,
  length,
  seed = 7,
  dissolve = 1,
  detail = 1,
  strength = 1,
}: PatchOptions): THREE.BufferGeometry {
  const nx = Math.max(3, Math.round((width / 4) * detail) + 2)
  const nz = Math.max(3, Math.round((length / 4) * detail) + 2)
  const geometry = new THREE.PlaneGeometry(width, length, nx, nz)
  geometry.rotateX(-Math.PI / 2)

  const position = geometry.getAttribute('position') as THREE.BufferAttribute
  const count = position.count
  const colors = new Float32Array(count * 4)
  const random = prng(seed * 977 + 13)
  const wobble = random() * 10

  for (let i = 0; i < count; i++) {
    const x = position.getX(i)
    const z = position.getZ(i)
    const u = (x / width) * 2 // -1..1
    const v = (z / length) * 2

    // smooth edge falloff
    const edge = Math.min(1, (1 - Math.abs(u)) / 0.34) * Math.min(1, (1 - Math.abs(v)) / 0.34)
    const noise = fbm2(x * 0.22 + wobble, z * 0.22, seed, 3)
    let alpha = Math.min(1, Math.max(0, edge * (0.45 + noise * 1.35)))
    if (dissolve > 0) {
      const blob = fbm2(x * 0.1 + wobble, z * 0.1, seed + 17, 3)
      alpha = alpha * (1 - dissolve) + alpha * blob * 1.6 * dissolve
    }
    alpha = Math.min(1, alpha * strength)

    colors[i * 4] = 1
    colors[i * 4 + 1] = 1
    colors[i * 4 + 2] = 1
    colors[i * 4 + 3] = alpha
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 4))
  return geometry
}
