'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { SERVICE_WORLDS } from '@/lib/world'
import { beatLocal } from '@/lib/chapters'
import { runtime } from '@/lib/store'
import { smoothstep } from '@/lib/math'
import type { QualitySettings } from '@/lib/quality'
import { concreteMaterial, glassMaterial, metalMaterial } from '@/lib/materials'
import { useChapterVisibility } from '../hooks'
import { GroundPatch } from '../GroundPatch'
import { Block, InstancedBoxes, type Item } from '../primitives'
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
      <group>
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
      </group>
      <GroundPatch
        surface="soilDry"
        width={66}
        length={66}
        position={[0, 0.01, 0]}
        seed={201}
        dissolve={0.75}
        strength={0.95}
        opacity={0.8}
        quality={quality}
      />
      <AssetModel id="rebar-stack" position={[-16, 0, 20]} rotation={[0, 0.4, 0]} quality={quality} lod="auto" />
      <AssetModel id="cement-bags" position={[16, 0, -20]} rotation={[0, -0.6, 0]} quality={quality} lod="auto" />
      <AssetModel id="barrier" position={[0, 0, 22]} rotation={[0, 0, 0]} quality={quality} lod="auto" />
      <AssetModel id="excavator" position={[17, 0, 19]} rotation={[0, -2.2, 0]} quality={quality} lod="auto" />
    </group>
  )
}

/* ------------------------------------------------------------- 02 RESIDENTIAL */

function Residence({ quality }: { quality: QualitySettings }) {
  const { x, z } = SERVICE_WORLDS.residential
  const group = useChapterVisibility<THREE.Group>([x, 6, z], 200)
  const light = concreteMaterial('light', 1.4, quality.textureSize)
  const dark = concreteMaterial('dark', 2, quality.textureSize)
  const glass = glassMaterial('#16242b', 0.56)
  const warm = concreteMaterial('light', 1.2, quality.textureSize)
  const water = metalMaterial('dark', 2, quality.textureSize)

  return (
    <group ref={group} position={[x, 0, z]}>
      <group>
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
      </group>

      {/* reflecting pool */}
      <mesh rotation-x={-Math.PI / 2} position={[-11, 0.09, 8]}>
        <planeGeometry args={[16, 10]} />
        <primitive object={water} attach="material" />
      </mesh>

      {/* concrete bollards at the drop-off */}
      <Block size={[0.32, 0.95, 0.32]} position={[-2, 0.48, 10]} material={concreteMaterial('light', 1, quality.textureSize)} />
      <Block size={[0.32, 0.95, 0.32]} position={[4, 0.48, 10]} material={concreteMaterial('light', 1, quality.textureSize)} />
      <Block size={[0.32, 0.95, 0.32]} position={[10, 0.48, 10]} material={concreteMaterial('light', 1, quality.textureSize)} />
      <AssetModel id="car-b" position={[-14, 0, 12]} rotation={[0, -0.5, 0]} quality={quality} lod="auto" />

      <GroundPatch
        surface="gravel"
        width={72}
        length={62}
        position={[0, 0.01, 0]}
        seed={211}
        dissolve={0.7}
        strength={0.95}
        opacity={0.8}
        quality={quality}
      />
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
      {/* approach road */}
      <GroundPatch
        surface="asphalt"
        width={20}
        length={140}
        position={[x, 0.014, z]}
        seed={221}
        dissolve={0.25}
        strength={1}
        opacity={1}
        quality={quality}
      />

      <group>
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
      </group>
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
        color: new THREE.Color('#152a41'),
        roughness: 0.11,
        metalness: 0.4,
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
      // trackers creep, they do not sweep
      tracker.current.rotation.x = -0.42 + (t - 0.5) * 0.05
    }
  })

  return (
    <group ref={group} position={[0, 0, 0]}>
      <group>
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
      </group>

      <GroundPatch
        surface="soilDry"
        width={84}
        length={66}
        position={[x, 0.01, z]}
        seed={231}
        dissolve={0.65}
        strength={0.95}
        opacity={0.85}
        quality={quality}
      />
      <AssetModel id="car-b" position={[x - 26, 0, z + 26]} rotation={[0, 0.9, 0]} quality={quality} lod="auto" />
    </group>
  )
}

