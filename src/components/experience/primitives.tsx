'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

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
