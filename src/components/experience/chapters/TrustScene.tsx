'use client'

import { Html } from '@react-three/drei'
import { TRUST_STRUCTURE } from '@/lib/world'
import { trustPillars } from '@/data/company'
import { beatLocal } from '@/lib/chapters'
import { runtime } from '@/lib/store'
import { smoothstep } from '@/lib/math'
import { concreteMaterial, decalMaterial, emissiveMaterial, PALETTE } from '@/lib/materials'
import type { QualitySettings } from '@/lib/quality'
import { useChapterVisibility, useNearCamera } from '../hooks'
import { Block } from '../primitives'
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type * as THREE from 'three'

const WORD_POSITIONS: { position: [number, number, number]; rotation: [number, number, number] }[] = [
  { position: [-19, 8.5, 6], rotation: [0, 0.5, 0] },
  { position: [19, 13.5, 2], rotation: [0, -0.5, 0] },
  { position: [-17.5, 20, -4], rotation: [0, 0.42, 0] },
  { position: [18, 25.5, -8], rotation: [0, -0.42, 0] },
]

/** Almost complete darkness. One structure. Four words. */
export function TrustScene({ quality }: { quality: QualitySettings }) {
  const { x, z } = TRUST_STRUCTURE
  const group = useChapterVisibility<THREE.Group>([x, 14, z], 220)
  const glowRef = useRef<THREE.Mesh>(null)
  const near = useNearCamera([x, 14, z], 150)

  const concrete = concreteMaterial('dark', 2.4, quality.textureSize)
  const accent = emissiveMaterial(PALETTE.accent, 1.4)

  useFrame(() => {
    const t = beatLocal('trust', runtime.progress)
    if (glowRef.current) {
      const intensity = smoothstep((t - 0.15) / 0.4)
      const material = glowRef.current.material as THREE.MeshStandardMaterial
      material.emissiveIntensity = 0.4 + intensity * 2.2
      glowRef.current.scale.x = Math.max(0.0001, intensity)
    }
  })

  return (
    <group ref={group} position={[x, 0, z]}>
      <Block size={[40, 1.2, 30]} position={[0, 0.6, 0]} material={concrete} />
      <Block size={[4.4, 26, 4.4]} position={[-13, 13, -9]} material={concrete} />
      <Block size={[4.4, 26, 4.4]} position={[13, 13, -9]} material={concrete} />
      <Block size={[4.4, 26, 4.4]} position={[-13, 13, 9]} material={concrete} />
      <Block size={[4.4, 26, 4.4]} position={[13, 13, 9]} material={concrete} />
      <Block size={[34, 4.4, 26]} position={[0, 28.2, 0]} material={concrete} />
      <Block size={[30, 0.2, 22]} position={[0, 26.1, 0]} material={concrete} />

      <mesh ref={glowRef} position={[0, 25.4, 0]} material={accent}>
        <boxGeometry args={[28, 0.16, 0.16]} />
      </mesh>

      <mesh rotation-x={-Math.PI / 2} position={[0, 0.08, 0]}>
        <planeGeometry args={[80, 70]} />
        <primitive object={decalMaterial('#000000', 0.7)} attach="material" />
      </mesh>

      {near
        ? trustPillars.map((pillar, index) => (
            <Html
              key={pillar}
              transform
              position={WORD_POSITIONS[index].position}
              rotation={WORD_POSITIONS[index].rotation}
              distanceFactor={11}
              style={{ pointerEvents: 'none' }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10,
                  fontFamily: 'var(--font-display)',
                  fontSize: '11px',
                  fontWeight: 500,
                  letterSpacing: '0.42em',
                  color: PALETTE.concrete,
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                }}
              >
                <span
                  style={{
                    width: 5,
                    height: 5,
                    background: PALETTE.accent,
                    display: 'inline-block',
                  }}
                />
                {pillar}
              </span>
            </Html>
          ))
        : null}
    </group>
  )
}
