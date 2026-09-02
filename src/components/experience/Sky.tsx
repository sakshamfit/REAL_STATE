'use client'

import { Cloud, Clouds, Sky as DaySky } from '@react-three/drei'
import { DEFAULT_ENVIRONMENT } from '@/data/environments'
import type { QualitySettings } from '@/lib/quality'

/**
 * Physically-inspired daylight sky with subtle drifting cloud layers.
 * Kept lightweight: one Sky dome plus two low-cost cloud fields.
 */
export function Sky({ quality }: { quality: QualitySettings }) {
  const preset = DEFAULT_ENVIRONMENT

  return (
    <group position={[0, 0, -650]}>
      <DaySky
        distance={1600}
        sunPosition={preset.sky.sunPosition}
        turbidity={preset.sky.turbidity}
        rayleigh={preset.sky.rayleigh}
        mieCoefficient={preset.sky.mieCoefficient}
        mieDirectionalG={preset.sky.mieDirectionalG}
      />
      {quality.tier !== 'low' ? (
        <Clouds limit={18}>
          <Cloud
            seed={0}
            segments={ins(quality)}
            bounds={[90, 12, 90]}
            volume={18}
            color="#ffffff"
            opacity={0.55}
            speed={0.06}
            position={[-40, 82, -320]}
            scale={[1.3, 0.55, 1.3]}
          />
          <Cloud
            seed={7}
            segments={ins(quality)}
            bounds={[70, 10, 70]}
            volume={15}
            color="#f3f1ec"
            opacity={0.38}
            speed={0.045}
            position={[46, 72, -180]}
            scale={[1.1, 0.42, 1.1]}
          />
        </Clouds>
      ) : null}
    </group>
  )
}

function ins(quality: QualitySettings) {
  return quality.tier === 'mid' ? 12 : 20
}
