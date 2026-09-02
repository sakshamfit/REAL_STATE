'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import * as THREE from 'three'
import type { QualitySettings } from '@/lib/quality'
import { PALETTE } from '@/lib/materials'
import { runtime } from '@/lib/store'

/**
 * Architectural lighting: one key light that travels with the camera (a world
 * this long only ever needs one shadow frustum), a cool fill, an accent rim,
 * and a small baked environment so the metals have something to reflect.
 */
const KEY_INTENSITY = 6.1
const RIM_INTENSITY = 1.95
const smoothstep01 = (t: number) => {
  const x = Math.min(1, Math.max(0, t))
  return x * x * (3 - 2 * x)
}

export function Lighting({ quality }: { quality: QualitySettings }) {
  const key = useRef<THREE.DirectionalLight>(null)
  const rim = useRef<THREE.DirectionalLight>(null)
  const fill = useRef<THREE.DirectionalLight>(null)
  const camera = useThree((state) => state.camera)

  const targets = useMemo(
    () => ({ key: new THREE.Object3D(), rim: new THREE.Object3D(), fill: new THREE.Object3D() }),
    [],
  )

  useEffect(() => {
    if (key.current) key.current.target = targets.key
    if (rim.current) rim.current.target = targets.rim
    if (fill.current) fill.current.target = targets.fill
  }, [targets])

  useFrame(() => {
    const position = camera.position
    // the first seconds are almost pure darkness — light arrives with the scroll
    const dawn = 0.1 + 0.9 * smoothstep01(runtime.progress / 0.045)
    if (key.current) key.current.intensity = KEY_INTENSITY * dawn
    if (rim.current) rim.current.intensity = RIM_INTENSITY * dawn
    if (key.current) {
      key.current.position.set(position.x + 46, position.y + 74, position.z + 34)
      targets.key.position.set(position.x - 6, position.y - 12, position.z - 40)
      targets.key.updateMatrixWorld()
    }
    if (rim.current) {
      rim.current.position.set(position.x - 58, position.y + 20, position.z - 64)
      targets.rim.position.set(position.x, position.y, position.z - 20)
      targets.rim.updateMatrixWorld()
    }
    if (fill.current) {
      fill.current.position.set(position.x - 34, position.y + 16, position.z + 42)
      targets.fill.position.set(position.x, position.y, position.z - 10)
      targets.fill.updateMatrixWorld()
    }
  })

  return (
    <>
      <ambientLight intensity={0.85} color="#2c3438" />
      <hemisphereLight args={['#26333a', '#050606', 1.75]} />

      <directionalLight
        ref={key}
        intensity={KEY_INTENSITY}
        color="#f4f1ea"
        castShadow={quality.shadows}
        shadow-mapSize-width={quality.shadowMapSize}
        shadow-mapSize-height={quality.shadowMapSize}
        shadow-camera-near={1}
        shadow-camera-far={340}
        shadow-camera-left={-90}
        shadow-camera-right={90}
        shadow-camera-top={90}
        shadow-camera-bottom={-90}
        shadow-bias={-0.0009}
        shadow-normalBias={0.05}
      />
      <primitive object={targets.key} />

      <directionalLight ref={rim} intensity={RIM_INTENSITY} color={PALETTE.accent} />
      <primitive object={targets.rim} />

      <directionalLight ref={fill} intensity={1.1} color="#8fa6b5" />
      <primitive object={targets.fill} />

      {quality.environment ? (
        <Environment resolution={128} frames={1}>
          <color attach="background" args={['#05070a']} />
          <Lightformer intensity={2.4} rotation-x={Math.PI / 2} position={[0, 8, -6]} scale={[14, 14, 1]} color="#e9e6dd" />
          <Lightformer intensity={0.9} rotation-y={Math.PI / 2} position={[-8, 2, 0]} scale={[24, 3, 1]} color="#b99a63" />
          <Lightformer intensity={0.7} rotation-y={-Math.PI / 2} position={[8, 1, 0]} scale={[24, 2, 1]} color="#7d96a6" />
          <Lightformer form="ring" intensity={1.2} position={[0, 4, 9]} scale={7} color="#ffffff" />
        </Environment>
      ) : null}
    </>
  )
}
