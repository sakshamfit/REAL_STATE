'use client'

import { useFrame } from '@react-three/fiber'
import type { QualitySettings } from '@/lib/quality'
import { runtime, useExperience } from '@/lib/store'
import { CameraRig } from './CameraRig'
import { Lighting } from './Lighting'
import { Atmosphere } from './Atmosphere'
import { Sky } from './Sky'
import { RealWorld } from './RealWorld'
import { WindSystem } from './WindSystem'
import { EntranceGate } from './EntranceGate'
import { HeroBuilding } from './chapters/HeroBuilding'
import { ServicesWorlds } from './chapters/ServicesWorlds'
import { ProcessModel } from './chapters/ProcessModel'
import { MaterialGates } from './chapters/MaterialGates'
import { TrustScene } from './chapters/TrustScene'
import { CorridorScene } from './chapters/CorridorScene'
import { IndiaMap } from './chapters/IndiaMap'
import { FutureScene } from './chapters/FutureScene'

/** The whole world, in story order. */
export function Scene({ quality }: { quality: QualitySettings }) {
  return (
    <>
      <CameraRig quality={quality} />
      <Lighting quality={quality} />
      <Atmosphere quality={quality} />
      <Sky quality={quality} />
      <RealWorld quality={quality} />
      <WindSystem quality={quality} />
      <EntranceGate quality={quality} />

      <HeroBuilding quality={quality} />
      <ServicesWorlds quality={quality} />
      <ProcessModel quality={quality} />
      <MaterialGates quality={quality} />
      <TrustScene quality={quality} />
      <CorridorScene quality={quality} />
      <IndiaMap quality={quality} />
      <FutureScene quality={quality} />

      <MapEngagement />
    </>
  )
}

/** Publishes "is the map currently driving?" to React (UI layer needs it). */
function MapEngagement() {
  const setMapEngaged = useExperience((state) => state.setMapEngaged)
  useFrame(() => {
    setMapEngaged(runtime.mapInteractive)
  })
  return null
}
