'use client'

import React, { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useGLTF } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import type { Object3D } from 'three'
import { assetById, preloadAssetIds, type AssetEntry } from '@/data/assets'
import { materialForKey } from './materials'
import type { QualitySettings } from './quality'

/** ----------------------------------------------------------------- preload */

let preloaded = false

/** Warm the browser cache for high-priority production assets. */
export function preloadProductionAssets() {
  if (preloaded || typeof window === 'undefined') return
  preloaded = true
  for (const id of preloadAssetIds) {
    const asset = assetById.get(id)
    if (asset) useGLTF.preload(asset.path)
  }
}

/** ----------------------------------------------------------------- helpers */

export function getAsset(id: string): AssetEntry | undefined {
  return assetById.get(id)
}

function applyAssetMaterials(root: Object3D, asset: AssetEntry, quality: QualitySettings) {
  root.traverse((object) => {
    const mesh = object as unknown as { isMesh?: boolean; material?: unknown; castShadow: boolean; receiveShadow: boolean; frustumCulled: boolean }
    if (!mesh.isMesh) return
    const original = mesh.material as { name?: string; [key: string]: unknown }
    const materialName = original && typeof original.name === 'string' ? original.name : ''
    const key = asset.materialMap[materialName] ?? (materialName ? materialName : 'concrete')
    mesh.material = materialForKey(key, { textureSize: quality.textureSize })
    mesh.castShadow = quality.shadows
    mesh.receiveShadow = quality.shadows
    mesh.frustumCulled = false
  })
}

/** ----------------------------------------------------------------- model */

export type AssetModelProps = {
  id: string
  position?: [number, number, number]
  rotation?: [number, number, number]
  scale?: [number, number, number]
  quality: QualitySettings
  visible?: boolean
  castShadow?: boolean
  receiveShadow?: boolean
  /** 'high' always renders full detail; 'auto' removes far objects */
  lod?: 'auto' | 'high' | 'medium' | 'low'
  /** range for 'auto' LOD. Smaller than cullDistance for hotter devices. */
  lodDistance?: number
  /** called after the GLB loads and materials are applied */
  onLoaded?: () => void
  /** gives the cloned scene object so callers can animate / attach to it */
  onObject?: (object: Object3D) => void
  fallback?: ReactNode
}

type AssetModelInnerProps = Omit<AssetModelProps, 'fallback' | 'id'> & { asset: AssetEntry }

/** Loads a registered GLB and remaps it to the shared PBR material library. */
export function AssetModel({
  id,
  position,
  rotation,
  scale,
  quality,
  visible = true,
  castShadow = true,
  receiveShadow = true,
  lod,
  lodDistance,
  onLoaded,
  onObject,
  fallback,
}: AssetModelProps) {
  const asset = assetById.get(id)
  if (!asset) return null

  return (
    <AssetErrorBoundary fallback={fallback ?? null}>
      <AssetModelInner
        asset={asset}
        position={position}
        rotation={rotation}
        scale={scale}
        quality={quality}
        visible={visible}
        castShadow={castShadow}
        receiveShadow={receiveShadow}
        lod={lod}
        lodDistance={lodDistance}
        onLoaded={onLoaded}
        onObject={onObject}
      />
    </AssetErrorBoundary>
  )
}

function AssetModelInner({
  asset,
  position,
  rotation,
  scale,
  quality,
  visible,
  castShadow,
  receiveShadow,
  lod = 'high',
  lodDistance,
  onLoaded,
  onObject,
}: AssetModelInnerProps) {
  const gltf = useGLTF(asset.path)
  const clone = useMemo(() => gltf.scene.clone(true), [gltf])
  const camera = useThree((state) => state.camera)
  const nearState = useRef(true)
  const [near, setNear] = useState(true)
  const fired = useRef(false)

  const effectiveDistance = lodDistance ?? asset.cullDistance * (quality.tier === 'low' ? 0.62 : quality.tier === 'mid' ? 0.8 : 1)

  useFrame(() => {
    if (lod !== 'auto') return
    const p = position ?? [0, 0, 0]
    const dx = camera.position.x - p[0]
    const dy = camera.position.y - p[1]
    const dz = camera.position.z - p[2]
    const distance = Math.hypot(dx, dy, dz)
    const next = distance < effectiveDistance
    if (next !== nearState.current) {
      nearState.current = next
      setNear(next)
    }
  })

  useEffect(() => {
    applyAssetMaterials(clone, asset, quality)
    onObject?.(clone)
    if (!fired.current) {
      fired.current = true
      onLoaded?.()
    }
  }, [clone, asset, quality, onObject, onLoaded])

  if (lod === 'auto' && !near) return null

  return (
    <group
      position={position}
      rotation={rotation}
      scale={scale}
      visible={visible}
    >
      <primitive
        object={clone}
        castShadow={castShadow}
        receiveShadow={receiveShadow}
      />
    </group>
  )
}

/** ----------------------------------------------------------------- error */

type ErrorBoundaryState = { failed: boolean }

class AssetErrorBoundary extends React.Component<{ fallback: ReactNode; children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { failed: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    if (typeof window !== 'undefined') {
      console.warn('[asset] GLB load failed, using fallback.', error)
    }
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}
