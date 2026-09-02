'use client'

import { create } from 'zustand'
import type { Tier } from './quality'

export type Phase = 'loading' | 'ready' | 'entered'

export type ExperienceState = {
  phase: Phase
  /** 0..1 preloader progress */
  loadProgress: number
  tier: Tier
  reducedMotion: boolean
  /** "SKIP 3D" / no-WebGL: typographic fallback instead of the WebGL world */
  flat: boolean
  /** beat id currently under the playhead */
  activeBeat: string
  scrollProgress: number
  /** id of the state selected in the 3D India map */
  selectedState: string | null
  hoveredState: string | null
  mapDataReady: boolean
  /** true while the map chapter owns the camera */
  mapEngaged: boolean
  menuOpen: boolean

  setPhase: (phase: Phase) => void
  setLoadProgress: (value: number) => void
  setTier: (tier: Tier, reducedMotion: boolean) => void
  setFlat: (flat: boolean) => void
  setActiveBeat: (id: string) => void
  setScrollProgress: (value: number) => void
  selectState: (id: string | null) => void
  hoverState: (id: string | null) => void
  setMapDataReady: (value: boolean) => void
  setMapEngaged: (value: boolean) => void
  setMenuOpen: (value: boolean) => void
}

export const useExperience = create<ExperienceState>((set) => ({
  phase: 'loading',
  loadProgress: 0,
  tier: 'mid',
  reducedMotion: false,
  flat: false,
  activeBeat: 'ground',
  scrollProgress: 0,
  selectedState: null,
  hoveredState: null,
  mapDataReady: false,
  mapEngaged: false,
  menuOpen: false,

  setPhase: (phase) => set({ phase }),
  setLoadProgress: (loadProgress) => set({ loadProgress }),
  setTier: (tier, reducedMotion) => set({ tier, reducedMotion }),
  setFlat: (flat) => set({ flat }),
  setActiveBeat: (activeBeat) => set((s) => (s.activeBeat === activeBeat ? s : { activeBeat })),
  setScrollProgress: (scrollProgress) => set({ scrollProgress }),
  selectState: (selectedState) => set({ selectedState }),
  hoverState: (hoveredState) => set((s) => (s.hoveredState === hoveredState ? s : { hoveredState })),
  setMapDataReady: (mapDataReady) => set({ mapDataReady }),
  setMapEngaged: (mapEngaged) => set((s) => (s.mapEngaged === mapEngaged ? s : { mapEngaged })),
  setMenuOpen: (menuOpen) => set({ menuOpen }),
}))

/**
 * Per-frame values live outside React so the camera can read them at 60fps
 * without triggering a single re-render.
 */
export const runtime = {
  /** raw scroll progress, 0..1 across the whole experience */
  progress: 0,
  /** smoothed scroll progress used by the camera */
  smoothProgress: 0,
  velocity: 0,
  /** 0..1 — how much the interactive India map owns the camera */
  mapInfluence: 0,
  /** true once the map chapter is fully settled and accepting pointer input */
  mapInteractive: false,
  /** local progress inside the india beat, 0..1 */
  mapBeatProgress: 0,
  pointer: { x: 0, y: 0 },
  /** set by CameraRig, read by chapters that need to know where we are */
  cameraZ: 0,
}
