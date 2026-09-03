/**
 * Tree system.
 *
 * A real tree is a recursive, irregular structure: a tapered trunk with root
 * flare and bark displacement, branches that fork unevenly with their own
 * gravity/phototropism bias, a few dead twigs, and leaf clusters made of
 * individual alpha-masked leaf cards — never smooth blobs.
 *
 * Every tree is generated from a species descriptor and a seed, so the world
 * gets genuine variety instead of one model repeated forty times.
 */

import * as THREE from 'three'
import { V, rng, tube } from './geo.mjs'

export const SPECIES = {
  /** Neem / mango type — broad spreading crown, medium height. */
  a: {
    height: 9.4,
    trunkRadius: 0.24,
    trunkCurve: 0.1,
    lean: 0.05,
    firstBranch: 0.2,
    levels: 4,
    children: [3, 3, 3, 3],
    lengthRatio: [0.74, 0.78, 0.8, 0.76],
    spread: [0.98, 1.0, 1.02, 1.04],
    upBias: [0.24, 0.14, 0.06, 0.0],
    droop: [0.02, 0.08, 0.16, 0.24],
    radiusPower: 2.3,
    leafSize: 0.58,
    leavesPerCluster: 8,
    clusterStep: 0.8,
    deadBranches: 2,
    canopyDepth: 3,
  },
  /** Eucalyptus / ashok type — tall, slim, upright crown. */
  b: {
    height: 13.2,
    trunkRadius: 0.2,
    trunkCurve: 0.06,
    lean: 0.035,
    firstBranch: 0.38,
    levels: 4,
    children: [2, 2, 3, 2],
    lengthRatio: [0.62, 0.7, 0.74, 0.74],
    spread: [0.56, 0.64, 0.76, 0.9],
    upBias: [0.5, 0.4, 0.26, 0.12],
    droop: [0.02, 0.08, 0.18, 0.3],
    radiusPower: 2.4,
    leafSize: 0.5,
    leavesPerCluster: 7,
    clusterStep: 0.78,
    deadBranches: 3,
    canopyDepth: 3,
  },
  /** Rain tree / gulmohar type — wide, flat topped, low forks. */
  c: {
    height: 7.6,
    trunkRadius: 0.27,
    trunkCurve: 0.14,
    lean: 0.07,
    firstBranch: 0.18,
    levels: 4,
    children: [3, 3, 3, 2],
    lengthRatio: [0.78, 0.78, 0.76, 0.72],
    spread: [1.05, 1.0, 0.95, 0.92],
    upBias: [0.16, 0.08, 0.03, 0.0],
    droop: [0.08, 0.16, 0.24, 0.32],
    radiusPower: 2.1,
    leafSize: 0.56,
    leavesPerCluster: 8,
    clusterStep: 0.72,
    deadBranches: 2,
    canopyDepth: 2,
  },
  /**
   * Mature roadside specimen — tamarind / banyan character. The oldest and
   * thickest tree in the set: a short bole that forks low into a few heavy
   * limbs, a crown wider than it is tall, and weeping outer growth. It exists
   * because four species instanced across a site still leaves the eye pairing
   * them up, and a fifth with a genuinely different mass breaks that.
   */
  e: {
    height: 10.2,
    trunkRadius: 0.42,
    trunkCurve: 0.17,
    lean: 0.09,
    firstBranch: 0.24,
    levels: 4,
    children: [3, 3, 3, 3],
    // Branch length is what sets the crown's final width, and it compounds
    // over four orders: the first numbers below put this tree at 40 m across,
    // wider than the building it stands beside. Shortened until the grown
    // crown lands near 20 m.
    lengthRatio: [0.66, 0.64, 0.6, 0.56],
    spread: [0.98, 1.0, 0.96, 0.9],
    upBias: [0.2, 0.1, 0.02, -0.04],
    droop: [0.06, 0.16, 0.28, 0.4],
    radiusPower: 2.0,
    leafSize: 0.52,
    leavesPerCluster: 9,
    clusterStep: 0.86,
    deadBranches: 3,
    canopyDepth: 3,
    barkRidges: 0.22,
    ridgeCount: 13,
  },
  /** Small ornamental / karanj — compact dense crown, used near buildings. */
  d: {
    height: 4.8,
    trunkRadius: 0.13,
    trunkCurve: 0.12,
    lean: 0.06,
    firstBranch: 0.3,
    levels: 3,
    children: [3, 3, 2],
    lengthRatio: [0.7, 0.74, 0.72],
    spread: [0.86, 0.94, 0.98],
    upBias: [0.28, 0.16, 0.05],
    droop: [0.02, 0.1, 0.2],
    radiusPower: 2.2,
    leafSize: 0.46,
    leavesPerCluster: 7,
    clusterStep: 0.8,
    deadBranches: 1,
    canopyDepth: 2,
  },
}

