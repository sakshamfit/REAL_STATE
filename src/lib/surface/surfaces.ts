/**
 * Procedural PBR surfaces.
 *
 * Every generator is a pure function that fills RGBA byte buffers for albedo,
 * roughness and a tangent-space normal map. They are deterministic, so the
 * offline QA renderer and the browser produce identical results.
 *
 * This is the layer that makes the world read as physical: asphalt with
 * aggregate and patch repairs, concrete with pores and rain streaks, bark with
 * vertical fissures, an alpha-masked leaf atlas, dusty compacted soil.
 */

import { clamp01, fbm, hash2, lerp, ridge, smoothstep, valueNoise, worley } from './noise'

export type SurfaceSize = 128 | 256 | 512 | 1024

export type Surface = {
  size: number
  albedo: Uint8Array
  roughness: Uint8Array
  normal: Uint8Array
  /** optional alpha in the albedo (foliage) */
  alpha?: boolean
}

type Buffer = { albedo: Uint8Array; roughness: Float32Array; height: Float32Array }

function allocate(size: number): Buffer {
  return {
    albedo: new Uint8Array(size * size * 4),
    roughness: new Float32Array(size * size),
    height: new Float32Array(size * size),
  }
}

/** Sobel height -> tangent space normal (RGB). */
function normalFromHeight(height: Float32Array, size: number, strength: number): Uint8Array {
  const out = new Uint8Array(size * size * 4)
  const at = (x: number, y: number) => height[((y + size) % size) * size + ((x + size) % size)]
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength
      const len = Math.sqrt(dx * dx + dy * dy + 1)
      const i = (y * size + x) * 4
      out[i] = Math.round(((-dx / len) * 0.5 + 0.5) * 255)
      out[i + 1] = Math.round(((-dy / len) * 0.5 + 0.5) * 255)
      out[i + 2] = Math.round((1 / len) * 0.5 * 255 + 127)
      out[i + 3] = 255
    }
  }
  return out
}

/** Roughness grey buffer -> RGBA (three samples .g for roughness). */
function roughnessFromHeight(rough: Float32Array, size: number): Uint8Array {
  const out = new Uint8Array(size * size * 4)
  for (let i = 0; i < size * size; i++) {
    const v = Math.round(clamp01(rough[i]) * 255)
    out[i * 4] = v
    out[i * 4 + 1] = v
    out[i * 4 + 2] = v
    out[i * 4 + 3] = 255
  }
  return out
}

function finish(buffer: Buffer, size: number, normalStrength: number): Surface {
  return {
    size,
    albedo: buffer.albedo,
    roughness: roughnessFromHeight(buffer.roughness, size),
    normal: normalFromHeight(buffer.height, size, normalStrength),
  }
}

/* ------------------------------------------------------------------ asphalt */

export function asphaltSurface(size: SurfaceSize = 512, seed = 11): Surface {
  const buf = allocate(size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size
      const v = y / size
      const i = y * size + x

      // base bitumen with broad patchiness (different pours / repairs)
      const blotch = fbm(u * 3.2, v * 3.2, seed, 4)
      const patch = fbm(u * 1.6 + 4, v * 1.6, seed + 31, 3)
      // aggregate: three scales of stone chips
      const chip = worley(u, v, seed + 5, Math.round(size / 6))
      const chip2 = worley(u, v, seed + 17, Math.round(size / 3))
      const chip3 = worley(u, v, seed + 29, Math.round(size / 1.5))
      const stone = clamp01(1 - chip.f1 * 6) * 0.5 + clamp01(1 - chip2.f1 * 12) * 0.28 + clamp01(1 - chip3.f1 * 26) * 0.22

      // cracks: thin ridged veins, sparse
      const crackNoise = ridge(u * 2.4, v * 2.4, seed + 71, 4)
      const crack = smoothstep(0.72, 0.995, crackNoise) * 0.9

      let tone = 0.2 + blotch * 0.1 + patch * 0.06
      tone += stone * 0.14
      tone -= crack * 0.12
      // repaired patches are slightly darker and smoother
      const repair = smoothstep(0.62, 0.7, patch) * smoothstep(0.42, 0.55, fbm(u * 2 + 9, v * 2, seed + 91, 2))
      tone = lerp(tone, tone * 0.86 + 0.03, repair)
      // dust film in the lows
      const dust = smoothstep(0.45, 0.9, fbm(u * 6, v * 6, seed + 111, 3))
      tone = lerp(tone, tone * 0.9 + 0.075, dust * 0.5)

      const c = Math.round(clamp01(tone) * 255)
      // asphalt is neutral with a faint warm-grey cast
      buf.albedo[i * 4] = c
      buf.albedo[i * 4 + 1] = Math.round(c * 1.005)
      buf.albedo[i * 4 + 2] = Math.round(c * 1.02)
      buf.albedo[i * 4 + 3] = 255

      let r = 0.82 + (1 - stone) * 0.12 - repair * 0.1 + crack * 0.06
      r = clamp01(r + (hash2(x, y, seed) - 0.5) * 0.05)
      buf.roughness[i] = r
      buf.height[i] = stone * 0.45 + blotch * 0.25 - crack * 0.7 + repair * 0.05
    }
  }
  return finish(buf, size, size / 12)
}

