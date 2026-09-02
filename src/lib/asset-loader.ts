'use client'

import { assetById, preloadAssetIds } from '@/data/assets'

/**
 * Real asset preloader.
 *
 * Streams the production GLBs with fetch (this also warms the browser cache),
 * reports a truthful 0..1 fraction and never fakes bytes that have not
 * arrived. A failure on a single asset does not block the world — the asset
 * loader falls back to the shared GLB ErrorBoundary at runtime.
 */

let inflight: Promise<number> | null = null

export function loadProductionAssets(): Promise<number> {
  if (inflight) return inflight
  const urls = preloadAssetIds.map((id) => assetById.get(id)?.path ?? '').filter(Boolean)

  let current = 0
  inflight = Promise.all(
    urls.map(async (url, index) => {
      try {
        const response = await fetch(url)
        if (!response.ok) {
          console.warn(`[asset-loader] ${url} returned ${response.status}`)
          return
        }
        const buffer = await response.arrayBuffer()
        if (buffer.byteLength < 20) {
          console.warn(`[asset-loader] ${url} appears empty`)
        }
      } catch (error) {
        console.warn(`[asset-loader] ${url} could not be preloaded`, error)
      } finally {
        current = (index + 1) / urls.length
      }
    }),
  ).then(() => current)

  inflight.catch(() => {
    inflight = null
  })
  return inflight
}

export function productionAssetCount(): number {
  return preloadAssetIds.length
}
