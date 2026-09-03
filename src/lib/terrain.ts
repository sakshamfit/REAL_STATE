/**
 * Terrain and scatter math for the world.
 *
 * Deterministic: the same seed always produces the same hills, grass patches
 * and vegetation layout, so the scene is reproducible between reloads and QA
 * runs. The corridor the camera travels through is kept flat (a real road is
 * graded flat); relief only starts outside the road reserve.
 */

import * as THREE from 'three'

export function prng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hash(x: number, y: number, seed: number) {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 1274126177)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

const fade = (t: number) => t * t * (3 - 2 * t)

function noise(x: number, y: number, seed: number) {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const xf = fade(x - xi)
  const yf = fade(y - yi)
  const a = hash(xi, yi, seed)
  const b = hash(xi + 1, yi, seed)
  const c = hash(xi, yi + 1, seed)
  const d = hash(xi + 1, yi + 1, seed)
  return (a + (b - a) * xf) * (1 - yf) + (c + (d - c) * xf) * yf
}

export function fbm2(x: number, y: number, seed: number, octaves = 4) {
  let value = 0
  let amp = 1
  let total = 0
  let fx = x
  let fy = y
  for (let i = 0; i < octaves; i++) {
    value += noise(fx, fy, seed + i * 131) * amp
    total += amp
    amp *= 0.5
    fx *= 2.03
    fy *= 2.03
  }
  return value / total
}

/** Road corridor half-width that stays graded flat. */
export const CORRIDOR_HALF_WIDTH = 13

/**
 * Every built area is levelled to the road datum, the way a real site is cut
 * and filled before anything is erected: the hero plot, the six service
 * worlds, the process pad, the corridor and the map plinth. Outside those
 * plateaus the land rolls, so the horizon still has relief.
 */
type Pad = { x: number; z: number; rx: number; rz: number }

export const PADS: Pad[] = [
  { x: -40, z: -104, rx: 36, rz: 34 },
  { x: -48, z: -206, rx: 40, rz: 32 },
  { x: 50, z: -262, rx: 40, rz: 32 },
  { x: -48, z: -300, rx: 42, rz: 34 },
  { x: 50, z: -360, rx: 40, rz: 32 },
  { x: -48, z: -412, rx: 40, rz: 32 },
  { x: 50, z: -451, rx: 40, rz: 32 },
  { x: -50, z: -525, rx: 34, rz: 46 },
  { x: -38, z: -744, rx: 26, rz: 24 },
  { x: 44, z: -820, rx: 22, rz: 72 },
  { x: 0, z: -1000, rx: 74, rz: 74 },
  { x: 0, z: -1150, rx: 46, rz: 46 },
]

const smooth = (t: number) => {
  const x = Math.min(1, Math.max(0, t))
  return x * x * (3 - 2 * x)
}

/** How much of the point is levelled ground: 1 = flat pad, 0 = open country. */
export function levelling(x: number, z: number): number {
  let weight = 0
  for (const pad of PADS) {
    const dx = (x - pad.x) / pad.rx
    const dz = (z - pad.z) / pad.rz
    const d = Math.sqrt(dx * dx + dz * dz)
    if (d < 1) weight = Math.max(weight, smooth((1 - d) / 0.42))
  }
  return weight
}

/**
 * Terrain height. Zero inside the road reserve and on every levelled pad,
 * gently rolling outside, with drainage falloff towards the road edge so the
 * ground meets the kerb.
 */
export function terrainHeight(x: number, z: number): number {
  const d = Math.abs(x)
  const corridor = 1 - Math.min(1, Math.max(0, (d - CORRIDOR_HALF_WIDTH) / 26))
  const flat = Math.max(corridor, levelling(x, z))
  const broad = (fbm2(x * 0.006, z * 0.006, 11, 4) - 0.5) * 7.5
  const medium = (fbm2(x * 0.021, z * 0.021, 27, 3) - 0.5) * 2.4
  const fine = (fbm2(x * 0.09, z * 0.09, 43, 2) - 0.5) * 0.42
  const rolling = broad + medium + fine
  // a shallow drain swale either side of the carriageway
  const swale = -0.32 * Math.exp(-Math.pow((d - 9.5) / 3.4, 2))
  return rolling * (1 - flat) + swale * corridor + (1 - flat) * 0.35
}