/* -------------------------------------------------------------- road markings */

/** Faded thermoplastic lane marking — white with wear, alpha in a channel. */
export function roadPaintSurface(size: SurfaceSize = 256, seed = 3): Surface {
  const buf = allocate(size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size
      const v = y / size
      const i = y * size + x
      const wear = fbm(u * 4, v * 12, seed, 4)
      const missing = smoothstep(0.6, 0.88, wear)
      const dirt = fbm(u * 2, v * 5, seed + 7, 3)
      const tone = lerp(0.86, 0.52, missing) * lerp(1, 0.82, dirt * 0.6)
      const c = Math.round(clamp01(tone) * 255)
      // alpha is the paint that is still there: thermoplastic wears off in
      // flakes and patches, it never fades evenly
      const alpha = clamp01(1 - smoothstep(0.55, 0.95, missing) - smoothstep(0.86, 1.02, wear))
      buf.albedo[i * 4] = c
      buf.albedo[i * 4 + 1] = Math.round(c * 0.99)
      buf.albedo[i * 4 + 2] = Math.round(c * 0.93)
      buf.albedo[i * 4 + 3] = Math.round(alpha * 255)
      buf.roughness[i] = 0.72 + missing * 0.2
      buf.height[i] = (1 - missing) * 0.25
    }
  }
  const surface = finish(buf, size, size / 30)
  surface.alpha = true
  return surface
}

/* --------------------------------------------------------------------- soil */

export function soilSurface(size: SurfaceSize = 512, seed = 21, opts: { gravel?: number; dry?: number } = {}): Surface {
  const gravel = opts.gravel ?? 0.45
  const dry = opts.dry ?? 0.5
  const buf = allocate(size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size
      const v = y / size
      const i = y * size + x
      const base = fbm(u * 4, v * 4, seed, 5)
      const fine = fbm(u * 26, v * 26, seed + 3, 3)
      const stones = worley(u, v, seed + 9, Math.round(size / 9))
      const stone = clamp01(1 - stones.f1 * 9)
      const stone2 = clamp01(1 - worley(u, v, seed + 19, Math.round(size / 4)).f1 * 16)
      // dry vs damp patches
      const moisture = fbm(u * 2.2, v * 2.2, seed + 41, 3)
      const dryness = clamp01(dry + (moisture - 0.5) * 0.7)

      const r0 = lerp(0.29, 0.42, dryness) * (0.82 + base * 0.34) + fine * 0.05
      const g0 = lerp(0.22, 0.34, dryness) * (0.82 + base * 0.34) + fine * 0.05
      const b0 = lerp(0.15, 0.24, dryness) * (0.82 + base * 0.34) + fine * 0.05
      const grav = (stone * 0.7 + stone2 * 0.4) * gravel
      const r = lerp(r0, 0.46, grav)
      const g = lerp(g0, 0.43, grav)
      const bl = lerp(b0, 0.39, grav)

      buf.albedo[i * 4] = Math.round(clamp01(r) * 255)
      buf.albedo[i * 4 + 1] = Math.round(clamp01(g) * 255)
      buf.albedo[i * 4 + 2] = Math.round(clamp01(bl) * 255)
      buf.albedo[i * 4 + 3] = 255
      buf.roughness[i] = clamp01(0.9 - moisture * 0.12 + grav * 0.06)
      buf.height[i] = base * 0.4 + fine * 0.12 + grav * 0.55
    }
  }
  return finish(buf, size, size / 9)
}

