'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { QualitySettings } from '@/lib/quality'
import { InstancedAsset, type InstanceItem } from '@/lib/glb'
import { bladeMaterial, decalMaterial, windUniforms } from '@/lib/materials'
import { GRASS_LAYERS, grassPoints, shrubs, trees, type Placed } from '@/lib/layout'
import { prng, terrainHeight } from '@/lib/terrain'

/**
 * VEGETATION.
 *
 * Four tree species and two shrub species, scattered with a blue-noise
 * distribution and randomised scale/rotation/lean so no two specimens read as
 * clones, drawn as instanced meshes (one draw call per species per material).
 *
 * Ground cover is three layers of instanced blade cards — short grazed grass
 * near the road, taller weeds further out, dry stubble where the ground is
 * bare — all driven by the shared wind clock. Motion is a few centimetres of
 * gust travel, never a visible sway.
 */

const TIER = {
  low: { grass: 0.16 },
  mid: { grass: 0.5 },
  high: { grass: 1 },
} as const

const toInstances = (items: Placed[]): InstanceItem[] =>
  items.map((item) => ({
    position: [item.x, item.y ?? 0, item.z],
    rotation: item.rotation,
    scale: [item.scale ?? 1, item.scaleY ?? item.scale ?? 1, item.scale ?? 1],
  }))

/**
 * Leaf litter and damp soil at the foot of each specimen.
 *
 * Real trees bare and darken the ground under the crown; without it every
 * trunk reads as a prop dropped onto a lawn. One instanced disc per group, so
 * the whole tree line costs one extra draw call.
 */
export function ContactRings({ items, radius, opacity }: { items: Placed[]; radius: number; opacity: number }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const geometry = useMemo(() => {
    const disc = new THREE.CircleGeometry(1, 16)
    disc.rotateX(-Math.PI / 2)
    return disc
  }, [])
  const material = useMemo(() => decalMaterial('#1f1d17', opacity), [opacity])

  useEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    items.forEach((item, index) => {
      const scale = (item.scale ?? 1) * radius
      dummy.position.set(item.x + scale * 0.06, (item.y ?? 0) + 0.02, item.z + scale * 0.04)
      dummy.rotation.set(0, item.rotation * 0.5, 0)
      dummy.scale.set(scale, 1, scale * (0.9 + (index % 5) * 0.04))
      dummy.updateMatrix()
      mesh.setMatrixAt(index, dummy.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [items, radius, dummy])

  return (
    <instancedMesh
      ref={ref}
      args={[geometry, material, Math.max(1, items.length)]}
      renderOrder={1}
      frustumCulled={false}
    />
  )
}

export function Vegetation({ quality }: { quality: QualitySettings }) {
  const treeGroups = useMemo(() => trees(quality.tier), [quality.tier])
  const shrubGroups = useMemo(() => shrubs(quality.tier), [quality.tier])

  return (
    <group>
      {treeGroups.map((group) => (
        <group key={group.id}>
          <ContactRings items={group.items} radius={4.2} opacity={0.34} />
          <InstancedAsset id={group.id} items={toInstances(group.items)} quality={quality} />
        </group>
      ))}
      {shrubGroups.map((group) => (
        <group key={group.id}>
          <ContactRings items={group.items} radius={1.35} opacity={0.3} />
          <InstancedAsset
            id={group.id}
            items={toInstances(group.items)}
            quality={quality}
            castShadow={quality.tier !== 'low'}
          />
        </group>
      ))}
      <GrassCover density={TIER[quality.tier].grass} quality={quality} />
    </group>
  )
}

/** Single shared wind clock. Every wind-driven material reads from it. */
export function WindClock() {
  const state = useRef({ time: 0 })
  useFrame((_, delta) => {
    state.current.time += Math.min(delta, 0.05)
    windUniforms.uTime.value = state.current.time
  })
  return null
}

/* ----------------------------------------------------------------- grass */

function tuftGeometry(seed: number, quadrants: number[]) {
  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  let vertex = 0
  const random = prng(seed)

  for (const quad of quadrants) {
    const u0 = (quad % 2) * 0.5
    const v0 = Math.floor(quad / 2) * 0.5
    const angle = (quad / quadrants.length) * Math.PI + random() * 0.7
    const height = 0.34 + random() * 0.3
    const width = 0.2 + random() * 0.16
    const lean = 0.12 + random() * 0.2
    const dirX = Math.cos(angle)
    const dirZ = Math.sin(angle)
    const sideX = -dirZ
    const sideZ = dirX
    const cx = (random() - 0.5) * 0.08
    const cz = (random() - 0.5) * 0.08

    const base0x = cx - sideX * width * 0.5
    const base0z = cz - sideZ * width * 0.5
    const base1x = cx + sideX * width * 0.5
    const base1z = cz + sideZ * width * 0.5
    const tipX = cx + dirX * lean
    const tipZ = cz + dirZ * lean

    // two quads forming a shallow V so the tuft has volume from any angle
    positions.push(
      base0x, 0, base0z,
      base1x, 0, base1z,
      tipX, height * 0.62, tipZ,
      tipX, height * 0.62, tipZ,
      tipX, height, tipZ,
      base0x, 0, base0z,
    )
    uvs.push(u0, v0, u0 + 0.5, v0, u0 + 0.5, v0 + 0.5, u0 + 0.5, v0 + 0.5, u0, v0 + 0.5, u0, v0)
    indices.push(vertex, vertex + 1, vertex + 2, vertex + 3, vertex + 4, vertex + 5)
    vertex += 6
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

/**
 * Ground cover. Three instanced layers: short grazed grass beside the
 * carriageway, taller weeds and forbs further out, and dry stubble on the bare
 * ground. Each layer is one draw call.
 */
function GrassCover({ density, quality }: { density: number; quality: QualitySettings }) {
  const layers = useMemo(() => {
    return GRASS_LAYERS.map((spec) => {
      const random = prng(spec.seed + 5)
      const points = grassPoints(spec, density)
      const geometry = tuftGeometry(spec.seed + 1, spec.quadrants)
      const material = bladeMaterial(spec.dry, quality.textureSize, spec.dry ? 1.15 : 0.9)
      const mesh = new THREE.InstancedMesh(geometry, material, points.length)
      const dummy = new THREE.Object3D()
      points.forEach((point, index) => {
        const s = spec.scaleRange[0] + random() * (spec.scaleRange[1] - spec.scaleRange[0])
        dummy.position.set(point.x, terrainHeight(point.x, point.z) + 0.01, point.z)
        dummy.rotation.set(0, random() * Math.PI * 2, 0)
        dummy.scale.set(s * (0.85 + random() * 0.4), s, s * (0.85 + random() * 0.4))
        dummy.updateMatrix()
        mesh.setMatrixAt(index, dummy.matrix)
      })
      mesh.instanceMatrix.needsUpdate = true
      mesh.castShadow = false
      mesh.receiveShadow = false
      mesh.computeBoundingSphere()
      return mesh
    })
  }, [density, quality.textureSize])

  useEffect(
    () => () => {
      layers.forEach((layer) => layer.geometry.dispose())
    },
    [layers],
  )

  return (
    <group>
      {layers.map((layer, index) => (
        <primitive key={index} object={layer} />
      ))}
    </group>
  )
}
