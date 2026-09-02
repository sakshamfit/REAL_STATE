'use client'

import { useMemo } from 'react'
import * as THREE from 'three'
import type { QualitySettings } from '@/lib/quality'
import { AssetModel } from '@/lib/glb'
import { materialForKey } from '@/lib/materials'
import { InstancedBoxes, type Item } from './primitives'

/**
 * The physical world the cinematic camera travels through.
 *
 * This is deliberately a real place, not a floating scene: a road corridor, a
 * boundary wall, Indian vegetation, street lights, parked vehicles and a
 * construction shed. Every object is grounded, scaled to real-world metres and
 * registered in `src/data/assets.ts`.
 */
export function RealWorld({ quality }: { quality: QualitySettings }) {
  const treePositions = useMemo(() => {
    const count = Math.max(6, Math.round(14 * Math.max(0.35, quality.density)))
    const positions: { x: number; z: number; kind: 'tree-a' | 'tree-b'; scale: number }[] = []
    for (let i = 0; i < count; i++) {
      const z = -8 - i * (38 / Math.max(1, count))
      positions.push({
        x: i % 2 === 0 ? -8.5 + Math.random() * 1.6 : 8.5 - Math.random() * 1.6,
        z,
        kind: i % 3 === 0 ? 'tree-b' : 'tree-a',
        scale: 0.82 + Math.random() * 0.4,
      })
    }
    return positions
  }, [quality.density])

  const streetLights = useMemo(() => {
    const count = Math.max(4, Math.round(6 * Math.max(0.5, quality.density)))
    return Array.from({ length: count }, (_, i) => ({
      x: 5.6,
      z: -12 - i * 70,
    }))
  }, [quality.density])

  const walls = useMemo(() => {
    const items: Item[] = []
    for (let z = 2; z >= -78; z -= 12.4) {
      items.push({ position: [-7.2, 0, z], scale: [1, 1, 1] })
      items.push({ position: [7.2, 0, z], scale: [1, 1, 1] })
    }
    return items
  }, [])

  const wallMaterial = materialForKey('render', { textureSize: quality.textureSize })

  return (
    <group>
      {/* boundary wall along the approach */}
      <InstancedBoxes items={walls} material={wallMaterial} />

      {/* vegetation */}
      {treePositions.map((tree, index) => (
        <AssetModel
          key={`${tree.kind}-${index}`}
          id={tree.kind}
          position={[tree.x, 0, tree.z]}
          scale={[tree.scale, tree.scale, tree.scale]}
          rotation={[0, (index * 0.71) % (Math.PI * 2), 0]}
          quality={quality}
          lod="auto"
        />
      ))}

      {/* street lights */}
      {streetLights.map((light, index) => (
        <AssetModel
          key={`light-${index}`}
          id="street-light"
          position={[light.x, 0, light.z]}
          rotation={[0, Math.PI, 0]}
          quality={quality}
          lod="auto"
        />
      ))}

      {/* parked / passing cars */}
      <AssetModel id="car-a" position={[-2.2, 0, -18]} rotation={[0, 0, 0]} quality={quality} lod="auto" />
      <AssetModel id="car-a" position={[2.3, 0, -128]} rotation={[0, Math.PI, 0]} quality={quality} lod="auto" />

      {/* construction shed beside the hero site */}
      <AssetModel id="construction-shed" position={[-15, 0, -53]} rotation={[0, 0.12, 0]} quality={quality} lod="auto" />
    </group>
  )
}
