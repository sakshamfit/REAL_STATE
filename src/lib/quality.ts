import { useEffect, useState } from 'react'

export type Tier = 'high' | 'mid' | 'low'

export type QualitySettings = {
  tier: Tier
  dpr: [number, number]
  textureSize: 256 | 512
  shadows: boolean
  shadowMapSize: number
  environment: boolean
  dust: number
  /** multiplier applied to decorative instance counts */
  density: number
  fov: number
  grid: boolean
  contactShadows: boolean
}

const PRESETS: Record<Tier, QualitySettings> = {
  high: {
    tier: 'high',
    dpr: [1, 1.85],
    textureSize: 512,
    shadows: true,
    shadowMapSize: 2048,
    environment: true,
    dust: 900,
    density: 1,
    fov: 42,
    grid: true,
    contactShadows: true,
  },
  mid: {
    tier: 'mid',
    dpr: [1, 1.5],
    textureSize: 256,
    shadows: true,
    shadowMapSize: 1024,
    environment: true,
    dust: 450,
    density: 0.7,
    fov: 46,
    grid: true,
    contactShadows: false,
  },
  low: {
    tier: 'low',
    dpr: [0.8, 1.15],
    textureSize: 256,
    shadows: false,
    shadowMapSize: 512,
    environment: false,
    dust: 160,
    density: 0.42,
    fov: 52,
    grid: false,
    contactShadows: false,
  },
}

export function detectTier(): Tier {
  if (typeof window === 'undefined') return 'mid'
  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false
  const cores = (navigator as Navigator & { hardwareConcurrency?: number }).hardwareConcurrency ?? 4
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4
  const small = window.innerWidth < 900

  if (!coarse && !small) return cores >= 8 && memory >= 8 ? 'high' : 'mid'
  if (cores >= 6 && memory >= 4) return 'mid'
  return 'low'
}

export function getQuality(tier: Tier, reducedMotion: boolean): QualitySettings {
  const base = PRESETS[tier]
  if (!reducedMotion) return base
  return {
    ...base,
    dust: Math.floor(base.dust * 0.25),
    density: base.density * 0.6,
    environment: base.environment,
    shadows: false,
  }
}

export function isWebGLAvailable() {
  if (typeof window === 'undefined') return false
  try {
    const canvas = document.createElement('canvas')
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    )
  } catch {
    return false
  }
}

export function useDeviceProfile() {
  const [state, setState] = useState<{ tier: Tier; reducedMotion: boolean; webgl: boolean }>({
    tier: 'mid',
    reducedMotion: false,
    webgl: true,
  })

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const read = () =>
      setState({
        tier: detectTier(),
        reducedMotion: query.matches,
        webgl: isWebGLAvailable(),
      })
    read()
    query.addEventListener('change', read)
    window.addEventListener('resize', read)
    return () => {
      query.removeEventListener('change', read)
      window.removeEventListener('resize', read)
    }
  }, [])

  return state
}
