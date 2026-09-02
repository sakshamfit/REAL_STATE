'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { SERVICE_WORLDS } from '@/lib/world'
import { beatLocal } from '@/lib/chapters'
import { runtime } from '@/lib/store'
import { smoothstep } from '@/lib/math'
import type { QualitySettings } from '@/lib/quality'
import {
  concreteMaterial,
  decalMaterial,
  emissiveMaterial,
  glassMaterial,
  metalMaterial,
  PALETTE,
} from '@/lib/materials'
import { useChapterVisibility } from '../hooks'
import { Block, Grow, InstancedBoxes, type Item } from '../primitives'
import { AssetModel } from '@/lib/glb'

export function ServicesWorlds({ quality }: { quality: QualitySettings }) {
  return (
    <>
      <CivilFrame quality={quality} />
      <Residence quality={quality} />
      <Infrastructure quality={quality} />
      <SolarField quality={quality} />
      <Renovation quality={quality} />
      <Warehouse quality={quality} />
    </>
  )
}

/* ------------------------------------------------------------------ 01 CIVIL */

function CivilFrame({ quality }: { quality: QualitySettings }) {
  const { x, z } = SERVICE_WORLDS.civil
  const group = useChapterVisibility<THREE.Group>([x, 10, z], 220)
  const concrete = concreteMaterial('mid', 1.2, quality.textureSize)
  const dark = concreteMaterial('dark', 2, quality.textureSize)
  const steel = metalMaterial('accent', 3, quality.textureSize)

  const { columns, beams, braces } = useMemo(() => {
    const xs = [-13, -4.5, 4.5, 13]
    const zs = [-15, -5, 5, 15]
    const columns: Item[] = []
    for (const cx of xs) for (const cz of zs) columns.push({ position: [cx, 10, cz], scale: [1.25, 20, 1.25] })

    const beams: Item[] = []
    for (const cz of zs) {
      beams.push({ position: [0, 20.8, cz], scale: [28, 1.2, 1.2] })
      beams.push({ position: [0, 10.6, cz], scale: [28, 0.9, 0.9] })
    }
    for (const cx of xs) {
      beams.push({ position: [cx, 20.8, 0], scale: [1.2, 1.2, 32] })
      beams.push({ position: [cx, 10.6, 0], scale: [0.9, 0.9, 32] })
    }

    const braces: Item[] = []
    for (const cx of [-13, 13]) {
      for (const cz of [-10, 10]) {
        braces.push({
          position: [cx * 0.82, 15.4, cz],
          rotation: [0, 0, cx > 0 ? -0.68 : 0.68],
          scale: [0.42, 0.42, 15],
        })
      }
    }
    return { columns, beams, braces }
  }, [])

  return (
    <group ref={group} position={[x, 0, z]}>
      <Grow beat="service-civil" start={0.03} duration={0.4}>
        <Block size={[36, 0.6, 42]} position={[0, 0.3, 0]} material={dark} />
        <InstancedBoxes items={columns} material={concrete} />
        <InstancedBoxes items={beams} material={concrete} />
        <InstancedBoxes items={braces} material={steel} />
        {/* real scaffolding modules */}
        <AssetModel id="scaffolding" position={[-11, 0, 12]} quality={quality} lod="auto" />
        <AssetModel id="scaffolding" position={[11, 0, -14]} rotation={[0, Math.PI, 0]} quality={quality} lod="auto" />
        {/* scaffold planks */}
        <Block size={[28, 0.3, 1.6]} position={[0, 15.6, -12]} material={steel} />
        <Block size={[28, 0.3, 1.6]} position={[0, 15.6, 12]} material={steel} />
      </Grow>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.06, 0]}>
        <planeGeometry args={[70, 70]} />
        <primitive object={decalMaterial('#000000', 0.5)} attach="material" />
      </mesh>
    </group>
  )
}

/* ------------------------------------------------------------- 02 RESIDENTIAL */

