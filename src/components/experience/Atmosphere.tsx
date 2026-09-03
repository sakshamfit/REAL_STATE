'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { QualitySettings } from '@/lib/quality'
import { dustSprite } from '@/lib/textures'
import { HORIZON_COLOR } from './Sky'

/**
 * Atmosphere.
 *
 * Distance haze (subtle, exponential, matched to the horizon) plus a very
 * light dust drift. The haze is what gives the world depth; the dust is only
 * there to catch the light near the ground in the construction stretches.
 */

export function Atmosphere({ quality }: { quality: QualitySettings }) {
  const fog = useMemo(() => new THREE.FogExp2(HORIZON_COLOR.getHex(), 0.0016), [])
  return (
    <>
      <primitive object={fog} attach="fog" />
      <Dust quality={quality} />
    </>
  )
}

function Dust({ quality }: { quality: QualitySettings }) {
  const points = useRef<THREE.Points>(null)
  const count = Math.max(30, Math.round(quality.dust * 0.22))
  const bounds = useMemo(() => new THREE.Vector3(150, 30, 150), [])

  const { geometry, drift } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const drift = new Float32Array(count * 2)
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * bounds.x
      positions[i * 3 + 1] = Math.random() * bounds.y
      positions[i * 3 + 2] = (Math.random() - 0.5) * bounds.z
      drift[i * 2] = 0.06 + Math.random() * 0.22
      drift[i * 2 + 1] = Math.random() * Math.PI * 2
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return { geometry, drift }
  }, [count, bounds])

  const sprite = useMemo(() => dustSprite(), [])

  useFrame((state, delta) => {
    const mesh = points.current
    if (!mesh) return
    const attribute = mesh.geometry.getAttribute('position') as THREE.BufferAttribute
    const array = attribute.array as Float32Array
    const camera = state.camera.position
    const dt = Math.min(delta, 0.05)
    const time = state.clock.elapsedTime

    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      array[i3] += (Math.sin(time * 0.13 + drift[i * 2 + 1]) * 0.12 + drift[i * 2]) * dt
      array[i3 + 1] += Math.sin(time * 0.21 + i) * 0.012 * dt * 10
      array[i3 + 2] += Math.cos(time * 0.11 + drift[i * 2 + 1]) * 0.09 * dt

      let dx = array[i3] - camera.x
      if (dx > bounds.x / 2) array[i3] -= bounds.x
      else if (dx < -bounds.x / 2) array[i3] += bounds.x

      let dy = array[i3 + 1] - camera.y
      if (dy > bounds.y / 2) array[i3 + 1] -= bounds.y
      else if (dy < -bounds.y / 2) array[i3 + 1] += bounds.y

      let dz = array[i3 + 2] - camera.z
      if (dz > bounds.z / 2) array[i3 + 2] -= bounds.z
      else if (dz < -bounds.z / 2) array[i3 + 2] += bounds.z
    }
    attribute.needsUpdate = true
  })

  return (
    <points ref={points} geometry={geometry} frustumCulled={false}>
      <pointsMaterial
        size={0.05}
        sizeAttenuation
        map={sprite}
        alphaMap={sprite}
        color="#e6dcc4"
        transparent
        opacity={0.16}
        depthWrite={false}
        blending={THREE.NormalBlending}
      />
    </points>
  )
}
