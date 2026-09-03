/**
 * Geometry toolkit for the procedural GLB generators.
 *
 * The old generator built every asset out of raw boxes/cylinders/spheres,
 * which is exactly why the world read as low-poly. These helpers author the
 * shapes real objects are actually made of:
 *
 *   tube()    tapered, noise-displaced tubes along a spline — trunks, branches,
 *             cables, pipes, railings, rebars
 *   quad()    arbitrary quads with explicit UVs — leaf cards, tarps, plates
 *   extrude() beveled extrusion of a 2D profile — car bodies, kerbs, copings
 *   lathe()   revolved profiles — wheels, water tanks, lamp heads, bollards
 *   strip()   quad strips along a path — fronds, belts, tracks, hoses
 */

import * as THREE from 'three'

/** Deterministic PRNG so every rebuild produces byte-identical assets. */
export function rng(seed) {
  let a = seed >>> 0
  return function random() {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function transform({ x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1 } = {}) {
  const m = new THREE.Matrix4()
  m.compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
    new THREE.Vector3(sx, sy, sz),
  )
  return m
}

/** Parallel-transport frames along a polyline. */
const safeNormalize = (v, fallback) => {
  if (!Number.isFinite(v.x) || !Number.isFinite(v.y) || !Number.isFinite(v.z)) return fallback.clone()
  if (v.lengthSq() < 1e-12) return fallback.clone()
  return v.normalize()
}

function frames(points) {
  const out = []
  let up = new THREE.Vector3(0, 1, 0)
  for (let i = 0; i < points.length; i++) {
    let tangent = new THREE.Vector3()
    if (i === 0) tangent.subVectors(points[1], points[0])
    else if (i === points.length - 1) tangent.subVectors(points[i], points[i - 1])
    else tangent.subVectors(points[i + 1], points[i - 1])
    if (tangent.lengthSq() < 1e-10) tangent.set(0, 1, 0)
    tangent = safeNormalize(tangent, new THREE.Vector3(0, 1, 0))
    let right = new THREE.Vector3().crossVectors(up, tangent)
    if (right.lengthSq() < 1e-8) {
      up = new THREE.Vector3(1, 0, 0)
      right = new THREE.Vector3().crossVectors(up, tangent)
    }
    right = safeNormalize(right, new THREE.Vector3(1, 0, 0))
    const normal = safeNormalize(new THREE.Vector3().crossVectors(tangent, right), new THREE.Vector3(0, 0, 1))
    up = normal.clone()
    out.push({ tangent, right, normal })
  }
  return out
}

/**
 * Tapered tube along a polyline.
 *
 * @param points      Vector3[] centreline
 * @param radius      number | (t:number, i:number) => number
 * @param opts.segments radial segments (6 for twigs, 12 for trunks)
 * @param opts.noise  radial displacement amount (bark irregularity), 0..0.4
 * @param opts.noiseScale frequency of bark detail
 * @param opts.seed
 * @param opts.uvScale  metres per texture tile along the tube
 * @param opts.capEnds
 */
export function tube(points, radius, opts = {}) {
  const segments = opts.segments ?? 8
  const noise = opts.noise ?? 0
  const noiseScale = opts.noiseScale ?? 6
  const seed = opts.seed ?? 1
  const uvScale = opts.uvScale ?? 1
  const random = rng(seed)
  const framesOf = frames(points)
  const positions = []
  const normals = []
  const uvs = []
  const indices = []
  const radiusAt = (t, i) => (typeof radius === 'function' ? radius(t, i) : radius)

  // pre-computed per-ring displacement so the noise is coherent along the tube
  const ringNoise = []
  for (let s = 0; s < segments; s++) ringNoise.push(random() * 2 - 1)

  let lengthSoFar = 0
  for (let i = 0; i < points.length; i++) {
    const p = points[i]
    const { right, normal } = framesOf[i]
    const r = radiusAt(i / Math.max(1, points.length - 1), i)
    if (i > 0) lengthSoFar += points[i].distanceTo(points[i - 1])
    const twist = (opts.twist ?? 0) * (i / Math.max(1, points.length - 1))
    // Bark is fissured *vertically*: the ridges run up the trunk and stay put,
    // which is why a trunk does not read as a lumpy cylinder. The existing
    // `noise` term wanders with the ring index, so it gives bumps; `ridges`
    // adds a coherent angular term that is constant along the length and fades
    // towards the tip, the way bark smooths out on young growth.
    const ridgeAmp = (opts.ridges ?? 0) * (opts.ridgeFade === false ? 1 : 1 - i / Math.max(1, points.length - 1) * 0.55)
    const ridgeCount = opts.ridgeCount ?? 9
    for (let s = 0; s < segments; s++) {
      const a = (s / segments) * Math.PI * 2 + twist
      const ridge =
        ridgeAmp === 0
          ? 0
          : ridgeAmp * (Math.sin(a * ridgeCount) * 0.62 + Math.sin(a * ridgeCount * 2.17 + 1.7) * 0.38)
      const wobble =
        1 +
        noise * (ringNoise[s] * 0.45 + Math.sin(a * 3 + i * 0.9) * 0.28 + Math.sin(a * noiseScale + i * 2.1) * 0.27) +
        ridge
      const rr = Math.max(0.004, r * wobble)
      const nx = Math.cos(a) * right.x + Math.sin(a) * normal.x
      const ny = Math.cos(a) * right.y + Math.sin(a) * normal.y
      const nz = Math.cos(a) * right.z + Math.sin(a) * normal.z
      positions.push(p.x + right.x * Math.cos(a) * rr + normal.x * Math.sin(a) * rr,
        p.y + right.y * Math.cos(a) * rr + normal.y * Math.sin(a) * rr,
        p.z + right.z * Math.cos(a) * rr + normal.z * Math.sin(a) * rr)
      normals.push(nx, ny, nz)
      uvs.push((s / segments) * (opts.uvAround ?? 1), lengthSoFar / uvScale)
    }
  }

  for (let i = 0; i < points.length - 1; i++) {
    for (let s = 0; s < segments; s++) {
      const a = i * segments + s
      const b = i * segments + ((s + 1) % segments)
      const c = (i + 1) * segments + s
      const d = (i + 1) * segments + ((s + 1) % segments)
      indices.push(a, c, b, b, c, d)
    }
  }

  if (opts.capEnds) {
    const last = points.length - 1
    const centreIndex = positions.length / 3
    positions.push(points[last].x, points[last].y, points[last].z)
    const t = framesOf[last].tangent
    normals.push(t.x, t.y, t.z)
    uvs.push(0.5, 0.5)
    for (let s = 0; s < segments; s++) {
      indices.push(centreIndex, last * segments + s, last * segments + ((s + 1) % segments))
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  if (opts.flatShaded) {
    const flat = geometry.toNonIndexed()
    flat.computeVertexNormals()
    return flat
  }
  return geometry
}

/** A single quad (two triangles) with explicit UVs. */
export function quad(a, b, c, d, uv = [0, 0, 1, 0, 1, 1, 0, 1]) {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(
      [a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z, a.x, a.y, a.z, c.x, c.y, c.z, d.x, d.y, d.z],
      3,
    ),
  )
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute([...uv.slice(0, 2), ...uv.slice(2, 4), ...uv.slice(4, 6), ...uv.slice(0, 2), ...uv.slice(4, 6), ...uv.slice(6, 8)], 2))
  geometry.setIndex([0, 1, 2, 3, 4, 5])
  geometry.computeVertexNormals()
  return geometry
}

/** Quad strip along a path, width tapering — fronds, belts, hoses, tracks. */
export function strip(points, width, opts = {}) {
  const framesOf = frames(points)
  const positions = []
  const uvs = []
  const indices = []
  const twistAt = opts.twist ?? (() => 0)
  for (let i = 0; i < points.length; i++) {
    const p = points[i]
    const { right } = framesOf[i]
    const w = (typeof width === 'function' ? width(i / Math.max(1, points.length - 1)) : width) / 2
    const droop = opts.droop ? opts.droop(i / Math.max(1, points.length - 1)) : 0
    const t = twistAt(i / Math.max(1, points.length - 1))
    const dir = right.clone().applyAxisAngle(framesOf[i].tangent, t)
    positions.push(p.x - dir.x * w, p.y - dir.y * w - droop, p.z - dir.z * w)
    positions.push(p.x + dir.x * w, p.y + dir.y * w - droop, p.z + dir.z * w)
    uvs.push(0, i / Math.max(1, points.length - 1))
    uvs.push(1, i / Math.max(1, points.length - 1))
  }
  for (let i = 0; i < points.length - 1; i++) {
    const a = i * 2
    indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

/** Beveled extrusion of a 2D profile (x = along, y = height). */
export function extrude(profile, depth, opts = {}) {
  const shape = new THREE.Shape()
  shape.moveTo(profile[0][0], profile[0][1])
  for (let i = 1; i < profile.length; i++) shape.lineTo(profile[i][0], profile[i][1])
  shape.closePath()
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: opts.bevel !== false,
    bevelThickness: opts.bevelThickness ?? 0.04,
    bevelSize: opts.bevelSize ?? 0.04,
    bevelSegments: opts.bevelSegments ?? 2,
    curveSegments: opts.curveSegments ?? 4,
    steps: opts.steps ?? 1,
  })
  geometry.translate(0, 0, -depth / 2)
  return geometry
}

/** Rounded rectangle extrusion — panels, doors, signs, kerb units. */
export function panel(w, h, d, opts = {}) {
  const radius = Math.min(opts.radius ?? 0.03, Math.min(w, h) / 2.2)
  const shape = new THREE.Shape()
  shape.moveTo(-w / 2 + radius, -h / 2)
  shape.lineTo(w / 2 - radius, -h / 2)
  shape.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + radius)
  shape.lineTo(w / 2, h / 2 - radius)
  shape.quadraticCurveTo(w / 2, h / 2, w / 2 - radius, h / 2)
  shape.lineTo(-w / 2 + radius, h / 2)
  shape.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - radius)
  shape.lineTo(-w / 2, -h / 2 + radius)
  shape.quadraticCurveTo(-w / 2, -h / 2, -w / 2, -h / 2 + radius)
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: d,
    bevelEnabled: opts.bevel !== false,
    bevelThickness: opts.bevelThickness ?? Math.min(0.02, d / 4),
    bevelSize: opts.bevelSize ?? Math.min(0.02, d / 4),
    bevelSegments: 1,
    curveSegments: opts.curveSegments ?? 3,
  })
  geometry.translate(0, 0, -d / 2)
  return geometry
}