function Residence({ quality }: { quality: QualitySettings }) {
  const { x, z } = SERVICE_WORLDS.residential
  const group = useChapterVisibility<THREE.Group>([x, 6, z], 200)
  const light = concreteMaterial('light', 1.4, quality.textureSize)
  const dark = concreteMaterial('dark', 2, quality.textureSize)
  const glass = glassMaterial('#0f161a', 0.3)
  const warm = emissiveMaterial('#f6e7c6', 1.1)
  const water = metalMaterial('dark', 2, quality.textureSize)

  return (
    <group ref={group} position={[x, 0, z]}>
      <Grow beat="service-residential" start={0.03} duration={0.42}>
        <Block size={[36, 0.8, 24]} position={[0, 0.4, 0]} material={dark} />

        {/* real residential GLB massing; procedural pavilion is the fallback */}
        <AssetModel
          id="residential-building"
          position={[0, 0, 0]}
          quality={quality}
          fallback={
            <>
              <Block size={[20, 4, 12.4]} position={[0, 2.6, 0]} material={warm} />
              <Block size={[20.6, 4.6, 13]} position={[0, 2.6, 0]} material={glass} castShadow={false} />
              <Block size={[24, 4.2, 13]} position={[3, 8, 0]} material={light} />
              <Block size={[26, 0.6, 15]} position={[2.4, 10.4, 0]} material={light} />
              <Block size={[0.7, 6.4, 0.7]} position={[-8.4, 4.6, 5.4]} material={light} />
              <Block size={[0.7, 6.4, 0.7]} position={[-8.4, 4.6, -5.4]} material={light} />
              <Block size={[0.35, 4.2, 13.4]} position={[14.6, 8, 0]} material={light} />
              <Block size={[0.35, 4.2, 13.4]} position={[8.6, 8, 0]} material={light} />
            </>
          }
        />
      </Grow>

      {/* reflecting pool */}
      <mesh rotation-x={-Math.PI / 2} position={[-11, 0.09, 8]}>
        <planeGeometry args={[16, 10]} />
        <primitive object={water} attach="material" />
      </mesh>

      {/* bollards */}
      <Block size={[0.3, 0.9, 0.3]} position={[-2, 1.25, 10]} material={emissiveMaterial(PALETTE.accent, 1.4)} />
      <Block size={[0.3, 0.9, 0.3]} position={[4, 1.25, 10]} material={emissiveMaterial(PALETTE.accent, 1.4)} />
      <Block size={[0.3, 0.9, 0.3]} position={[10, 1.25, 10]} material={emissiveMaterial(PALETTE.accent, 1.4)} />

      <mesh rotation-x={-Math.PI / 2} position={[0, 0.05, 0]}>
        <planeGeometry args={[80, 70]} />
        <primitive object={decalMaterial('#000000', 0.5)} attach="material" />
      </mesh>
    </group>
  )
}

/* ---------------------------------------------------------- 03 INFRASTRUCTURE */

function Infrastructure({ quality }: { quality: QualitySettings }) {
  const { x, z } = SERVICE_WORLDS.infrastructure
  const group = useChapterVisibility<THREE.Group>([x, 8, z], 240)
  const concrete = concreteMaterial('mid', 1.6, quality.textureSize)
  const dark = concreteMaterial('dark', 3, quality.textureSize)
  const steel = metalMaterial('dark', 4, quality.textureSize)
  const road = concreteMaterial('dark', 8, quality.textureSize)

  const { arch, hangers, dashes } = useMemo(() => {
    const arch: Item[] = []
    const segments = 18
    const span = 42
    const rise = 15
    const deckY = 16
    const points: [number, number][] = []
    for (let i = 0; i <= segments; i++) {
      const t = i / segments
      points.push([x + (t - 0.5) * span, deckY + rise * Math.cos((t - 0.5) * Math.PI)])
    }
    for (let i = 0; i < segments; i++) {
      const [ax, ay] = points[i]
      const [bx, by] = points[i + 1]
      const length = Math.hypot(bx - ax, by - ay) * 1.15
      const angle = Math.atan2(by - ay, bx - ax)
      arch.push({
        position: [(ax + bx) / 2, (ay + by) / 2, 0],
        rotation: [0, 0, angle],
        scale: [length, 1.1, 1.4],
      })
    }

    const hangers: Item[] = []
    for (let i = 1; i < segments; i++) {
      const [px, py] = points[i]
      const height = py - deckY
      if (height < 1.2) continue
      hangers.push({ position: [px, deckY + height / 2, 0], scale: [0.22, height, 0.22] })
    }

    const dashes: Item[] = []
    for (let d = -68; d <= 68; d += 9) {
      dashes.push({ position: [x, 0.12, z + d], scale: [0.6, 0.06, 3.4] })
    }
    return { arch, hangers, dashes }
  }, [x, z])

  return (
    <group ref={group}>
      {/* road */}
      <mesh rotation-x={-Math.PI / 2} position={[x, 0.04, z]} receiveShadow>
        <planeGeometry args={[22, 150]} />
        <primitive object={road} attach="material" />
      </mesh>
      <InstancedBoxes items={dashes} material={emissiveMaterial(PALETTE.accent, 0.9)} castShadow={false} />

      <Grow beat="service-infrastructure" start={0.05} duration={0.45}>
        {/* real bridge GLB; procedural arch is the fallback */}
        <AssetModel
          id="bridge"
          position={[x, 0, z]}
          quality={quality}
          fallback={
            <>
              <Block size={[44, 1.3, 16]} position={[x, 16, z]} material={concrete} />
              <Block size={[44, 1.4, 0.7]} position={[x, 17.2, z - 7.7]} material={concrete} />
              <Block size={[44, 1.4, 0.7]} position={[x, 17.2, z + 7.7]} material={concrete} />
              <Block size={[4.2, 16, 9]} position={[x - 18, 8, z]} material={dark} />
              <Block size={[4.2, 16, 9]} position={[x + 18, 8, z]} material={dark} />
              <Block size={[6, 16, 12]} position={[x - 24, 8, z]} material={dark} />
              <Block size={[6, 16, 12]} position={[x + 24, 8, z]} material={dark} />
              <InstancedBoxes items={arch} material={concrete} />
              <InstancedBoxes items={hangers} material={steel} />
            </>
          }
        />
      </Grow>
    </group>
  )
}

