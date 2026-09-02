'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { QualitySettings } from '@/lib/quality'
import { PALETTE } from '@/lib/materials'

/**
 * Real wind: instanced grass along the road plus a few drifting leaves.
 * The motion is intentionally subtle — a breeze, not a storm.
 */
export function WindSystem({ quality }: { quality: QualitySettings }) {
  const grassRef = useRef<THREE.InstancedMesh>(null)
  const leafRef = useRef<THREE.Points>(null)
  const fake = useMemo(() => new THREE.Object3D(), [])
  const grassMat = useMemo(() => grassMaterial(), [])
  const time = useRef(0)

  const grass = useMemo(() => {
    const count = Math.max(40, Math.round(140 * Math.max(0.35, quality.density)))
    const items: { x: number; z: number; s: number; o: number }[] = []
    for (let i = 0; i < count; i++) {
      const side = i % 2 === 0 ? -1 : 1
      items.push({
        x: side * (3.8 + Math.random() * 2.2),
        z: 18 - Math.random() * 240,
        s: 0.55 + Math.random() * 0.8,
        o: Math.random() * Math.PI * 2,
      })
    }
    return items
  }, [quality.density])

  const leaves = useMemo(() => {
    const count = Math.max(18, Math.round(60 * Math.max(0.35, quality.density)))
    const positions = new Float32Array(count * 3)
    const seeds = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 24
      positions[i * 3 + 1] = 0.4 + Math.random() * 5
      positions[i * 3 + 2] = (Math.random() - 0.5) * 120 - 20
      seeds[i] = Math.random() * Math.PI * 2
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1))
    return { geometry, count, seeds }
  }, [quality.density])

  useFrame((state, delta) => {
    time.current += Math.min(delta, 0.05)
    const mesh = grassRef.current
    if (!mesh) return
    const t = state.clock.elapsedTime
    grass.forEach((item, index) => {
      const sway = Math.sin(t * 0.8 + item.o) * 0.16 + Math.sin(t * 0.52 + item.o * 2) * 0.06
      fake.position.set(item.x, 0.1 + item.s / 2, item.z)
      fake.rotation.set(0, item.o, sway)
      fake.scale.set(0.14, item.s, 0.14)
      fake.updateMatrix()
      mesh.setMatrixAt(index, fake.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true

    const leafMesh = leafRef.current
    if (leafMesh) {
      const pos = leafMesh.geometry.getAttribute('position') as THREE.BufferAttribute
      const data = pos.array as Float32Array
      for (let i = 0; i < leaves.count; i++) {
        const i3 = i * 3
        data[i3 + 1] += Math.sin(t * 0.7 + leaves.seeds[i]) * 0.004
        data[i3] += Math.cos(t * 0.5 + leaves.seeds[i]) * 0.005
      }
      pos.needsUpdate = true
    }
  })

  return (
    <>
      <instancedMesh
        ref={grassRef}
        args={[new THREE.PlaneGeometry(1, 1, 1, 1), grassMat, grass.length]}
        castShadow={false}
        receiveShadow
        frustumCulled={false}
      />
      <points ref={leafRef} geometry={leaves.geometry} frustumCulled={false}>
        <pointsMaterial
          size={0.14}
          sizeAttenuation
          color={PALETTE.foliageB}
          transparent
          opacity={0.5}
          depthWrite={false}
        />
      </points>
    </>
  )
}

function grassMaterial(): THREE.MeshStandardMaterial {
  // Shared per-render material. Double-side so blades are visible both ways.
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(PALETTE.foliageB),
    roughness: 0.85,
    metalness: 0,
    side: THREE.DoubleSide,
  })
  return material
}
