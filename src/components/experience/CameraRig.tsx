'use client'

import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { sampleCamera } from '@/lib/camera-path'
import { damp } from '@/lib/math'
import { runtime, useExperience } from '@/lib/store'
import { mapCamera, updateMapCamera } from '@/lib/map-camera'
import type { QualitySettings } from '@/lib/quality'

/**
 * The single camera of the film. It reads the scroll, samples the spline, lets
 * the India map take over inside its own chapter, and always follows with a
 * heavy damped lag — nothing in this world moves abruptly.
 */
export function CameraRig({ quality }: { quality: QualitySettings }) {
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera
  const size = useThree((state) => state.size)
  const reducedMotion = useExperience((state) => state.reducedMotion)

  const journeyPos = useRef(new THREE.Vector3(0, 1, 18))
  const journeyLook = useRef(new THREE.Vector3(0, 1.2, -2))
  const finalPos = useRef(new THREE.Vector3(0, 1, 18))
  const finalLook = useRef(new THREE.Vector3(0, 1.2, -2))
  const look = useRef(new THREE.Vector3(0, 1.2, -2))

  useEffect(() => {
    const aspect = size.width / Math.max(1, size.height)
    const portraitBoost = aspect < 1 ? 1.24 : aspect < 1.4 ? 1.08 : 1
    camera.fov = Math.min(72, quality.fov * portraitBoost)
    // near 0.1 throws away most of the depth range: at 200 m the buffer
    // resolves ~24 mm, which is coarser than the 15 mm the road overlays sit
    // at, so they z-fight. 0.5 buys a 5× improvement for no visible clipping.
    camera.near = 0.5
    camera.far = 2400
    camera.updateProjectionMatrix()
  }, [camera, quality.fov, size])

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05)
    runtime.smoothProgress = runtime.progress

    sampleCamera(runtime.progress, journeyPos.current, journeyLook.current)
    finalPos.current.copy(journeyPos.current)
    finalLook.current.copy(journeyLook.current)

    updateMapCamera(dt, state.pointer, reducedMotion)

    if (mapCamera.influence > 0.0005) {
      finalPos.current.lerp(mapCamera.position, mapCamera.influence)
      finalLook.current.lerp(mapCamera.look, mapCamera.influence)
    }

    const lambda = reducedMotion ? 14 : 3.6
    camera.position.x = damp(camera.position.x, finalPos.current.x, lambda, dt)
    camera.position.y = damp(camera.position.y, finalPos.current.y, lambda, dt)
    camera.position.z = damp(camera.position.z, finalPos.current.z, lambda, dt)

    look.current.x = damp(look.current.x, finalLook.current.x, lambda, dt)
    look.current.y = damp(look.current.y, finalLook.current.y, lambda, dt)
    look.current.z = damp(look.current.z, finalLook.current.z, lambda, dt)

    camera.lookAt(look.current)

    if (!reducedMotion) {
      const time = state.clock.elapsedTime
      camera.rotation.z += Math.sin(time * 0.21) * 0.0035 + Math.sin(time * 0.07) * 0.0022
    }

    runtime.cameraZ = camera.position.z
  })

  return null
}