/* ------------------------------------------------------------ 04 SOLAR */

function SolarField({ quality }: { quality: QualitySettings }) {
  const { x, z } = SERVICE_WORLDS.solar
  const group = useChapterVisibility<THREE.Group>([x, 2, z], 240)
  const tracker = useRef<THREE.Group>(null)

  const panelMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#0a1013'),
        roughness: 0.16,
        metalness: 0.88,
        envMapIntensity: 1.5,
      }),
    [],
  )

  const { panels, posts } = useMemo(() => {
    const cols = Math.round(11 * Math.max(0.5, quality.density))
    const rows = Math.round(7 * Math.max(0.5, quality.density))
    const panels: Item[] = []
    const posts: Item[] = []
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const px = x + (i - (cols - 1) / 2) * 4.3
        const pz = z + (j - (rows - 1) / 2) * 3.6
        panels.push({ position: [px, 1.5, pz], rotation: [-0.42, 0, 0], scale: [3.6, 0.14, 2.1] })
        posts.push({ position: [px, 0.7, pz], scale: [0.18, 1.4, 0.18] })
      }
    }
    return { panels, posts }
  }, [x, z, quality.density])

  useFrame(() => {
    if (tracker.current) {
      const t = beatLocal('service-solar', runtime.progress)
      tracker.current.rotation.x = -0.42 + Math.sin(t * Math.PI) * 0.12
    }
  })

  return (
    <group ref={group} position={[0, 0, 0]}>
      <Grow beat="service-solar" start={0.05} duration={0.5}>
        {/* detailed tracker GLBs near the camera */}
        {[-8, 0, 8].map((dx, index) => (
          <AssetModel
            key={`solar-${dx}`}
            id="solar-panel"
            position={[x + dx, 0, z + (index - 1) * 4.5]}
            rotation={[0, 0.18 * (index - 1), 0]}
            quality={quality}
            lod="auto"
          />
        ))}
        <group ref={tracker}>
          <InstancedBoxes items={panels} material={panelMaterial} />
        </group>
        <InstancedBoxes items={posts} material={metalMaterial('dark', 1, quality.textureSize)} />

        {/* substation */}
        <Block size={[7, 3.6, 4.6]} position={[x - 24, 1.8, z + 16]} material={concreteMaterial('dark', 1.4, quality.textureSize)} />
        <Block size={[7.4, 0.4, 5]} position={[x - 24, 3.8, z + 16]} material={metalMaterial('dark', 2, quality.textureSize)} />
        <Block size={[0.8, 6, 0.8]} position={[x - 20.6, 3, z + 16]} material={metalMaterial('accent', 2, quality.textureSize)} />

        {/* inverter rows */}
        <Block size={[2.2, 1.6, 1.2]} position={[x + 22, 0.8, z - 12]} material={metalMaterial('dark', 1, quality.textureSize)} />
        <Block size={[2.2, 1.6, 1.2]} position={[x + 22, 0.8, z - 9]} material={metalMaterial('dark', 1, quality.textureSize)} />
      </Grow>

      <mesh rotation-x={-Math.PI / 2} position={[x, 0.05, z]}>
        <planeGeometry args={[90, 70]} />
        <primitive object={decalMaterial('#000000', 0.45)} attach="material" />
      </mesh>
    </group>
  )
}

