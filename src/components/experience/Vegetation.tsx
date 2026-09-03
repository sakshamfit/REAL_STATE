'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
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

/**
 * Distance levels for the tree line, in metres from the camera.
 *
 * The four species are generated three times: level 0 (three-bladed leaf
 * clusters — real volume, for trees you can walk up to), level 1 (single
 * cupped cards, the working horse) and level 2 (fewer, larger blades and a
 * leaner branch skeleton for the far boundary). Every level shares the same
 * skeleton and the same bounding box, so the swap is invisible; what changes
 * is where the triangles are spent.
 */
const TREE_LOD_BANDS: Record<string, [number, number]> = {
  high: [52, 135],
  mid: [36, 100],
  low: [0, 55],
}

function bandsForTier(tier: QualitySettings['tier']): [number, number] {
  return TREE_LOD_BANDS[tier] ?? TREE_LOD_BANDS.mid
}

/**
 * Splits one species into its three distance levels.
 *
 * Re-binned at most twice a second and only when a tree actually crosses a
 * boundary — a per-frame sort of the whole tree line would cost more than it
 * saves. Hysteresis keeps a specimen parked on the boundary from flickering
 * between levels.
 */
function TreeLod({ id, items, quality }: { id: string; items: Placed[]; quality: QualitySettings }) {
  const camera = useThree((state) => state.camera)
  const [near, far] = bandsForTier(quality.tier)
  const capacity = items.length
  const [buckets, setBuckets] = useState(() => ({ close: [] as Placed[], mid: items, distant: [] as Placed[] }))
  const state = useRef({ x: Number.NaN, z: Number.NaN, key: '', band: new Map<Placed, number>(), elapsed: 0 })

  useFrame((_, delta) => {
    state.current.elapsed += delta
    if (state.current.elapsed < 0.5) return
    state.current.elapsed = 0
    const position = camera.position
    if (Math.abs(position.x - state.current.x) < 1.5 && Math.abs(position.z - state.current.z) < 1.5) return
    state.current.x = position.x
    state.current.z = position.z

    const close: Placed[] = []
    const mid: Placed[] = []
    const distant: Placed[] = []
    const band = state.current.band
    for (const item of items) {
      const dx = item.x - position.x
      const dz = item.z - position.z
      const distance = Math.sqrt(dx * dx + dz * dz)
      // 4 m of slack in the direction the tree is already committed to: a
      // specimen sitting on a boundary must not flip level every time the
      // camera breathes
      const previous = band.get(item) ?? 1
      const nearEdge = previous === 0 ? near + 4 : near
      const farEdge = previous === 2 ? far - 4 : far
      const level = nearEdge > 0 && distance < nearEdge ? 0 : distance < farEdge ? 1 : 2
      band.set(item, level)
      if (level === 0) close.push(item)
      else if (level === 1) mid.push(item)
      else distant.push(item)
    }
    const key = `${close.length}/${mid.length}/${distant.length}`
    if (key === state.current.key) return
    state.current.key = key
    setBuckets({ close, mid, distant })
  })

  useEffect(() => {
    // tier change: re-bin from scratch on the next tick
    state.current.key = ''
    state.current.band.clear()
    state.current.elapsed = 1
  }, [quality.tier])

  const showClose = quality.tier !== 'low'
  return (
    <group>
      {showClose && buckets.close.length > 0 && (
        <InstancedAsset
          id={`${id}-close`}
          items={toInstances(buckets.close)}
          capacity={capacity}
          quality={quality}
        />
      )}
      {buckets.mid.length > 0 && (
        <InstancedAsset id={id} items={toInstances(buckets.mid)} capacity={capacity} quality={quality} />
      )}
      {buckets.distant.length > 0 && (
        <InstancedAsset
          id={`${id}-far`}
          items={toInstances(buckets.distant)}
          capacity={capacity}
          quality={quality}
        />
      )}
    </group>
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
          <TreeLod id={group.id} items={group.items} quality={quality} />
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