const GOLDEN = 2.399963

function orthonormal(dir) {
  const safe = Number.isFinite(dir.x) && Number.isFinite(dir.y) && Number.isFinite(dir.z) && dir.lengthSq() > 1e-9 ? dir : V(0, 1, 0)
  dir = safe
  const up = Math.abs(dir.y) > 0.9 ? V(1, 0, 0) : V(0, 1, 0)
  const right = new THREE.Vector3().crossVectors(up, dir).normalize()
  const forward = new THREE.Vector3().crossVectors(dir, right).normalize()
  return { right, forward }
}

/** Random unit vector at `angle` radians away from `dir`. */
function coneVector(dir, angle, azimuth, random) {
  if (!Number.isFinite(dir.x) || !Number.isFinite(dir.y) || !Number.isFinite(dir.z) || dir.lengthSq() < 1e-9) dir = V(0, 1, 0)
  const { right, forward } = orthonormal(dir)
  const a = azimuth + (random() - 0.5) * 0.7
  const spread = angle * (0.72 + random() * 0.56)
  return dir
    .clone()
    .addScaledVector(right, Math.sin(spread) * Math.cos(a))
    .addScaledVector(forward, Math.sin(spread) * Math.sin(a))
    .normalize()
}

/**
 * @param b        Builder
 * @param options  { species, seed, groundOffset }
 */