/* -------------------------------------------------------------------- grass */

export function grassSurface(size: SurfaceSize = 512, seed = 33): Surface {
  const buf = allocate(size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size
      const v = y / size
      const i = y * size + x
      // blade directions: stretched noise
      const blade = fbm(u * 60, v * 8, seed, 3)
      const blade2 = fbm(u * 120, v * 14, seed + 5, 2)
      const patch = fbm(u * 3, v * 3, seed + 11, 4)
      const dryness = clamp01(0.35 + (patch - 0.5) * 1.5 + fbm(u * 7, v * 7, seed + 17, 3) * 0.4)
      const speckle = hash2(x, y, seed + 23)

      const green = 0.26 + blade * 0.2 + blade2 * 0.1 + speckle * 0.06
      const dry = 0.46 + blade * 0.14 + speckle * 0.08
      const g = lerp(green, dry, dryness)
      const r = lerp(g * 0.62, dry * 1.06, dryness)
      const b = lerp(g * 0.42, dry * 0.6, dryness)

      buf.albedo[i * 4] = Math.round(clamp01(r) * 255)
      buf.albedo[i * 4 + 1] = Math.round(clamp01(g) * 255)
      buf.albedo[i * 4 + 2] = Math.round(clamp01(b) * 255)
      buf.albedo[i * 4 + 3] = 255
      buf.roughness[i] = clamp01(0.78 + dryness * 0.14)
      buf.height[i] = blade * 0.6 + blade2 * 0.3 + patch * 0.2
    }
  }
  return finish(buf, size, size / 10)
}

/* ------------------------------------------------------------- leaf atlas */

/**
 * 2x2 atlas of leaf clusters with alpha. Each quadrant holds a small spray of
 * leaves with its own hue, so instanced cards never look like clones.
 */
/**
 * Leaf atlas — four quadrants, each a spray of individually drawn leaves.
 *
 * The previous version drew ellipses with binary alpha. Ellipses are not
 * leaves, binary alpha gives a cut-out sticker edge, and a solid spray with no
 * gaps reads as a green sheet. Real foliage at close range is: ovate leaves
 * with a pointed tip and a narrow base, a visible midrib and secondary veins,
 * ragged edges with the odd hole, and sky showing through between them.
 *
 * Leaves are drawn as a width profile along the length rather than an ellipse:
 *   w(u) = k · u^0.5 · (1 − u)^0.8      u = 0 at the stalk, 1 at the tip
 * which peaks at ~38 % of the length — the ovate shape of a neem or rain-tree
 * leaflet — with serration noise on the margin. Coverage is written as a real
 * alpha ramp so the silhouette is antialiased instead of stepped.
 */
const LEAF_PROFILE_K = 2.354 // normalises max(u^0.5·(1−u)^0.8) to 1

function leafWidth(u: number) {
  if (u <= 0 || u >= 1) return 0
  return LEAF_PROFILE_K * Math.pow(u, 0.5) * Math.pow(1 - u, 0.8)
}

