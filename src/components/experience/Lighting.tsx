'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { QualitySettings } from '@/lib/quality'
import { runtime } from '@/lib/store'
import { SUN_DIRECTION } from './Sky'

/**
 * Daylight.
 *
 * One sun, one sky dome, one bounce. The key light follows the camera along a
 * fixed world direction so a 1.3 km world still gets a single, tight shadow map
 * (crisp contact shadows) and every surface is lit by the same sun the sky dome
 * is drawn from. No rim lights, no neon, no fake fill.
 */

const SUN_COLOR = new THREE.Color('#fff3dc')
const SKY_COLOR = new THREE.Color('#9fc0dc')
const BOUNCE_COLOR = new THREE.Color('#8a7c62')

export function Lighting({ quality }: { quality: QualitySettings }) {
  const sun = useRef<THREE.DirectionalLight>(null)
  const target = useMemo(() => new THREE.Object3D(), [])
  const camera = useThree((state) => state.camera)
  const gl = useThree((state) => state.gl)

  useEffect(() => {
    if (sun.current) sun.current.target = target
    gl.toneMapping = THREE.ACESFilmicToneMapping
    gl.toneMappingExposure = 1.0
  }, [gl, target])

  const shadowExtent = quality.tier === 'low' ? 42 : quality.tier === 'mid' ? 70 : 92

  useFrame(() => {
    const light = sun.current
    if (!light) return
    const position = camera.position
    // keep the sun at a constant world direction, centred on the camera
    light.position.set(
      position.x + SUN_DIRECTION.x * 140,
      position.y + SUN_DIRECTION.y * 140,
      position.z + SUN_DIRECTION.z * 140,
    )
    target.position.set(position.x, 0, position.z - 30)
    target.updateMatrixWorld()

    // a gentle exposure lift out of the preloader, never a brightness pop
    const dawn = 0.82 + 0.18 * Math.min(1, runtime.progress / 0.03 + 0.4)
    light.intensity = 3.15 * dawn
  })

  return (
    <>
      {/* sky dome + ground bounce: this is what softens the shadows */}
      <hemisphereLight args={[SKY_COLOR, BOUNCE_COLOR, 0.85]} />
      <ambientLight intensity={0.16} color="#c8d2d6" />

      <directionalLight
        ref={sun}
        color={SUN_COLOR}
        intensity={3.15}
        castShadow={quality.shadows}
        shadow-mapSize-width={quality.shadowMapSize}
        shadow-mapSize-height={quality.shadowMapSize}
        shadow-camera-near={20}
        shadow-camera-far={330}
        shadow-camera-left={-shadowExtent}
        shadow-camera-right={shadowExtent}
        shadow-camera-top={shadowExtent}
        shadow-camera-bottom={-shadowExtent}
        shadow-bias={-0.00035}
        shadow-normalBias={0.045}
        shadow-radius={quality.tier === 'high' ? 2.4 : 1.6}
      />
      <primitive object={target} />
    </>
  )
}
