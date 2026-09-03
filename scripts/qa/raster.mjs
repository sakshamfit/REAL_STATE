/**
 * Offline software rasteriser used by the photorealism QA pipeline.
 *
 * The sandbox that builds this project has no GPU and no browser, so the only
 * honest way to inspect GLB geometry is to rasterise it ourselves. The
 * renderer supports:
 *
 *   • arbitrary GLB instances (position / rotation / scale)
 *   • a displaced ground plane with a procedural surface texture
 *   • sun + sky + bounce lighting with a real shadow map
 *   • ACES tone mapping, exponential haze, gamma
 *
 * It is deliberately unoptimised: clarity over speed, it only ever runs in CI.
 */
import fs from 'node:fs'
import path from 'node:path'
import { Document, NodeIO } from '@gltf-transform/core'
import * as THREE from 'three'
import { encodePNG } from './png.mjs'

/* ------------------------------------------------------------------ glb load */

/**
 * De-quantises an accessor (the optimiser stores positions as normalised
 * shorts) and returns a plain Float32Array of 3-component values.
 */
function readVec(accessor, components) {
  const raw = accessor.getArray()
  const normalized = accessor.getNormalized()
  const componentType = accessor.getComponentType()
  const divisor =
    componentType === 5122 || componentType === 5120
      ? componentType === 5120
        ? 127
        : 32767
      : componentType === 5123 || componentType === 5121
        ? componentType === 5121
          ? 255
          : 65535
        : 1
  const out = new Float32Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = normalized ? raw[i] / divisor : raw[i]
  if (accessor.getComponentSize() !== components) return out
  return out
}

export async function loadGLB(file) {
  const io = new NodeIO()
  const doc = await io.read(file)
  const root = doc.getRoot()
  const meshes = []

  for (const node of root.listNodes()) {
    const mesh = node.getMesh()
    if (!mesh) continue
    // the optimised assets carry their real size in the node transform
    const matrix = new THREE.Matrix4().fromArray(node.getMatrix())
    const normalMatrix = new THREE.Matrix3().getNormalMatrix(matrix)

    for (const prim of mesh.listPrimitives()) {
      const position = prim.getAttribute('POSITION')
      const normal = prim.getAttribute('NORMAL')
      const uv = prim.getAttribute('TEXCOORD_0')
      const indices = prim.getIndices()
      const material = prim.getMaterial()
      if (!position) continue

      const rawPosition = readVec(position, 3)
      const worldPosition = new Float32Array(rawPosition.length)
      const v = new THREE.Vector3()
      for (let i = 0; i < rawPosition.length; i += 3) {
        v.set(rawPosition[i], rawPosition[i + 1], rawPosition[i + 2]).applyMatrix4(matrix)
        worldPosition[i] = v.x
        worldPosition[i + 1] = v.y
        worldPosition[i + 2] = v.z
      }

      let worldNormal = null
      if (normal) {
        const rawNormal = readVec(normal, 3)
        worldNormal = new Float32Array(rawNormal.length)
        const n = new THREE.Vector3()
        for (let i = 0; i < rawNormal.length; i += 3) {
          n.set(rawNormal[i], rawNormal[i + 1], rawNormal[i + 2]).applyMatrix3(normalMatrix).normalize()
          worldNormal[i] = n.x
          worldNormal[i + 1] = n.y
          worldNormal[i + 2] = n.z
        }
      }

      const rawUv = uv ? readVec(uv, 2) : null

      meshes.push({
        name: mesh.getName() || 'mesh',
        material: material ? material.getName() : 'default',
        baseColor: material ? material.getBaseColorFactor() : [0.8, 0.8, 0.8, 1],
        metallic: material ? material.getMetallicFactor() : 0,
        roughness: material ? material.getRoughnessFactor() : 0.8,
        position: worldPosition,
        normal: worldNormal,
        uv: rawUv,
        indices: indices ? indices.getArray() : null,
        count: position.getCount(),
      })
    }
  }
  return { doc, prims: meshes }
}

