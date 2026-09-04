'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { QualitySettings } from '@/lib/quality'
import { SUN_DIRECTION } from './Sky'
import {
  AMBIENT_COLOR,
  AMBIENT_INTENSITY,
  BACKGROUND_INTENSITY,
  DAYLIGHT_EXPOSURE,
  ENVIRONMENT_INTENSITY,
  FILL_BOUNCE,
  FILL_SKY,
  HEMI_INTENSITY,
  SUN_COLOR,
  SUN_INTENSITY,
} from '@/lib/daylight'

/**
 * Daylight.
 *
 * One sun, one sky dome, one bounce. The key light follows the camera along a
 * fixed world direction so a 1.3 km world still gets a single, tight shadow map
 * (crisp contact shadows) and every surface is lit by the same sun the sky dome
 * is drawn from. No rim lights, no neon, no fake fill.
 */

export { DAYLIGHT_EXPOSURE } from '@/lib/daylight'

export function Lighting({ quality }: { quality: QualitySettings }) {
  const sun = useRef<THREE.DirectionalLight>(null)
  const target = useMemo(() => new THREE.Object3D(), [])
  const camera = useThree((state) => state.camera)
  const gl = useThree((state) => state.gl)
  const scene = useThree((state) => state.scene)
  const shadowExtent = quality.tier === 'low' ? 42 : quality.tier === 'mid' ? 70 : 88

  useEffect(() => {
    if (sun.current) sun.current.target = target
    gl.toneMapping = THREE.ACESFilmicToneMapping
    gl.toneMappingExposure = DAYLIGHT_EXPOSURE
    scene.environmentIntensity = ENVIRONMENT_INTENSITY
    scene.backgroundIntensity = BACKGROUND_INTENSITY
  }, [gl, scene, target])

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

    // the world opens at full daylight; there is no dawn to wait through
    light.intensity = SUN_INTENSITY
  })

  return (
    <>
      {/* sky dome + ground bounce: this is what softens the shadows */}
      <hemisphereLight args={[FILL_SKY, FILL_BOUNCE, HEMI_INTENSITY]} />
      <ambientLight intensity={AMBIENT_INTENSITY} color={AMBIENT_COLOR} />

      <directionalLight
        ref={sun}
        color={SUN_COLOR}
        intensity={SUN_INTENSITY}
        castShadow={quality.shadows}
        shadow-mapSize-width={quality.shadowMapSize}
        shadow-mapSize-height={quality.shadowMapSize}
        shadow-camera-near={20}
        shadow-camera-far={330}
        shadow-camera-left={-shadowExtent}
        shadow-camera-right={shadowExtent}
        shadow-camera-top={shadowExtent}
        shadow-camera-bottom={-shadowExtent}
        shadow-bias={-0.0003}
        shadow-normalBias={0.04}
        shadow-radius={quality.tier === 'high' ? 2.0 : 1.4}
      />
      <primitive object={target} />
    </>
  )
}
