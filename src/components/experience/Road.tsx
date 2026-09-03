'use client'

import { useEffect, useMemo } from 'react'
import type { QualitySettings } from '@/lib/quality'
import { buildRoadParts } from '@/lib/road-geometry'
import { roadPartMaterial } from '@/lib/materials'

export { Z_START, Z_END, HALF, SHOULDER, VERGE, RESERVE } from '@/lib/road-geometry'
export { carriagewayHeight } from '@/lib/road-geometry'

/**
 * THE ROAD.
 *
 * Geometry comes from `src/lib/road-geometry.ts` so the offline QA rasteriser
 * renders exactly the same road: graded carriageway with camber, worn
 * thermoplastic markings, re-laid patches, polished wheel tracks, dusty gravel
 * shoulders, kerb stones and open drains.
 */
export function Road({ quality }: { quality: QualitySettings }) {
  const step = quality.tier === 'low' ? 12 : quality.tier === 'mid' ? 8 : 5
  const parts = useMemo(() => buildRoadParts(step, quality.tier), [step, quality.tier])

  useEffect(
    () => () => {
      parts.forEach((part) => part.geometry.dispose())
    },
    [parts],
  )

  return (
    <group>
      {parts.map((part, index) => (
        <mesh
          key={index}
          geometry={part.geometry}
          material={roadPartMaterial(part, quality.textureSize)}
          receiveShadow
          renderOrder={part.key === 'film' || part.key === 'paint' || part.key === 'patch' ? 1 : 0}
        />
      ))}
    </group>
  )
}
