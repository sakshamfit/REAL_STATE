import * as THREE from 'three'

/**
 * Procedural textures — everything is generated in a canvas at runtime so the
 * experience ships zero image assets and still gets real material detail.
 * All generators are memoised and resolution-aware (mobile gets half res).
 */

type TextureSet = {
  map: THREE.Texture
  normalMap: THREE.Texture
  roughnessMap: THREE.Texture
}

const cache = new Map<string, unknown>()

function memo<T>(key: string, make: () => T): T {
  const hit = cache.get(key)
  if (hit) return hit as T
  const value = make()
  cache.set(key, value)
  return value
}

function canvas2d(size: number) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  return { canvas, ctx, image: ctx.createImageData(size, size) }
}

function hash(x: number, y: number, seed: number) {
  let h = x * 374761393 + y * 668265263 + seed * 1274126177
  h = (h ^ (h >>> 13)) * 1274126177
  return ((h ^ (h >>> 16)) & 0x7fffffff) / 0x7fffffff
}

const fade = (t: number) => t * t * (3 - 2 * t)

function valueNoise(x: number, y: number, seed: number) {
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

function fbm(x: number, y: number, seed: number, octaves = 4, gain = 0.5, lacunarity = 2) {
  let value = 0
  let amplitude = 1
  let total = 0
  let fx = x
  let fy = y
  for (let i = 0; i < octaves; i++) {
    value += valueNoise(fx, fy, seed + i * 17) * amplitude
    total += amplitude
    amplitude *= gain
    fx *= lacunarity
    fy *= lacunarity
  }
  return value / total
}

/** Sobel height -> tangent space normal map. */
function normalFromHeight(height: Float32Array, size: number, strength: number) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const image = ctx.createImageData(size, size)
  const at = (x: number, y: number) => height[((y + size) % size) * size + ((x + size) % size)]
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength
      const len = Math.hypot(dx, dy, 1)
      const i = (y * size + x) * 4
      image.data[i] = ((-dx / len) * 0.5 + 0.5) * 255
      image.data[i + 1] = ((-dy / len) * 0.5 + 0.5) * 255
      image.data[i + 2] = (1 / len) * 0.5 * 255 + 127
      image.data[i + 3] = 255
    }
  }
  ctx.putImageData(image, 0, 0)
  return canvas
}

function textureFromCanvas(canvas: HTMLCanvasElement, repeat: number) {
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(repeat, repeat)
  texture.colorSpace = THREE.NoColorSpace
  texture.anisotropy = 4
  texture.needsUpdate = true
  return texture
}

function albedoTexture(canvas: HTMLCanvasElement, repeat: number, srgb = true) {
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(repeat, repeat)
  texture.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace
  texture.anisotropy = 4
  return texture
}

/** Board-formed concrete: soft blotches, pores, horizontal form lines. */
function buildConcrete(size: number, repeat: number, tint: number): TextureSet {
  const albedo = canvas2d(size)
  const rough = canvas2d(size)
  const height = new Float32Array(size * size)

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size
      const v = y / size
      const blotch = fbm(u * 5, v * 5, 11, 5)
      const pores = fbm(u * 90, v * 90, 31, 3)
      const form = Math.sin(v * Math.PI * 2 * 8 + fbm(u * 3, v * 3, 7, 2) * 2) * 0.5 + 0.5
      const grain = hash(x, y, 5)

      const value = tint * (0.72 + blotch * 0.38) * (0.94 + form * 0.06) - (pores > 0.74 ? (pores - 0.74) * 0.9 : 0)
      const c = Math.max(0, Math.min(1, value)) * 255
      const i = (y * size + x) * 4
      albedo.image.data[i] = c
      albedo.image.data[i + 1] = c
      albedo.image.data[i + 2] = c * 1.005
      albedo.image.data[i + 3] = 255

      const r = 0.62 + (1 - blotch) * 0.3 + grain * 0.06
      const rc = Math.max(0, Math.min(1, r)) * 255
      rough.image.data[i] = rc
      rough.image.data[i + 1] = rc
      rough.image.data[i + 2] = rc
      rough.image.data[i + 3] = 255

      height[y * size + x] = blotch * 0.7 + pores * 0.2 + form * 0.1
    }
  }
  albedo.ctx.putImageData(albedo.image, 0, 0)
  rough.ctx.putImageData(rough.image, 0, 0)

  return {
    map: albedoTexture(albedo.canvas, repeat),
    roughnessMap: textureFromCanvas(rough.canvas, repeat),
    normalMap: textureFromCanvas(normalFromHeight(height, size, size / 26), repeat),
  }
}

