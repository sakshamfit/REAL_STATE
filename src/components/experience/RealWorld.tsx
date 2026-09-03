'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { QualitySettings } from '@/lib/quality'
import { AssetModel, InstancedAsset, type InstanceItem } from '@/lib/glb'
import {
  LANE,
  TRAFFIC,
  boundaryWalls,
  groundPatches,
  parkedVehicles,
  streetLights,
  yardBarriers,
  yardProps,
  type Placed,
} from '@/lib/layout'
import { GroundPatch } from './GroundPatch'
import { ContactRings } from './Vegetation'

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

export function RealWorld({ quality }: { quality: QualitySettings }) {
  const walls = useMemo(() => toInstances(boundaryWalls()), [])
  const lights = useMemo(() => toInstances(streetLights(quality.tier === 'low' ? 92 : 46)), [quality.tier])
  const barriers = useMemo(() => toInstances(yardBarriers()), [])
  const props = useMemo(() => yardProps(), [])
  const vehicles = useMemo(() => parkedVehicles(), [])
  const vehiclePoints = useMemo(() => vehicles.flatMap((group) => group.items), [vehicles])
  const patches = useMemo(() => groundPatches(), [])

  return (
    <group>
      <InstancedAsset id="street-light" items={lights} quality={quality} castShadow={quality.tier === 'high'} />
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
  const cars = useMemo(
    () => (quality.tier === 'low' ? TRAFFIC.slice(0, 1) : quality.tier === 'mid' ? TRAFFIC.slice(0, 2) : TRAFFIC),
    [quality.tier],
  )
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
