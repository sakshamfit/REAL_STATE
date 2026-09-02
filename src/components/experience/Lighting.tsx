'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import * as THREE from 'three'
import type { QualitySettings } from '@/lib/quality'
import { DEFAULT_ENVIRONMENT } from '@/data/environments'
import { runtime } from '@/lib/store'

/**
 * Real daylight architectural lighting.
 *
 * One key shadow sun follows the camera so a world this long only ever needs a
 * single shadow map. A broad hemisphere/ambient pair provides believable sky
 * bounce, and a warm environment map gives glass/metal something realistic to
 * reflect.
 */
const smoothstep01 = (t: number) => {
  const x = Math.min(1, Math.max(0, t))
  return x * x * (3 - 2 * x)
}

export function Lighting({ quality }: { quality: QualitySettings }) {
  const sun = useRef<THREE.DirectionalLight>(null)
  const fill = useRef<THREE.DirectionalLight>(null)
  const camera = useThree((state) => state.camera)
  const preset = DEFAULT_ENVIRONMENT

  const targets = useMemo(
    () => ({ sun: new THREE.Object3D(), fill: new THREE.Object3D() }),
    [],
  )

  useEffect(() => {
    if (sun.current) sun.current.target = targets.sun
    if (fill.current) fill.current.target = targets.fill
  }, [targets])

  useFrame(() => {
    const position = camera.position
    const dawn = 0.1 + 0.9 * smoothstep01(runtime.progress / 0.045)
    if (sun.current) {
      sun.current.intensity = preset.light.sunIntensity * dawn
      sun.current.position.set(position.x + 46, position.y + 68, position.z + 34)
      targets.sun.position.set(position.x, 0, position.z - 40)
      targets.sun.updateMatrixWorld()
    }
    if (fill.current) {
      fill.current.intensity = preset.light.fillIntensity * dawn
      fill.current.position.set(position.x - 34, position.y + 16, position.z + 42)
      targets.fill.position.set(position.x, 0, position.z - 10)
      targets.fill.updateMatrixWorld()
    }
  })

  return (
    <>
      <ambientLight intensity={preset.light.ambientIntensity} color={preset.light.ambientColor} />
      <hemisphereLight args={[preset.light.hemiSky, preset.light.hemiGround, preset.light.hemiIntensity]} />

      <directionalLight
        ref={sun}
        intensity={preset.light.sunIntensity}
        color={preset.light.sunColor}
        castShadow={quality.shadows}
        shadow-mapSize-width={quality.shadowMapSize}
        shadow-mapSize-height={quality.shadowMapSize}
        shadow-camera-near={1}
        shadow-camera-far={340}
        shadow-camera-left={-90}
        shadow-camera-right={90}
        shadow-camera-top={90}
        shadow-camera-bottom={-90}
        shadow-bias={-0.0008}
        shadow-normalBias={0.06}
      />
      <primitive object={targets.sun} />

      <directionalLight ref={fill} intensity={preset.light.fillIntensity} color={preset.light.fillColor} />
      <primitive object={targets.fill} />

      {quality.environment ? (
        <Environment resolution={128} frames={1}>
          <color attach="background" args={['#9fb6c4']} />
          <Lightformer intensity={2.6} rotation-x={Math.PI / 2} position={[0, 8, -6]} scale={[16, 16, 1]} color="#fff1dd" />
          <Lightformer intensity={0.85} rotation-y={Math.PI / 2} position={[-8, 2, 0]} scale={[24, 4, 1]} color="#bcd0da" />
          <Lightformer intensity={0.7} rotation-y={-Math.PI / 2} position={[8, 1, 0]} scale={[24, 2, 1]} color="#d7c5a9" />
          <Lightformer form="ring" intensity={1.1} position={[0, 4, 9]} scale={8} color="#ffffff" />
        </Environment>
      ) : null}
    </>
  )
}
