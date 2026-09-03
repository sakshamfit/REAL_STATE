'use client'

import { Suspense } from 'react'
import dynamic from 'next/dynamic'
import { Canvas } from '@react-three/fiber'
import { AdaptiveDpr } from '@react-three/drei'
import * as THREE from 'three'
import type { QualitySettings } from '@/lib/quality'
import { useExperience } from '@/lib/store'
import { Scene } from './Scene'

/**
 * One canvas, one continuous shot. Fixed behind the HTML typography layer.
 */
/**
 * The post stack (composer + AO) is ~110 kB gzipped. The low tier gets its
 * grounding from the contact decals instead, so it never downloads it.
 */
const Post = dynamic(() => import('./Post').then((module) => module.Post), { ssr: false })

export default function Experience({ quality }: { quality: QualitySettings }) {
  return (
    <div className="canvas-layer" aria-hidden="true">
      <Canvas
        dpr={quality.dpr}
        shadows={quality.shadows}
        camera={{ position: [0, 1, 18], fov: quality.fov, near: 0.5, far: 2400 }}
        gl={{
          antialias: quality.tier === 'high',
          powerPreference: 'high-performance',
          alpha: false,
          stencil: false,
          depth: true,
        }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping
          // single source of truth: `Lighting` owns exposure, and `Post`
          // re-applies ACES inside the composer on the same 1.0
          gl.toneMappingExposure = 1.0
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
        {quality.tier !== 'low' ? <Post quality={quality} /> : null}
        <AdaptiveDpr pixelated />
      </Canvas>
    </div>
  )
}