/* -------------------------------------------------------- 05 RENOVATION */

function Renovation({ quality }: { quality: QualitySettings }) {
  const { x, z } = SERVICE_WORLDS.renovation
  const group = useChapterVisibility<THREE.Group>([x, 8, z], 220)
  const oldRef = useRef<THREE.Group>(null)
  const debrisRef = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])

  const debris = useMemo(() => {
    const count = Math.max(6, Math.round(22 * quality.density))
    const items: { from: [number, number, number]; direction: [number, number, number]; scale: [number, number, number] }[] = []
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const radius = 8 + Math.random() * 6
      items.push({
        from: [Math.cos(angle) * 6, 2 + Math.random() * 8, Math.sin(angle) * 5],
        direction: [Math.cos(angle) * radius, -1, Math.sin(angle) * radius],
        scale: [0.6 + Math.random() * 1.8, 0.5 + Math.random() * 1.4, 0.6 + Math.random() * 1.8],
      })
    }
    return items
  }, [quality.density])

  useFrame((state) => {
    const t = beatLocal('service-renovation', runtime.progress)
    const dissolve = smoothstep((t - 0.18) / 0.42)

    if (oldRef.current) {
      oldRef.current.scale.setScalar(Math.max(0.0001, 1 - dissolve * 0.96))
      oldRef.current.position.y = -dissolve * 9
      oldRef.current.rotation.y = dissolve * 0.16
      oldRef.current.visible = dissolve < 0.995
    }

    const mesh = debrisRef.current
    if (mesh) {
      const scatter = smoothstep((t - 0.16) / 0.5)
      debris.forEach((item, index) => {
        dummy.position.set(
          item.from[0] + item.direction[0] * scatter,
          Math.max(0.2, item.from[1] + item.direction[1] * scatter),
          item.from[2] + item.direction[2] * scatter,
        )
        dummy.rotation.set(scatter * 2.4, scatter * 1.8 + index, scatter * 1.2)
        dummy.scale.set(...item.scale)
        dummy.scale.multiplyScalar(Math.max(0.0001, 1 - smoothstep((t - 0.75) / 0.22)))
        dummy.updateMatrix()
        mesh.setMatrixAt(index, dummy.matrix)
      })
      mesh.instanceMatrix.needsUpdate = true
      mesh.visible = t > 0.12 && t < 0.99
    }
    void state
  })

  return (
    <group ref={group} position={[x, 0, z]}>
      <group ref={oldRef}>
        <Block size={[20, 9, 16]} position={[0, 4.5, 0]} material={concreteMaterial('stone', 1.6, quality.textureSize)} />
        <Block size={[14, 5, 12]} position={[2, 11.6, -1]} material={concreteMaterial('stone', 1.2, quality.textureSize)} />
        <Block size={[7, 3, 6]} position={[-6, 14.4, 3]} material={concreteMaterial('stone', 1, quality.textureSize)} />
        <Block size={[9, 0.6, 5]} position={[8, 8.4, 5]} rotation={[0, 0, -0.22]} material={concreteMaterial('stone', 1, quality.textureSize)} />
        <Block size={[0.18, 3.2, 0.18]} position={[-9, 10.4, -6]} material={metalMaterial('accent', 1, quality.textureSize)} />
        <Block size={[0.18, 2.6, 0.18]} position={[-7, 10.1, -6]} material={metalMaterial('accent', 1, quality.textureSize)} />
        <Block size={[0.18, 2.1, 0.18]} position={[-5, 9.8, -6]} material={metalMaterial('accent', 1, quality.textureSize)} />
      </group>

      <Grow beat="service-renovation" start={0.34} duration={0.46}>
        <Block size={[24, 0.8, 18]} position={[0, 0.4, 0]} material={concreteMaterial('dark', 2, quality.textureSize)} />
        <Block size={[21, 13, 15]} position={[0, 7.1, 0]} material={concreteMaterial('light', 1.6, quality.textureSize)} />
        <Block size={[21.5, 9.6, 15.5]} position={[0, 7.4, 0]} material={glassMaterial('#101a1f', 0.34)} castShadow={false} />
        <Block size={[27, 0.7, 19]} position={[0, 14.1, 0]} material={concreteMaterial('light', 2, quality.textureSize)} />
        <Block size={[0.4, 13, 0.9]} position={[10.8, 7.1, 4]} material={metalMaterial('accent', 2, quality.textureSize)} />
        <Block size={[0.4, 13, 0.9]} position={[10.8, 7.1, 0]} material={metalMaterial('accent', 2, quality.textureSize)} />
        <Block size={[0.4, 13, 0.9]} position={[10.8, 7.1, -4]} material={metalMaterial('accent', 2, quality.textureSize)} />
      </Grow>

      <instancedMesh
        ref={debrisRef}
        args={[new THREE.BoxGeometry(1, 1, 1), concreteMaterial('stone', 1, quality.textureSize), debris.length]}
        castShadow
        frustumCulled={false}
      />
    </group>
  )
}