/** Surface of revolution — tyres, tanks, lamp heads, bollards, cones. */
export function lathe(profile, segments = 16, opts = {}) {
  const points = profile.map(([x, y]) => new THREE.Vector2(x, y))
  const geometry = new THREE.LatheGeometry(points, segments, opts.phiStart ?? 0, opts.phiLength ?? Math.PI * 2)
  geometry.computeVertexNormals()
  return geometry
}

/* ------------------------------------------------------------------ builder */

export class Builder {
  constructor() {
    this.targets = new Map()
  }

  add(geometry, transformOrName, materialNameOrOpts, maybeOpts) {
    let matrix
    let material
    let opts
    if (typeof transformOrName === 'string') {
      matrix = new THREE.Matrix4()
      material = transformOrName
      opts = materialNameOrOpts ?? {}
    } else {
      matrix = transformOrName instanceof THREE.Matrix4 ? transformOrName : transform(transformOrName ?? {})
      material = materialNameOrOpts
      opts = maybeOpts ?? {}
    }
    const g = geometry.index ? geometry.toNonIndexed() : geometry
    if (g !== geometry) geometry.dispose()
    g.applyMatrix4(matrix)
    if (!opts.uvLock) {
      // world-space texel density: one texture tile every `tileMeters`, so a
      // 0.3 m sill and a 30 m wall get the same surface scale
      if (!g.boundingBox) g.computeBoundingBox()
      const bb = g.boundingBox
      const world = matrix.elements
      const warp =
        (Math.hypot(world[0], world[1], world[2]) + Math.hypot(world[4], world[5], world[6]) + Math.hypot(world[8], world[9], world[10])) / 3
      const scale = bb ? ((bb.max.x - bb.min.x + (bb.max.y - bb.min.y) + (bb.max.z - bb.min.z)) / 3) * warp : 1
      const tile = opts.tileMeters ?? 2.5
      // quantise the tile count to 0.25 steps: keeps texel density consistent
      // while leaving enough duplicate UVs for the welder to collapse them
      const raw = Math.min(12, Math.max(0.35, (scale / tile) * (opts.uvScale ?? 1)))
      const k = process.env.NO_UVK ? 1 : Math.round(raw * 4) / 4
      if (Math.abs(k - 1) > 1e-4) {
        const uv = g.getAttribute('uv')
        if (uv) {
          for (let i = 0; i < uv.count; i++) {
            uv.setXY(i, uv.getX(i) * k, uv.getY(i) * k)
          }
        }
      }
    }
    const pos = g.getAttribute('position')
    const nor = g.getAttribute('normal')
    const uv = g.getAttribute('uv')
    let target = this.targets.get(material)
    if (!target) {
      target = { positions: [], normals: [], uvs: [] }
      this.targets.set(material, target)
    }
    for (let i = 0; i < pos.count - 2; i += 3) {
      // never let a degenerate / NaN triangle into the asset
      let bad = false
      for (let k = 0; k < 3; k++) {
        const x = pos.getX(i + k)
        const y = pos.getY(i + k)
        const z = pos.getZ(i + k)
        if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) bad = true
      }
      if (bad) continue
      for (let k = 0; k < 3; k++) {
        target.positions.push(pos.getX(i + k), pos.getY(i + k), pos.getZ(i + k))
        target.normals.push(nor ? nor.getX(i + k) : 0, nor ? nor.getY(i + k) : 1, nor ? nor.getZ(i + k) : 0)
        if (uv) {
          let u = uv.getX(i + k)
          let v = uv.getY(i + k)
          if (!Number.isFinite(u)) u = 0
          if (!Number.isFinite(v)) v = 0
          // keep UVs inside [0,1] so the quantiser can compress them; every
          // runtime texture repeats, so wrapping is visually identical
          target.uvs.push(u - Math.floor(u), v - Math.floor(v))
        } else target.uvs.push(0, 0)
      }
    }
    g.dispose()
  }

  box(w, h, d, t, material, opts) {
    this.add(new THREE.BoxGeometry(w, h, d), t, material, opts)
  }

  /**
   * Chamfered box. `material` is used for the flats; `opts.edge` overrides the
   * bevel strips and corners, and `opts.materials.{px,nx,py,ny,pz,nz}` gives a
   * different material to individual faces (a concrete slab with a stone
   * topping, say). See `chamferBox` for why the creases are flat-shaded.
   */
  chamfer(w, h, d, t, material, opts = {}) {
    const { materials, edge, ...rest } = opts
    for (const piece of chamferBox(w, h, d, rest)) {
      const mat =
        piece.region === 'face'
          ? materials?.[piece.face] ?? material
          : edge ?? materials?.[piece.face] ?? material
      this.add(piece.geometry, t, mat, rest)
    }
  }

  plane(w, h, t, material, opts) {
    this.add(new THREE.PlaneGeometry(w, h), t, material, opts)
  }

  cylinder(rTop, rBottom, h, segments, t, material, opts) {
    this.add(new THREE.CylinderGeometry(rTop, rBottom, h, segments), t, material, opts)
  }

  sphere(r, t, material, opts, width = 12, height = 8) {
    this.add(new THREE.SphereGeometry(r, width, height), t, material, opts)
  }

  tube(points, radius, t, material, opts) {
    this.add(tube(points, radius, opts), t, material)
  }

  quad(a, b, c, d, uv, t, material, opts) {
    // atlas UVs (leaf cards) must not be rescaled
    this.add(quad(a, b, c, d, uv), t, material, { ...(opts ?? {}), uvLock: true })
  }

  strip(points, width, t, material, opts) {
    this.add(strip(points, width, opts), t, material)
  }

  extrude(profile, depth, t, material, opts) {
    this.add(extrude(profile, depth, opts), t, material, opts)
  }

  panel(w, h, d, t, material, opts) {
    this.add(panel(w, h, d, opts), t, material, opts)
  }

  lathe(profile, segments, t, material, opts) {
    this.add(lathe(profile, segments, opts), t, material, opts)
  }

  /** Geometry factories — used when the caller needs to post-process a shape. */
  makeExtrude(profile, depth, opts) {
    return extrude(profile, depth, opts)
  }

  makePanel(w, h, d, opts) {
    return panel(w, h, d, opts)
  }

  makeLathe(profile, segments, opts) {
    return lathe(profile, segments, opts)
  }

  makeFrame(outerW, outerH, section, depth, opts) {
    return frameRing(outerW, outerH, section, depth, opts)
  }

  frame(outerW, outerH, section, depth, t, material, opts) {
    this.add(frameRing(outerW, outerH, section, depth, opts), t, material, opts)
  }

  makeTube(points, radius, opts) {
    return tube(points, radius, opts)
  }

  makeQuad(a, b, c, d, uv) {
    return quad(a, b, c, d, uv)
  }

  /** Repeat a build function along an axis. */
  repeat(count, fn) {
    for (let i = 0; i < count; i++) fn(i)
  }
}

