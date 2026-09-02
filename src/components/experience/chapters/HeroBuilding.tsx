'use client'

import { forwardRef, useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { HERO_BUILDING } from '@/lib/world'
import { beatLocal } from '@/lib/chapters'
import { runtime } from '@/lib/store'
import { smoothstep } from '@/lib/math'
import type { QualitySettings } from '@/lib/quality'
import { concreteMaterial, decalMaterial, glassMaterial, metalMaterial, emissiveMaterial } from '@/lib/materials'
import { useChapterVisibility } from '../hooks'

const { width, depth, height, floors, x, z } = HERO_BUILDING
const FLOOR_HEIGHT = height / floors

type Part = {
  px: number
  py: number
  pz: number
  sx: number
  sy: number
  sz: number
  start: number
  duration: number
  drop: number
  mode: 'growY' | 'growAll'
}

function buildParts() {
  const columns: Part[] = []
  const slabs: Part[] = []
  const glass: Part[] = []
  const strips: Part[] = []

  const offsets = [-0.34, 0.34]
  const columnPositions: [number, number][] = []
  for (const sx of [-1, 1]) {
    for (const ox of offsets) {
      for (const sz of [-1, 1]) {
        for (const oz of offsets) {
          columnPositions.push([ox * width * sx, oz * depth * sz])
        }
      }
    }
  }

  for (let floor = 0; floor < floors; floor++) {
    const base = floor * FLOOR_HEIGHT

    for (const [cx, cz] of columnPositions) {
      columns.push({
        px: cx,
        py: base,
        pz: cz,
        sx: 0.9,
        sy: FLOOR_HEIGHT,
        sz: 0.9,
        start: 0.13 + floor * 0.0265 + Math.random() * 0.014,
        duration: 0.075,
        drop: 7,
        mode: 'growY',
      })
    }

    slabs.push({
      px: 0,
      py: base + FLOOR_HEIGHT - 0.22,
      pz: 0,
      sx: width,
      sy: 0.44,
      sz: depth,
      start: 0.2 + floor * 0.027,
      duration: 0.09,
      drop: 6,
      mode: 'growAll',
    })

    for (let side = 0; side < 4; side++) {
      const alongX = side < 2
      const sign = side % 2 === 0 ? 1 : -1
      glass.push({
        px: alongX ? 0 : sign * (width / 2 + 0.22),
        py: base + FLOOR_HEIGHT * 0.03,
        pz: alongX ? sign * (depth / 2 + 0.22) : 0,
        sx: alongX ? width : 0.18,
        sy: FLOOR_HEIGHT * 0.94,
        sz: alongX ? 0.18 : depth,
        start: 0.43 + floor * 0.026,
        duration: 0.1,
        drop: 0,
        mode: 'growY',
      })
    }

    if (floor % 2 === 0) {
      strips.push({
        px: 0,
        py: base + FLOOR_HEIGHT - 0.8,
        pz: 0,
        sx: width * 0.86,
        sy: 0.1,
        sz: depth * 0.86,
        start: 0.5 + floor * 0.02,
        duration: 0.12,
        drop: 0,
        mode: 'growAll',
      })
    }
  }

  return { columns, slabs, glass, strips }
}

const dummy = new THREE.Object3D()

export function HeroBuilding({ quality }: { quality: QualitySettings }) {
  const group = useChapterVisibility<THREE.Group>([x, height / 2, z], 460)
  const columnsRef = useRef<THREE.InstancedMesh>(null)
  const slabsRef = useRef<THREE.InstancedMesh>(null)
  const glassRef = useRef<THREE.InstancedMesh>(null)
  const stripsRef = useRef<THREE.InstancedMesh>(null)
  const coreRef = useRef<THREE.Mesh>(null)
  const foundationRef = useRef<THREE.Mesh>(null)
  const craneRef = useRef<THREE.Group>(null)
  const debrisRef = useRef<THREE.InstancedMesh>(null)

  const parts = useMemo(buildParts, [])

  const geometries = useMemo(
    () => ({
      unit: new THREE.BoxGeometry(1, FLOOR_HEIGHT, 1),
      slab: new THREE.BoxGeometry(1, 0.44, 1),
      panel: new THREE.BoxGeometry(1, 1, 1),
      strip: new THREE.BoxGeometry(1, 0.1, 1),
    }),
    [],
  )

  const materials = useMemo(
    () => ({
      concrete: concreteMaterial('mid', 0.6, quality.textureSize),
      darkConcrete: concreteMaterial('dark', 1.8, quality.textureSize),
      glass: glassMaterial('#0d1417', 0.32),
      strip: emissiveMaterial('#f2e6cb', 0),
    }),
    [quality.textureSize],
  )

  const debris = useMemo(() => {
    const count = Math.max(1, Math.round(30 * quality.density))
    const items: { position: [number, number, number]; rotation: number; scale: [number, number, number] }[] = []
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const radius = width * 0.8 + Math.random() * 30
      items.push({
        position: [Math.cos(angle) * radius, 0.4 + Math.random() * 0.8, Math.sin(angle) * radius],
        rotation: Math.random() * Math.PI,
        scale: [0.9 + Math.random() * 3.2, 0.6 + Math.random() * 1.6, 0.9 + Math.random() * 4],
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
  }, [debris])

  useFrame((state) => {
    const built = beatLocal('build', runtime.progress)
    const companyT = beatLocal('company', runtime.progress)

    const apply = (mesh: THREE.InstancedMesh | null, list: Part[], scaleXZ: boolean) => {
      if (!mesh) return
      for (let i = 0; i < list.length; i++) {
        const part = list[i]
        const a = smoothstep((built - part.start) / part.duration)
        if (a <= 0.001) {
          dummy.position.set(0, -9999, 0)
          dummy.scale.set(0.0001, 0.0001, 0.0001)
        } else {
          const heightScale = part.mode === 'growY' ? a : a
          const widthScale = scaleXZ ? Math.max(0.0001, a) : 1
          dummy.position.set(part.px, part.py + (part.sy * heightScale) / 2 + (1 - a) * part.drop, part.pz)
          dummy.scale.set(part.sx * widthScale, Math.max(0.0001, part.sy * heightScale), part.sz * widthScale)
        }
        dummy.updateMatrix()
        mesh.setMatrixAt(i, dummy.matrix)
      }
      mesh.instanceMatrix.needsUpdate = true
    }

    apply(columnsRef.current, parts.columns, false)
    apply(slabsRef.current, parts.slabs, true)
    apply(glassRef.current, parts.glass, false)
    apply(stripsRef.current, parts.strips, true)

    const coreA = smoothstep((built - 0.26) / 0.44)
    if (coreRef.current) {
      coreRef.current.scale.y = Math.max(0.0001, coreA)
      coreRef.current.position.y = (height * coreA) / 2
      coreRef.current.visible = coreA > 0.002
    }

    const foundationA = smoothstep((built - 0.015) / 0.13)
    if (foundationRef.current) {
      foundationRef.current.scale.set(1, Math.max(0.0001, foundationA), 1)
      foundationRef.current.position.y = (1.4 * foundationA) / 2 + (1 - foundationA) * 3
      foundationRef.current.visible = foundationA > 0.002
    }

    const stripMaterial = materials.strip as THREE.MeshStandardMaterial
    const intensity = smoothstep((built - 0.55) / 0.35) * 0.4 + smoothstep((companyT - 0.08) / 0.5) * 1.6
    stripMaterial.emissiveIntensity = intensity
    stripMaterial.opacity = Math.min(1, 0.3 + intensity * 0.6)

    const crane = craneRef.current
    if (crane) {
      const presence = smoothstep((built - 0.04) / 0.12) * (1 - smoothstep((companyT - 0.04) / 0.28))
      crane.visible = presence > 0.01
      crane.scale.setScalar(Math.max(0.0001, presence))
      crane.rotation.y = Math.sin(state.clock.elapsedTime * 0.07) * 0.32
    }

    if (debrisRef.current) {
      debrisRef.current.scale.setScalar(smoothstep((built - 0.01) / 0.18))
    }
  })

  return (
    <group ref={group} position={[x, 0, z]}>
      <mesh ref={foundationRef} castShadow receiveShadow>
        <boxGeometry args={[width + 8, 1.4, depth + 8]} />
        <primitive object={concreteMaterial('dark', 2.4, quality.textureSize)} attach="material" />
      </mesh>

      <instancedMesh
        ref={columnsRef}
        args={[geometries.unit, materials.concrete, parts.columns.length]}
        castShadow
        receiveShadow
        frustumCulled={false}
      />
      <instancedMesh
        ref={slabsRef}
        args={[geometries.slab, materials.concrete, parts.slabs.length]}
        castShadow
        receiveShadow
        frustumCulled={false}
      />
      <instancedMesh
        ref={glassRef}
        args={[geometries.panel, materials.glass, parts.glass.length]}
        frustumCulled={false}
      />
      <instancedMesh
        ref={stripsRef}
        args={[geometries.strip, materials.strip, parts.strips.length]}
        frustumCulled={false}
      />

      <mesh ref={coreRef} castShadow receiveShadow>
        <boxGeometry args={[7.6, height, 7.6]} />
        <primitive object={concreteMaterial('dark', 1.4, quality.textureSize)} attach="material" />
      </mesh>

      <mesh position={[0, height + 1.8, 0]}>
        <boxGeometry args={[width * 0.66, 0.8, depth * 0.66]} />
        <primitive object={metalMaterial('dark', 3, quality.textureSize)} attach="material" />
      </mesh>

      <instancedMesh
        ref={debrisRef}
        args={[geometries.slab, materials.darkConcrete, debris.length]}
        castShadow
        receiveShadow
        frustumCulled={false}
      />

      <TowerCrane ref={craneRef} quality={quality} />

      <mesh rotation-x={-Math.PI / 2} position={[0, 0.09, 0]}>
        <planeGeometry args={[width * 3.6, depth * 3.6]} />
        <primitive object={decalMaterial('#000000', 0.6)} attach="material" />
      </mesh>
    </group>
  )
}

type CraneProps = { quality: QualitySettings }

const TowerCrane = forwardRef<THREE.Group, CraneProps>(function TowerCrane({ quality }, ref) {
  const mastHeight = height + 18
  const jib = 46

  return (
    <group ref={ref} position={[-width * 0.5 - 18, 0, -depth * 0.5 - 8]}>
      <mesh position={[0, mastHeight / 2, 0]} castShadow>
        <boxGeometry args={[2.4, mastHeight, 2.4]} />
        <primitive object={metalMaterial('accent', 5, quality.textureSize)} attach="material" />
      </mesh>
      <mesh position={[0, mastHeight + 1.8, 0]}>
        <boxGeometry args={[4.6, 2.6, 4.6]} />
        <primitive object={metalMaterial('dark', 2, quality.textureSize)} attach="material" />
      </mesh>
      <mesh position={[jib * 0.32, mastHeight + 4.8, 0]}>
        <boxGeometry args={[jib, 1.1, 1.5]} />
        <primitive object={metalMaterial('accent', 8, quality.textureSize)} attach="material" />
      </mesh>
      <mesh position={[-8, mastHeight + 4.8, 0]}>
        <boxGeometry args={[17, 1.2, 1.7]} />
        <primitive object={metalMaterial('accent', 3, quality.textureSize)} attach="material" />
      </mesh>
      <mesh position={[-15.8, mastHeight + 2.8, 0]}>
        <boxGeometry args={[3.4, 2.8, 3.4]} />
        <primitive object={concreteMaterial('dark', 1, quality.textureSize)} attach="material" />
      </mesh>
      <mesh position={[jib * 0.6, mastHeight + 4.8 - 17, 0]}>
        <boxGeometry args={[0.09, 34, 0.09]} />
        <primitive object={metalMaterial('dark', 1, quality.textureSize)} attach="material" />
      </mesh>
      <mesh position={[jib * 0.6, mastHeight + 4.8 - 34.4, 0]}>
        <boxGeometry args={[1.7, 1.3, 1.7]} />
        <primitive object={metalMaterial('dark', 1, quality.textureSize)} attach="material" />
      </mesh>
    </group>
  )
})