/** Brushed metal: strong horizontal anisotropy. */
function buildMetal(size: number, repeat: number, tint: number): TextureSet {
  const albedo = canvas2d(size)
  const rough = canvas2d(size)
  const height = new Float32Array(size * size)

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size
      const v = y / size
      const streak = fbm(u * 3, v * 160, 3, 3)
      const sweep = fbm(u * 6, v * 6, 19, 4)
      const value = tint * (0.68 + streak * 0.34) * (0.9 + sweep * 0.16)
      const c = Math.max(0, Math.min(1, value)) * 255
      const i = (y * size + x) * 4
      albedo.image.data[i] = c
      albedo.image.data[i + 1] = c
      albedo.image.data[i + 2] = c * 0.99
      albedo.image.data[i + 3] = 255

      const r = 0.18 + streak * 0.34 + sweep * 0.1
      const rc = Math.max(0, Math.min(1, r)) * 255
      rough.image.data[i] = rc
      rough.image.data[i + 1] = rc
      rough.image.data[i + 2] = rc
      rough.image.data[i + 3] = 255

      height[y * size + x] = streak * 0.9 + sweep * 0.1
    }
  }
  albedo.ctx.putImageData(albedo.image, 0, 0)
  rough.ctx.putImageData(rough.image, 0, 0)

  return {
    map: albedoTexture(albedo.canvas, repeat),
    roughnessMap: textureFromCanvas(rough.canvas, repeat),
    normalMap: textureFromCanvas(normalFromHeight(height, size, size / 90), repeat),
  }
}

export type MaterialSize = 256 | 512

export function concreteTextureSet(size: MaterialSize = 512, repeat = 4, tint = 0.62) {
  return memo(`concrete-${size}-${repeat}-${tint}`, () => buildConcrete(size, repeat, tint))
}

export function metalTextureSet(size: MaterialSize = 256, repeat = 3, tint = 0.72) {
  return memo(`metal-${size}-${repeat}-${tint}`, () => buildMetal(size, repeat, tint))
}

/** Soft round sprite used by the dust / atmosphere points. */
export function dustSprite(size = 64) {
  return memo(`dust-${size}`, () => {
    const { canvas, ctx } = canvas2d(size)
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    gradient.addColorStop(0, 'rgba(255,255,255,1)')
    gradient.addColorStop(0.35, 'rgba(255,255,255,0.32)')
    gradient.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, size, size)
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    return texture
  })
}

/** Thin architectural grid, tiled on the ground. */
export function gridTexture(size = 512, cells = 8) {
  return memo(`grid-${size}-${cells}`, () => {
    const { canvas, ctx } = canvas2d(size)
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, size, size)
    const step = size / cells
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'
    ctx.lineWidth = 1
    for (let i = 0; i <= cells; i++) {
      const p = Math.round(i * step) + 0.5
      ctx.beginPath()
      ctx.moveTo(p, 0)
      ctx.lineTo(p, size)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(0, p)
      ctx.lineTo(size, p)
      ctx.stroke()
    }
    return textureFromCanvas(canvas, 1)
  })
}

/** Radial falloff used as a fake contact shadow / glow decal. */
export function radialTexture(size = 256, power = 2.2) {
  return memo(`radial-${size}-${power}`, () => {
    const { canvas, ctx } = canvas2d(size)
    const image = ctx.createImageData(size, size)
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = (x / size) * 2 - 1
        const dy = (y / size) * 2 - 1
        const d = Math.min(1, Math.hypot(dx, dy))
        const a = Math.pow(1 - d, power)
        const i = (y * size + x) * 4
        image.data[i] = 255
        image.data[i + 1] = 255
        image.data[i + 2] = 255
        image.data[i + 3] = a * 255
      }
    }
    ctx.putImageData(image, 0, 0)
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    return texture
  })
}

export function disposeTextureCache() {
  cache.forEach((value) => {
    if (value instanceof THREE.Texture) value.dispose()
    else if (value && typeof value === 'object') {
      Object.values(value as Record<string, unknown>).forEach((item) => {
        if (item instanceof THREE.Texture) item.dispose()
      })
    }
  })
  cache.clear()
}
