'use client'

import { Html } from '@react-three/drei'
import { MATERIAL_GATES } from '@/lib/world'
import { beatLocal } from '@/lib/chapters'
import type { QualitySettings } from '@/lib/quality'
import { concreteMaterial, glassMaterial, metalMaterial, PALETTE } from '@/lib/materials'
import { useChapterVisibility } from '../hooks'
import { Block } from '../primitives'
import { useRef } from 'react'
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
          ? glassMaterial('#182730', 0.62)
          : concreteMaterial('stone', 2.4, quality.textureSize)

  void ref

  return (
    <group ref={ref} position={[0, 0, gate.z]}>
      {/* a gateway straddling the carriageway: two piers, a head beam, a plinth */}
      <Block size={[7, 17, 4.2]} position={[-13, 8.5, 0]} material={material} />
      <Block size={[7, 17, 4.2]} position={[13, 8.5, 0]} material={material} />
      <Block size={[34, 4.4, 4.6]} position={[0, 19.2, 0]} material={material} />
      <Block size={[7.6, 0.8, 4.8]} position={[-13, 0.4, 0]} material={concreteMaterial('dark', 2, quality.textureSize)} />
      <Block size={[7.6, 0.8, 4.8]} position={[13, 0.4, 0]} material={concreteMaterial('dark', 2, quality.textureSize)} />

      <Html
        transform
        position={[8.6, 12.4, 2.5]}
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