/* --------------------------------------------------------- 06 MATERIALS */

function Warehouse({ quality }: { quality: QualitySettings }) {
  const { x, z } = SERVICE_WORLDS.materials
  const group = useChapterVisibility<THREE.Group>([x, 8, z], 210)
  const concrete = concreteMaterial('mid', 1.4, quality.textureSize)
  const dark = concreteMaterial('dark', 2, quality.textureSize)
  const light = concreteMaterial('light', 1, quality.textureSize)
  const stone = concreteMaterial('stone', 1, quality.textureSize)
  const steel = metalMaterial('dark', 2, quality.textureSize)

  const { columns, bags, blocks, bundles } = useMemo(() => {
    const columns: Item[] = []
    for (const cx of [-15, 0, 15]) {
      for (const cz of [-11, 11]) columns.push({ position: [cx, 7.5, cz], scale: [1.5, 15, 1.5] })
    }

    const bags: Item[] = []
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 4; j++) {
        for (let k = 0; k < 3; k++) {
          bags.push({ position: [-26 + i * 1.3, 0.3 + k * 0.52, -8 + j * 1.1], scale: [1.1, 0.48, 0.75] })
        }
      }
    }

    const blocks: Item[] = []
    for (let i = 0; i < 16; i++) {
      const angle = Math.random() * Math.PI
      blocks.push({
        position: [-6 + Math.random() * 5, 0.6 + Math.random() * 0.5, -9 + Math.random() * 18],
        rotation: [0, angle, 0],
        scale: [1.1 + Math.random() * 1.4, 0.9 + Math.random() * 1.2, 1.1 + Math.random() * 1.4],
      })
    }

    const bundles: Item[] = []
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 3; j++) {
        bundles.push({ position: [-25 + i * 0.1, 0.7 + j * 1.35, 6 + i * 0.2], scale: [9, 1.2, 1.5] })
      }
    }
    return { columns, bags, blocks, bundles }
  }, [])

  return (
    <group ref={group} position={[x, 0, z]}>
      <Grow beat="service-materials" start={0.04} duration={0.44}>
        {/* real warehouse GLB; open canopy/deck is the fallback */}
        <AssetModel
          id="warehouse"
          position={[0, 0, 0]}
          quality={quality}
          fallback={
            <>
              <Block size={[36, 1.1, 26]} position={[0, 15.4, 0]} material={steel} />
              <Block size={[36, 0.5, 0.6]} position={[0, 14.6, -12.6]} material={steel} />
              <InstancedBoxes items={columns} material={concrete} />
            </>
          }
        />

        {/* stock */}
        <InstancedBoxes items={bags} material={light} />
        <InstancedBoxes items={blocks} material={stone} />
        <InstancedBoxes items={bundles} material={steel} />

        {/* sand cone */}
        <mesh position={[-4, 1.5, -9]} material={light}>
          <coneGeometry args={[4.6, 3, 24]} />
        </mesh>

        {/* racking */}
        <Block size={[0.4, 8, 0.4]} position={[-18, 4, -6]} material={steel} />
        <Block size={[0.4, 8, 0.4]} position={[-18, 4, 4]} material={steel} />
        <Block size={[0.4, 0.4, 10]} position={[-18, 7.8, -1]} material={steel} />
        <Block size={[14, 0.3, 0.3]} position={[-18, 5.6, 0]} material={steel} />
      </Grow>

      <mesh rotation-x={-Math.PI / 2} position={[0, 0.05, 0]}>
        <planeGeometry args={[90, 70]} />
        <primitive object={decalMaterial('#000000', 0.5)} attach="material" />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.03, 0]} receiveShadow>
        <planeGeometry args={[70, 50]} />
        <primitive object={dark} attach="material" />
      </mesh>
    </group>
  )
}
