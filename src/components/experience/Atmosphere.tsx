'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { QualitySettings } from '@/lib/quality'
import { asphaltMaterial, foliageMaterial, PALETTE } from '@/lib/materials'
import { dustSprite } from '@/lib/textures'
import { DEFAULT_ENVIRONMENT } from '@/data/environments'

/**
 * The physical envelope: natural soil/grass ground, atmospheric haze and
 * subtle drifting particles. The road, vegetation and buildings are layered on
 * top by the other chapter components.
 */
export function Atmosphere({ quality }: { quality: QualitySettings }) {
  const ground = useMemo(() => foliageMaterial(PALETTE.foliage, quality.textureSize), [quality.textureSize])
  const groundFar = useMemo(() => foliageMaterial('#7f8f67', quality.textureSize), [quality.textureSize])
  const asphalt = asphaltMaterial(quality.textureSize)
  const preset = DEFAULT_ENVIRONMENT

  return (
    <>
      <fogExp2 attach="fog" args={[preset.fog.color, preset.fog.density]} />

      {/* soil base */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.05, -650]} receiveShadow>
        <planeGeometry args={[2400, 2400]} />
        <primitive object={groundFar} attach="material" />
      </mesh>

      {/* compacted earth corridor around the road */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.14, -650]} receiveShadow>
        <planeGeometry args={[260, 1600]} />
        <primitive object={ground} attach="material" />
      </mesh>

      {/* asphalt ribbon — the road the visitor travels along */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.2, -650]} receiveShadow>
        <planeGeometry args={[7.4, 1600]} />
        <primitive object={asphalt} attach="material" />
      </mesh>

      {/* edge lines */}
      <RoadLine x={-3.5} />
      <RoadLine x={3.5} />

      <Dust quality={quality} />
    </>
  )
}

function RoadLine({ x }: { x: number }) {
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#e9e5d9'),
        roughness: 0.8,
        metalness: 0,
      }),
    [],
  )
  return (
    <mesh rotation-x={-Math.PI / 2} position={[x, 0.22, -650]} material={material}>
      <planeGeometry args={[0.1, 1600]} />
    </mesh>
  )
}

function Dust({ quality }: { quality: QualitySettings }) {
  const points = useRef<THREE.Points>(null)
  const count = Math.max(40, Math.round(quality.dust * 0.35))

  const { geometry, drift, size } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const drift = new Float32Array(count)
    const size = new THREE.Vector3(180, 46, 180)
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * size.x
      positions[i * 3 + 1] = Math.random() * size.y
      positions[i * 3 + 2] = (Math.random() - 0.5) * size.z
      drift[i] = 0.08 + Math.random() * 0.34
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return { geometry, drift, size }
  }, [count])

  const sprite = useMemo(() => dustSprite(48), [])

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
      array[i3] += Math.sin(time * 0.22 + i) * 0.006
      array[i3 + 2] += Math.sin(time * 0.16 + i * 1.3) * 0.004

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
        size={0.07}
        sizeAttenuation
        map={sprite}
        alphaMap={sprite}
        color="#e9e0c5"
        transparent
        opacity={0.22}
        depthWrite={false}
        blending={THREE.NormalBlending}
      />
    </points>
  )
}

/** Thin natural horizon band. */
export function Horizon() {
  return (
    <mesh position={[0, 0.05, -1400]}>
      <planeGeometry args={[2600, 60]} />
      <meshBasicMaterial color="#a9b9b6" transparent opacity={0.62} />
    </mesh>
  )
}
