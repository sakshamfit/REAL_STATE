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
import { FlatExperience } from '@/components/ui/FlatExperience'
import { AudioControl } from '@/components/ui/AudioControl'
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

  return (
    <>
      {flat ? (
        <FlatExperience />
      ) : (
        <>
          <Experience quality={quality} />
          <ScrollContent />
          <MapOverlay />
            <Hud />
          <Overlays />
        </>
      )}

      <Navigation />
      <AudioControl />
      <Preloader />
    </>
  )
}
