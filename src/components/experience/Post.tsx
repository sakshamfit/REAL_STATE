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
 * V13: recalibrated from V12's aggressive values. The V12 AO was creating
 * visible dark halos at building joints and dirty-looking contact areas.
 * The V12 vignette was clearly identifiable as an effect. Both are pulled
 * back to near-invisible — the image should look naturally photographic,
 * not post-processed.
 *
 * Deliberately conservative:
 *  · warm dust-coloured occlusion, never pure black;
 *  · moderate radius with a soft distance falloff;
 *  · half resolution on the mid tier with depth-aware upsampling;
 *  · disabled on the low tier, where the contact decals carry grounding.
 */

const AO_COLOR = '#332e26'

export function Post({ quality }: { quality: QualitySettings }) {
  const gl = useThree((state) => state.gl)

  useEffect(() => {
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
        // V13: pulled back from V12's 1.4/1.15. The higher values created
        // dark halos around building joints and dirty-looking contact areas.
        // At 1.3/1.1 the AO reads as natural contact shadow, not dirt.
        aoRadius={high ? 1.3 : 1.1}
        distanceFalloff={0.72}
        // V13: pulled back from V12's 1.15/0.9. At 1.0/0.8 the grounding
        // is visible without creating black corners or over-dark underpasses.
        intensity={high ? 1.0 : 0.8}
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
      {/* V13: pulled back from V12's 0.35/0.28. The higher values were
          clearly identifiable as a vignette effect. At 0.25/0.18 the
          darkening is subliminal — the viewer thinks "photographic" not
          "there is a vignette." */}
      <Vignette
        offset={0.4}
        darkness={high ? 0.25 : 0.18}
        blendFunction={BlendFunction.NORMAL}
      />
    </EffectComposer>
  )
}
