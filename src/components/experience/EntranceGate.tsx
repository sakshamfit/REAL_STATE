'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { QualitySettings } from '@/lib/quality'
import { AssetModel } from '@/lib/glb'
import { GATE } from '@/lib/layout'
import { beatLocal } from '@/lib/chapters'
import { runtime } from '@/lib/store'
import { easeInOutCubic } from '@/lib/math'
import { GroundPatch } from './GroundPatch'

const LEAF_TRAVEL = 9.3

/**
 * Real compound gate: stone piers, name board, guard room and a sliding leaf
 * that runs back behind the boundary wall on its track. It opens with the
 * weight of a steel gate on rollers — slow start, slow stop, no bounce.
 */
export function EntranceGate({ quality }: { quality: QualitySettings }) {
  const leaf = useRef<THREE.Group>(null)

  useFrame(() => {
    const build = beatLocal('build', runtime.progress)
    const open = easeInOutCubic(Math.min(1, Math.max(0, (build - 0.16) / 0.2)))
    if (leaf.current) leaf.current.position.z = GATE.z - open * LEAF_TRAVEL
  })

  return (
    <group position={[GATE.x, 0, GATE.z]} rotation={[0, Math.PI / 2, 0]}>
      <AssetModel id="entrance-gate" quality={quality} lod="auto" />

      {/* the leaf runs on its own track, set back behind the wall line */}
      <group ref={leaf} position={[0, 0, 0]}>
        <AssetModel id="entrance-gate-leaf" position={[-0.55, 0, 0]} quality={quality} lod="auto" />
      </group>

      {/* compacted apron where site traffic turns off the road */}
      <GroundPatch
        surface="gravel"
        width={11}
        length={9}
        position={[0, 0.016, 3.6]}
        seed={63}
        dissolve={0.9}
        strength={0.85}
        opacity={0.6}
        quality={quality}
      />
    </group>
  )
}
