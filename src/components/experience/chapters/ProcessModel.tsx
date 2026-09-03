'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { PROCESS_MODEL, PROCESS_STAGE_Z } from '@/lib/world'
import { beatLocal } from '@/lib/chapters'
import { runtime } from '@/lib/store'
import { smoothstep } from '@/lib/math'
import type { QualitySettings } from '@/lib/quality'
import { concreteMaterial, glassMaterial, metalMaterial, paintMaterial } from '@/lib/materials'
import { useChapterVisibility } from '../hooks'
import { Block, InstancedBoxes, type Item } from '../primitives'
import { AssetModel } from '@/lib/glb'
import { GroundPatch } from '../GroundPatch'

const STAGE_BEATS = ['process-1', 'process-2', 'process-3', 'process-4', 'process-5']

/** Miniature construction environment — the whole method, visible at once. */
export function ProcessModel({ quality }: { quality: QualitySettings }) {
  const group = useChapterVisibility<THREE.Group>([PROCESS_MODEL.x, 6, -520], 230)
  const concrete = concreteMaterial('mid', 1, quality.textureSize)
  const dark = concreteMaterial('dark', 2, quality.textureSize)
  const steel = metalMaterial('dark', 2, quality.textureSize)
  const glass = glassMaterial('#16242b', 0.56)

  const survey = useMemo(() => {
    const items: Item[] = []
    const count = Math.round(64 * Math.max(0.5, quality.density))
    const side = Math.ceil(Math.sqrt(count))
    for (let i = 0; i < side; i++) {
      for (let j = 0; j < side; j++) {
        const height = 0.15 + Math.random() * 0.9
        items.push({
          position: [-6 + (i / (side - 1)) * 12, 0.3 + height / 2, -5 + (j / (side - 1)) * 10],
          scale: [0.55, height, 0.55],
        })
      }
    }
    return items
  }, [quality.density])

  const stock = useMemo(() => {
    const items: Item[] = []
    for (let i = 0; i < 14; i++) {
      items.push({
        position: [-5 + Math.random() * 10, 0.45 + Math.random() * 0.9, -4 + Math.random() * 8],
        rotation: [0, Math.random() * Math.PI, 0],
        scale: [1.4 + Math.random() * 1.6, 0.5 + Math.random() * 0.7, 1.2 + Math.random() * 1.4],
      })
    }
    return items
  }, [])

  return (
    <group ref={group} position={[PROCESS_MODEL.x, 0, 0]}>
      {/* site plate */}
      <Block size={[40, 0.5, 64]} position={[0, 0.25, -525]} material={dark} />
      <Block size={[40.6, 0.12, 64.6]} position={[0, 0.54, -525]} material={concrete} receiveShadow />
      <GroundPatch
        surface="soilDry"
        width={64}
        length={88}
        position={[0, 0.012, -525]}
        seed={501}
        dissolve={0.7}
        strength={0.95}
        opacity={0.85}
        quality={quality}
      />

      {/* stage plates */}
      {PROCESS_STAGE_Z.map((z, index) => (
        <StagePlate key={z} z={z} />
      ))}

      {/* 01 — requirement analysis */}
      <group position={[0, 0.7, PROCESS_STAGE_Z[0]]}>
        <group>
          <InstancedBoxes items={survey} material={concrete} />
          <mesh position={[0, 0.2, 0]} rotation-x={-Math.PI / 2} material={concreteMaterial('light', 1.5, quality.textureSize)}>
            <ringGeometry args={[5.2, 6, 48]} />
          </mesh>
        </group>
      </group>

      {/* 02 — design & planning */}
      <group position={[0, 0.7, PROCESS_STAGE_Z[1]]}>
        <group>
          <Block size={[13, 0.12, 9]} position={[0, 0.06, 0]} material={paintMaterial('#e8e2d2', 1, quality.textureSize)} castShadow={false} />
          <Block size={[13.4, 0.06, 9.4]} position={[0, 0.02, 0]} material={dark} castShadow={false} />
          {[-4, 0, 4].map((offset) => (
            <mesh key={offset} position={[-5.4, 0.3, offset]} rotation={[Math.PI / 2, 0, 0]} material={concrete}>
              <cylinderGeometry args={[0.34, 0.34, 3.2, 12]} />
            </mesh>
          ))}
          <Block size={[0.12, 1.6, 0.12]} position={[4.6, 0.8, -3]} material={steel} />
          <Block size={[0.12, 2.2, 0.12]} position={[5.4, 1.1, 2]} material={steel} />
        </group>
      </group>

      {/* 03 — procurement */}
      <group position={[0, 0.7, PROCESS_STAGE_Z[2]]}>
        <group>
          <InstancedBoxes items={stock} material={concrete} />
          <Block size={[5.4, 1.4, 2.2]} position={[3.6, 0.9, 0]} material={steel} />
          <Block size={[2.2, 1.1, 2]} position={[5.2, 2.1, 0]} material={metalMaterial('accent', 1, quality.textureSize)} />
          <Block size={[0.5, 0.5, 0.5]} position={[2.4, 0.4, 1.1]} material={steel} />
          <Block size={[0.5, 0.5, 0.5]} position={[2.4, 0.4, -1.1]} material={steel} />
        </group>
      </group>

      {/* 04 — execution */}
      <group position={[0, 0.7, PROCESS_STAGE_Z[3]]}>
        <AssetModel
          id="scaffolding"
          position={[-8, 0, 0]}
          rotation={[0, -0.3, 0]}
          quality={quality}
          lod="auto"
        />
        <MiniStructure quality={quality} concrete={concrete} steel={steel} glass={glass} />
      </group>

      {/* 05 — quality & safety */}
      <group position={[0, 0.7, PROCESS_STAGE_Z[4]]}>
        <group>
          <Block size={[10, 3.4, 7]} position={[0, 1.7, 0]} material={concrete} />
          <Block size={[10.2, 1.2, 7.2]} position={[0, 3.9, 0]} material={glass} castShadow={false} />
          {[-3.4, 0, 3.4].map((offset) => (
            <mesh key={offset} position={[offset, 0.65, 4.4]} material={paintMaterial('#d8c48a', 1, quality.textureSize)}>
              <coneGeometry args={[0.42, 1.3, 4]} />
            </mesh>
          ))}
          <mesh position={[0, 0.12, 0]} rotation-x={-Math.PI / 2} material={concreteMaterial('light', 1.5, quality.textureSize)}>
            <ringGeometry args={[6.4, 6.7, 64, 1, Math.PI * 0.15, Math.PI * 0.7]} />
          </mesh>
        </group>
      </group>

      <ScanSweep quality={quality} />
    </group>
  )
}