export function leafAtlas(
  size: SurfaceSize = 256,
  seed = 51,
  opts: { hue?: number; dry?: number; blade?: boolean } = {},
): Surface {
  const buf = allocate(size)
  const albedo = buf.albedo
  const height = buf.height
  for (let i = 0; i < size * size; i++) {
    albedo[i * 4] = 0
    albedo[i * 4 + 1] = 0
    albedo[i * 4 + 2] = 0
    albedo[i * 4 + 3] = 0
  }

  const half = size / 2
  for (let q = 0; q < 4; q++) {
    const ox = (q % 2) * half
    const oy = Math.floor(q / 2) * half
    const leaves = opts.blade ? 11 + Math.floor(hash2(q, seed, 3) * 7) : 8 + Math.floor(hash2(q, seed, 3) * 6)
    for (let l = 0; l < leaves; l++) {
      const cx = ox + half * (0.16 + hash2(q * 31, l, seed) * 0.68)
      const cy = oy + half * (0.16 + hash2(q * 37, l, seed + 5) * 0.68)
      const angle = hash2(q * 41, l, seed + 9) * Math.PI * 2
      const len = half * (opts.blade ? 0.3 + hash2(q * 43, l, seed + 13) * 0.3 : 0.18 + hash2(q * 43, l, seed + 13) * 0.22)
      const wide = len * (opts.blade ? 0.1 + hash2(q * 47, l, seed + 17) * 0.09 : 0.3 + hash2(q * 47, l, seed + 17) * 0.2)
      const shade = 0.6 + hash2(q * 53, l, seed + 19) * 0.55
      // per-leaf hue jitter: a crown is never one green
      const leafHue = (hash2(q * 59, l, seed + 23) - 0.5) * 0.22
      // serration: how ragged this particular leaf's margin is
      const serration = 0.02 + hash2(q * 61, l, seed + 29) * 0.07
      const serrationFreq = 5 + hash2(q * 67, l, seed + 31) * 7
      const serrationPhase = hash2(q * 71, l, seed + 37) * Math.PI * 2
      const veinCount = 3 + Math.floor(hash2(q * 73, l, seed + 41) * 4)
      const cos = Math.cos(angle)
      const sin = Math.sin(angle)
      const radius = Math.ceil(len) + 2

      for (let y = Math.floor(cy - radius); y <= cy + radius; y++) {
        for (let x = Math.floor(cx - radius); x <= cx + radius; x++) {
          if (x < ox || y < oy || x >= ox + half || y >= oy + half) continue
          const dx = x - cx
          const dy = y - cy
          const lxRaw = (dx * cos + dy * sin) / (len * 0.5)
          const lyRaw = (-dx * sin + dy * cos) / (wide * 0.5)
          if (Math.abs(lxRaw) > 1 || Math.abs(lyRaw) > 1.4) continue

          // u: 0 at the stalk, 1 at the tip. ly is the signed distance from
          // the midrib in units of the leaf's half width.
          const u = (lxRaw + 1) * 0.5
          let w = leafWidth(u)
          if (w <= 0) continue
          // ragged margin
          w *= 1 + serration * Math.sin(u * serrationFreq * Math.PI + serrationPhase)
          if (Math.abs(lyRaw) > w) continue

          // ragged holes near the margin — sky must get through the spray
          const holeNoise = hash2(x * 1.7 + 0.5, y * 2.3 + 0.5, seed + 77)
          if (holeNoise > 0.955 && Math.abs(lyRaw) > w * 0.45) continue

          // antialiased coverage: ramp across roughly one texel
          const dist = w - Math.abs(lyRaw)
          const coverage = Math.min(1, dist * (wide * 0.5) * 0.9)

          const i = y * size + x
          const j = i * 4
          if (coverage <= albedo[j + 3] / 255) continue

          const aly = Math.abs(lyRaw)
          const rib = Math.exp(-aly * 9)
          // secondary veins sweeping forward from the midrib
          const vein = Math.pow(Math.max(0, Math.sin((u * veinCount - aly * 2.1) * Math.PI)), 16) * 0.35
          // tip catches more light than the shaded base
          const alongLeaf = 0.86 + u * 0.2
          const edge = 1 - Math.abs(lyRaw) / Math.max(0.001, w)
          const light = shade * alongLeaf * (0.72 + edge * 0.3) + rib * 0.1 + vein
          const hue = (opts.hue ?? 0) + leafHue
          const dry = opts.dry ?? 0
          const r = clamp01(lerp(0.16 + hue * 0.5, 0.42, dry) * light)
          const g = clamp01(lerp(0.3, 0.38, dry) * light * (1.0 + hue * 0.1))
          const b = clamp01(lerp(0.1, 0.18, dry) * light)

          albedo[j] = Math.round(r * 255)
          albedo[j + 1] = Math.round(g * 255)
          albedo[j + 2] = Math.round(b * 255)
          albedo[j + 3] = Math.round(coverage * 255)
          height[i] = Math.max(height[i], (edge * 0.5 + rib * 0.5 + vein * 0.3) * coverage)
        }
      }
    }
  }

  const surface = finish(buf, size, size / 16)
  surface.alpha = true
  return surface
}

