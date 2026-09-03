'use client'

import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { useExperience } from '@/lib/store'
import { loadIndiaData } from '@/lib/map-data'
import { useScrollLock, registerGsap } from '@/lib/scroll'
import { company } from '@/data/company'
import { loadProductionAssets } from '@/lib/asset-loader'

function loaderStage(percent: number) {
  if (percent < 14) return 'PREPARING THE WORLD'
  if (percent < 46) return 'STREAMING ARCHITECTURE'
  if (percent < 96) return 'STREAMING ENVIRONMENT'
  if (percent < 100) return 'COMPILING THE FIRST FRAMES'
  return 'ENTERING'
}

export function Preloader() {
  const phase = useExperience((state) => state.phase)
  const setPhase = useExperience((state) => state.setPhase)
  const setFlat = useExperience((state) => state.setFlat)
  const setMapDataReady = useExperience((state) => state.setMapDataReady)

  const [percent, setPercent] = useState(0)
  const [ready, setReady] = useState(false)
  const startedAt = useRef(0)

  useScrollLock(phase !== 'entered')

  useEffect(() => {
    registerGsap()
    startedAt.current = performance.now()
    let cancelled = false
    const state = { value: 0 }

    const advance = (target: number, duration: number) =>
      gsap.to(state, {
        value: target,
        duration,
        ease: 'power2.out',
        onUpdate: () => {
          if (!cancelled) setPercent(state.value)
        },
      })

    const run = async () => {
      advance(8, 0.35)
      if (document.fonts?.ready) {
        try {
          await document.fonts.ready
        } catch {
          /* fonts are optional */
        }
      }
      if (cancelled) return
      advance(12, 0.3)

      // Real 0..1 progress from streaming the priority GLBs (never fake bytes)
      const assetProgress = await loadProductionAssets()
      if (cancelled) return
      advance(18 + assetProgress * 74, 0.5)

      try {
        await loadIndiaData()
        if (!cancelled) setMapDataReady(true)
      } catch {
        /* the map falls back gracefully */
      }
      if (cancelled) return
      advance(96, 0.4)

      // Hand over on a real signal: wait until the world has actually drawn
      // three frames (shader compile + first upload), never a fixed timer.
      await new Promise((resolve) => {
        let frames = 0
        const tick = () => {
          frames += 1
          if (frames >= 3) resolve(null)
          else requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      })
      if (cancelled) return
      const elapsed = performance.now() - startedAt.current
      if (elapsed < 700) await new Promise((resolve) => setTimeout(resolve, 700 - elapsed))
      if (cancelled) return
      advance(100, 0.35)
      setReady(true)
    }

    run()
    return () => {
      cancelled = true
      gsap.killTweensOf(state)
    }
  }, [setMapDataReady])

  const enter = () => {
    setPhase('entered')
    window.scrollTo({ top: 0 })
    requestAnimationFrame(() => {
      window.dispatchEvent(new Event('resize'))
      window.dispatchEvent(new CustomEvent('rudra:refresh'))
    })
  }

  const skip = () => {
    setFlat(true)
    setPhase('entered')
    window.scrollTo({ top: 0 })
  }

  return (
    <div className="loader" data-done={phase === 'entered'} aria-hidden={phase === 'entered'}>
      <p className="loader__mark">RUDRA</p>
      <p className="loader__sub">CONSTRUCTIONS &amp; SUPPLIERS</p>

      <p className="loader__status">{ready ? 'EXPERIENCE READY' : loaderStage(percent)}</p>
      <p className="loader__percent">{String(Math.round(percent)).padStart(3, '0')}%</p>
      <div className="loader__track">
        <i style={{ transform: `scaleX(${percent / 100})` }} />
      </div>

      <div className="loader__actions">
        {ready ? (
          <>
            <button type="button" className="loader__enter" onClick={enter} autoFocus>
              ENTER EXPERIENCE <span aria-hidden="true">→</span>
            </button>
            <button type="button" className="loader__skip" onClick={skip}>
              SKIP 3D →
            </button>
          </>
        ) : (
          <span className="loader__skip">{company.tagline}</span>
        )}
      </div>
    </div>
  )
}
