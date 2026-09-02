'use client'

import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import type * as THREE from 'three'
import { runtime } from '@/lib/store'

/**
 * Distance based culling. The world is ~1300 units long, so chapters switch
 * themselves off when the camera is nowhere near them.
 */
export function useChapterVisibility<T extends THREE.Object3D>(anchor: [number, number, number], range = 260) {
  const ref = useRef<T>(null)
  const visible = useRef(true)

  useFrame(({ camera }) => {
    const object = ref.current
    if (!object) return
    const distance = Math.hypot(camera.position.x - anchor[0], camera.position.z - anchor[2])
    const should = distance < range
    if (should !== visible.current) {
      visible.current = should
      object.visible = should
    }
  })

  return ref
}

/**
 * React-visible proximity flag — used to mount DOM-based labels (drei <Html>)
 * only when the camera is actually near them.
 */
export function useNearCamera(anchor: [number, number, number], range = 130) {
  const [near, setNear] = useState(false)
  const state = useRef(false)

  useFrame(({ camera }) => {
    const distance = Math.hypot(
      camera.position.x - anchor[0],
      camera.position.y - anchor[1],
      camera.position.z - anchor[2],
    )
    const next = distance < range
    if (next !== state.current) {
      state.current = next
      setNear(next)
    }
  })

  return near
}
