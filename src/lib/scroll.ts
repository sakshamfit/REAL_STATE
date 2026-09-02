'use client'

import { useEffect } from 'react'
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { beatTimings } from './chapters'
import { runtime, useExperience } from './store'

let registered = false
export function registerGsap() {
  if (registered || typeof window === 'undefined') return
  gsap.registerPlugin(ScrollTrigger)
  registered = true
}

let lenis: Lenis | null = null

export function getLenis() {
  return lenis
}

export function scrollToBeat(beatId: string) {
  const timing = beatTimings.find((t) => t.beat.id === beatId)
  if (!timing) return
  const doc = document.documentElement
  const limit = doc.scrollHeight - window.innerHeight
  const target = limit * (timing.start + (timing.end - timing.start) * 0.06)
  if (lenis) lenis.scrollTo(target, { duration: 1.6 })
  else window.scrollTo({ top: target, behavior: 'smooth' })
}

function readProgress() {
  const doc = document.documentElement
  const limit = Math.max(1, doc.scrollHeight - window.innerHeight)
  const next = Math.min(1, Math.max(0, window.scrollY / limit))
  runtime.velocity = next - runtime.progress
  runtime.progress = next
  const timing = beatTimings.find((t) => next < t.end) ?? beatTimings[beatTimings.length - 1]
  const store = useExperience.getState()
  if (timing && timing.beat.id !== store.activeBeat) store.setActiveBeat(timing.beat.id)
}

/**
 * Smooth scroll (Lenis) wired into GSAP's ticker + ScrollTrigger, plus the
 * scroll listener that feeds the per-frame `runtime` values the camera reads.
 */
export function useSmoothScroll(enabled: boolean) {
  useEffect(() => {
    registerGsap()
    if (!enabled) {
      window.addEventListener('scroll', readProgress, { passive: true })
      window.addEventListener('resize', readProgress)
      readProgress()
      return () => {
        window.removeEventListener('scroll', readProgress)
        window.removeEventListener('resize', readProgress)
      }
    }

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const instance = new Lenis({
      duration: reduced ? 0.6 : 1.15,
      smoothWheel: !reduced,
      syncTouch: false,
      touchMultiplier: 1.4,
      wheelMultiplier: 1,
      easing: (t: number) => 1 - Math.pow(1 - t, 3),
    })
    lenis = instance

    const onScroll = () => readProgress()
    instance.on('scroll', onScroll)
    const raf = (time: number) => instance.raf(time * 1000)
    gsap.ticker.add(raf)
    gsap.ticker.lagSmoothing(0)
    ScrollTrigger.refresh()
    readProgress()

    return () => {
      gsap.ticker.remove(raf)
      instance.off('scroll', onScroll)
      instance.destroy()
      lenis = null
    }
  }, [enabled])
}

/** Lock / unlock page scroll (preloader, mobile menu). */
export function useScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return
    const instance = lenis
    instance?.stop()
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
      instance?.start()
    }
  }, [locked])
}
