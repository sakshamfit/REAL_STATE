/**
 * Road geometry.
 *
 * Pure geometry + material keys, no renderer state, so the same road can be
 * built by the React scene and by the offline QA rasteriser. That matters: the
 * road is the most looked-at surface in the whole experience and it has to be
 * identical in both.
 *
 * The carriageway is not a plane. It is a graded ribbon with camber, long-wave
 * undulation, worn thermoplastic markings, re-laid patches, polished wheel
 * tracks, dust drifted in from the verge, potholes, gravel shoulders, unmetalled
 * verges, kerb stones and open kutcha drains.
 */

import * as THREE from 'three'
import { prng } from './terrain'

export const Z_START = 60
export const Z_END = -960
export const HALF = 3.75
export const SHOULDER = 1.9
export const VERGE = 2.6
/** outside edge of the road reserve (carriageway + shoulder + verge) */
export const RESERVE = HALF + SHOULDER + VERGE

/** Carriageway camber: a real road is crowned so water runs off. */
export function carriagewayHeight(x: number, z: number) {
  const crown = 0.09 * (1 - Math.pow(Math.abs(x) / HALF, 2))
  const wave = Math.sin(z * 0.06) * 0.03 + Math.sin(z * 0.017 + 1.7) * 0.05
  return 0.2 + crown + wave
}

export type RoadPartKey = 'asphalt' | 'gravel' | 'soil' | 'paint' | 'patch' | 'film' | 'kerb' | 'drain' | 'hole'

export type RoadPart = {
  key: RoadPartKey
  geometry: THREE.BufferGeometry
  /** translucent wear films carry their own colour and opacity */
  color?: string
  opacity?: number
}

type RibbonOptions = {
  /** cross-section offsets (x) */
  xs: number[]
  from: number
  to: number
  step: number
  /** height at (x, z) */
  height: (x: number, z: number) => number
  /** metres per texture tile */
  tile?: number
}