export function buildTree(b, options = {}) {
  const species = SPECIES[options.species ?? 'a']
  const seed = options.seed ?? 7
  const random = rng(seed)
  const leafMaterial = options.leafMaterial ?? 'leaf'
  const barkMaterial = options.barkMaterial ?? 'wood'
  const height = species.height * (options.heightScale ?? 1)
  const trunkRadius = species.trunkRadius * (options.heightScale ?? 1)

  /**
   * 0 — hero / close: every leaf is a three-bladed cluster, so the crown has
   *     volume and never reads as a flat card.
   * 1 — medium: single cupped cards (the working horse of the tree line).
   * 2 — distant: fewer, larger blades and a leaner branch skeleton; the
   *     silhouette is what matters at that range.
   */
  const lod = options.lod ?? 1
  const blades = lod === 0 ? 3 : 1
  // folded blades at the two levels the camera can actually inspect; the far
  // level stays a flat card because at 150 m a crease is invisible
  const folded = lod !== 2
  const leafScale = lod === 2 ? 1.32 : lod === 0 ? 0.94 : 1
  const leafDensity = lod === 0 ? 0.55 : lod === 2 ? 0.55 : 1
  const maxLeaves = options.maxLeaves ?? (lod === 0 ? 700 : lod === 2 ? 340 : 1100)
  // radial tube detail only. The number of samples along a branch is part of
  // the growth walk, so changing it between LODs would give each level a
  // different skeleton — and trees would visibly change shape as you move.
  const branchDetail = lod === 0 ? 2 : lod === 2 ? -2 : 0

  /* --------------------------------------------------------------- trunk */
  const leanDir = random() * Math.PI * 2
  const trunkSamples = 11
  const trunkPoints = []
  for (let i = 0; i < trunkSamples; i++) {
    const t = i / (trunkSamples - 1)
    const y = t * height * 0.82
    const sway =
      Math.sin(t * 2.1 + seed) * species.trunkCurve +
      Math.sin(t * 4.7 + seed * 1.7) * species.trunkCurve * 0.35
    trunkPoints.push(
      V(
        Math.cos(leanDir) * sway * height * 0.06 + Math.sin(t * 3.1) * species.lean * height * 0.16,
        y,
        Math.sin(leanDir) * sway * height * 0.06 + Math.cos(t * 2.3) * species.lean * height * 0.16,
      ),
    )
  }

  const trunkRadiusAt = (t) => {
    const flare = t < 0.06 ? 1 + (0.06 - t) * 8 : 1
    return trunkRadius * (1 - t * 0.62) * flare * (1 + Math.sin(t * 9 + seed) * 0.04)
  }

  b.tube(trunkPoints, trunkRadiusAt, {}, barkMaterial, {
    segments: Math.max(5, 10 + branchDetail * 2),
    noise: 0.09,
    noiseScale: 9,
    // vertical bark fissures, 11 around a mature trunk, strongest at the base
    ridges: species.barkRidges ?? 0.16,
    ridgeCount: species.ridgeCount ?? 11,
    seed: seed * 3 + 1,
    uvScale: 1.2,
    twist: 0.5,
    capEnds: true,
  })

  /* ------------------------------------------------------- root buttresses */
  const roots = 4 + Math.floor(random() * 3)
  for (let i = 0; i < roots; i++) {
    const a = (i / roots) * Math.PI * 2 + random() * 0.6
    const reach = trunkRadius * (2.4 + random() * 2.2)
    const points = [
      V(Math.cos(a) * reach, 0.015, Math.sin(a) * reach),
      V(Math.cos(a) * reach * 0.55, 0.05 + random() * 0.04, Math.sin(a) * reach * 0.55),
      V(Math.cos(a) * trunkRadius * 0.5, 0.26 + random() * 0.14, Math.sin(a) * trunkRadius * 0.5),
      V(0, height * 0.055, 0),
    ]
    b.tube(points, (t) => trunkRadius * (0.16 + 0.34 * t) * (1 - t * 0.2), {}, barkMaterial, {
      segments: 6,
      noise: 0.16,
      noiseScale: 7,
      seed: seed * 11 + i,
      uvScale: 0.8,
    })
  }

  /* ----------------------------------------------------------- branches */
  const tips = []
  const leafPoints = []

  const grow = (start, dir, length, radius, depth, azimuth) => {
    const samples = depth === 0 ? 6 : depth === 1 ? 5 : depth === 2 ? 4 : 3
    const points = []
    const current = start.clone()
    const direction = dir.clone()
    const droopStrength = species.droop[Math.min(depth, species.droop.length - 1)]
    const upBias = species.upBias[Math.min(depth, species.upBias.length - 1)]

    for (let i = 0; i < samples; i++) {
      points.push(current.clone())
      // gravity pulls tips down, phototropism pulls the base up
      direction.y += upBias * 0.16 - droopStrength * 0.22 * (i / samples)
      // wander
      direction.x += (random() - 0.5) * 0.24
      direction.z += (random() - 0.5) * 0.24
      direction.normalize()
      current.addScaledVector(direction, length / samples)
    }

    const radiusAt = (t) => radius * (1 - t * 0.72) * (1 + Math.sin(t * 7 + depth) * 0.05)
    b.tube(points, radiusAt, {}, barkMaterial, {
      segments: Math.max(3, (depth === 0 ? 8 : depth === 1 ? 6 : depth === 2 ? 5 : 4) + branchDetail),
      noise: 0.14,
      noiseScale: 6 + depth * 3,
      seed: seed * 31 + depth * 97 + points.length,
      uvScale: 0.9,
    })

    const endPoint = points[points.length - 1]
    const endDir = direction.clone()

    if (depth >= species.levels - 1) {
      tips.push({ point: endPoint, dir: endDir, radius: radius * 0.3 })
      // leaves also grow along the last two branch orders
      for (let s = 1; s < points.length; s++) {
        leafPoints.push({ point: points[s], dir: endDir.clone(), scale: 0.82 })
      }
      return
    }

    const childCount = species.children[Math.min(depth, species.children.length - 1)]
    const count = Math.max(1, childCount - (random() < 0.22 ? 1 : 0) + (random() < 0.14 ? 1 : 0))
    const spread = species.spread[Math.min(depth, species.spread.length - 1)]
    const ratio = species.lengthRatio[Math.min(depth, species.lengthRatio.length - 1)]
    const childRadius = radius * Math.pow(1 / count, 1 / species.radiusPower) * 0.96

    for (let i = 0; i < count; i++) {
      const childAzimuth = azimuth + GOLDEN * (i + 1) + (random() - 0.5) * 0.9
      const childDir = coneVector(endDir, spread, childAzimuth, random)
      const childLength = length * ratio * (0.78 + random() * 0.44)
      // occasionally drop a branch — real trees are not perfectly balanced
      if (depth > 0 && random() < 0.07) continue
      grow(endPoint.clone(), childDir, childLength, childRadius, depth + 1, childAzimuth)
    }

    // a lateral twig off the middle of this branch
    if (depth >= 1 && random() < 0.55) {
      const mid = points[Math.floor(points.length * (0.4 + random() * 0.3))]
      const twigDir = coneVector(direction.clone(), 0.9, random() * Math.PI * 2, random)
      grow(mid.clone(), twigDir, length * 0.34, radius * 0.42, Math.min(depth + 2, species.levels - 1), random() * 6.28)
    }

    if (depth >= species.levels - species.canopyDepth) {
      for (let s = 2; s < points.length; s++) {
        if (random() < species.clusterStep) leafPoints.push({ point: points[s], dir: direction.clone(), scale: 0.7 })
      }
    }
  }

  const trunkTop = trunkPoints[trunkPoints.length - 1]
  const firstBranchIndex = Math.max(1, Math.floor(trunkSamples * species.firstBranch))
  const mainForks = species.children[0]
  for (let i = 0; i < mainForks; i++) {
    const base = trunkPoints[firstBranchIndex + i].clone()
    const dir = coneVector(
      V(trunkPoints[firstBranchIndex + i + 1]).sub(base).normalize(),
      species.spread[0],
      GOLDEN * (i + 1) + random() * 0.5,
      random,
    )
    const length = height * species.lengthRatio[0] * (0.85 + random() * 0.35)
    /**
     * Branch collar. Where a limb leaves a trunk the wood swells — a branch
     * simply intersecting a cylinder reads as two tubes pushed together, and
     * the joint is the first thing you look at on a bare winter tree.
     */
    const collarR = trunkRadius * 0.46
    b.tube(
      [base.clone().addScaledVector(dir, -collarR * 0.6), base.clone().addScaledVector(dir, collarR * 1.1)],
      (t) => collarR * (1.25 - Math.abs(t - 0.35) * 0.9),
      {},
      barkMaterial,
      { segments: 6, noise: 0.2, noiseScale: 6, seed: seed * 13 + i, uvScale: 0.7 },
    )
    grow(base, dir, length, trunkRadius * 0.62, 0, GOLDEN * i)
  }

  // the leader continues above the first fork
  const leaderStart = trunkPoints[firstBranchIndex].clone()
  grow(leaderStart, V(0, 1, 0).add(V(Math.sin(seed) * 0.16, 0, Math.cos(seed) * 0.16)).normalize(), height * 0.4, trunkRadius * 0.5, 0, seed)

  /* ------------------------------------------------------ dead branches */
  for (let i = 0; i < species.deadBranches; i++) {
    const t = 0.3 + random() * 0.45
    const index = Math.min(trunkSamples - 2, Math.floor(trunkSamples * t))
    const base = trunkPoints[index].clone()
    const dir = coneVector(V(0, 1, 0), 1.1 + random() * 0.4, random() * Math.PI * 2, random)
    const length = height * (0.12 + random() * 0.14)
    const points = []
    const cursor = base.clone()
    const d = dir.clone()
    for (let s = 0; s < 4; s++) {
      points.push(cursor.clone())
      d.y -= 0.12
      d.normalize()
      cursor.addScaledVector(d, length / 4)
    }
    b.tube(points, (tt) => trunkRadius * 0.3 * (1 - tt * 0.85), {}, barkMaterial, {
      segments: 4,
      noise: 0.22,
      noiseScale: 5,
      seed: seed * 51 + i,
      uvScale: 0.7,
    })
  }

  /* -------------------------------------------------------------- leaves */
  const leaves = []
  // leaves grow on the outside of the crown, so cards face roughly outwards
  const crownCentre = V(0, height * 0.62, 0)
  let clusterIndex = 0
  const pushCluster = (point, dir, scale) => {
    clusterIndex++
    const count = Math.max(2, Math.round(species.leavesPerCluster * (0.7 + random() * 0.7) * scale * leafDensity))
    const clusterOffset = new THREE.Vector3(
      (random() - 0.5) * species.leafSize * 2.2,
      (random() - 0.5) * species.leafSize * 1.6,
      (random() - 0.5) * species.leafSize * 2.2,
    )
    const centre = point.clone().add(clusterOffset)

    // A shoot for the cluster to hang on. Foliage cards floating in mid-air is
    // one of the strongest tells there is: real leaves grow on twigs. Only the
    // close level pays for them, and only where the shoot is long enough to see.
    if (lod === 0 && clusterOffset.length() > species.leafSize * 0.35 && clusterIndex % 2 === 0) {
      const length = clusterOffset.length()
      const mid = point.clone().addScaledVector(clusterOffset, 0.55).add(V(0, -length * 0.12, 0))
      b.tube(
        [point.clone(), mid, centre.clone()],
        (t) => Math.max(0.006, trunkRadius * 0.09 * (1 - t * 0.55)),
        {},
        barkMaterial,
        { segments: 3, noise: 0.18, noiseScale: 8, seed: seed * 71 + clusterIndex, uvScale: 0.6 },
      )
    }

    for (let i = 0; i < count; i++) {
      // wide size spread: many small clusters and a few big ones, never a
      // field of identical blobs
      const size = species.leafSize * leafScale * (0.42 + random() * 0.95)
      const delta = point.clone().sub(crownCentre)
      const outward = delta.lengthSq() < 1e-6 ? V(0, 1, 0) : delta.normalize()
      const axis = outward
        .clone()
        .add(new THREE.Vector3(random() * 2 - 1, random() * 2 - 1, random() * 2 - 1).multiplyScalar(0.85))
        .normalize()
      const { right, forward } = orthonormal(axis)
      const spin = random() * Math.PI * 2
      const u = right.clone().multiplyScalar(Math.cos(spin)).addScaledVector(forward, Math.sin(spin))
      const v = new THREE.Vector3().crossVectors(axis, u)
      const offset = new THREE.Vector3(
        (random() - 0.5) * species.leafSize * 1.5,
        (random() - 0.5) * species.leafSize * 1.2,
        (random() - 0.5) * species.leafSize * 1.5,
      )
      const c = centre.clone().add(offset)
      const quad = i % 4 // atlas quadrant — four different leaf clusters
      const u0 = (quad % 2) * 0.5
      const v0 = Math.floor(quad / 2) * 0.5
      leaves.push({ c, u: u.clone().multiplyScalar(size * 0.5), v: v.clone().multiplyScalar(size), quad: [u0, v0] })
    }
  }

  /**
   * Crown asymmetry. A crown built by a symmetric rule is a sphere with
   * leaves on it. Real crowns lean away from the prevailing wind or towards a
   * gap in the canopy, so one side is thinner than the other; the sparse side
   * is chosen per tree from the seed and costs nothing.
   */
  const sparseDir = V(Math.cos(seed * 2.3), (random() - 0.5) * 0.5, Math.sin(seed * 2.3)).normalize()
  const sparseAmount = 0.34 + random() * 0.3

  for (const tip of tips) pushCluster(tip.point, tip.dir, 1)
  const leafBudget = options.leafBudget ?? 1
  for (const lp of leafPoints) {
    const lean = lp.point.clone().sub(crownCentre).normalize().dot(sparseDir)
    const thin = 1 - Math.max(0, lean) * sparseAmount
    if (random() < species.clusterStep * leafBudget * thin) pushCluster(lp.point, lp.dir, lp.scale)
  }

  /**
   * Epicormic shoots. A few twigs growing straight out of the lower trunk is
   * one of the cheapest signs that a tree is a living thing rather than a
   * model: they appear where the tree has been damaged or suddenly given light.
   */
  if (lod !== 2) {
    const shoots = 2 + Math.floor(random() * 3)
    for (let i = 0; i < shoots; i++) {
      const t = 0.18 + random() * 0.3
      const base = trunkPoints[Math.min(trunkSamples - 2, Math.floor(trunkSamples * t))].clone()
      const a = random() * Math.PI * 2
      const out = 0.18 + random() * 0.26
      const tip = base.clone().add(V(Math.cos(a) * out, 0.16 + random() * 0.3, Math.sin(a) * out))
      b.tube(
        [base, base.clone().lerp(tip, 0.6).add(V(0, 0.04, 0)), tip],
        (tt) => Math.max(0.007, trunkRadius * 0.11 * (1 - tt * 0.6)),
        {},
        barkMaterial,
        { segments: 4, noise: 0.22, noiseScale: 6, seed: seed * 91 + i, uvScale: 0.5 },
      )
      pushCluster(tip, V(Math.cos(a), 0.3, Math.sin(a)).normalize(), 0.55)
    }
  }
  // Hard cap so a dense species cannot blow the triangle budget. Leaves are
  // dropped on a stride, not at random: the list is in branch-walk order, so a
  // stride thins every part of the crown evenly and keeps the silhouette (and
  // therefore the bounding box) the same across LODs. Random removal eats the
  // outer clusters first and the tree shrinks every time its LOD changes.
  if (leaves.length > maxLeaves) {
    const stride = Math.ceil(leaves.length / maxLeaves)
    const kept = []
    for (let i = 0; i < leaves.length; i += stride) kept.push(leaves[i])
    leaves.length = 0
    leaves.push(...kept)
  }

  // Crown radius, so a leaf knows whether it is in the shaded interior or out
  // in the sun. Real crowns are two-tone: dark and desaturated inside, bright
  // and yellow-green where the light gets in.
  let crownRadius = 1
  for (const leaf of leaves) crownRadius = Math.max(crownRadius, leaf.c.distanceTo(crownCentre))
  const deepLeaf = `${leafMaterial}Deep`

  for (const leaf of leaves) {
    const { c, u, v } = leaf
    const [u0, v0] = leaf.quad
    const n = new THREE.Vector3().crossVectors(u, v).normalize()
    const depth = Math.min(1, c.distanceTo(crownCentre) / crownRadius)
    const material = depth < 0.52 ? deepLeaf : leafMaterial
    const uLen = u.length() || 1
    const vLen = v.length() || 1
    const uh = u.clone().multiplyScalar(1 / uLen)
    const vh = v.clone().multiplyScalar(1 / vLen)
    // fold along the midrib and a slight twist: a leaf is not a plane, and a
    // plane that only ever catches one light direction is what gives foliage
    // away. Two creases turn a billboard into a surface.
    // curvature varies leaf to leaf: some nearly flat, some tightly cupped,
    // otherwise the crown is a field of identical stamped shapes
    const foldDepth = vLen * (0.34 + random() * 0.42)
    const twist = (random() * 0.62 + 0.16) * (random() < 0.5 ? -1 : 1)

    const emit = (spin, along) => {
      const cos = Math.cos(spin)
      const sin = Math.sin(spin)
      const ru = uh
        .clone()
        .multiplyScalar(cos)
        .addScaledVector(vh, sin)
        .multiplyScalar(uLen)
      const rv = uh.clone().multiplyScalar(-sin).addScaledVector(vh, cos).multiplyScalar(vLen)
      const centre = c.clone().addScaledVector(n, along)

      // three rows along the blade: base, middle, tip
      const row = (t) => {
        const theta = twist * t
        const rc = rv.clone().multiplyScalar(Math.cos(theta)).addScaledVector(n, vLen * Math.sin(theta))
        const off = foldDepth * (t * t - 0.33)
        const at = centre.clone().addScaledVector(ru, t).addScaledVector(n, off)
        return {
          left: at.clone().addScaledVector(rc, -0.5),
          right: at.clone().addScaledVector(rc, 0.5),
        }
      }

      if (folded) {
        const r0 = row(-1)
        const r1 = row(0)
        const r2 = row(1)
        const vMid = v0 + 0.25
        const vEnd = v0 + 0.5
        b.quad(
          r0.left,
          r0.right,
          r1.right,
          r1.left,
          [u0, v0, u0 + 0.5, v0, u0 + 0.5, vMid, u0, vMid],
          {},
          material,
        )
        b.quad(
          r1.left,
          r1.right,
          r2.right,
          r2.left,
          [u0, vMid, u0 + 0.5, vMid, u0 + 0.5, vEnd, u0, vEnd],
          {},
          material,
        )
        return
      }

      const bend = n.clone().multiplyScalar(centre.length() * 0.0004)
      const a = centre.clone().addScaledVector(ru, -1).addScaledVector(rv, -0.5)
      const bb = centre.clone().addScaledVector(ru, 1).addScaledVector(rv, -0.5)
      const cc = centre.clone().addScaledVector(ru, 1).addScaledVector(rv, 0.5).add(bend)
      const dd = centre.clone().addScaledVector(ru, -1).addScaledVector(rv, 0.5).add(bend)
      b.quad(a, bb, cc, dd, [u0, v0, u0 + 0.5, v0, u0 + 0.5, v0 + 0.5, u0, v0 + 0.5], {}, material)
    }

    if (blades === 1) {
      emit(0, 0)
      continue
    }
    // three blades at 120°, staggered along the axis: from any viewing angle
    // at least two are edge-on, which is what makes the cluster read as a
    // volume instead of a rectangle
    const spread = species.leafSize * 0.42
    emit(0, 0)
    emit(2.094, spread)
    emit(4.188, -spread * 0.7)
  }

  return { leafCount: leaves.length }
}