/* ----------------------------------------------------------------- concrete */

export function concreteSurface(
  size: SurfaceSize = 512,
  seed = 61,
  opts: { tint?: number; pore?: number; streak?: number; board?: number } = {},
): Surface {
  const tint = opts.tint ?? 0.62
  const pore = opts.pore ?? 0.5
  const streak = opts.streak ?? 0.55
  const board = opts.board ?? 0.35
  const buf = allocate(size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size
      const v = y / size
      const i = y * size + x
      const blotch = fbm(u * 4, v * 4, seed, 5)
      const fine = fbm(u * 40, v * 40, seed + 3, 3)
      const pores = worley(u, v, seed + 9, Math.round(size / 5))
      const poreV = clamp01(1 - pores.f1 * 11) * pore
      // board formwork lines
      const line = board > 0 ? Math.sin(v * Math.PI * 2 * 6 + fbm(u * 3, v * 3, seed + 13, 2) * 1.4) : 0
      const boardLine = (line > 0.985 ? 1 : 0) * board
      // rain streaks running down from the top
      const streakNoise = fbm(u * 26, v * 1.6, seed + 23, 3)
      const run = smoothstep(0.55, 0.95, streakNoise) * smoothstep(0.1, 0.9, v) * streak

      let tone = tint * (0.78 + blotch * 0.34) * (0.96 + fine * 0.08)
      tone -= poreV * 0.14
      tone -= boardLine * 0.06
      tone -= run * 0.12
      // chipped corners / edge wear from the fine noise
      const chip = smoothstep(0.86, 0.99, fine)
      tone -= chip * 0.05
      const c = Math.round(clamp01(tone) * 255)
      buf.albedo[i * 4] = c
      buf.albedo[i * 4 + 1] = Math.round(c * 0.995)
      buf.albedo[i * 4 + 2] = Math.round(c * 0.975)
      buf.albedo[i * 4 + 3] = 255

      buf.roughness[i] = clamp01(0.72 + (1 - blotch) * 0.2 + poreV * 0.1 - run * 0.08)
      buf.height[i] = blotch * 0.3 + fine * 0.15 - poreV * 0.5 - boardLine * 0.4 - run * 0.12
    }
  }
  return finish(buf, size, size / 14)
}

/* ------------------------------------------------------------ render/plaster */

export function renderSurface(size: SurfaceSize = 512, seed = 71, opts: { tint?: number; wear?: number } = {}): Surface {
  const tint = opts.tint ?? 0.82
  const wear = opts.wear ?? 0.5
  const buf = allocate(size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size
      const v = y / size
      const i = y * size + x
      const grain = fbm(u * 52, v * 52, seed, 3)
      const medium = fbm(u * 9, v * 9, seed + 5, 4)
      const patch = fbm(u * 2.6, v * 2.6, seed + 11, 3)
      // trowel marks
      const trowel = fbm(u * 6 + v * 2, v * 14, seed + 17, 2)
      // damp/stain running down from sills
      const stain = smoothstep(0.58, 0.98, fbm(u * 18, v * 2.2, seed + 23, 3)) * smoothstep(0.05, 0.6, v)
      const dirt = smoothstep(0.4, 0.95, patch) * wear

      let tone = tint * (0.85 + medium * 0.24) * (0.97 + grain * 0.06)
      tone += trowel * 0.03
      tone -= stain * 0.16
      tone -= dirt * 0.08
      const c = Math.round(clamp01(tone) * 255)
      buf.albedo[i * 4] = c
      buf.albedo[i * 4 + 1] = Math.round(c * 0.985)
      buf.albedo[i * 4 + 2] = Math.round(c * 0.955)
      buf.albedo[i * 4 + 3] = 255
      buf.roughness[i] = clamp01(0.74 + (1 - medium) * 0.16 + stain * 0.08)
      buf.height[i] = grain * 0.4 + trowel * 0.2 + medium * 0.2 - stain * 0.08
    }
  }
  return finish(buf, size, size / 18)
}

/* -------------------------------------------------------------------- stone */

