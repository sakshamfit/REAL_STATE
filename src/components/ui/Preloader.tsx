'use client'

import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { useExperience } from '@/lib/store'
import { loadIndiaData } from '@/lib/map-data'
import { useScrollLock, registerGsap } from '@/lib/scroll'
import { company } from '@/data/company'

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
      advance(14, 0.7)
      if (document.fonts?.ready) {
        try {
          await document.fonts.ready
        } catch {
          /* fonts are optional */
        }
      }
      if (cancelled) return
      advance(46, 1.1)

      try {
        await loadIndiaData()
        if (!cancelled) setMapDataReady(true)
      } catch {
        /* the map falls back gracefully */
      }
      if (cancelled) return
      advance(92, 1.3)

      // let the first frames of the world compile before we hand over control
      await new Promise((resolve) => setTimeout(resolve, 520))
      if (cancelled) return
      await new Promise((resolve) => {
        const elapsed = performance.now() - startedAt.current
        setTimeout(resolve, Math.max(0, 2600 - elapsed))
      })
      if (cancelled) return
      advance(100, 0.6)
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

      <p className="loader__status">{ready ? 'EXPERIENCE READY' : 'LOADING EXPERIENCE'}</p>
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
