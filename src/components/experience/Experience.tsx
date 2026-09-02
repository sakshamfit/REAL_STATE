'use client'

import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { AdaptiveDpr } from '@react-three/drei'
import * as THREE from 'three'
import type { QualitySettings } from '@/lib/quality'
import { useExperience } from '@/lib/store'
import { Scene } from './Scene'

/**
 * One canvas, one continuous shot. Fixed behind the HTML typography layer.
 */
export default function Experience({ quality }: { quality: QualitySettings }) {
  return (
    <div className="canvas-layer" aria-hidden="true">
      <Canvas
        dpr={quality.dpr}
        shadows={quality.shadows}
        camera={{ position: [0, 1, 18], fov: quality.fov, near: 0.1, far: 1600 }}
        gl={{
          antialias: quality.tier === 'high',
          powerPreference: 'high-performance',
          alpha: false,
          stencil: false,
          depth: true,
        }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping
          gl.toneMappingExposure = 1.12
          gl.setClearColor(new THREE.Color('#a9c0cb'), 1)
        }}
        onPointerMissed={() => {
          const state = useExperience.getState()
          if (state.mapEngaged && state.selectedState) state.selectState(null)
        }}
      >
        <Suspense fallback={null}>
          <Scene quality={quality} />
        </Suspense>
        <AdaptiveDpr pixelated />
      </Canvas>
    </div>
  )
}
