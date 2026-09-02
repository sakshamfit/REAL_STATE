'use client'

import { Html } from '@react-three/drei'
import { MATERIAL_GATES } from '@/lib/world'
import { beatLocal } from '@/lib/chapters'
import { runtime } from '@/lib/store'
import { smoothstep } from '@/lib/math'
import type { QualitySettings } from '@/lib/quality'
import { concreteMaterial, glassMaterial, metalMaterial, PALETTE } from '@/lib/materials'
import { useChapterVisibility } from '../hooks'
import { Block } from '../primitives'
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type * as THREE from 'three'

/**
 * Macro material world — four gates the camera flies through: concrete, steel,
 * glass, stone. Each one is a single material at architectural scale.
 */
export function MaterialGates({ quality }: { quality: QualitySettings }) {
  const group = useChapterVisibility<THREE.Group>([0, 8, -610], 260)

  return (
    <group ref={group}>
      {MATERIAL_GATES.map((gate, index) => (
        <Gate key={gate.material} gate={gate} index={index} quality={quality} />
      ))}
    </group>
  )
}

function Gate({
  gate,
  index,
  quality,
}: {
  gate: (typeof MATERIAL_GATES)[number]
  index: number
  quality: QualitySettings
}) {
  const ref = useRef<THREE.Group>(null)

  const material =
    gate.material === 'concrete'
      ? concreteMaterial('mid', 3, quality.textureSize)
      : gate.material === 'steel'
        ? metalMaterial('brushed', 4, quality.textureSize)
        : gate.material === 'glass'
          ? glassMaterial('#121c22', 0.42)
          : concreteMaterial('stone', 2.4, quality.textureSize)

  useFrame(() => {
    const t = beatLocal('material-world', runtime.progress)
    const group = ref.current
    if (!group) return
    const a = smoothstep((t - 0.08 - index * 0.09) / 0.3)
    group.scale.y = Math.max(0.0001, a)
    group.visible = a > 0.003
  })

  return (
    <group ref={ref} position={[0, 0, gate.z]}>
      <Block size={[9, 30, 5]} position={[-11.5, 12, 0]} material={material} />
      <Block size={[9, 30, 5]} position={[11.5, 12, 0]} material={material} />
      <Block size={[32, 9, 5]} position={[0, 21.5, 0]} material={material} />
      <Block size={[32, 6, 5]} position={[0, -1, 0]} material={material} />

      {/* light seam inside the frame */}
      <Block size={[0.18, 12, 0.18]} position={[-6.9, 7, 2.4]} material={concreteMaterial('dark', 1, quality.textureSize)} />
      <Block size={[0.18, 12, 0.18]} position={[6.9, 7, 2.4]} material={concreteMaterial('dark', 1, quality.textureSize)} />

      <Html
        transform
        position={[8.6, 15.4, 2.7]}
        distanceFactor={10}
        style={{ pointerEvents: 'none' }}
      >
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '13px',
            letterSpacing: '0.42em',
            color: PALETTE.metal,
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            opacity: 0.75,
          }}
        >
          {gate.label}
        </span>
      </Html>
    </group>
  )
}
