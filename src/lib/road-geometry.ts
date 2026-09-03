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
import { fbm2, prng } from './terrain'

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
  /**
   * Large-scale tint, evaluated per vertex in metres.
   *
   * This is what stops the surface reading as one repeated texture: the tile
   * repeats every few metres, this varies over tens of metres and never
   * repeats, so the eye reads weathering rather than wallpaper.
   */
  tint?: (x: number, z: number) => [number, number, number]
}

export function buildRibbon({ xs, from, to, step, height, tile = 4, tint }: RibbonOptions) {
  const nz = Math.max(1, Math.ceil(Math.abs(to - from) / step))
  const nx = xs.length
  const vertexCount = (nz + 1) * nx
  const positions = new Float32Array(vertexCount * 3)
  const uvs = new Float32Array(vertexCount * 2)
  const colors = new Float32Array(vertexCount * 3)
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
      const c = tint ? tint(x, z) : [1, 1, 1]
      colors[i * 3] = c[0]
      colors[i * 3 + 1] = c[1]
      colors[i * 3 + 2] = c[2]
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
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  return geometry
}

/** Small local merge so the dozens of paint dashes stay one draw call. */
export function mergeGeometries(list: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const positions: number[] = []
  const uvs: number[] = []
  const colors: number[] = []
  const indices: number[] = []
  let offset = 0
  for (const geometry of list) {
    const pos = geometry.getAttribute('position')
    const uv = geometry.getAttribute('uv')
    const tint = geometry.getAttribute('color') as THREE.BufferAttribute | undefined
    const index = geometry.getIndex()
    for (let i = 0; i < pos.count; i++) {
      positions.push(pos.getX(i), pos.getY(i), pos.getZ(i))
      uvs.push(uv.getX(i), uv.getY(i))
      colors.push(tint ? tint.getX(i) : 1, tint ? tint.getY(i) : 1, tint ? tint.getZ(i) : 1)
    }
    if (index) for (let i = 0; i < index.count; i++) indices.push(offset + index.getX(i))
    else for (let i = 0; i < pos.count; i++) indices.push(offset + i)
    offset += pos.count
  }
  const merged = new THREE.BufferGeometry()
  merged.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  merged.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  merged.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  merged.setIndex(indices)
  merged.computeVertexNormals()
  merged.computeBoundingSphere()
  return merged
}

// Tile sizes are in metres. Small tiles read as wallpaper over a 1 km road, so
// the fine maps stretch further and the variation that would have lived inside
// a tile now lives in the vertex tint below.
/**
 * Irregular spill along a road edge.
 *
 * A real verge never meets the carriageway on a mathematical line: soil creeps
 * onto the shoulder, gravel gets kicked out onto the asphalt, dust fills the
 * joint. These are small, jagged, randomly-sized patches laid along the length
 * so the boundary dissolves instead of reading as a painted stripe.
 */
