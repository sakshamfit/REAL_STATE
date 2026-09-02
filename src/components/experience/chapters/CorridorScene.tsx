'use client'

import { useMemo } from 'react'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { CORRIDOR } from '@/lib/world'
import { clients } from '@/data/company'
import { concreteMaterial, decalMaterial, emissiveMaterial, PALETTE } from '@/lib/materials'
import type { QualitySettings } from '@/lib/quality'
import { useChapterVisibility, useNearCamera } from '../hooks'
import { Block, InstancedBoxes, type Item } from '../primitives'

const LENGTH = CORRIDOR.to - CORRIDOR.from // negative
const CENTER_Z = (CORRIDOR.from + CORRIDOR.to) / 2

/** Client names are placed in the architecture — no logo wall, no cards. */
export function CorridorScene({ quality }: { quality: QualitySettings }) {
  const group = useChapterVisibility<THREE.Group>([0, 6, CENTER_Z], 260)
  const near = useNearCamera([0, 6, CENTER_Z], 170)

  const concrete = concreteMaterial('mid', 1.6, quality.textureSize)
  const dark = concreteMaterial('dark', 3, quality.textureSize)
  const lightStrip = emissiveMaterial('#efe6d2', 1.6)

  const { columns, strips } = useMemo(() => {
    const count = Math.floor(Math.abs(LENGTH) / 6)
    const columns: Item[] = []
    for (let i = 0; i <= count; i++) {
      const z = CORRIDOR.from + (i / count) * LENGTH
      columns.push({ position: [-CORRIDOR.width / 2 + 0.6, CORRIDOR.height / 2, z], scale: [1.3, CORRIDOR.height, 1.3] })
      columns.push({ position: [CORRIDOR.width / 2 - 0.6, CORRIDOR.height / 2, z], scale: [1.3, CORRIDOR.height, 1.3] })
    }
    const strips: Item[] = []
    const stripCount = Math.floor(Math.abs(LENGTH) / 11)
    for (let i = 0; i <= stripCount; i++) {
      const z = CORRIDOR.from + (i / stripCount) * LENGTH
      strips.push({ position: [0, CORRIDOR.height - 0.5, z], scale: [1.1, 0.14, 3.4] })
    }
    return { columns, strips }
  }, [])

  const names = clients.map((client, index) => {
    const t = (index + 0.6) / (clients.length + 0.4)
    const z = CORRIDOR.from + t * LENGTH
    const side = index % 2 === 0 ? -1 : 1
    return {
      client,
      position: [side * 5.6, 3.4 + (index % 3) * 1.1, z] as [number, number, number],
      rotation: [0, side * -0.42, 0] as [number, number, number],
    }
  })

  return (
    <group ref={group}>
      <Block
        size={[CORRIDOR.width, 0.6, Math.abs(LENGTH) + 8]}
        position={[0, 0.3, CENTER_Z]}
        material={dark}
        castShadow={false}
      />
      <Block size={[CORRIDOR.width + 3, 0.9, Math.abs(LENGTH) + 8]} position={[0, CORRIDOR.height + 0.45, CENTER_Z]} material={dark} />
      <InstancedBoxes items={columns} material={concrete} />
      <InstancedBoxes items={strips} material={lightStrip} castShadow={false} receiveShadow={false} />

      {/* light at the end of the corridor */}
      <mesh position={[0, 5.5, CORRIDOR.to - 1]} material={emissiveMaterial('#f2ead8', 1.1)}>
        <planeGeometry args={[9, 11]} />
      </mesh>
      <mesh position={[0, 5.5, CORRIDOR.from + 1]} rotation-y={Math.PI} material={emissiveMaterial('#f2ead8', 0.35)}>
        <planeGeometry args={[9, 11]} />
      </mesh>

      <mesh rotation-x={-Math.PI / 2} position={[0, 0.7, CENTER_Z]}>
        <planeGeometry args={[CORRIDOR.width, Math.abs(LENGTH)]} />
        <primitive object={decalMaterial('#000000', 0.45)} attach="material" />
      </mesh>

      {near
        ? names.map((item) => (
            <Html
              key={item.client}
              transform
              position={item.position}
              rotation={item.rotation}
              distanceFactor={9}
              style={{ pointerEvents: 'none' }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '15px',
                  fontWeight: 500,
                  letterSpacing: '0.24em',
                  lineHeight: 1.25,
                  color: PALETTE.white,
                  textTransform: 'uppercase',
                  maxWidth: '190px',
                  display: 'block',
                  textShadow: '0 0 40px rgba(0,0,0,0.8)',
                }}
              >
                {item.client}
              </span>
            </Html>
          ))
        : null}
    </group>
  )
}