export function buildRibbon({ xs, from, to, step, height, tile = 4 }: RibbonOptions) {
  const nz = Math.max(1, Math.ceil(Math.abs(to - from) / step))
  const nx = xs.length
  const vertexCount = (nz + 1) * nx
  const positions = new Float32Array(vertexCount * 3)
  const uvs = new Float32Array(vertexCount * 2)
  const indices: number[] = []

  for (let iz = 0; iz <= nz; iz++) {
    const z = from + ((to - from) * iz) / nz
    for (let ix = 0; ix < nx; ix++) {
      const x = xs[ix]
      const i = iz * nx + ix
      positions[i * 3] = x
      positions[i * 3 + 1] = height(x, z)
      positions[i * 3 + 2] = z
      uvs[i * 2] = x / tile
      uvs[i * 2 + 1] = z / tile
    }
  }
  // z decreases as iz grows, so (a, b, c) / (b, d, c) is the +Y winding — the
  // carriageway has to be visible from above with a front-side material
  for (let iz = 0; iz < nz; iz++) {
    for (let ix = 0; ix < nx - 1; ix++) {
      const a = iz * nx + ix
      const b = a + 1
      const c = (iz + 1) * nx + ix
      const d = c + 1
      indices.push(a, b, c, b, d, c)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  return geometry
}

/** Small local merge so the dozens of paint dashes stay one draw call. */
export function mergeGeometries(list: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  let offset = 0
  for (const geometry of list) {
    const pos = geometry.getAttribute('position')
    const uv = geometry.getAttribute('uv')
    const index = geometry.getIndex()
    for (let i = 0; i < pos.count; i++) {
      positions.push(pos.getX(i), pos.getY(i), pos.getZ(i))
      uvs.push(uv.getX(i), uv.getY(i))
    }
    if (index) for (let i = 0; i < index.count; i++) indices.push(offset + index.getX(i))
    else for (let i = 0; i < pos.count; i++) indices.push(offset + i)
    offset += pos.count
  }
  const merged = new THREE.BufferGeometry()
  merged.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  merged.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  merged.setIndex(indices)
  merged.computeVertexNormals()
  merged.computeBoundingSphere()
  return merged
}

const ASPHALT_TILE = 4
const GRAVEL_TILE = 3
const SOIL_TILE = 6
const PAINT_TILE = 3

export function buildRoadParts(step: number, tier: 'low' | 'mid' | 'high' = 'high'): RoadPart[] {
  const parts: RoadPart[] = []

  /* ------------------------------------------------------------ carriageway */
  const carriagewayXs: number[] = []
  const divisions = 8
  for (let i = 0; i <= divisions; i++) carriagewayXs.push(-HALF + (i * (HALF * 2)) / divisions)
  parts.push({
    key: 'asphalt',
    geometry: buildRibbon({
      xs: carriagewayXs,
      from: Z_START,
      to: Z_END,
      step,
      height: carriagewayHeight,
      tile: ASPHALT_TILE,
    }),
  })

  /* ---------------------------------------------------------------- shoulders */
  for (const side of [-1, 1]) {
    parts.push({
      key: 'gravel',
      geometry: buildRibbon({
        xs: side < 0 ? [-HALF - SHOULDER, -HALF - SHOULDER * 0.5, -HALF] : [HALF, HALF + SHOULDER * 0.5, HALF + SHOULDER],
        from: Z_START,
        to: Z_END,
        step: step * 2,
        height: (x, z) =>
          carriagewayHeight(side * HALF, z) - 0.06 - Math.pow(Math.abs(x - side * HALF) / SHOULDER, 1.4) * 0.14,
        tile: GRAVEL_TILE,
      }),
    })
    // unmetalled verge that blends the shoulder into the terrain
    parts.push({
      key: 'soil',
      geometry: buildRibbon({
        xs:
          side < 0
            ? [-HALF - SHOULDER - VERGE, -HALF - SHOULDER]
            : [HALF + SHOULDER, HALF + SHOULDER + VERGE],
        from: Z_START,
        to: Z_END,
        step: step * 3,
        height: (x, z) => {
          const t = Math.abs(x - side * (HALF + SHOULDER)) / VERGE
          return carriagewayHeight(side * HALF, z) - 0.2 - t * 0.34 + Math.sin(z * 0.03 + (side < 0 ? 0 : 2)) * 0.06
        },
        tile: SOIL_TILE,
      }),
    })
  }

  /* ---------------------------------------------------------------- markings */
  // edge lines — continuous but worn
  const edgeLines: THREE.BufferGeometry[] = []
  for (const side of [-1, 1]) {
    const x = side * (HALF - 0.42)
    edgeLines.push(
      buildRibbon({
        xs: [x - 0.075, x + 0.075],
        from: Z_START,
        to: Z_END,
        step: 24,
        height: (xx, z) => carriagewayHeight(xx, z) + 0.006,
        tile: PAINT_TILE,
      }),
    )
  }
  parts.push({ key: 'paint', geometry: mergeGeometries(edgeLines) })

  // centre line — broken, and the paint is missing in stretches
  const random = prng(19)
  const dashes: THREE.BufferGeometry[] = []
  const dashLength = 3
  const gap = 4.6
  for (let z = Z_START; z > Z_END; z -= dashLength + gap) {
    if (random() < 0.12) continue
    const from = z
    const to = Math.max(Z_END, z - dashLength * (0.8 + random() * 0.5))
    dashes.push(
      buildRibbon({
        xs: [-0.075, 0.075],
        from,
        to,
        step: 6,
        height: (xx, zz) => carriagewayHeight(xx, zz) + 0.006,
        tile: PAINT_TILE,
      }),
    )
  }
  parts.push({ key: 'paint', geometry: mergeGeometries(dashes), opacity: 0.9 })

  /* ---------------------------------------------------- patches, film, wear */
  const patchRandom = prng(41)
  const patches = tier === 'low' ? 4 : 12
  const patchGeometries: THREE.BufferGeometry[] = []
  for (let i = 0; i < patches; i++) {
    const z = Z_START - patchRandom() * Math.abs(Z_END - Z_START)
    const width = 1.2 + patchRandom() * 3.4
    const length = 1.6 + patchRandom() * 6
    const x = (patchRandom() - 0.5) * (HALF * 1.7)
    patchGeometries.push(
      buildRibbon({
        xs: [x - width / 2, x + width / 2],
        from: z,
        to: z - length,
        step: 3,
        height: (xx, zz) => carriagewayHeight(xx, zz) + 0.008,
        tile: ASPHALT_TILE * 0.5,
      }),
    )
  }
  parts.push({ key: 'patch', geometry: mergeGeometries(patchGeometries) })

  // polished wheel tracks — traffic burnishes the surface into two dark bands
  for (const side of [-1, 1]) {
    parts.push({
      key: 'film',
      color: '#4b4a49',
      opacity: 0.3,
      geometry: buildRibbon({
        xs: [side * 0.55, side * 2.05],
        from: Z_START,
        to: Z_END,
        step: 40,
        height: (xx, z) => carriagewayHeight(xx, z) + 0.004,
        tile: 6,
      }),
    })
    // dust drifted onto the carriageway from the verge
    parts.push({
      key: 'film',
      color: '#7d7263',
      opacity: 0.26,
      geometry: buildRibbon({
        xs: [side * (HALF - 0.1), side * (HALF - 1.5)],
        from: Z_START,
        to: Z_END,
        step: 30,
        height: (xx, z) => carriagewayHeight(xx, z) + 0.005,
        tile: 5,
      }),
    })
  }

  // potholes
  const holes = tier === 'low' ? 0 : 3
  for (let i = 0; i < holes; i++) {
    const z = -40 - patchRandom() * 700
    const x = (patchRandom() - 0.5) * 4
    const r = 0.4 + patchRandom() * 0.5
    const geometry = new THREE.CircleGeometry(r, 12)
    geometry.rotateX(-Math.PI / 2)
    geometry.scale(1, 1, 0.7)
    geometry.translate(x, carriagewayHeight(x, z) + 0.012, z)
    parts.push({ key: 'hole', geometry })
  }

  /* ------------------------------------------------------------------ drains */
  // open kutcha drain either side of the built-up stretch
  for (const side of [-1, 1]) {
    parts.push({
      key: 'drain',
      geometry: buildRibbon({
        xs: [side * (HALF + SHOULDER), side * (HALF + SHOULDER + 0.9)],
        from: -30,
        to: -300,
        step: 16,
        height: (_x, z) => carriagewayHeight(side * HALF, z) - 0.55,
        tile: 1.5,
      }),
    })
  }

  /* ------------------------------------------------------------- kerb stones */
  const kerbs: THREE.BufferGeometry[] = []
  for (const side of [-1, 1]) {
    for (let z = -40; z > -240; z -= 1.0) {
      const kerb = new THREE.BoxGeometry(0.34, 0.22, 0.98)
      kerb.translate(side * (HALF + SHOULDER + 0.32), carriagewayHeight(side * HALF, z) - 0.05, z)
      kerbs.push(kerb)
    }
  }
  parts.push({ key: 'kerb', geometry: mergeGeometries(kerbs) })

  return parts
}
