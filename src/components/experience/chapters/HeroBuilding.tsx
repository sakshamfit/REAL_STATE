'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { HERO_BUILDING } from '@/lib/world'
import { beatLocal } from '@/lib/chapters'
import type { QualitySettings } from '@/lib/quality'
import { AssetModel } from '@/lib/glb'
import { GroundPatch } from '../GroundPatch'
import { concreteMaterial, glassMaterial } from '@/lib/materials'
import { useChapterVisibility } from '../hooks'

const { width, depth, height, x, z } = HERO_BUILDING

/**
 * HERO BUILDING — the primary architectural asset.
 *
 * The detailed massing comes from the registered GLB asset
 * (`hero-building.glb`), mapped through the PBR material library. A simple
 * foundation, tower crane and construction debris complete the real site.
 */
/**
 * HERO BUILDING — the primary architectural asset.
 *
 * The massing is the registered GLB (`hero-building.glb`) mapped through the
 * shared PBR library. Around it: a real plinth, a tower crane from the asset
 * library, scaffolding on the working elevation and construction debris. The
 * building is simply *there* — nothing grows out of the ground.
 */
export function HeroBuilding({ quality }: { quality: QualitySettings }) {
  const group = useChapterVisibility<THREE.Group>([x, height / 2, z], 460)
  const craneRef = useRef<THREE.Group>(null)
  const debrisRef = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])

  const debris = useMemo(() => {
    const count = Math.max(1, Math.round(26 * quality.density))
    const items: { position: [number, number, number]; rotation: number; scale: [number, number, number] }[] = []
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const radius = width * 0.7 + Math.random() * 20
      items.push({
        position: [Math.cos(angle) * radius, 0.14 + Math.random() * 0.34, Math.sin(angle) * radius],
        rotation: Math.random() * Math.PI,
        scale: [0.5 + Math.random() * 2.1, 0.25 + Math.random() * 0.7, 0.5 + Math.random() * 2.4],
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
    mesh.computeBoundingSphere()
  }, [debris, dummy])

  // a tower crane slews slowly and irregularly, it does not orbit
  useFrame((_, delta) => {
    const crane = craneRef.current
    if (!crane) return
    crane.rotation.y += Math.min(delta, 0.05) * 0.012
  })

  return (
    <group ref={group} position={[x, 0, z]}>
      {/* plinth the tower is founded on */}
      <mesh castShadow receiveShadow position={[0, 0.42, -6]}>
        <boxGeometry args={[width + 6, 0.84, depth + 6]} />
        <primitive object={concreteMaterial('dark', 2.4, quality.textureSize)} attach="material" />
      </mesh>

      <AssetModel
        id="hero-building"
        position={[0, 0, HERO_BUILDING.modelZOffset]}
        quality={quality}
        lod="high"
        fallback={<FallbackTower quality={quality} />}
      />

      {/* scaffolding on the elevation that is still being clad */}
      <AssetModel id="scaffolding" position={[-width * 0.5 - 1.6, 0, -14]} rotation={[0, 0, 0]} quality={quality} lod="auto" />
      <AssetModel id="scaffolding" position={[-width * 0.5 - 1.6, 0, -3]} rotation={[0, 0, 0]} quality={quality} lod="auto" />

      <instancedMesh
        ref={debrisRef}
        args={[new THREE.BoxGeometry(1, 1, 1), concreteMaterial('dark', 1.8, quality.textureSize), debris.length]}
        castShadow
        receiveShadow
        frustumCulled={false}
      />

      <group ref={craneRef} position={[width * 0.5 + 15, 0, -depth * 0.5 - 12]}>
        <AssetModel id="crane" quality={quality} lod="auto" />
      </group>

      <GroundPatch
        surface="soilDry"
        width={width * 4.2}
        length={depth * 4.2}
        position={[0, 0.01, 0]}
        seed={301}
        dissolve={0.8}
        strength={0.95}
        opacity={0.8}
        quality={quality}
      />
    </group>
  )
}

function FallbackTower({ quality }: { quality: QualitySettings }) {
  const concrete = concreteMaterial('mid', 1.6, quality.textureSize)
  const glass = glassMaterial('#3b5c64', 0.6)
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
