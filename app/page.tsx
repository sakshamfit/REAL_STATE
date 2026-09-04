'use client'

import { useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { getQuality, useDeviceProfile } from '@/lib/quality'
import { useExperience } from '@/lib/store'
import { useSmoothScroll, registerGsap } from '@/lib/scroll'
import { Preloader } from '@/components/ui/Preloader'
import { Navigation } from '@/components/ui/Navigation'
import { ScrollContent } from '@/components/ui/ScrollContent'
import { Hud } from '@/components/ui/Hud'
import { MapOverlay } from '@/components/ui/MapOverlay'
import { Overlays } from '@/components/ui/Overlays'
import { DaylightDebug } from '@/components/ui/DaylightDebug'
import { FlatExperience } from '@/components/ui/FlatExperience'
import { AudioControl } from '@/components/ui/AudioControl'
import { CanvasErrorBoundary } from '@/components/ui/CanvasErrorBoundary'
import { preloadProductionAssets } from '@/lib/glb'

const Experience = dynamic(() => import('@/components/experience/Experience'), { ssr: false })

export default function Page() {
  const { tier, reducedMotion, webgl } = useDeviceProfile()
  const setTier = useExperience((state) => state.setTier)
  const setFlat = useExperience((state) => state.setFlat)
  const flat = useExperience((state) => state.flat)
  const phase = useExperience((state) => state.phase)

  const quality = useMemo(() => getQuality(tier, reducedMotion), [tier, reducedMotion])

  useEffect(() => {
    registerGsap()
    setTier(tier, reducedMotion)
    if (!webgl) setFlat(true)
    if (webgl) preloadProductionAssets()
  }, [tier, reducedMotion, webgl, setTier, setFlat])

  useSmoothScroll(phase === 'entered')

  useEffect(() => {
    const refresh = () => ScrollTrigger.refresh()
    window.addEventListener('rudra:refresh', refresh)
    const timeout = window.setTimeout(refresh, 900)
    return () => {
      window.removeEventListener('rudra:refresh', refresh)
      window.clearTimeout(timeout)
    }
  }, [flat])

  // After entering the experience, force a GSAP refresh once the scroll
  // lock has been released and Lenis is live — the initial rAF-based
  // refresh inside the Preloader can fire too early.
  useEffect(() => {
    if (phase !== 'entered') return
    const t1 = setTimeout(() => {
      ScrollTrigger.refresh()
    }, 200)
    const t2 = setTimeout(() => {
      ScrollTrigger.refresh()
    }, 800)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [phase])

  return (
    <>
      {flat ? (
        <FlatExperience />
      ) : (
        <>
          <CanvasErrorBoundary onError={() => setFlat(true)}>
            <Experience quality={quality} />
          </CanvasErrorBoundary>
          <ScrollContent />
          <MapOverlay />
          <Hud />
          <Overlays />
        </>
      )}

      <Navigation />
      <AudioControl />
      {/* dev tool: ?daylight=1 only, never shown in a normal session */}
      <DaylightDebug quality={quality} />
      <Preloader />
    </>
  )
}