export function stoneSurface(size: SurfaceSize = 512, seed = 83, opts: { blocks?: number; tint?: number } = {}): Surface {
  const blocks = opts.blocks ?? 0
  const tint = opts.tint ?? 0.58
  const buf = allocate(size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size
      const v = y / size
      const i = y * size + x
      const grain = fbm(u * 30, v * 30, seed, 4)
      const mottle = fbm(u * 5, v * 5, seed + 7, 4)
      const vein = ridge(u * 3, v * 3, seed + 13, 4)
      let tone = tint * (0.8 + mottle * 0.34) * (0.95 + grain * 0.1)
      tone += (vein - 0.5) * 0.08

      if (blocks > 0) {
        // coursed masonry with slightly varying block tone
        const rows = 5
        const row = Math.floor(v * rows)
        const offset = row % 2 === 0 ? 0 : 0.5
        const bu = (u * 4 + offset) % 1
        const bv = (v * rows) % 1
        const mortar = smoothstep(0.0, 0.05, bu) * smoothstep(1.0, 0.95, bu) * smoothstep(0.0, 0.06, bv) * smoothstep(1.0, 0.94, bv)
        const blockTone = 0.9 + hash2(Math.floor(u * 4 + offset), row, seed) * 0.22
        tone = lerp(tone * 0.72 + 0.02, tone * blockTone, mortar)
        buf.height[i] = grain * 0.3 + mottle * 0.3 - (1 - mortar) * 0.5
      } else {
        buf.height[i] = grain * 0.35 + mottle * 0.3 + vein * 0.2
      }

      const c = Math.round(clamp01(tone) * 255)
      buf.albedo[i * 4] = c
      buf.albedo[i * 4 + 1] = Math.round(c * 0.985)
      buf.albedo[i * 4 + 2] = Math.round(c * 0.955)
      buf.albedo[i * 4 + 3] = 255
      buf.roughness[i] = clamp01(0.78 + (1 - mottle) * 0.16)
    }
  }
  return finish(buf, size, size / 11)
}

/* -------------------------------------------------------------------- metal */

export function metalSurface(size: SurfaceSize = 256, seed = 97, opts: { rust?: number; brushed?: number } = {}): Surface {
  const rust = opts.rust ?? 0
  const brushed = opts.brushed ?? 1
  const buf = allocate(size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size
      const v = y / size
      const i = y * size + x
      const streak = fbm(u * 3, v * 170, seed, 3) * brushed
      const sweep = fbm(u * 6, v * 6, seed + 7, 4)
      let tone = 0.62 * (0.72 + streak * 0.3) * (0.9 + sweep * 0.2)
      let rough = 0.3 + streak * 0.26 + sweep * 0.1
      if (rust > 0) {
        const r = smoothstep(0.52, 0.85, fbm(u * 4, v * 4, seed + 21, 5))
        const speck = clamp01(1 - worley(u, v, seed + 31, 24).f1 * 7)
        const amount = clamp01(r * rust + speck * rust * 0.5)
        tone = lerp(tone, 0.3 + speck * 0.16, amount)
        rough = lerp(rough, 0.88, amount)
        buf.height[i] = streak * 0.2 + sweep * 0.2 + amount * 0.7
      } else {
        buf.height[i] = streak * 0.5 + sweep * 0.2
      }
      const c = Math.round(clamp01(tone) * 255)
      buf.albedo[i * 4] = Math.round(c * 1.02)
      buf.albedo[i * 4 + 1] = c
      buf.albedo[i * 4 + 2] = Math.round(c * 0.98)
      buf.albedo[i * 4 + 3] = 255
      buf.roughness[i] = clamp01(rough)
    }
  }
  return finish(buf, size, size / 40)
}

/* --------------------------------------------------------------------- bark */