const MATERIAL_TINT = {
  concrete: [0.72, 0.70, 0.66],
  render: [0.88, 0.84, 0.77],
  stone: [0.66, 0.61, 0.54],
  wood: [0.32, 0.24, 0.17],
  metal: [0.66, 0.67, 0.69],
  darkMetal: [0.20, 0.21, 0.22],
  glass: [0.28, 0.36, 0.40],
  asphalt: [0.20, 0.20, 0.21],
  soil: [0.40, 0.31, 0.23],
  foliage: [0.24, 0.34, 0.17],
  foliageB: [0.30, 0.39, 0.19],
  leaf: [0.26, 0.36, 0.18],
  terracotta: [0.66, 0.36, 0.22],
  paintMuted: [0.35, 0.43, 0.38],
  rust: [0.44, 0.26, 0.16],
  rubber: [0.09, 0.09, 0.10],
  paint: [0.62, 0.62, 0.64],
  safety: [0.78, 0.62, 0.14],
  plastic: [0.30, 0.30, 0.30],
}

/* ------------------------------------------------------------------- shading */

function aces(x) {
  const a = 2.51
  const b = 0.03
  const c = 2.43
  const d = 0.59
  const e = 0.14
  return Math.min(1, Math.max(0, (x * (a * x + b)) / (x * (c * x + d) + e)))
}

/* ------------------------------------------------------------------ renderer */

export class Renderer {
  constructor(options = {}) {
    this.width = options.width ?? 900
    this.height = options.height ?? 600
    this.background = options.background ?? [0.72, 0.79, 0.83]
    this.sunDir = new THREE.Vector3(...(options.sunDir ?? [0.45, 0.62, 0.5])).normalize()
    this.sunColor = options.sunColor ?? [1.0, 0.94, 0.82]
    this.sunEnergy = options.sunEnergy ?? 2.6
    this.skyColor = options.skyColor ?? [0.52, 0.63, 0.74]
    this.groundColor = options.groundColor ?? [0.42, 0.36, 0.28]
    this.haze = options.haze ?? 0.0022
    this.hazeColor = options.hazeColor ?? [0.76, 0.81, 0.83]
    this.shadowMapSize = options.shadowMapSize ?? 1024
    this.shadowExtent = options.shadowExtent ?? 90
    /** optional world-space centre for the sun's orthographic frustum */
    this.shadowCenter = options.shadowCenter ? new THREE.Vector3(...options.shadowCenter) : null
    /** optional sky function: (normalised ray direction) => [r, g, b] */
    this.skyFn = options.sky ?? null
    this.exposure = options.exposure ?? 1.05
    this.samples = options.samples ?? 1

    this.color = new Float32Array(this.width * this.height * 3)
    this.depth = new Float32Array(this.width * this.height).fill(Infinity)
    this.shadow = null
    this.instances = []
    this.ids = new Array(this.width * this.height).fill('sky')
    this.materials = options.materials ?? {}
  }

  add(instance) {
    this.instances.push(instance)
    return this
  }

