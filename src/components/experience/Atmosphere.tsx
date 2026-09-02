'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { QualitySettings } from '@/lib/quality'
import { concreteMaterial, flatMaterial, PALETTE } from '@/lib/materials'
import { dustSprite, gridTexture } from '@/lib/textures'
import { FOG } from '@/lib/world'

/**
 * The world the camera travels through: a concrete ground plane, a thin
 * architectural grid, drifting dust and distance fog that swallows everything
 * the story is not currently looking at.
 */
export function Atmosphere({ quality }: { quality: QualitySettings }) {
  const concrete = concreteMaterial('dark', 240, quality.textureSize)
  const grid = useMemo(() => gridTexture(512, 8), [])

  return (
    <>
      <fogExp2 attach="fog" args={[FOG.color, FOG.density]} />

      <mesh rotation-x={-Math.PI / 2} position={[0, -0.02, -650]} receiveShadow>
        <planeGeometry args={[2200, 2200]} />
        <primitive object={concrete} attach="material" />
      </mesh>

      {quality.grid ? (
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.015, -650]}>
          <planeGeometry args={[2200, 2200]} />
          <meshBasicMaterial
            color={PALETTE.concrete}
            map={grid}
            transparent
            opacity={0.055}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ) : null}

      <Dust quality={quality} />
    </>
  )
}

function Dust({ quality }: { quality: QualitySettings }) {
  const points = useRef<THREE.Points>(null)
  const count = Math.max(60, Math.round(quality.dust))

  const { geometry, drift, size } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const drift = new Float32Array(count)
    const size = new THREE.Vector3(180, 70, 180)
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * size.x
      positions[i * 3 + 1] = Math.random() * size.y
      positions[i * 3 + 2] = (Math.random() - 0.5) * size.z
      drift[i] = 0.12 + Math.random() * 0.55
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return { geometry, drift, size }
  }, [count])

  const sprite = useMemo(() => dustSprite(64), [])

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
      array[i3 + 1] += drift[i] * dt
      array[i3] += Math.sin(time * 0.25 + i) * 0.006

      let dx = array[i3] - camera.x
      if (dx > size.x / 2) array[i3] -= size.x
      else if (dx < -size.x / 2) array[i3] += size.x

      let dy = array[i3 + 1] - camera.y
      if (dy > size.y / 2) array[i3 + 1] -= size.y
      else if (dy < -size.y / 2) array[i3 + 1] += size.y

      let dz = array[i3 + 2] - camera.z
      if (dz > size.z / 2) array[i3 + 2] -= size.z
      else if (dz < -size.z / 2) array[i3 + 2] += size.z
    }
    attribute.needsUpdate = true
  })

  return (
    <points ref={points} geometry={geometry} frustumCulled={false}>
      <pointsMaterial
        size={0.11}
        sizeAttenuation
        map={sprite}
        alphaMap={sprite}
        color={PALETTE.concrete}
        transparent
        opacity={0.42}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

/** Thin horizon line — reads like the edge of a concrete plane. */
export function Horizon() {
  const material = flatMaterial('#0c0d0e')
  return (
    <mesh position={[0, 0.05, -1400]} material={material}>
      <planeGeometry args={[2600, 40]} />
    </mesh>
  )
}