function buildSpill({
  side,
  from,
  to,
  count,
  inner,
  outer,
  tint,
  seed,
}: {
  side: -1 | 1
  from: number
  to: number
  count: number
  /** x range the patch can cover, measured from the carriageway edge */
  inner: number
  outer: number
  tint: (x: number, z: number) => [number, number, number]
  seed: number
}): THREE.BufferGeometry[] {
  const random = prng(seed)
  const out: THREE.BufferGeometry[] = []
  for (let i = 0; i < count; i++) {
    const z = from - random() * Math.abs(to - from)
    const length = 0.9 + random() * 3.6
    const z0 = z
    const z1 = z - length
    const startX = HALF + inner + random() * 0.5
    const endX = HALF + inner + 0.4 + random() * (outer - inner)
    // width wanders along the patch instead of being a clean rectangle
    const w0 = 0.35 + random() * 0.9
    const w1 = 0.35 + random() * 0.9
    const wMid = 0.6 + random() * 1.2

    const rings: [number, number][] = [
      [startX, z0],
      [startX + w0, z0 - length * 0.25],
      [startX + wMid, z0 - length * 0.55],
      [startX + w1, z1],
      [startX + w1 * 0.4, z1 - length * 0.1],
      [startX - 0.15, z1 - length * 0.05],
    ]

    const positions: number[] = []
    const uvs: number[] = []
    const colors: number[] = []
    const indices: number[] = []
    const centre = rings.reduce((acc, p) => ({ x: acc.x + p[0] / rings.length, z: acc.z + p[1] / rings.length }), {
      x: 0,
      z: 0,
    })
    rings.forEach(([x, z], index) => {
      const wx = side * x
      // sit on whichever surface the patch is creeping across, lifted clear of
      // it — the lift has to beat depth-buffer precision at 200 m
      const base =
        x > HALF
          ? carriagewayHeight(HALF, z) - 0.06 - Math.pow(Math.abs(x - HALF) / SHOULDER, 1.4) * 0.14
          : carriagewayHeight(x, z)
      positions.push(wx, base + 0.02, z)
      uvs.push(wx / 3, z / 3)
      const c = tint(wx, z)
      colors.push(c[0], c[1], c[2])
      if (index > 1) indices.push(0, index - 1, index)
    })
    void centre
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    geometry.setIndex(indices)
    geometry.computeVertexNormals()
    out.push(geometry)
  }
  return out
}

/**
 * Tile sizes in metres. Read them together with the texture resolution:
 * a 512² asphalt map over 6.5 m is 13 mm per texel, which is coarser than the
 * 5–12 mm aggregate it is supposed to show, so close up the road reads as
 * smooth noise rather than stone. Halving the tile puts the texel at 6 mm —
 * inside the real aggregate size — for no extra memory or generation time.
 *
 * The cost is a shorter repeat period, which is paid for by the things that do
 * not repeat: the per-vertex macro tint, the patch and dust-film overlays at
 * their own scales, the markings, and the verge spill patches.
 */
const ASPHALT_TILE = 3.4
const GRAVEL_TILE = 2.8
const SOIL_TILE = 5
const PAINT_TILE = 3

/**
 * Macro weathering for the carriageway.
 *
 * Three things a real Indian road shows that a tiled texture cannot: pours
 * from different days (broad tonal drift along the length), traffic polishing
 * the wheel paths darker, and dust drifted in from the verge lightening the
 * outer edges — all irregular, none of it repeating.
 */
function asphaltTint(x: number, z: number): [number, number, number] {
  const pour = fbm2(z * 0.009, x * 0.05, 601, 3) // ~110 m wavelength
  const age = fbm2(z * 0.022 + 11, x * 0.08, 631, 2) // ~45 m
  let v = 0.9 + pour * 0.2 + (age - 0.5) * 0.12

  // wheel paths: two soft bands, worn darker where the tyres run
  const near = Math.min(Math.abs(Math.abs(x) - 1.35), Math.abs(Math.abs(x) - 1.15))
  const polished = Math.max(0, 1 - near / 1.5)
  v -= polished * 0.07

  // dust drifted in from either verge, strongest at the outer edge
  const edge = Math.max(0, Math.abs(x) - (HALF - 1.1)) / 1.1
  v += edge * (0.05 + fbm2(z * 0.05, x * 0.5, 661, 2) * 0.07)

  // faint patchy bleaching where the surface is drying out
  v += (fbm2(z * 0.07, x * 0.2, 691, 2) - 0.5) * 0.05

  const g = v * 0.995
  const b = v * 0.985
  return [Math.max(0.7, Math.min(1.15, v)), Math.max(0.7, Math.min(1.15, g)), Math.max(0.7, Math.min(1.15, b))]
}

/** Shoulders vary between fresh gravel and bare compacted earth. */
function gravelTint(x: number, z: number): [number, number, number] {
  const drift = fbm2(z * 0.012, x * 0.1, 701, 3)
  const sparse = fbm2(z * 0.035 + 5, x * 0.2, 711, 2)
  const v = 0.88 + drift * 0.2 + (sparse - 0.5) * 0.1
  return [v, v * 0.985, v * 0.95]
}

