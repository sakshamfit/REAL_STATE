'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { QualitySettings } from '@/lib/quality'
import { AssetModel, InstancedAsset, type InstanceItem } from '@/lib/glb'
import {
  LANE,
  boundaryWalls,
  externalSiteProps,
  groundPatches,
  parkedVehicles,
  streetLights,
  traffic,
  yardBarriers,
  yardProps,
  type Placed,
} from '@/lib/layout'
import { GroundPatch } from './GroundPatch'
import { ContactRings } from './Vegetation'
import { plinthMaterial } from '@/lib/materials'

/**
 * The road corridor's furniture.
 *
 * Street lighting, the plot boundary wall, a working construction yard, parked
 * vehicles and live traffic. Every object sits on the terrain height at its own
 * position, faces the way it would in India (left-hand traffic) and is drawn
 * from the instanced asset pool. Placement lives in `src/lib/layout.ts` so the
 * offline QA rasteriser renders the same world.
 */

const toInstances = (items: Placed[]): InstanceItem[] =>
  items.map((item) => ({
    position: [item.x, item.y ?? 0, item.z],
    rotation: item.rotation,
    scale: [item.scale ?? 1, item.scaleY ?? item.scale ?? 1, item.scale ?? 1],
  }))

/**
 * The plinth course under the compound wall.
 *
 * A rendered wall that meets bare soil looks pasted on. Real boundary walls
 * stand on a slightly wider plinth that stays damp, collects dirt and throws
 * the shadow line that tells you the wall is actually standing in the ground.
 */
function WallPlinths({ quality }: { quality: QualitySettings }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const segments = useMemo(() => boundaryWalls(), [])
  const geometry = useMemo(() => new THREE.BoxGeometry(12, 0.34, 0.62), [])
  const material = useMemo(() => plinthMaterial(quality.textureSize), [quality.textureSize])

  useEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    segments.forEach((segment, index) => {
      dummy.position.set(segment.x, (segment.y ?? 0) + 0.17, segment.z)
      dummy.rotation.set(0, segment.rotation, 0)
      dummy.scale.set(segment.scale ?? 1, 1, 1)
      dummy.updateMatrix()
      mesh.setMatrixAt(index, dummy.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [segments, dummy])

  useEffect(
    () => () => {
      geometry.dispose()
    },
    [geometry],
  )

  return (
    <instancedMesh
      ref={ref}
      args={[geometry, material, Math.max(1, segments.length)]}
      castShadow={quality.tier !== 'low'}
      receiveShadow
    />
  )
}

export function RealWorld({ quality }: { quality: QualitySettings }) {
  const walls = useMemo(() => toInstances(boundaryWalls()), [])
  const lights = useMemo(() => toInstances(streetLights(quality.tier === 'low' ? 92 : 46)), [quality.tier])
  const barriers = useMemo(() => toInstances(yardBarriers()), [])
  const props = useMemo(() => yardProps(), [])
  const vehicles = useMemo(() => parkedVehicles(), [])
  const vehiclePoints = useMemo(() => vehicles.flatMap((group) => group.items), [vehicles])
  const patches = useMemo(() => groundPatches(), [])
  // Real site kit (cones, drums, pallets), only when the developer supplied one.
  const siteProps = useMemo(() => externalSiteProps(), [])

  return (
    <group>
      <InstancedAsset id="street-light" items={lights} quality={quality} castShadow={quality.tier === 'high'} />
      <WallPlinths quality={quality} />
      <InstancedAsset id="boundary-wall" items={walls} quality={quality} castShadow={quality.tier !== 'low'} />
      <InstancedAsset id="barrier" items={barriers} quality={quality} />
      {/* dust shadow / drips under the parked vehicles so they touch the ground */}
      <ContactRings items={vehiclePoints} radius={2.3} opacity={0.3} />

      {patches.map((patch, index) => (
        <GroundPatch
          key={index}
          surface={patch.surface}
          width={patch.width}
          length={patch.length}
          position={[patch.x, 0.012, patch.z]}
          rotation={patch.rotation}
          seed={patch.seed}
          dissolve={patch.dissolve}
          strength={patch.strength}
          opacity={patch.opacity}
          lift={0.004}
          quality={quality}
        />
      ))}

      {props.map((prop, index) => (
        <AssetModel
          key={`${prop.id}-${index}`}
          id={prop.id}
          position={[prop.x, prop.y ?? 0, prop.z]}
          rotation={[0, prop.rotation, 0]}
          quality={quality}
          lod="auto"
        />
      ))}

      {vehicles.map((group) => (
        <InstancedAsset key={group.id} id={group.id} items={toInstances(group.items)} quality={quality} />
      ))}

      {siteProps.map((group) => (
        <InstancedAsset
          key={group.id}
          id={group.id}
          items={toInstances(group.items)}
          quality={quality}
          castShadow={quality.tier !== 'low'}
        />
      ))}

      <Traffic quality={quality} />
    </group>
  )
}

/**
 * Live traffic. Cars hold a constant world speed and are recycled 340 m behind
 * or ahead of the camera, so a vehicle never visibly pops: by the time it wraps
 * it is out of frame or dissolved in haze.
 */
function Traffic({ quality }: { quality: QualitySettings }) {
  const cars = useMemo(() => {
    const all = traffic()
    return quality.tier === 'low' ? all.slice(0, 1) : quality.tier === 'mid' ? all.slice(0, 2) : all
  }, [quality.tier])
  const refs = useRef<(THREE.Group | null)[]>([])
  const positions = useRef<number[]>(cars.map((car) => car.start))

  useFrame((state, delta) => {
    const cameraZ = state.camera.position.z
    const dt = Math.min(delta, 0.05)
    cars.forEach((car, index) => {
      const group = refs.current[index]
      if (!group) return
      let z = positions.current[index] - car.direction * car.speed * dt
      const relative = z - cameraZ
      if (relative > 340) z -= 660
      else if (relative < -340) z += 660
      positions.current[index] = z
      group.position.set(-car.direction * LANE + car.laneOffset, 0, z)
      group.rotation.y = car.direction > 0 ? -Math.PI / 2 : Math.PI / 2
      group.visible = Math.abs(z - cameraZ) < 330
    })
  })

  return (
    <group>
      {cars.map((car, index) => (
        <group
          key={`${car.id}-${index}`}
          ref={(node) => {
            refs.current[index] = node
          }}
          position={[-car.direction * LANE, 0, car.start]}
          rotation={[0, car.direction > 0 ? -Math.PI / 2 : Math.PI / 2, 0]}
        >
          <AssetModel id={car.id} quality={quality} lod="auto" lodDistance={260} />
        </group>
      ))}
    </group>
  )
}