  /** Build the flat triangle list (world space) from all instances. */
  build() {
    const tris = []
    const tmpA = new THREE.Vector3()
    const tmpB = new THREE.Vector3()
    const tmpC = new THREE.Vector3()

    for (const instance of this.instances) {
      const matrix = new THREE.Matrix4()
      const quat = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(...(instance.rotation ?? [0, 0, 0])),
      )
      matrix.compose(
        new THREE.Vector3(...(instance.position ?? [0, 0, 0])),
        quat,
        new THREE.Vector3(...(instance.scale ?? [1, 1, 1])),
      )
      const normalMatrix = new THREE.Matrix3().getNormalMatrix(matrix)

      for (const prim of instance.prims) {
        const pos = prim.position
        const nor = prim.normal
        const uv = prim.uv
        const idx = prim.indices
        const count = idx ? idx.length : prim.count
        for (let i = 0; i < count; i += 3) {
          const ia = idx ? idx[i] : i
          const ib = idx ? idx[i + 1] : i + 1
          const ic = idx ? idx[i + 2] : i + 2
          tmpA.fromArray(pos, ia * 3).applyMatrix4(matrix)
          tmpB.fromArray(pos, ib * 3).applyMatrix4(matrix)
          tmpC.fromArray(pos, ic * 3).applyMatrix4(matrix)
          const n = new THREE.Vector3()
          if (nor) {
            n.fromArray(nor, ia * 3).applyMatrix3(normalMatrix).normalize()
          } else {
            n.copy(
              new THREE.Vector3()
                .subVectors(tmpB, tmpA)
                .cross(new THREE.Vector3().subVectors(tmpC, tmpA))
                .normalize(),
            )
          }
          tris.push({
            a: tmpA.clone(),
            b: tmpB.clone(),
            c: tmpC.clone(),
            n,
            uvA: uv ? [uv[ia * 2], uv[ia * 2 + 1]] : [0, 0],
            uvB: uv ? [uv[ib * 2], uv[ib * 2 + 1]] : [0, 0],
            uvC: uv ? [uv[ic * 2], uv[ic * 2 + 1]] : [0, 0],
            material: prim.material,
            label: instance.label ?? prim.material,
            tint: prim.tint,
            twoSided: !!prim.twoSided || ['leaf', 'leafB', 'leafDry', 'foliage', 'foliageB'].includes(prim.material),
            alphaTest: prim.alphaTest ?? 0,
          })
        }
      }
    }
    this.tris = tris
    return tris
  }

  /** Orthographic depth pass from the sun. */
  buildShadowMap() {
    const size = this.shadowMapSize
    const extent = this.shadowExtent
    const center = new THREE.Vector3()
    if (this.shadowCenter) {
      center.copy(this.shadowCenter)
    } else {
      let n = 0
      for (const instance of this.instances) {
        center.add(new THREE.Vector3(...(instance.position ?? [0, 0, 0])))
        n++
      }
      if (n) center.divideScalar(n)
    }
    this.shadowCenter = center.clone()

    const forward = this.sunDir.clone().normalize()
    const up = Math.abs(forward.y) > 0.95 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0)
    const right = new THREE.Vector3().crossVectors(up, forward).normalize()
    const realUp = new THREE.Vector3().crossVectors(forward, right).normalize()
    const eye = center.clone().add(forward.clone().multiplyScalar(extent * 2))
    const lightCam = new THREE.Camera()
    lightCam.position.copy(eye)
    lightCam.up.copy(realUp)
    lightCam.lookAt(center)
    lightCam.updateMatrixWorld()
    const view = lightCam.matrixWorldInverse.clone()
    const depth = new Float32Array(size * size).fill(Infinity)
    const toLight = (v) => {
      const p = v.clone().applyMatrix4(view)
      return p
    }
    const half = extent
    for (const t of this.tris) {
      const pa = toLight(t.a)
      const pb = toLight(t.b)
      const pc = toLight(t.c)
      // rasterise in light space (x right, y up), depth = -z
      const project = (p) => [
        ((p.x + half) / (half * 2)) * size,
        (1 - (p.y + half) / (half * 2)) * size,
        -p.z,
      ]
      const A = project(pa)
      const B = project(pb)
      const C = project(pc)
      const minX = Math.max(0, Math.floor(Math.min(A[0], B[0], C[0])))
      const maxX = Math.min(size - 1, Math.ceil(Math.max(A[0], B[0], C[0])))
      const minY = Math.max(0, Math.floor(Math.min(A[1], B[1], C[1])))
      const maxY = Math.min(size - 1, Math.ceil(Math.max(A[1], B[1], C[1])))
      if (maxX < minX || maxY < minY) continue
      const area = (B[0] - A[0]) * (C[1] - A[1]) - (C[0] - A[0]) * (B[1] - A[1])
      if (Math.abs(area) < 1e-9) continue
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          const px = x + 0.5
          const py = y + 0.5
          const w0 = ((B[0] - px) * (C[1] - py) - (C[0] - px) * (B[1] - py)) / area
          const w1 = ((C[0] - px) * (A[1] - py) - (A[0] - px) * (C[1] - py)) / area
          const w2 = 1 - w0 - w1
          if (w0 < 0 || w1 < 0 || w2 < 0) continue
          const z = w0 * A[2] + w1 * B[2] + w2 * C[2]
          const i = y * size + x
          if (z < depth[i]) depth[i] = z
        }
      }
    }
    this.shadow = { size, depth, view, extent: half }
  }

  shadowFactor(worldPoint, normal) {
    if (!this.shadow) return 1
    const p = worldPoint.clone()
    p.addScaledVector(normal, 0.035)
    const lp = p.applyMatrix4(this.shadow.view)
    const size = this.shadow.size
    const half = this.shadow.extent
    const x = ((lp.x + half) / (half * 2)) * size
    const y = (1 - (lp.y + half) / (half * 2)) * size
    const z = -lp.z
    if (x < 1 || y < 1 || x > size - 2 || y > size - 2) return 1
    let shadowed = 0
    const radius = 1
    const bias = 0.06
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const i = (Math.round(y) + dy) * size + (Math.round(x) + dx)
        if (i < 0 || i >= this.shadow.depth.length) continue
        if (this.shadow.depth[i] + bias < z) shadowed += 1
      }
    }
    const total = (radius * 2 + 1) * (radius * 2 + 1)
    return 1 - shadowed / total * 0.85
  }

  shade(tri, point, normal, uv, viewDir) {
    const key = tri.material
    const tint = tri.tint ?? MATERIAL_TINT[key] ?? [0.7, 0.7, 0.7]
    const surface = this.materials[key]

    let r = tint[0]
    let g = tint[1]
    let b = tint[2]

    if (surface && surface.albedo) {
      const s = surface.size
      const u = ((uv[0] * (surface.repeat ?? 1)) % 1 + 1) % 1
      const v = ((uv[1] * (surface.repeat ?? 1)) % 1 + 1) % 1
      const x = Math.min(s - 1, Math.max(0, Math.floor(u * s)))
      const y = Math.min(s - 1, Math.max(0, Math.floor((1 - v) * s)))
      const i = (y * s + x) * 4
      const a = surface.albedo
      r *= a[i] / 255
      g *= a[i + 1] / 255
      b *= a[i + 2] / 255
      if (surface.roughness) {
        // subtle roughness-driven darkening/lightening preview only
        const rv = surface.roughness[i] / 255
        const k = 0.86 + (1 - rv) * 0.28
        r *= k
        g *= k
        b *= k
      }
    }

    const ndl = Math.max(0, normal.dot(this.sunDir))
    const sh = this.shadowFactor(point, normal)
    const sky = 0.5 + 0.5 * normal.y
    const bounce = 0.5 - 0.5 * normal.y

    let lr = 0
    let lg = 0
    let lb = 0
    // sun
    lr += this.sunColor[0] * this.sunEnergy * ndl * sh
    lg += this.sunColor[1] * this.sunEnergy * ndl * sh
    lb += this.sunColor[2] * this.sunEnergy * ndl * sh
    // sky dome
    lr += this.skyColor[0] * sky * 0.85
    lg += this.skyColor[1] * sky * 0.9
    lb += this.skyColor[2] * sky * 1.0
    // ground bounce
    lr += this.groundColor[0] * bounce * 0.35
    lg += this.groundColor[1] * bounce * 0.32
    lb += this.groundColor[2] * bounce * 0.26

    let outR = (r * lr) / Math.PI * 2.2
    let outG = (g * lg) / Math.PI * 2.2
    let outB = (b * lb) / Math.PI * 2.2

    // cheap specular for metals / glass
    if (key === 'metal' || key === 'darkMetal' || key === 'glass') {
      const half = this.sunDir.clone().add(viewDir).normalize()
      const spec = Math.pow(Math.max(0, normal.dot(half)), key === 'glass' ? 64 : 24) * sh
      outR += spec * (key === 'glass' ? 1.4 : 0.6)
      outG += spec * (key === 'glass' ? 1.4 : 0.6)
      outB += spec * (key === 'glass' ? 1.4 : 0.6)
    }
    return [outR, outG, outB]
  }

  render(camera) {
    if (!this.tris) this.build()
    this.buildShadowMap()

    const aspect = this.width / this.height
    const camPos = new THREE.Vector3(...camera.position)
    const look = new THREE.Vector3(...(camera.look ?? [0, 1, 0]))
    const viewObj = new THREE.Camera()
    viewObj.position.copy(camPos)
    viewObj.lookAt(look)
    viewObj.updateMatrixWorld()
    const view = viewObj.matrixWorldInverse.clone()
    const projCam = new THREE.PerspectiveCamera(camera.fov ?? 38, aspect, 0.1, 3000)
    projCam.updateProjectionMatrix()
    const viewProj = new THREE.Matrix4().multiplyMatrices(projCam.projectionMatrix, view)

    const w = this.width
    const h = this.height
    const invViewProj = viewProj.clone().invert()
    const ray = new THREE.Vector3()
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x
        if (this.skyFn) {
          ray
            .set(((x + 0.5) / w) * 2 - 1, 1 - ((y + 0.5) / h) * 2, 0.5)
            .applyMatrix4(invViewProj)
          const dir = ray.clone().sub(camPos).normalize()
          const sky = this.skyFn(dir)
          this.color[i * 3] = sky[0]
          this.color[i * 3 + 1] = sky[1]
          this.color[i * 3 + 2] = sky[2]
        } else {
          this.color[i * 3] = this.background[0]
          this.color[i * 3 + 1] = this.background[1]
          this.color[i * 3 + 2] = this.background[2]
        }
        this.depth[i] = Infinity
      }
    }

    const clip = new THREE.Vector4()
    const project = (v) => {
      clip.set(v.x, v.y, v.z, 1).applyMatrix4(viewProj)
      if (clip.w <= 0.0001) return null
      return [
        ((clip.x / clip.w) * 0.5 + 0.5) * w,
        (1 - ((clip.y / clip.w) * 0.5 + 0.5)) * h,
        clip.w,
      ]
    }

    for (const tri of this.tris) {
      const A = project(tri.a)
      const B = project(tri.b)
      const C = project(tri.c)
      if (!A || !B || !C) continue
      const area = (B[0] - A[0]) * (C[1] - A[1]) - (C[0] - A[0]) * (B[1] - A[1])
      if (Math.abs(area) < 1e-9) continue
      const minX = Math.max(0, Math.floor(Math.min(A[0], B[0], C[0])))
      const maxX = Math.min(w - 1, Math.ceil(Math.max(A[0], B[0], C[0])))
      const minY = Math.max(0, Math.floor(Math.min(A[1], B[1], C[1])))
      const maxY = Math.min(h - 1, Math.ceil(Math.max(A[1], B[1], C[1])))
      if (maxX < minX || maxY < minY) continue

      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          const px = x + 0.5
          const py = y + 0.5
          let w0 = ((B[0] - px) * (C[1] - py) - (C[0] - px) * (B[1] - py)) / area
          let w1 = ((C[0] - px) * (A[1] - py) - (A[0] - px) * (C[1] - py)) / area
          let w2 = 1 - w0 - w1
          const back = area > 0
          if (!tri.twoSided && back) continue
          if (w0 < -0.001 || w1 < -0.001 || w2 < -0.001) continue
          const z = w0 * A[2] + w1 * B[2] + w2 * C[2]
          const idx = y * w + x
          if (z >= this.depth[idx]) continue

          const u = w0 * tri.uvA[0] + w1 * tri.uvB[0] + w2 * tri.uvC[0]
          const v = w0 * tri.uvA[1] + w1 * tri.uvB[1] + w2 * tri.uvC[1]

          if (tri.alphaTest > 0 && this.materials[tri.material]?.albedo) {
            const surface = this.materials[tri.material]
            const s = surface.size
            const uu = ((u * (surface.repeat ?? 1)) % 1 + 1) % 1
            const vv = ((v * (surface.repeat ?? 1)) % 1 + 1) % 1
            const sx = Math.min(s - 1, Math.max(0, Math.floor(uu * s)))
            const sy = Math.min(s - 1, Math.max(0, Math.floor((1 - vv) * s)))
            const alpha = surface.albedo[(sy * s + sx) * 4 + 3] / 255
            if (alpha < tri.alphaTest) continue
          }

          const point = new THREE.Vector3()
            .addScaledVector(tri.a, w0)
            .addScaledVector(tri.b, w1)
            .addScaledVector(tri.c, w2)
          let normal = tri.n.clone()
          if (back && tri.twoSided) normal.negate()
          const viewDir = camPos.clone().sub(point).normalize()

          const [r, g, b] = this.shade(tri, point, normal, [u, v], viewDir)
          const dist = point.distanceTo(camPos)
          const fog = 1 - Math.exp(-this.haze * dist)
          const fr = r * (1 - fog) + this.hazeColor[0] * fog
          const fg = g * (1 - fog) + this.hazeColor[1] * fog
          const fb = b * (1 - fog) + this.hazeColor[2] * fog

          this.depth[idx] = z
          this.ids[idx] = tri.label
          this.color[idx * 3] = fr
          this.color[idx * 3 + 1] = fg
          this.color[idx * 3 + 2] = fb
        }
      }
    }

    // tone map + gamma
    const out = new Uint8Array(w * h * 3)
    for (let i = 0; i < w * h; i++) {
      for (let c = 0; c < 3; c++) {
        const v = aces(this.color[i * 3 + c] * this.exposure)
        out[i * 3 + c] = Math.round(Math.pow(v, 1 / 2.2) * 255)
      }
    }
    return out
  }

  /**
   * Brightness statistics for the tone-mapped frame.
   *
   * The screenshot test, done numerically: how bright is the picture, how much
   * of it is crushed to near-black, how much is clipped, and — the thing the
   * brief actually asks about — is the *foreground* readable.
   */
  luma(camera) {
    const pixels = this.render(camera)
    const w = this.width
    const h = this.height
    let sum = 0
    let dark = 0
    let clipped = 0
    let sky = 0
    let foreground = 0
    let foregroundCount = 0
    let darkest = 1
    const skyRGB = [0, 0, 0]
    let skyCount = 0
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 3
        const value = (0.2126 * pixels[i] + 0.7152 * pixels[i + 1] + 0.0722 * pixels[i + 2]) / 255
        sum += value
        if (value < 0.18) dark++
        if (value > 0.97) clipped++
        if (value < darkest) darkest = value
        if (this.ids[y * w + x] === 'sky') {
          sky++
          skyRGB[0] += pixels[i]
          skyRGB[1] += pixels[i + 1]
          skyRGB[2] += pixels[i + 2]
          skyCount++
          continue
        }
        // bottom third of the frame: the road, the yard, the foreground
        if (y > h * 0.66) {
          foreground += value
          foregroundCount++
        }
      }
    }
    const total = w * h
    const hex = (v) => Math.round(v).toString(16).padStart(2, '0')
    return {
      mean: sum / total,
      dark: dark / total,
      clipped: clipped / total,
      sky: sky / total,
      darkest,
      skyHex: skyCount
        ? `#${hex(skyRGB[0] / skyCount)}${hex(skyRGB[1] / skyCount)}${hex(skyRGB[2] / skyCount)}`
        : 'n/a',
      foreground: foregroundCount ? foreground / foregroundCount : 0,
    }
  }

  save(file, camera) {
    const pixels = this.render(camera)
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, encodePNG(pixels, this.width, this.height, 3))
    return file
  }

  /**
   * Semantic frame map: one character per *object* rather than per brightness.
   * This is what makes composition reviewable without an image viewer — you can
   * read exactly which asset fills which part of the frame.
   */
  /**
   * Tonal map: the frame as a luminance ramp.
   *
   * The label map says *what* is in frame; this says *how bright* it is. It is
   * the closest thing to looking at the screenshot: read it and you can see
   * whether the sky is the brightest thing, whether the building is a
   * silhouette, and whether the foreground has gone to black.
   */
  tones(camera, cols = 96) {
    const w = this.width
    const h = this.height
    const pixels = this.render(camera)
    const rows = Math.max(8, Math.round((cols * h) / w / 2.1))
    const cellW = w / cols
    const cellH = h / rows
    const RAMP = ' .:-=+*#%@'
    const lines = []
    for (let ry = 0; ry < rows; ry++) {
      let line = ''
      for (let rx = 0; rx < cols; rx++) {
        let sum = 0
        let n = 0
        for (let y = Math.floor(ry * cellH); y < Math.min(h, (ry + 1) * cellH); y++) {
          for (let x = Math.floor(rx * cellW); x < Math.min(w, (rx + 1) * cellW); x++) {
            const i = (y * w + x) * 3
            sum += (0.2126 * pixels[i] + 0.7152 * pixels[i + 1] + 0.0722 * pixels[i + 2]) / 255
            n++
          }
        }
        const value = n ? sum / n : 0
        line += RAMP[Math.min(RAMP.length - 1, Math.max(0, Math.round(value * (RAMP.length - 1))))]
      }
      lines.push(line)
    }
    return lines.join('\n')
  }

  labels(camera, cols = 120) {
    const w = this.width
    const h = this.height
    const pixels = this.render(camera)
    const rows = Math.max(8, Math.round((cols * h) / w / 2.1))
    const CHAR = {
      sky: '.',
      soil: ',',
      soilDry: ',',
      grass: ';',
      asphalt: '=',
      asphaltPatch: '=',
      roadPaint: '|',
      gravel: '~',
      concrete: 'C',
      render: 'B',
      stone: 'S',
      brick: 'r',
      metal: 'M',
      rust: 'M',
      bark: 'w',
      paint: 'p',
      plastic: 'p',
      rubber: 'o',
      glass: 'G',
      safety: '!',
      light: 'l',
      tail: 'l',
      leaf: 'T',
      leafDry: 'T',
      sand: ':',
    }
    const ROAD_CHAR = {
      asphalt: '=',
      gravel: '~',
      soil: ',',
      paint: '|',
      patch: '=',
      film: '=',
      kerb: 'C',
      drain: 'C',
      hole: 'o',
    }
    const charFor = (label) => {
      if (label.startsWith('road-')) return ROAD_CHAR[label.slice(5)] ?? '='
      if (CHAR[label]) return CHAR[label]
      if (label.startsWith('tree-') || label === 'bush' || label === 'shrub-dry') return 'T'
      if (label.startsWith('car-') || label.startsWith('truck') || label === 'excavator') return 'c'
      if (label === 'hero-building' || label === 'residential-building' || label === 'warehouse') return 'B'
      if (label === 'boundary-wall') return 'W'
      if (label === 'street-light') return 'i'
      if (label === 'crane') return 'K'
      if (label === 'entrance-gate') return 'E'
      if (label === 'bridge') return 'H'
      if (label === 'solar-panel') return 'P'
      if (label === 'barrier') return 'x'
      if (label === 'construction-shed' || label === 'material-stack' || label === 'cement-bags') return 'm'
      if (label === 'rebar-stack') return 'm'
      return '?'
    }

    const lines = []
    for (let ry = 0; ry < rows; ry++) {
      let line = ''
      for (let rx = 0; rx < cols; rx++) {
        const x0 = Math.floor((rx * w) / cols)
        const y0 = Math.floor((ry * h) / rows)
        const x1 = Math.max(x0 + 1, Math.floor(((rx + 1) * w) / cols))
        const y1 = Math.max(y0 + 1, Math.floor(((ry + 1) * h) / rows))
        const tally = new Map()
        for (let y = y0; y < y1; y++) {
          for (let x = x0; x < x1; x++) {
            const key = this.ids[y * w + x]
            tally.set(key, (tally.get(key) ?? 0) + 1)
          }
        }
        let best = 'sky'
        let bestCount = -1
        for (const [key, count] of tally) {
          if (key === 'sky') continue
          if (count > bestCount) {
            best = key
            bestCount = count
          }
        }
        // only call it sky if nothing else is present in this cell
        if (bestCount < 0) best = 'sky'
        line += charFor(best)
      }
      lines.push(line)
    }
    return lines.join('\n')
  }

  /**
   * ASCII luminance preview — the sandbox has no image viewer, so silhouettes
   * and proportions are reviewed as text.
   */
  ascii(camera, cols = 108) {
    const w = this.width
    const h = this.height
    const rows = Math.max(8, Math.round((cols * h) / w / 2.1))
    const pixels = this.render(camera)
    const ramp = ' .:-=+*#%@'
    const lines = []
    for (let ry = 0; ry < rows; ry++) {
      let line = ''
      const row = []
      for (let rx = 0; rx < cols; rx++) {
        const x0 = Math.floor((rx * w) / cols)
        const x1 = Math.max(x0 + 1, Math.floor(((rx + 1) * w) / cols))
        const y0 = Math.floor((ry * h) / rows)
        const y1 = Math.max(y0 + 1, Math.floor(((ry + 1) * h) / rows))
        let sum = 0
        let n = 0
        for (let y = y0; y < y1; y++) {
          for (let x = x0; x < x1; x++) {
            const i = (y * w + x) * 3
            sum += 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2]
            n++
          }
        }
        const lum = sum / Math.max(1, n) / 255
        row.push(lum)
      }
      lines.push(row)
    }
    // auto-contrast for legibility
    const flat = lines.flat().sort((a, b) => a - b)
    const lo = flat[Math.floor(flat.length * 0.02)]
    const hi = flat[Math.floor(flat.length * 0.995)]
    return lines
      .map((row) =>
        row
          .map((lum) => {
            const t = Math.min(1, Math.max(0, (lum - lo) / Math.max(1e-4, hi - lo)))
            return ramp[Math.min(ramp.length - 1, Math.round(t * (ramp.length - 1)))]
          })
          .join(''),
      )
      .join('\n')
  }
}
