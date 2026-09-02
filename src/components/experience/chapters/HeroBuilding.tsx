'use client'

import { forwardRef, useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { HERO_BUILDING } from '@/lib/world'
import { beatLocal } from '@/lib/chapters'
import { runtime } from '@/lib/store'
import { smoothstep } from '@/lib/math'
import type { QualitySettings } from '@/lib/quality'
import { AssetModel } from '@/lib/glb'
import { concreteMaterial, decalMaterial, metalMaterial, glassMaterial } from '@/lib/materials'
import { useChapterVisibility } from '../hooks'

const { width, depth, height, x, z } = HERO_BUILDING

/**
 * HERO BUILDING — the primary architectural asset.
 *
 * The detailed massing comes from the registered GLB asset
 * (`hero-building.glb`), mapped through the PBR material library. A simple
 * foundation, tower crane and construction debris complete the real site.
 */
export function HeroBuilding({ quality }: { quality: QualitySettings }) {
  const group = useChapterVisibility<THREE.Group>([x, height / 2, z], 460)
  const grow = useRef<THREE.Group>(null)
  const craneRef = useRef<THREE.Group>(null)
  const debrisRef = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])

  const debris = useMemo(() => {
    const count = Math.max(1, Math.round(18 * quality.density))
    const items: { position: [number, number, number]; rotation: number; scale: [number, number, number] }[] = []
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const radius = width * 0.75 + Math.random() * 22
      items.push({
        position: [Math.cos(angle) * radius, 0.35 + Math.random() * 0.5, Math.sin(angle) * radius],
        rotation: Math.random() * Math.PI,
        scale: [0.6 + Math.random() * 2.4, 0.5 + Math.random() * 1.2, 0.8 + Math.random() * 2.6],
      })
    }
    return items
  }, [quality.density])

  useEffect(() => {
    const mesh = debrisRef.current
    if (!mesh) return
    debris.forEach((item, index) => {
      dummy.position.set(...item.position)
      dummy.rotation.set(0, item.rotation, 0)
      dummy.scale.set(...item.scale)
      dummy.updateMatrix()
      mesh.setMatrixAt(index, dummy.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
  }, [debris, dummy])

  useFrame((state) => {
    const built = beatLocal('build', runtime.progress)
    const companyT = beatLocal('company', runtime.progress)
    const a = smoothstep((built - 0.08) / 0.42)
    if (grow.current) {
      grow.current.scale.y = Math.max(0.0001, a)
      grow.current.visible = a > 0.002
    }

    const cranePresence = smoothstep((built - 0.04) / 0.12) * (1 - smoothstep((companyT - 0.04) / 0.3))
    const crane = craneRef.current
    if (crane) {
      crane.visible = cranePresence > 0.01
      crane.scale.setScalar(Math.max(0.0001, cranePresence))
      crane.rotation.y = Math.sin(state.clock.elapsedTime * 0.07) * 0.22
    }

    if (debrisRef.current) {
      debrisRef.current.scale.setScalar(smoothstep((built - 0.01) / 0.18))
    }
  })

  return (
    <group ref={group} position={[x, 0, z]}>
      <mesh castShadow receiveShadow position={[0, 0.7, 3]}>
        <boxGeometry args={[width + 10, 1.4, depth + 10]} />
        <primitive object={concreteMaterial('dark', 2.4, quality.textureSize)} attach="material" />
      </mesh>

      <group ref={grow}>
        <AssetModel
          id="hero-building"
          position={[0, 0, -8.5]}
          quality={quality}
          lod="high"
          fallback={<FallbackTower quality={quality} />}
        />
      </group>

      <instancedMesh
        ref={debrisRef}
        args={[new THREE.BoxGeometry(1, 1, 1), concreteMaterial('dark', 1.8, quality.textureSize), debris.length]}
        castShadow
        receiveShadow
        frustumCulled={false}
      />

      <TowerCrane ref={craneRef} quality={quality} />

      <mesh rotation-x={-Math.PI / 2} position={[0, 0.09, 0]}>
        <planeGeometry args={[width * 3.6, depth * 3.6]} />
        <primitive object={decalMaterial('#2c2a24', 0.55)} attach="material" />
      </mesh>
    </group>
  )
}

function FallbackTower({ quality }: { quality: QualitySettings }) {
  const concrete = concreteMaterial('mid', 1.6, quality.textureSize)
  const glass = glassMaterial('#34535b', 0.34)
  return (
    <group>
      <mesh position={[0, height / 2, 1]} material={concrete} castShadow receiveShadow>
        <boxGeometry args={[width, height, depth]} />
      </mesh>
      <mesh position={[0, height / 2, 1]} material={glass} castShadow={false}>
        <boxGeometry args={[width * 0.82, height * 0.78, depth + 0.2]} />
      </mesh>
    </group>
  )
}

type CraneProps = { quality: QualitySettings }

const TowerCrane = forwardRef<THREE.Group, CraneProps>(function TowerCrane({ quality }, ref) {
  const mastHeight = height + 14
  const steel = metalMaterial('dark', 3, quality.textureSize)
  return (
    <group ref={ref} position={[-width * 0.5 - 17, 0, -depth * 0.5 - 8]}>
      <mesh position={[0, mastHeight / 2, 0]} castShadow>
        <boxGeometry args={[2.2, mastHeight, 2.2]} />
        <primitive object={steel} attach="material" />
      </mesh>
      <mesh position={[7.4, mastHeight + 0.8, 0]} material={steel} castShadow>
        <boxGeometry args={[28, 0.5, 0.7]} />
      </mesh>
      <mesh position={[-5.4, mastHeight + 0.8, 0]} material={steel} castShadow>
        <boxGeometry args={[8, 0.6, 0.7]} />
      </mesh>
      <mesh position={[1.4, mastHeight + 2.2, 0]} material={steel} castShadow>
        <boxGeometry args={[1.5, 1.5, 1.5]} />
      </mesh>
      <mesh position={[-6.8, mastHeight + 0.7, 0]} material={concreteMaterial('light', 1, quality.textureSize)} castShadow>
        <boxGeometry args={[2, 1.2, 1]} />
      </mesh>
      <mesh position={[19.4, mastHeight - 5, 0]} material={metalMaterial('dark', 1, quality.textureSize)}>
        <cylinderGeometry args={[0.08, 0.08, 13, 6]} />
      </mesh>
    </group>
  )
})
