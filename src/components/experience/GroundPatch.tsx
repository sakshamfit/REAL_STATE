'use client'

import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import type { QualitySettings } from '@/lib/quality'
import { patchGeometry } from '@/lib/decals'
import { patchMaterial } from '@/lib/materials'

/**
 * A soft-edged patch of ground: dust drift, a compacted yard, a spill, a
 * repair. Dissolved by noise so it never reads as a rectangle.
 */
export function GroundPatch({
  surface = 'soilDry',
  width,
  length,
  position,
  rotation = 0,
  seed = 7,
  dissolve = 1,
  strength = 1,
  opacity = 0.85,
  lift = 0.012,
  quality,
}: {
  surface?: 'soil' | 'soilDry' | 'gravel' | 'asphalt' | 'asphaltPatch' | 'concrete' | 'sand'
  width: number
  length: number
  position: [number, number, number]
  rotation?: number
  seed?: number
  dissolve?: number
  strength?: number
  opacity?: number
  lift?: number
  quality: QualitySettings
}) {
  const geometry = useMemo(
    () => patchGeometry({ width, length, seed, dissolve, strength, detail: quality.tier === 'low' ? 0.6 : 1 }),
    [width, length, seed, dissolve, strength, quality.tier],
  )
  const material = useMemo(
    () => patchMaterial(surface, quality.textureSize, opacity),
    [surface, opacity, quality.textureSize],
  )

  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <mesh
      geometry={geometry}
      material={material}
      position={[position[0], position[1] + lift, position[2]]}
      rotation-y={rotation}
      renderOrder={1}
      receiveShadow
    />
  )
}