export const V = (x, y, z) => new THREE.Vector3(x, y, z)

/**
 * Window / door frame: a rectangular ring extruded with a small bevel.
 *
 * Aluminium sections are extrusions and they are *bevelled* — a frame drawn as
 * four flat boxes has no edge for the sun to catch and reads as a printed
 * rectangle on the wall. This gives the section a real 45° arris on both faces
 * for about 60 triangles.
 */
export function frameRing(outerW, outerH, section, depth, opts = {}) {
  const innerW = Math.max(0.01, outerW - section * 2)
  const innerH = Math.max(0.01, outerH - section * 2)
  const shape = new THREE.Shape()
  shape.moveTo(-outerW / 2, -outerH / 2)
  shape.lineTo(outerW / 2, -outerH / 2)
  shape.lineTo(outerW / 2, outerH / 2)
  shape.lineTo(-outerW / 2, outerH / 2)
  shape.closePath()
  const hole = new THREE.Path()
  hole.moveTo(-innerW / 2, -innerH / 2)
  hole.lineTo(-innerW / 2, innerH / 2)
  hole.lineTo(innerW / 2, innerH / 2)
  hole.lineTo(innerW / 2, -innerH / 2)
  hole.closePath()
  shape.holes.push(hole)
  const bevel = Math.max(0, Math.min(opts.bevel ?? 0.008, section / 3))
  // A bevelled section is 64 triangles against 32 for a plain extrusion. That
  // is worth paying on an entrance the camera walks up to and not worth paying
  // on 168 windows twelve storeys up, so the caller decides.
  const useBevel = bevel > 1e-4
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.001, useBevel ? depth - bevel * 2 : depth),
    bevelEnabled: useBevel,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 1,
    curveSegments: 1,
    steps: 1,
  })
  geometry.translate(0, 0, -(useBevel ? depth - bevel * 2 : depth) / 2)
  return geometry
}