/** Per-stage floor plate. */
function StagePlate({ z }: { z: number }) {
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#8b857a'),
        roughness: 0.95,
        metalness: 0.02,
      }),
    [],
  )

  useEffect(() => () => material.dispose(), [material])

  return <Block size={[16, 0.14, 11]} position={[0, 0.74, z]} material={material} castShadow={false} />
}

function MiniStructure({
  quality,
  concrete,
  steel,
  glass,
}: {
  quality: QualitySettings
  concrete: THREE.Material
  steel: THREE.Material
  glass: THREE.Material
}) {
  const ref = useRef<THREE.Group>(null)

  useFrame(() => {
    const t = beatLocal('process-4', runtime.progress)
    const group = ref.current
    if (!group) return
    group.children.forEach((child, index) => {
      const a = smoothstep((t - 0.12 - index * 0.12) / 0.35)
      child.scale.y = Math.max(0.0001, a)
      child.position.y = (3.2 * a) / 2 + (1 - a) * 4
      child.visible = a > 0.002
    })
  })

  return (
    <group ref={ref}>
      {[0, 1, 2, 3].map((level) => (
        <group key={level}>
          <Block size={[9, 3.2, 7]} position={[0, 1.6, 0]} material={level % 2 === 0 ? concrete : steel} />
          <Block size={[9.2, 2.2, 7.2]} position={[0, 1.9, 0]} material={glass} castShadow={false} />
        </group>
      ))}
      <Block size={[0.18, 14, 0.18]} position={[6.2, 0, 4.2]} material={steel} />
    </group>
  )
}

function ScanSweep({ quality }: { quality: QualitySettings }) {
  const ref = useRef<THREE.Mesh>(null)
  const material = useMemo(() => paintMaterial('#d8c48a', 1, quality.textureSize), [quality.textureSize])

  useFrame((state) => {
    const mesh = ref.current
    if (!mesh) return
    const cycle = (state.clock.elapsedTime * 0.06) % 1
    mesh.position.z = -498 - cycle * 54
    mesh.visible = cycle < 0.98
  })

  return (
    <mesh ref={ref} position={[0, 1.6, -520]} material={material}>
      <boxGeometry args={[38, 0.05, 0.5]} />
    </mesh>
  )
}
