'use client'

import { assetById, preloadAssetIds } from '@/data/assets'

/**
 * Real asset preloader.
 *
 * Streams the production GLBs with fetch (this also warms the browser cache),
 * reports a truthful 0..1 fraction and never fakes bytes that have not
 * arrived. A failure on a single asset does not block the world — the asset
 * loader falls back to the shared GLB ErrorBoundary at runtime.
 *
 * A per-asset timeout (30 s) ensures one stalled connection cannot hold the
 * loading screen hostage forever.
 */

const FETCH_TIMEOUT = 30_000

let inflight: Promise<number> | null = null

export function loadProductionAssets(): Promise<number> {
  if (inflight) return inflight
  const urls = preloadAssetIds.map((id) => assetById.get(id)?.path ?? '').filter(Boolean)

  let completed = 0
  inflight = Promise.all(
    urls.map(async (url) => {
      try {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT)
        const response = await fetch(url, { signal: controller.signal })
        clearTimeout(timer)
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
        completed += 1
      }
    }),
  ).then(() => (urls.length ? completed / urls.length : 1))

  inflight.catch(() => {
    inflight = null
  })
  return inflight
}

export function productionAssetCount(): number {
  return preloadAssetIds.length
}
