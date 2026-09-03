'use client'

import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { EffectComposer, N8AO, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import type { QualitySettings } from '@/lib/quality'
import { DAYLIGHT_EXPOSURE } from './Lighting'

/**
 * Post — restrained tone mapping and ambient occlusion.
 *
 * The objective of the AO pass is not dramatic dark outlines; it is that
 * objects read as *embedded* in the ground instead of standing on it. Anything
 * stronger than this starts to look like a video game: a dark halo around every
 * silhouette, black corners in the building reveals, dirty contact edges on the
 * road.
 *
 * Deliberately conservative:
 *  · warm dust-coloured occlusion, never pure black;
 *  · moderate radius with a soft distance falloff, so distant geometry gets
 *    almost none and near-field contact gets most of it;
 *  · half resolution on the mid tier with depth-aware upsampling, so the
 *    upsample cannot bleed occlusion across silhouettes;
 *  · disabled on the low tier, where the contact decals carry grounding.
 *
 * `EffectComposer` forces `gl.toneMapping = NoToneMapping` while mounted (three
 * skips in-material tone mapping when rendering to a target), so the ACES
 * operator is re-applied here as an effect. Exposure still comes from
 * `gl.toneMappingExposure`, which three uploads as a common uniform.
 *
 * The AO pass runs at half resolution on every tier — depth-aware upsampling
 * keeps contact edges clean and the pass costs roughly a quarter of the fill
 * rate it did at full resolution.
 */

/**
 * Occlusion colour and strength.
 *
 * In daylight, ambient occlusion is a small correction — the sky fills the
 * crevices, so the darkening under a truck or inside a parapet is a few
 * percent, not a black halo. Black AO was tolerable in the old low-key look;
 * under a bright sun it reads as dirt, so the colour is warm dust and the
 * intensity is roughly two thirds of what it was.
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
        aoRadius={high ? 1.25 : 1.05}
        distanceFalloff={0.78}
        intensity={high ? 0.8 : 0.66}
        quality={high ? 'medium' : 'low'}
        aoSamples={high ? 10 : 8}
        denoiseSamples={high ? 4 : 2}
        denoiseRadius={12}
        color={AO_COLOR}
        halfRes
        depthAwareUpsampling
        screenSpaceRadius
      />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  )
}