/** Multi-stem shrub — used for understorey and compound planting. */
export function buildShrub(b, options = {}) {
  const seed = options.seed ?? 3
  const random = rng(seed)
  const height = options.height ?? 1.35
  const spread = options.spread ?? 1.5
  const stems = 5 + Math.floor(random() * 4)
  const leafPoints = []

  for (let i = 0; i < stems; i++) {
    const a = (i / stems) * Math.PI * 2 + random() * 0.8
    const tilt = 0.35 + random() * 0.55
    const h = height * (0.6 + random() * 0.6)
    const points = [
      V(Math.cos(a) * 0.06, 0.02, Math.sin(a) * 0.06),
      V(Math.cos(a) * spread * 0.22, h * 0.35, Math.sin(a) * spread * 0.22),
      V(Math.cos(a) * spread * 0.42 * tilt, h * 0.7, Math.sin(a) * spread * 0.42 * tilt),
      V(Math.cos(a) * spread * 0.5 * tilt, h, Math.sin(a) * spread * 0.5 * tilt),
    ]
    b.tube(points, (t) => 0.035 * (1 - t * 0.7), {}, 'wood', {
      segments: 5,
      noise: 0.2,
      noiseScale: 6,
      seed: seed * 13 + i,
      uvScale: 0.6,
    })
    for (let s = 1; s <= 3; s++) {
      const t = s / 3
      if (random() < 0.8) {
        leafPoints.push({
          point: new THREE.Vector3().lerpVectors(points[s - 1], points[s], random()),
          scale: 0.8 + random() * 0.5,
        })
      }
    }
  }

  const leafMaterial = options.leafMaterial ?? 'leaf'
  for (const lp of leafPoints) {
    const clusters = 2 + Math.floor(random() * 3)
    for (let c = 0; c < clusters; c++) {
      const size = 0.2 * (0.7 + random() * 0.6) * lp.scale
      const centre = lp.point.clone().add(
        new THREE.Vector3((random() - 0.5) * 0.4, (random() - 0.3) * 0.3, (random() - 0.5) * 0.4),
      )
      for (let i = 0; i < 3; i++) {
        const axis = new THREE.Vector3(random() * 2 - 1, random() * 2 - 1, random() * 2 - 1).normalize()
        const { right, forward } = orthonormal(axis)
        const spin = random() * Math.PI * 2
        const u = right.clone().multiplyScalar(Math.cos(spin)).addScaledVector(forward, Math.sin(spin))
        const v = new THREE.Vector3().crossVectors(axis, u)
        const quad = Math.floor(random() * 4)
        const u0 = (quad % 2) * 0.5
        const v0 = Math.floor(quad / 2) * 0.5
        const s = size * (0.7 + random() * 0.6)
        b.quad(
          centre.clone().addScaledVector(u, -s * 0.5).addScaledVector(v, -s * 0.5),
          centre.clone().addScaledVector(u, s * 0.5).addScaledVector(v, -s * 0.5),
          centre.clone().addScaledVector(u, s * 0.5).addScaledVector(v, s * 0.5),
          centre.clone().addScaledVector(u, -s * 0.5).addScaledVector(v, s * 0.5),
          [u0, v0, u0 + 0.5, v0, u0 + 0.5, v0 + 0.5, u0, v0 + 0.5],
          {},
          leafMaterial,
        )
      }
    }
  }
}
