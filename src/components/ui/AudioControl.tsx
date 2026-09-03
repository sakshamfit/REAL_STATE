'use client'

import { useEffect, useState } from 'react'
import { audioEngine, getStoredLevel, getStoredMuted } from '@/lib/audio'
import { useExperience } from '@/lib/store'
import { sceneForBeat } from '@/data/scenes'

/**
 * Environmental audio control.
 *
 * The state is never implied by an icon alone: the button reads SOUND ON or
 * SOUND OFF next to a lit dot, and there is a master level that persists.
 */
export function AudioControl() {
  const activeBeat = useExperience((state) => state.activeBeat)
  const [muted, setMuted] = useState(true)
  const [level, setLevel] = useState(0.8)

  useEffect(() => {
    setMuted(getStoredMuted())
    setLevel(getStoredLevel())
  }, [])

  useEffect(() => {
    const scene = sceneForBeat(activeBeat)
    audioEngine.setMix(scene.audio)
  }, [activeBeat])

  const toggle = () => {
    setMuted(audioEngine.toggle())
  }

  const on = !muted
  const label = on ? 'Mute environmental audio' : 'Play environmental audio'

  return (
    <div className="audio-dock" data-on={on}>
      <button
        type="button"
        className="audio-control"
        aria-label={label}
        aria-pressed={on}
        title={label}
        data-muted={muted}
        onClick={toggle}
      >
        {on ? (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M11 5 6 9H2v6h4l5 4z" />
            <path d="M15.5 8.5a5 5 0 0 1 0 7" />
            <path d="M18.5 6a9 9 0 0 1 0 12" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M11 5 6 9H2v6h4l5 4z" />
            <line x1="22" y1="9" x2="16" y2="15" />
            <line x1="16" y1="9" x2="22" y2="15" />
          </svg>
        )}
      </button>

      <span className="audio-state" data-on={on} aria-hidden="true">
        <i />
        {on ? 'Sound on' : 'Sound off'}
      </span>

      <input
        className="audio-level"
        type="range"
        min={0}
        max={1}
        step={0.02}
        value={level}
        disabled={!on}
        aria-label="Ambience level"
        title="Ambience level"
        onChange={(event) => {
          const next = Number(event.target.value)
          setLevel(next)
          audioEngine.setLevel(next)
        }}
      />
    </div>
  )
}
