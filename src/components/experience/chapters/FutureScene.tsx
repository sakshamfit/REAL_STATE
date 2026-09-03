'use client'

import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { FUTURE_BUILDING } from '@/lib/world'
import { beatLocal } from '@/lib/chapters'
import { runtime } from '@/lib/store'
import { smoothstep } from '@/lib/math'
import { concreteMaterial, glassMaterial, metalMaterial } from '@/lib/materials'
import type { QualitySettings } from '@/lib/quality'
import { useChapterVisibility } from '../hooks'
import { GroundPatch } from '../GroundPatch'
import { Block, InstancedBoxes, type Item } from '../primitives'

const { x, z, width, depth, height } = FUTURE_BUILDING

/** The next structure: twisted slabs, solar skin, sustainable massing. */
export function FutureScene({ quality }: { quality: QualitySettings }) {
  const group = useChapterVisibility<THREE.Group>([x, height / 2, z], 420)
  const tower = useRef<THREE.Group>(null)

  const light = concreteMaterial('light', 1.4, quality.textureSize)
  const dark = concreteMaterial('dark', 2, quality.textureSize)
  const glass = glassMaterial('#101b20', 0.32)
  const steel = metalMaterial('dark', 3, quality.textureSize)
  const accent = metalMaterial('accent', 2, quality.textureSize)

  const { slabs, fins, edges, solar } = useMemo(() => {
    const levels = 8
    const slabs: Item[] = []
    const edges: Item[] = []
    for (let i = 0; i < levels; i++) {
      const y = 5 + i * 6.4
      const twist = i * 0.13
      slabs.push({ position: [0, y, 0], rotation: [0, twist, 0], scale: [width, 1.6, depth] })
      edges.push({ position: [0, y + 0.9, 0], rotation: [0, twist, 0], scale: [width * 0.99, 0.12, 0.12] })
      edges.push({ position: [0, y + 0.9, 0], rotation: [0, twist + Math.PI / 2, 0], scale: [depth * 0.99, 0.12, 0.12] })
    }

    const fins: Item[] = []
    for (let i = 0; i < levels; i++) {
      const y = 5 + i * 6.4
      const twist = i * 0.13
      for (let f = -2; f <= 2; f++) {
        fins.push({
          position: [f * 5.6, y + 3.4, depth / 2 - 0.6],
          rotation: [0, twist, 0],
          scale: [0.4, 5.2, 1.1],
        })
      }
    }

    const solar: Item[] = []
    for (let i = 0; i < levels; i++) {
      const y = 5 + i * 6.4 + 1.4
      const twist = i * 0.13
      for (let s = -2; s <= 2; s++) {
        solar.push({
          position: [s * 6.2, y + 1.6, -depth / 2 - 1.4],
          rotation: [-0.55, twist, 0],
          scale: [5.4, 0.16, 3],
        })
      }
    }

    return { slabs, fins, edges, solar }
  }, [])

  const solarMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#0b1216'),
        roughness: 0.18,
        metalness: 0.9,
        envMapIntensity: 1.5,
      }),
    [],
  )

  useFrame(() => {
    const t = beatLocal('future', runtime.progress)
    if (tower.current) {
      const a = smoothstep((t - 0.02) / 0.55)
      tower.current.scale.y = Math.max(0.0001, a)
      tower.current.visible = a > 0.003
    }
  })

  return (
    <group ref={group} position={[x, 0, z]}>
      <Block size={[width + 22, 1.6, depth + 22]} position={[0, 0.8, 0]} material={dark} />
      <Block size={[width + 12, 0.4, depth + 12]} position={[0, 1.8, 0]} material={light} />

      <group ref={tower}>
        <mesh position={[0, height / 2, 0]} material={dark}>
          <cylinderGeometry args={[3.6, 4.4, height, 16]} />
        </mesh>
        <InstancedBoxes items={slabs} material={light} />
        <Block size={[width * 0.94, height * 0.86, depth * 0.94]} position={[0, height * 0.5, 0]} material={glass} castShadow={false} />
        <InstancedBoxes items={fins} material={light} />
        <InstancedBoxes items={edges} material={accent} castShadow={false} receiveShadow={false} />
        <InstancedBoxes items={solar} material={solarMaterial} />

        {/* crown */}
        <Block size={[width * 0.7, 1.2, depth * 0.7]} position={[0, height + 2, 0]} material={light} />
        <mesh position={[0, height + 9, 0]} material={steel}>
          <cylinderGeometry args={[0.22, 0.34, 14, 8]} />
        </mesh>
        <mesh position={[0, height + 16.4, 0]} material={steel}>
          <sphereGeometry args={[0.42, 12, 12]} />
        </mesh>
      </group>

      <GroundPatch
        surface="soilDry"
        width={124}
        length={124}
        position={[0, 0.012, 0]}
        seed={601}
        dissolve={0.7}
        strength={0.95}
        opacity={0.85}
        quality={quality}
      />
    </group>
  )
}

