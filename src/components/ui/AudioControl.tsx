'use client'

import { useEffect, useState } from 'react'
import { audioEngine, getStoredMuted } from '@/lib/audio'
import { useExperience } from '@/lib/store'
import { sceneForBeat } from '@/data/scenes'

/** Floating, accessible environmental-audio control. */
export function AudioControl() {
  const activeBeat = useExperience((state) => state.activeBeat)
  const [muted, setMuted] = useState(true)

  useEffect(() => {
    setMuted(getStoredMuted())
  }, [])

  useEffect(() => {
    const scene = sceneForBeat(activeBeat)
    audioEngine.setMix(scene.audio)
  }, [activeBeat])

  const toggle = () => {
    const next = audioEngine.toggle()
    setMuted(next)
  }

  const label = muted ? 'Play environmental audio' : 'Mute environmental audio'

  return (
    <button
      type="button"
      className="audio-control"
      aria-label={label}
      title={label}
      data-muted={muted}
      onClick={toggle}
    >
      {muted ? (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M11 5 6 9H2v6h4l5 4z" />
          <line x1="22" y1="9" x2="16" y2="15" />
          <line x1="16" y1="9" x2="22" y2="15" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M11 5 6 9H2v6h4l5 4z" />
          <path d="M15.5 8.5a5 5 0 0 1 0 7" />
          <path d="M18.5 6a9 9 0 0 1 0 12" />
        </svg>
      )}
    </button>
  )
}
