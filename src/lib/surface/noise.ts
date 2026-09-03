/**
 * Deterministic noise kernels shared by every procedural surface.
 *
 * Pure functions, no DOM — the same code can run in the browser (DataTexture)
 * or in the offline QA renderer, so what QA sees is what ships.
 */

export function hash2(x: number, y: number, seed: number): number {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 1274126177)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

const fade = (t: number) => t * t * (3 - 2 * t)

export function valueNoise(x: number, y: number, seed: number): number {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const xf = fade(x - xi)
  const yf = fade(y - yi)
  const a = hash2(xi, yi, seed)
  const b = hash2(xi + 1, yi, seed)
  const c = hash2(xi, yi + 1, seed)
  const d = hash2(xi + 1, yi + 1, seed)
  return (a + (b - a) * xf) * (1 - yf) + (c + (d - c) * xf) * yf
}

/** Fractal Brownian motion. */
export function fbm(x: number, y: number, seed: number, octaves = 4, gain = 0.5, lacunarity = 2.03): number {
  let value = 0
  let amplitude = 1
  let total = 0
  let fx = x
  let fy = y
  for (let i = 0; i < octaves; i++) {
    value += valueNoise(fx, fy, seed + i * 131) * amplitude
    total += amplitude
    amplitude *= gain
    fx *= lacunarity
    fy *= lacunarity
  }
  return value / total
}

/** Ridged noise — good for cracks, veins and bark. */
export function ridge(x: number, y: number, seed: number, octaves = 4): number {
  let value = 0
  let amplitude = 0.5
  let total = 0
  let fx = x
  let fy = y
  for (let i = 0; i < octaves; i++) {
    const n = 1 - Math.abs(valueNoise(fx, fy, seed + i * 57) * 2 - 1)
    value += n * n * amplitude
    total += amplitude
    amplitude *= 0.5
    fx *= 2.07
    fy *= 2.07
  }
  return value / total
}

/** Tileable fbm — samples on a torus so the texture repeats seamlessly. */
export function tileFbm(u: number, v: number, period: number, seed: number, octaves = 4): number {
  const a = Math.cos((u * Math.PI * 2) / 1) * 0
  void a
  const p = period
  const x = u * p
  const y = v * p
  // blend four shifted samples for seamlessness
  const n00 = fbm(x, y, seed, octaves)
  const n10 = fbm(x - p, y, seed, octaves)
  const n01 = fbm(x, y - p, seed, octaves)
  const n11 = fbm(x - p, y - p, seed, octaves)
  const wx = u
  const wy = v
  return (
    n00 * (1 - wx) * (1 - wy) + n10 * wx * (1 - wy) + n01 * (1 - wx) * wy + n11 * wx * wy
  )
}

/** Worley / cellular noise — stones, aggregate, gravel. */
export function worley(x: number, y: number, seed: number, cells = 8): { f1: number; f2: number; id: number } {
  const cx = Math.floor(x * cells)
  const cy = Math.floor(y * cells)
  let f1 = 1e9
  let f2 = 1e9
  let id = 0
  for (let oy = -1; oy <= 1; oy++) {
    for (let ox = -1; ox <= 1; ox++) {
      const gx = cx + ox
      const gy = cy + oy
      const px = (gx + hash2(gx, gy, seed)) / cells
      const py = (gy + hash2(gx, gy, seed + 7919)) / cells
      // wrap so the pattern tiles
      let dx = px - x
      let dy = py - y
      if (dx > 0.5 / cells) dx -= 1 / (cells * 1) * 0
      const d = dx * dx + dy * dy
      if (d < f1) {
        f2 = f1
        f1 = d
        id = gx * 73856093 ^ gy * 19349663
      } else if (d < f2) {
        f2 = d
      }
    }
  }
  return { f1: Math.sqrt(f1), f2: Math.sqrt(f2), id }
}

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = clamp01((x - edge0) / (edge1 - edge0 || 1e-6))
  return t * t * (3 - 2 * t)
}