export function barkSurface(size: SurfaceSize = 256, seed = 103): Surface {
  const buf = allocate(size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size
      const v = y / size
      const i = y * size + x
      // vertical fissures warped by low-frequency noise
      const warp = fbm(u * 3, v * 1.5, seed, 3) * 2.2
      const fissure = ridge(u * 9 + warp, v * 1.2, seed + 11, 4)
      const crack = smoothstep(0.55, 0.95, fissure)
      const chunk = fbm(u * 14, v * 5, seed + 17, 4)
      const moss = smoothstep(0.62, 0.95, fbm(u * 5, v * 5, seed + 29, 3))

      let tone = 0.3 + chunk * 0.16 - crack * 0.16
      const r = clamp01(tone * 1.15)
      const g = clamp01(tone * 1.0)
      const b = clamp01(tone * 0.86)
      // a little lichen/moss on the sheltered side
      buf.albedo[i * 4] = Math.round(lerp(r, 0.26, moss * 0.5) * 255)
      buf.albedo[i * 4 + 1] = Math.round(lerp(g, 0.31, moss * 0.5) * 255)
      buf.albedo[i * 4 + 2] = Math.round(lerp(b, 0.2, moss * 0.5) * 255)
      buf.albedo[i * 4 + 3] = 255
      buf.roughness[i] = clamp01(0.85 - crack * 0.06 + moss * 0.08)
      buf.height[i] = chunk * 0.4 - crack * 1.0 + warp * 0.05
    }
  }
  return finish(buf, size, size / 8)
}

/* --------------------------------------------------------------------- paint */

/** Automotive paint: near-uniform with fine orange-peel and dust. */
export function paintSurface(size: SurfaceSize = 128, seed = 113): Surface {
  const buf = allocate(size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size
      const v = y / size
      const i = y * size + x
      const peel = fbm(u * 80, v * 80, seed, 2)
      const dust = fbm(u * 5, v * 5, seed + 7, 3)
      const tone = 0.9 + peel * 0.08 - dust * 0.04
      const c = Math.round(clamp01(tone) * 255)
      buf.albedo[i * 4] = c
      buf.albedo[i * 4 + 1] = c
      buf.albedo[i * 4 + 2] = c
      buf.albedo[i * 4 + 3] = 255
      buf.roughness[i] = clamp01(0.16 + peel * 0.1 + dust * 0.14)
      buf.height[i] = peel * 0.3
    }
  }
  return finish(buf, size, size / 60)
}

/* --------------------------------------------------------------------- brick */

export function brickSurface(size: SurfaceSize = 512, seed = 127): Surface {
  const buf = allocate(size)
  const rows = 8
  const cols = 4
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size
      const v = y / size
      const i = y * size + x
      const row = Math.floor(v * rows)
      const offset = row % 2 === 0 ? 0 : 0.5
      const bu = ((u * cols + offset) % 1 + 1) % 1
      const bv = (v * rows) % 1
      const mortar = smoothstep(0.0, 0.045, bu) * smoothstep(1.0, 0.955, bu) * smoothstep(0.0, 0.07, bv) * smoothstep(1.0, 0.93, bv)
      const brickId = Math.floor(u * cols + offset) * 31 + row * 17
      const tint = 0.42 + hash2(brickId, row, seed) * 0.24
      const grain = fbm(u * 40, v * 40, seed + 3, 3)
      const tone = lerp(0.5, tint * (0.85 + grain * 0.3), mortar)
      const c = Math.round(clamp01(tone) * 255)
      buf.albedo[i * 4] = Math.round(c * 1.18)
      buf.albedo[i * 4 + 1] = Math.round(c * 0.72)
      buf.albedo[i * 4 + 2] = Math.round(c * 0.58)
      buf.albedo[i * 4 + 3] = 255
      buf.roughness[i] = clamp01(lerp(0.92, 0.78, mortar))
      buf.height[i] = grain * 0.2 - (1 - mortar) * 0.8
    }
  }
  return finish(buf, size, size / 10)
}

/* ------------------------------------------------------------------ helpers */

export function surfaceFromFunction(
  size: SurfaceSize,
  fn: (u: number, v: number) => { r: number; g: number; b: number; rough: number; height: number },
): Surface {
  const buf = allocate(size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const out = fn(x / size, y / size)
      const i = y * size + x
      buf.albedo[i * 4] = Math.round(clamp01(out.r) * 255)
      buf.albedo[i * 4 + 1] = Math.round(clamp01(out.g) * 255)
      buf.albedo[i * 4 + 2] = Math.round(clamp01(out.b) * 255)
      buf.albedo[i * 4 + 3] = 255
      buf.roughness[i] = clamp01(out.rough)
      buf.height[i] = out.height
    }
  }
  return finish(buf, size, size / 12)
}

export const noiseUtils = { valueNoise, fbm, ridge, worley, hash2, smoothstep }