/** Verge soil: damp hollows, dust crust, the odd bleached patch. */
function soilTint(x: number, z: number): [number, number, number] {
  const mottle = fbm2(z * 0.014, x * 0.06, 721, 3)
  const crust = fbm2(z * 0.06, x * 0.3, 731, 2)
  const v = 0.86 + mottle * 0.22 + (crust - 0.5) * 0.08
  return [v, v * 0.97, v * 0.9]
}

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
      tint: asphaltTint,
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
        tint: gravelTint,
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
        tint: soilTint,
      }),
    })
  }

  /* ---------------------------------------------------------------- markings */
  /**
   * Markings are laid in short segments, each with its own centre offset and
   * width.
   *
   * A stripe drawn as one ribbon from horizon to horizon has two mathematically
   * straight edges, and a straight edge is the one thing road paint never has:
   * it is applied by a machine guided by a walking man, it gets scuffed by
   * traffic within a week, and it wears away in flakes along the sides. The
   * wobble is 20-odd millimetres over a 6 m segment — invisible as a shape,
   * and the difference between paint and a vector line.
   */
  const paintRandom = prng(1901)
  const edgeLines: THREE.BufferGeometry[] = []
  const SEG = 6
  for (const side of [-1, 1]) {
    const base = side * (HALF - 0.42)
    for (let z = Z_START; z > Z_END; z -= SEG) {
      const to = Math.max(Z_END, z - SEG)
      // occasional stretch where the line has gone altogether
      if (paintRandom() < 0.05) continue
      const drift = (paintRandom() - 0.5) * 0.05
      const half = 0.062 + paintRandom() * 0.03
      const cx = base + drift
      edgeLines.push(
        buildRibbon({
          xs: [cx - half, cx + half],
          from: z,
          to,
          step: 24,
          height: (xx, zz) => carriagewayHeight(xx, zz) + 0.006,
          tile: PAINT_TILE,
        }),
      )
    }
  }
  parts.push({ key: 'paint', geometry: mergeGeometries(edgeLines) })

  // centre line — broken, and the paint is missing in stretches. Each dash is
  // also laid slightly off centre, the way a machine-laid line actually runs.
  const random = prng(19)
  const dashes: THREE.BufferGeometry[] = []
  const dashLength = 3
  const gap = 4.6
  for (let z = Z_START; z > Z_END; z -= dashLength + gap) {
    if (random() < 0.12) continue
    const from = z
    const to = Math.max(Z_END, z - dashLength * (0.8 + random() * 0.5))
    const drift = (random() - 0.5) * 0.05
    const half = 0.062 + random() * 0.026
    dashes.push(
      buildRibbon({
        xs: [drift - half, drift + half],
        from,
        to,
        step: 6,
        height: (xx, zz) => carriagewayHeight(xx, zz) + 0.006,
        tile: PAINT_TILE,
      }),
    )
  }
  parts.push({ key: 'paint', geometry: mergeGeometries(dashes), opacity: 0.9 })

  /* ------------------------------------------- verge creep and edge spill */
  if (tier !== 'low') {
    const creepCount = tier === 'high' ? 46 : 22
    for (const side of [-1, 1] as const) {
      // soil creeping off the verge onto the gravel shoulder
      parts.push({
        key: 'soil',
        geometry: mergeGeometries(
          buildSpill({
            side,
            from: Z_START,
            to: Z_END,
            count: creepCount,
            inner: SHOULDER * 0.45,
            outer: SHOULDER + VERGE * 0.6,
            tint: soilTint,
            seed: side < 0 ? 811 : 821,
          }),
        ),
      })
      // gravel and dust kicked out onto the carriageway edge
      parts.push({
        key: 'gravel',
        geometry: mergeGeometries(
          buildSpill({
            side,
            from: Z_START,
            to: Z_END,
            count: Math.round(creepCount * 0.7),
            inner: -1.5,
            outer: 0.2,
            tint: gravelTint,
            seed: side < 0 ? 831 : 841,
          }),
        ),
      })
    }
  }

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