/* ------------------------------------------------------- chamfered solids */

/**
 * Chamfered (bevelled) box.
 *
 * A box with a small 45° chamfer on all twelve edges and a cut on all eight
 * corners. This is the primitive the architecture was missing: an axis-aligned
 * box has a mathematically perfect 90° edge, which no cast-concrete or
 * blockwork building has, and which is one of the fastest ways to read a
 * building as CG. The chamfer is not decoration — it gives the edge a second
 * plane at 45° to the wall, so sunlight produces a real highlight-to-shadow
 * transition along every corner instead of a one-pixel aliasing line.
 *
 * Default bevel is 20 mm. It is meant to be *subtle*: at 20 mm on a 3 m floor
 * the chamfer is invisible as a shape and unmistakable as a shading cue.
 *
 * @param opts.bevel      chamfer width in metres (default 0.02)
 * @param opts.profile    'chamfer' (flat 45° strip) | 'round' (fillet)
 * @param opts.segments   subdivisions across the bevel; only meaningful for
 *                        'round', where more segments smooth the fillet. A
 *                        chamfer is planar, so extra segments only add
 *                        collinear vertices and are ignored.
 *
 * @returns pieces: [{ face, region, geometry }]
 *   face   one of px nx py ny pz nz — the box face this piece belongs to
 *   region 'face' (the flat area), 'edge' (a chamfer strip), 'corner'
 *
 * **No piece is emitted twice.** Every edge strip and every corner patch is
 * generated by six face grids, so ownership is resolved by axis index: a strip
 * belongs to the adjacent face with the lowest axis index. Without that rule
 * two coplanar quads land in the same place and z-fight.
 */
