'use client'

import { Html } from '@react-three/drei'
import { TRUST_STRUCTURE } from '@/lib/world'
import { trustPillars } from '@/data/company'
import { concreteMaterial, PALETTE } from '@/lib/materials'
import type { QualitySettings } from '@/lib/quality'
import type * as THREE from 'three'
import { useChapterVisibility, useNearCamera } from '../hooks'
import { Block } from '../primitives'
import { AssetModel } from '@/lib/glb'
import { GroundPatch } from '../GroundPatch'

/** Where the four standards hang, in the air around the finished building. */
const WORD_POSITIONS: { position: [number, number, number]; rotation: [number, number, number] }[] = [
  { position: [-21, 9.5, 8], rotation: [0, 0.5, 0] },
  { position: [21, 14.5, 4], rotation: [0, -0.5, 0] },
  { position: [-19, 21, -2], rotation: [0, 0.42, 0] },
  { position: [20, 26.5, -6], rotation: [0, -0.42, 0] },
]

/**
 * TRUST — a finished building in open daylight.
 *
 * No darkness and no glow: the section is a completed structure standing on a
 * levelled plinth, with the four standards hung in the space around it.
 */
export function TrustScene({ quality }: { quality: QualitySettings }) {
  const { x, z } = TRUST_STRUCTURE
  const group = useChapterVisibility<THREE.Group>([x, 14, z], 220)
  const near = useNearCamera([x, 14, z], 150)
  const plinth = concreteMaterial('light', 3, quality.textureSize)

  return (
    <group ref={group} position={[x, 0, z]}>
      <mesh receiveShadow position={[0, 0.35, 0]} material={plinth}>
        <boxGeometry args={[46, 0.7, 38]} />
      </mesh>

      <AssetModel id="residential-building" position={[0, 0.7, 0]} rotation={[0, 0.28, 0]} quality={quality} lod="auto" />

      {/* site office and the two standards at the entrance */}
      <AssetModel id="construction-shed" position={[26, 0.7, -14]} rotation={[0, -0.6, 0]} quality={quality} lod="auto" />
      <Block size={[0.4, 2.2, 0.4]} position={[-20, 1.8, 16]} material={plinth} />
      <Block size={[0.4, 2.2, 0.4]} position={[20, 1.8, 16]} material={plinth} />

      <GroundPatch
        surface="soilDry"
        width={84}
        length={74}
        position={[0, 0.012, 0]}
        seed={401}
        dissolve={0.75}
        strength={0.95}
        opacity={0.8}
        quality={quality}
      />

      {near
        ? trustPillars.map((pillar, index) => (
            <Html
              key={pillar}
              transform
              position={WORD_POSITIONS[index].position}
              rotation={WORD_POSITIONS[index].rotation}
              distanceFactor={11}
              style={{ pointerEvents: 'none' }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10,
                  fontFamily: 'var(--font-display)',
                  fontSize: '11px',
                  fontWeight: 500,
                  letterSpacing: '0.42em',
                  color: PALETTE.concrete,
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                }}
              >
                <span
                  style={{
                    width: 5,
                    height: 5,
                    background: PALETTE.accent,
                    display: 'inline-block',
                  }}
                />
                {pillar}
              </span>
            </Html>
          ))
        : null}
    </group>
  )
}