/** Which groundcover wins at a point: 0 = soil, 1 = grass. */
export function groundCover(x: number, z: number): number {
  const d = Math.abs(x)
  const near = Math.min(1, Math.max(0, (d - 5.6) / 5))
  const patch = fbm2(x * 0.03, z * 0.03, 71, 4)
  const wear = fbm2(x * 0.12, z * 0.12, 89, 2)
  const cover = patch * 0.75 + wear * 0.25
  return Math.min(1, Math.max(0, (cover - 0.42) * 2.6)) * near
}

export type TerrainOptions = {
  width: number
  length: number
  centerZ: number
  cell: number
}

/**
 * Builds the ground as two meshes: the soil body and a grass skin that only
 * covers the cells where grass actually wins. The skin sits a few centimetres
 * above the soil so there is no z-fighting.
 */
export function buildTerrain({ width, length, centerZ, cell }: TerrainOptions) {
  const nx = Math.max(8, Math.round(width / cell))
  const nz = Math.max(8, Math.round(length / cell))
  const dx = width / nx
  const dz = length / nz
  const count = (nx + 1) * (nz + 1)

  const positions = new Float32Array(nx * nz * 6 * 3)
  const normals = new Float32Array(nx * nz * 6 * 3)
  const uvs = new Float32Array(nx * nz * 6 * 2)
  const colors = new Float32Array(nx * nz * 6 * 3)
  const indices = new (count > 65535 ? Uint32Array : Uint16Array)(nx * nz * 6)

  const grassPositions = new Float32Array(nx * nz * 6 * 3)
  const grassNormals = new Float32Array(nx * nz * 6 * 3)
  const grassUvs = new Float32Array(nx * nz * 6 * 2)
  const grassColors = new Float32Array(nx * nz * 6 * 3)
  const grassIndices = new (count > 65535 ? Uint32Array : Uint16Array)(nx * nz * 6)

  const heightAt = (ix: number, iz: number) => {
    const x = -width / 2 + ix * dx
    const z = centerZ - length / 2 + iz * dz
    return { x, z, y: terrainHeight(x, z) }
  }

  const sample: { x: number; y: number; z: number }[][] = []
  for (let iz = 0; iz <= nz; iz++) {
    const row: { x: number; y: number; z: number }[] = []
    for (let ix = 0; ix <= nx; ix++) row.push(heightAt(ix, iz))
    sample.push(row)
  }

  let v = 0
  let g = 0
  let grassTri = 0
  const push = (
    target: { positions: Float32Array; normals: Float32Array; uvs: Float32Array; colors: Float32Array },
    index: number,
    p: { x: number; y: number; z: number },
    n: THREE.Vector3,
    u: number,
    vv: number,
    c: THREE.Color,
  ) => {
    const i3 = index * 3
    const i2 = index * 2
    target.positions[i3] = p.x
    target.positions[i3 + 1] = p.y
    target.positions[i3 + 2] = p.z
    target.normals[i3] = n.x
    target.normals[i3 + 1] = n.y
    target.normals[i3 + 2] = n.z
    target.uvs[i2] = u / 4
    target.uvs[i2 + 1] = vv / 4
    target.colors[i3] = c.r
    target.colors[i3 + 1] = c.g
    target.colors[i3 + 2] = c.b
  }

  const tmpA = new THREE.Vector3()
  const tmpB = new THREE.Vector3()
  const nrm = new THREE.Vector3()
  const soilTint = new THREE.Color()
  const grassTint = new THREE.Color()

  for (let iz = 0; iz < nz; iz++) {
    for (let ix = 0; ix < nx; ix++) {
      const a = sample[iz][ix]
      const b = sample[iz][ix + 1]
      const c = sample[iz + 1][ix]
      const d = sample[iz + 1][ix + 1]
      tmpA.set(b.x - a.x, b.y - a.y, b.z - a.z)
      tmpB.set(c.x - a.x, c.y - a.y, c.z - a.z)
      nrm.crossVectors(tmpB, tmpA).normalize()

      const cx = (a.x + b.x + c.x + d.x) / 4
      const cz = (a.z + b.z + c.z + d.z) / 4
      const cover = groundCover(cx, cz)
      const moisture = fbm2(cx * 0.05, cz * 0.05, 101, 3)

      // soil tint: damp near the road, dusty further out
      const dust = 0.82 + fbm2(cx * 0.08, cz * 0.08, 131, 2) * 0.36
      soilTint.setRGB(dust, dust * (0.93 + moisture * 0.1), dust * 0.86)
      // grass tint: dry patches vary the hue
      const dryness = Math.min(1, Math.max(0, (fbm2(cx * 0.04, cz * 0.04, 151, 3) - 0.35) * 2))
      grassTint.setRGB(0.72 + dryness * 0.5, 0.86, 0.62 + (1 - dryness) * 0.2)

      // wound (a, c, b) / (b, c, d) so the face normal is +Y — the ground must
      // be visible from above with a front-side material
      const soilTarget = { positions, normals, uvs, colors }
      push(soilTarget, v, a, nrm, a.x, a.z, soilTint)
      push(soilTarget, v + 1, c, nrm, c.x, c.z, soilTint)
      push(soilTarget, v + 2, b, nrm, b.x, b.z, soilTint)
      push(soilTarget, v + 3, b, nrm, b.x, b.z, soilTint)
      push(soilTarget, v + 4, c, nrm, c.x, c.z, soilTint)
      push(soilTarget, v + 5, d, nrm, d.x, d.z, soilTint)
      for (let k = 0; k < 6; k++) indices[v + k] = v + k
      v += 6

      if (cover > 0.18) {
        const lift = 0.035
        const grassTarget = { positions: grassPositions, normals: grassNormals, uvs: grassUvs, colors: grassColors }
        const liftPoint = (p: { x: number; y: number; z: number }) => ({ x: p.x, y: p.y + lift, z: p.z })
        push(grassTarget, g, liftPoint(a), nrm, a.x, a.z, grassTint)
        push(grassTarget, g + 1, liftPoint(c), nrm, c.x, c.z, grassTint)
        push(grassTarget, g + 2, liftPoint(b), nrm, b.x, b.z, grassTint)
        push(grassTarget, g + 3, liftPoint(b), nrm, b.x, b.z, grassTint)
        push(grassTarget, g + 4, liftPoint(c), nrm, c.x, c.z, grassTint)
        push(grassTarget, g + 5, liftPoint(d), nrm, d.x, d.z, grassTint)
        for (let k = 0; k < 6; k++) grassIndices[g + k] = g + k
        g += 6
        grassTri += 2
      }
    }
  }

  const soil = new THREE.BufferGeometry()
  soil.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  soil.setAttribute('normal', new THREE.BufferAttribute(normals, 3))
  soil.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
  soil.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  soil.setIndex(new THREE.BufferAttribute(indices, 1))
  soil.computeBoundingSphere()

  const grass = new THREE.BufferGeometry()
  grass.setAttribute('position', new THREE.BufferAttribute(grassPositions.slice(0, g * 3), 3))
  grass.setAttribute('normal', new THREE.BufferAttribute(grassNormals.slice(0, g * 3), 3))
  grass.setAttribute('uv', new THREE.BufferAttribute(grassUvs.slice(0, g * 2), 2))
  grass.setAttribute('color', new THREE.BufferAttribute(grassColors.slice(0, g * 3), 3))
  grass.setIndex(new THREE.BufferAttribute(grassIndices.slice(0, g), 1))
  grass.computeBoundingSphere()

  return { soil, grass, grassTriangles: grassTri }
}

/**
 * Poisson-ish scatter inside a corridor, density weighted by a noise field so
 * vegetation clumps naturally instead of sitting on a grid.
 */
export function scatter(
  seed: number,
  options: {
    count: number
    xRange: [number, number]
    zRange: [number, number]
    minDistance?: number
    avoid?: (x: number, z: number) => boolean
    jitter?: number
  },
): { x: number; z: number; r: number }[] {
  const random = prng(seed)
  const points: { x: number; z: number; r: number }[] = []
  const [x0, x1] = options.xRange
  const [z0, z1] = options.zRange
  const minDistance = options.minDistance ?? 2
  const attempts = options.count * 12
  for (let i = 0; i < attempts && points.length < options.count; i++) {
    const x = x0 + random() * (x1 - x0)
    const z = z0 + random() * (z1 - z0)
    if (options.avoid?.(x, z)) continue
    if (minDistance > 0) {
      let ok = true
      for (const p of points) {
        const dx = p.x - x
        const dz = p.z - z
        if (dx * dx + dz * dz < minDistance * minDistance) {
          ok = false
          break
        }
      }
      if (!ok) continue
    }
    points.push({ x, z, r: random() })
  }
  return points
}