export function chamferBox(w, h, d, opts = {}) {
  const half = [w / 2, h / 2, d / 2]
  const bevel = Math.max(0, Math.min(opts.bevel ?? 0.02, Math.min(half[0], half[1], half[2]) - 1e-4))
  const profile = opts.profile ?? 'chamfer'
  const segments = profile === 'chamfer' ? 1 : Math.max(1, Math.round(opts.segments ?? 1))
  const core = half.map((a) => a - bevel)

  /** Sample coordinates along one axis: chamfer band, flat core, chamfer band. */
  const axisCoords = (axis) => {
    const a = half[axis]
    const e = core[axis]
    const out = []
    for (let i = 0; i <= segments; i++) out.push(-a + ((a - e) * i) / segments)
    out.push(e)
    for (let i = 1; i <= segments; i++) out.push(e + ((a - e) * i) / segments)
    return out
  }
  const coords = [axisCoords(0), axisCoords(1), axisCoords(2)]

  /**
   * Chamfer mapping: project a point on the un-chamfered box surface onto the
   * chamfered one. `q` is the same point clamped to the core box; `n` is the
   * part of it that lies in the bevel band. Scaling `n` so its L1 norm equals
   * the bevel puts the point exactly on the 45° cut; normalising it instead
   * puts it on a circular fillet.
   */
  const project = (p) => {
    const q = [0, 0, 0]
    const n = [0, 0, 0]
    for (let i = 0; i < 3; i++) {
      q[i] = Math.max(-core[i], Math.min(core[i], p[i]))
      n[i] = p[i] - q[i]
    }
    const l1 = Math.abs(n[0]) + Math.abs(n[1]) + Math.abs(n[2])
    if (l1 < 1e-9) return p
    if (profile === 'round') {
      const len = Math.hypot(n[0], n[1], n[2])
      return [q[0] + (n[0] / len) * bevel, q[1] + (n[1] / len) * bevel, q[2] + (n[2] / len) * bevel]
    }
    const s = bevel / l1
    return [q[0] + n[0] * s, q[1] + n[1] * s, q[2] + n[2] * s]
  }

  const FACE_NAME = ['px', 'nx', 'py', 'ny', 'pz', 'nz']
  const pieces = []
  const push = (face, region, tris) => {
    const positions = []
    const normals = []
    const uvs = []
    for (const tri of tris) {
      const [a, b, c] = tri
      const ux = b[0] - a[0]
      const uy = b[1] - a[1]
      const uz = b[2] - a[2]
      const vx = c[0] - a[0]
      const vy = c[1] - a[1]
      const vz = c[2] - a[2]
      let nx = uy * vz - uz * vy
      let ny = uz * vx - ux * vz
      let nz = ux * vy - uy * vx
      const len = Math.hypot(nx, ny, nz)
      if (len < 1e-12) continue
      nx /= len
      ny /= len
      nz /= len
      // every piece is flat-shaded: a chamfer is two planes meeting at a
      // crease, and smoothing across that crease is what makes a bevelled box
      // look like a rounded one
      for (const p of [a, b, c]) {
        positions.push(p[0], p[1], p[2])
        normals.push(nx, ny, nz)
      }
      uvs.push(0, 0, 1, 0, 1, 1)
    }
    if (!positions.length) return
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    pieces.push({ face, region, geometry })
  }

  for (let a = 0; a < 3; a++) {
    const u = a === 0 ? 1 : 0
    const v = a === 0 ? 2 : a === 1 ? 2 : 1
    for (const sign of [1, -1]) {
      const face = FACE_NAME[a * 2 + (sign > 0 ? 0 : 1)]
      const buckets = { face: [], edge: [], corner: [] }
      const cu = coords[u]
      const cv = coords[v]
      for (let i = 0; i < cu.length - 1; i++) {
        for (let j = 0; j < cv.length - 1; j++) {
          const mu = (cu[i] + cu[i + 1]) / 2
          const mv = (cv[j] + cv[j + 1]) / 2
          const outU = Math.abs(mu) > core[u] + 1e-9
          const outV = Math.abs(mv) > core[v] + 1e-9
          if (!outU && !outV) {
            // the flat area of this face — always owned by this face
          } else {
            // owned by the adjacent face with the lowest axis index
            if ((outU && u < a) || (outV && v < a)) continue
          }
          const region = outU && outV ? 'corner' : outU || outV ? 'edge' : 'face'
          const at = (uu, vv) => {
            const p = [0, 0, 0]
            p[a] = sign * half[a]
            p[u] = uu
            p[v] = vv
            return project(p)
          }
          const p00 = at(cu[i], cv[j])
          const p10 = at(cu[i + 1], cv[j])
          const p11 = at(cu[i + 1], cv[j + 1])
          const p01 = at(cu[i], cv[j + 1])
          buckets[region].push([p00, p10, p11], [p00, p11, p01])
        }
      }
      for (const region of ['face', 'edge', 'corner']) {
        if (buckets[region].length) push(face, region, buckets[region])
      }
    }
  }
  return pieces
}
