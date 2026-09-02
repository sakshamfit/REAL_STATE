'use client'

import { useEffect, useRef } from 'react'
import { beatTimings } from '@/lib/chapters'
import { runtime, useExperience } from '@/lib/store'

const MAJOR = beatTimings.filter((timing) =>
  ['ground', 'build', 'company', 'services-intro', 'process-intro', 'material-world', 'trust', 'corridor', 'india', 'future', 'contact'].includes(
    timing.beat.id,
  ),
)

export function Hud() {
  const activeBeat = useExperience((state) => state.activeBeat)
  const percentRef = useRef<HTMLSpanElement>(null)
  const barRef = useRef<HTMLElement>(null)
  const chapterRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    let frame = 0
    let lastLabel = ''
    const tick = () => {
      const value = runtime.progress
      if (percentRef.current) percentRef.current.textContent = `${String(Math.round(value * 100)).padStart(3, '0')}%`
      if (barRef.current) barRef.current.style.transform = `scaleX(${value})`
      const timing = beatTimings.find((item) => value < item.end) ?? beatTimings[beatTimings.length - 1]
      const label = timing?.beat.label ?? ''
      if (label !== lastLabel && chapterRef.current) {
        chapterRef.current.textContent = label
        lastLabel = label
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <>
      <div className="hud">
        <span className="hud__chapter" ref={chapterRef}>
          THE GROUND
        </span>
        <span className="hud__bar">
          <i ref={barRef} />
        </span>
        <span className="hud__percent" ref={percentRef}>
          000%
        </span>
      </div>

      <nav className="rail" aria-label="Chapters">
        {MAJOR.map((timing) => (
          <button
            key={timing.beat.id}
            type="button"
            className="rail__item"
            data-active={timing.beat.id === activeBeat || isWithin(timing.beat.id, activeBeat)}
            onClick={() => window.dispatchEvent(new CustomEvent('rudra:navigate', { detail: timing.beat.id }))}
          >
            <span className="rail__label">{timing.beat.label}</span>
          </button>
        ))}
      </nav>
    </>
  )
}

const GROUPS: Record<string, string[]> = {
  'services-intro': ['service-civil', 'service-residential', 'service-infrastructure', 'service-solar', 'service-renovation', 'service-materials'],
  'process-intro': ['process-1', 'process-2', 'process-3', 'process-4', 'process-5'],
}

function isWithin(railId: string, activeBeat: string) {
  return Boolean(GROUPS[railId]?.includes(activeBeat))
}
