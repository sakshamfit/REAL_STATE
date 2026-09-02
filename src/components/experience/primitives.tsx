'use client'

import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { beatLocal } from '@/lib/chapters'
import { runtime } from '@/lib/store'
import { smoothstep } from '@/lib/math'

export type Item = {
  position: [number, number, number]
  rotation?: [number, number, number]
  scale: [number, number, number]
}

const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1)
const dummy = new THREE.Object3D()

/** Instanced boxes from a plain list — cheap and keeps the scene graph flat. */
export function InstancedBoxes({
  items,
  material,
  castShadow = true,
  receiveShadow = true,
}: {
  items: Item[]
  material: THREE.Material
  castShadow?: boolean
  receiveShadow?: boolean
}) {
  const ref = useRef<THREE.InstancedMesh>(null)

  useEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    items.forEach((item, index) => {
      dummy.position.set(...item.position)
      dummy.rotation.set(...(item.rotation ?? [0, 0, 0]))
      dummy.scale.set(...item.scale)
      dummy.updateMatrix()
      mesh.setMatrixAt(index, dummy.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [items])

  return (
    <instancedMesh
      ref={ref}
      args={[UNIT_BOX, material, Math.max(1, items.length)]}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
    />
  )
}

/**
 * Grows its children out of the ground as a beat plays — the assembly language
 * of the whole world.
 */
export function Grow({
  beat,
  start = 0,
  duration = 0.4,
  drop = 0,
  axis = 'y',
  position,
  rotation,
  children,
}: {
  beat: string
  start?: number
  duration?: number
  drop?: number
  axis?: 'y' | 'all'
  position?: [number, number, number]
  rotation?: [number, number, number]
  children: ReactNode
}) {
  const ref = useRef<THREE.Group>(null)
  const baseY = position?.[1] ?? 0

  useFrame(() => {
    const group = ref.current
    if (!group) return
    const t = beatLocal(beat, runtime.progress)
    const a = smoothstep((t - start) / duration)
    if (axis === 'y') group.scale.set(1, Math.max(0.0001, a), 1)
    else group.scale.setScalar(Math.max(0.0001, a))
    group.position.y = baseY + (1 - a) * drop
    group.visible = a > 0.002
  })

  return (
    <group ref={ref} position={position} rotation={rotation}>
      {children}
    </group>
  )
}

/** Simple box helper with a memoised geometry. */
export function Block({
  size,
  position,
  rotation,
  material,
  castShadow = true,
  receiveShadow = true,
}: {
  size: [number, number, number]
  position?: [number, number, number]
  rotation?: [number, number, number]
  material: THREE.Material
  castShadow?: boolean
  receiveShadow?: boolean
}) {
  const geometry = useMemo(() => new THREE.BoxGeometry(...size), [size])
  return (
    <mesh
      geometry={geometry}
      material={material}
      position={position}
      rotation={rotation}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
    />
  )
}
