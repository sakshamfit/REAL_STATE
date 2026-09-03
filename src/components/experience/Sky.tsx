'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { QualitySettings } from '@/lib/quality'
import { buildCloudTexture, buildSkyTexture, DEFAULT_SKY } from '@/lib/sky'

/**
 * Sky + image based lighting.
 *
 * The background, the reflections and the sun all come from one procedural
 * equirect map, so glass, water and painted metal reflect exactly the sky that
 * is on screen. A second, slowly rotating cloud sheet supplies cloud structure.
 */
export function Sky({ quality }: { quality: QualitySettings }) {
  const gl = useThree((state) => state.gl)
  const scene = useThree((state) => state.scene)
  const cloudRef = useRef<THREE.Mesh>(null)

  const skyTexture = useMemo(() => buildSkyTexture(DEFAULT_SKY, quality.tier === 'low' ? 256 : 512), [quality.tier])
  const cloudTexture = useMemo(
    () => buildCloudTexture(5, quality.tier === 'low' ? 512 : 1024, DEFAULT_SKY.cloudiness),
    [quality.tier],
  )

  useEffect(() => {
    const previousBackground = scene.background
    const previousEnvironment = scene.environment
    scene.background = skyTexture

    // every tier gets image based lighting — without it PBR reads as plastic
    const pmrem = new THREE.PMREMGenerator(gl)
    pmrem.compileEquirectangularShader()
    const target = pmrem.fromEquirectangular(skyTexture)
    scene.environment = target.texture
    pmrem.dispose()
    return () => {
      scene.background = previousBackground
      scene.environment = previousEnvironment
      target.dispose()
    }
  }, [gl, scene, skyTexture, quality.tier])

  useFrame((state, delta) => {
    // clouds drift, very slowly — a breeze in the upper air, not a timelapse
    if (cloudRef.current) cloudRef.current.rotation.y += delta * 0.0016
  })

  return (
    <group>
      <mesh ref={cloudRef} scale={[-1, 1, 1]} renderOrder={-1}>
        <sphereGeometry args={[1420, 40, 24]} />
        <meshBasicMaterial
          map={cloudTexture}
          transparent
          opacity={0.72}
          depthWrite={false}
          side={THREE.BackSide}
          fog={false}
        />
      </mesh>
    </group>
  )
}

export const SUN_DIRECTION = DEFAULT_SKY.sunDirection.clone()
export const HORIZON_COLOR = DEFAULT_SKY.horizon.clone()
