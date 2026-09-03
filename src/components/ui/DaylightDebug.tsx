'use client'

import { useEffect, useState } from 'react'
import { DEFAULT_SKY } from '@/lib/sky'
import {
  AMBIENT_INTENSITY,
  BACKGROUND_INTENSITY,
  DAYLIGHT_EXPOSURE,
  ENVIRONMENT_INTENSITY,
  HEMI_INTENSITY,
  SUN_INTENSITY,
} from '@/lib/daylight'
import { FOG } from '@/lib/world'
import type { QualitySettings } from '@/lib/quality'

/**
 * Daylight debug (§34).
 *
 * Shows the numbers that decide how bright the world is, so a brightness
 * complaint can be answered by reading values instead of guessing.
 *
 * Off unless the URL carries `?daylight=1`. Nothing here is reachable from the
 * UI in a normal session, and it can be deleted without touching the scene.
 */

function useDaylightFlag() {
  const [on, setOn] = useState(false)
  useEffect(() => {
    setOn(typeof window !== 'undefined' && window.location.search.includes('daylight=1'))
  }, [])
  return on
}

export function DaylightDebug({ quality }: { quality: QualitySettings }) {
  const on = useDaylightFlag()
  if (!on) return null

  const sun = DEFAULT_SKY.sunDirection.clone().normalize()
  const elevation = (Math.asin(sun.y) * 180) / Math.PI
  const bearing = (Math.atan2(sun.x, sun.z) * 180) / Math.PI

  const rows: [string, string][] = [
    ['tier', quality.tier],
    ['exposure', DAYLIGHT_EXPOSURE.toFixed(2)],
    ['tone mapping', 'ACES filmic'],
    ['sun elevation', `${elevation.toFixed(1)}°  (daylight 40–70°)`],
    ['sun bearing', `${bearing.toFixed(1)}° from +Z`],
    ['sun intensity', SUN_INTENSITY.toFixed(2)],
    ['sky fill (hemi)', HEMI_INTENSITY.toFixed(2)],
    ['ambient', AMBIENT_INTENSITY.toFixed(2)],
    ['environment (IBL)', ENVIRONMENT_INTENSITY.toFixed(2)],
    ['background', BACKGROUND_INTENSITY.toFixed(2)],
    ['fog', `${FOG.color}  d=${FOG.density}`],
    ['shadow map', `${quality.shadowMapSize}px, ${quality.tier === 'low' ? 42 : quality.tier === 'mid' ? 70 : 92} m extent`],
    ['SSAO', quality.tier === 'low' ? 'off (contact decals only)' : `on, intensity ${quality.tier === 'high' ? 0.82 : 0.66}`],
    ['vignette', '0.10 radial / 0.13 bottom'],
  ]

  return (
    <div
      style={{
        position: 'fixed',
        left: 16,
        bottom: 16,
        zIndex: 90,
        padding: '12px 14px',
        borderRadius: 8,
        background: 'rgba(12, 16, 18, 0.72)',
        backdropFilter: 'blur(6px)',
        color: '#e8eeef',
        font: '11px/1.55 ui-monospace, SFMono-Regular, Menlo, monospace',
        letterSpacing: 0.2,
        pointerEvents: 'none',
      }}
    >
      <div style={{ opacity: 0.6, marginBottom: 6, letterSpacing: 1 }}>DAYLIGHT DEBUG</div>
      {rows.map(([key, value]) => (
        <div key={key} style={{ display: 'flex', gap: 10, justifyContent: 'space-between' }}>
          <span style={{ opacity: 0.65 }}>{key}</span>
          <span>{value}</span>
        </div>
      ))}
    </div>
  )
}
