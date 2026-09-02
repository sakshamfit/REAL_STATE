'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { QualitySettings } from '@/lib/quality'
import { AssetModel } from '@/lib/glb'
import { metalMaterial } from '@/lib/materials'
import { beatLocal } from '@/lib/chapters'
import { runtime } from '@/lib/store'
import { smoothstep } from '@/lib/math'

const GATE_Z = -28

/**
 * Real entrance gate. The static concrete/metal frame is the registered GLB;
 * the two leaves are animated as separate mechanisms so the visitor physically
 * passes through as the gate opens with heavy, mechanical easing.
 */
export function EntranceGate({ quality }: { quality: QualitySettings }) {
  const left = useRef<THREE.Group>(null)
  const right = useRef<THREE.Group>(null)
  const leftGlow = useRef<THREE.Group>(null)

  useFrame(() => {
    const build = beatLocal('build', runtime.progress)
    const openT = smoothstep((build - 0.18) / 0.18)
    const open = 1 - Math.pow(1 - openT, 3)

    if (left.current) left.current.rotation.y = open * (Math.PI * 0.62) * -1
    if (right.current) right.current.rotation.y = open * (Math.PI * 0.62)

    if (leftGlow.current) {
      leftGlow.current.visible = open > 0.02 && open < 0.6
    }
  })

  return (
    <group position={[0, 0, GATE_Z]}>
      <AssetModel id="entrance-gate" quality={quality} lod="auto" />

      <group ref={left} position={[-4.2, 0, 0]}>
        <LeafPanel side={-1} quality={quality} />
      </group>
      <group ref={right} position={[4.2, 0, 0]}>
        <LeafPanel side={1} quality={quality} />
      </group>

      <group ref={leftGlow} position={[0, 0.1, 0.4]}>
        <mesh rotation-x={-Math.PI / 2}>
          <planeGeometry args={[7.2, 1.2]} />
          <meshBasicMaterial color="#d9d9d9" transparent opacity={0.08} depthWrite={false} />
        </mesh>
      </group>
    </group>
  )
}

function LeafPanel({ side, quality }: { side: number; quality: QualitySettings }) {
  const dark = metalMaterial('dark', 2, quality.textureSize)
  const metal = metalMaterial('brushed', 2, quality.textureSize)
  return (
    <group>
      <mesh position={[side * 2.0, 1.45, 0]} material={dark} castShadow receiveShadow>
        <boxGeometry args={[3.8, 2.55, 0.14]} />
      </mesh>
      {[-1, -0.5, 0, 0.5, 1].map((offset) => (
        <mesh key={offset} position={[side * 2.0 + offset * 0.72, 1.35, 0.1]} material={metal} castShadow>
          <boxGeometry args={[0.08, 2.2, 0.14]} />
        </mesh>
      ))}
      <mesh position={[side * 2.0, 2.82, 0]} material={metal} castShadow>
        <boxGeometry args={[3.9, 0.1, 0.16]} />
      </mesh>
    </group>
  )
}
