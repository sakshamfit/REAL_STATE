'use client'

import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { EffectComposer, N8AO, ToneMapping, Vignette } from '@react-three/postprocessing'
import { ToneMappingMode, BlendFunction } from 'postprocessing'
import type { QualitySettings } from '@/lib/quality'
import { DAYLIGHT_EXPOSURE } from './Lighting'

/**
 * Post — tone mapping, ambient occlusion, and photographic finishing.
 *
 * The objective of the AO pass is not dramatic dark outlines; it is that
 * objects read as *embedded* in the ground instead of standing on it.
 *
 * V12 additions:
 *  · Vignette — subtle natural lens vignetting (12 % corner darkening) that
 *    frames the subject and reads as photographic rather than rendered.
 *  · Boosted AO — stronger contact shadows (intensity 1.0–1.2) so buildings
 *    read as sitting on the earth rather than floating above it.
 *  · Warm dust AO colour is preserved — never pure black.
 *
 * Deliberately conservative:
 *  · warm dust-coloured occlusion, never pure black;
 *  · moderate radius with a soft distance falloff, so distant geometry gets
 *    almost none and near-field contact gets most of it;
 *  · half resolution on the mid tier with depth-aware upsampling, so the
 *    upsample cannot bleed occlusion across silhouettes;
 *  · disabled on the low tier, where the contact decals carry grounding.
 */

/**
 * Occlusion colour and strength.
 *
 * In daylight, ambient occlusion is a small correction — the sky fills the
 * crevices, so the darkening under a truck or inside a parapet is a few
 * percent, not a black halo. Black AO was tolerable in the old low-key look;
 * under a bright sun it reads as dirt, so the colour is warm dust and the
 * intensity is boosted from V11 for stronger grounding.
 */
const AO_COLOR = '#332e26'

export function Post({ quality }: { quality: QualitySettings }) {
  const gl = useThree((state) => state.gl)

  useEffect(() => {
    // the composer's tone-mapping effect reads the same uniform the renderer
    // does, so daylight exposure is set in exactly one place
    gl.toneMappingExposure = DAYLIGHT_EXPOSURE
    return () => {
      gl.toneMappingExposure = DAYLIGHT_EXPOSURE
    }
  }, [gl])

  if (quality.tier === 'low') return null

  const high = quality.tier === 'high'

  return (
    <EffectComposer multisampling={high ? 4 : 0} enableNormalPass={false}>
      <N8AO
        aoRadius={high ? 1.4 : 1.15}
        distanceFalloff={0.72}
        // V12: boosted AO intensity for stronger grounding — buildings now
        // read as embedded in the earth rather than floating above it
        intensity={high ? 1.15 : 0.9}
        quality={high ? 'medium' : 'low'}
        aoSamples={high ? 12 : 8}
        denoiseSamples={high ? 4 : 2}
        denoiseRadius={12}
        color={AO_COLOR}
        halfRes
        depthAwareUpsampling
        screenSpaceRadius
      />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      {/* V12: subtle natural vignette — 12 % corner darkening, soft edge.
          This is what separates a photograph from a render. */}
      <Vignette
        offset={0.35}
        darkness={high ? 0.35 : 0.28}
        blendFunction={BlendFunction.NORMAL}
      />
    </EffectComposer>
  )
}