/* -------------------------------------------------------- 05 RENOVATION */

function Renovation({ quality }: { quality: QualitySettings }) {
  const { x, z } = SERVICE_WORLDS.renovation
  const group = useChapterVisibility<THREE.Group>([x, 8, z], 220)
  const debrisRef = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])

  /** Rubble from the stripped facade, lying where it fell. */
  const debris = useMemo(() => {
    const count = Math.max(6, Math.round(26 * quality.density))
    const items: { position: [number, number, number]; rotation: number; scale: [number, number, number] }[] = []
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const radius = 9 + Math.random() * 9
      items.push({
        position: [Math.cos(angle) * radius, 0.16 + Math.random() * 0.2, Math.sin(angle) * radius],
        rotation: Math.random() * Math.PI,
        scale: [0.5 + Math.random() * 1.5, 0.3 + Math.random() * 0.7, 0.5 + Math.random() * 1.5],
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

  return (
    <group ref={group} position={[x, 0, z]}>
      {/* the existing structure being refurbished: old render, new render */}
      <AssetModel id="residential-building" position={[0, 0, 0]} rotation={[0, 0.3, 0]} quality={quality} lod="auto" />

      {/* full-height scaffolding on two elevations */}
      <AssetModel id="scaffolding" position={[-13.5, 0, 4]} rotation={[0, 0.3, 0]} quality={quality} lod="auto" />
      <AssetModel id="scaffolding" position={[13.5, 0, -4]} rotation={[0, Math.PI + 0.3, 0]} quality={quality} lod="auto" />

      {/* materials staged for the retrofit */}
      <AssetModel id="material-stack" position={[-20, 0, 16]} rotation={[0, 0.5, 0]} quality={quality} lod="auto" />
      <AssetModel id="cement-bags" position={[-14, 0, 18]} rotation={[0, -0.3, 0]} quality={quality} lod="auto" />
      <AssetModel id="rebar-stack" position={[18, 0, -16]} rotation={[0, 1.1, 0]} quality={quality} lod="auto" />
      <AssetModel id="barrier" position={[0, 0, 20]} rotation={[0, 0, 0]} quality={quality} lod="auto" />
      <AssetModel id="barrier" position={[7, 0, 20]} rotation={[0, 0, 0]} quality={quality} lod="auto" />

      <instancedMesh
        ref={debrisRef}
        args={[new THREE.BoxGeometry(1, 1, 1), concreteMaterial('stone', 1, quality.textureSize), debris.length]}
        castShadow
        receiveShadow
        frustumCulled={false}
      />

      <GroundPatch
        surface="soilDry"
        width={70}
        length={62}
        position={[0, 0.01, 0]}
        seed={251}
        dissolve={0.8}
        strength={0.95}
        opacity={0.8}
        quality={quality}
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
      <group>
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
      </group>

      <GroundPatch
        surface="concrete"
        width={70}
        length={52}
        position={[0, 0.02, 0]}
        seed={241}
        dissolve={0.3}
        strength={1}
        opacity={1}
        quality={quality}
      />
      <GroundPatch
        surface="soilDry"
        width={92}
        length={72}
        position={[0, 0.008, 0]}
        seed={243}
        dissolve={0.7}
        strength={0.95}
        opacity={0.85}
        quality={quality}
      />
      <AssetModel id="truck-a" position={[24, 0, -16]} rotation={[0, -1.9, 0]} quality={quality} lod="auto" />
      <AssetModel id="car-c" position={[24, 0, -10]} rotation={[0, 1.7, 0]} quality={quality} lod="auto" />
    </group>
  )
}
