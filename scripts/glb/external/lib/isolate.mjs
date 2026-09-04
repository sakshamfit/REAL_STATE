/**
 * Showcase-scene isolation.
 *
 * Downloaded assets are very often not a single object. They are a *presentation*
 * of an object: the model plus a backdrop plane, plus a studio camera, plus a
 * light rig, and frequently two or three copies of the same mesh laid out side
 * by side to compare material variants.
 *
 * Dropped into a world unchanged, that produces exactly the failures the brief
 * forbids — a grey disc floating under a traffic cone, or a "lamp post" whose
 * bounding box is 15 m wide because the shade was parked next to the column.
 *
 * This module reduces such a file to the one object the developer meant, using
 * only what is in the geometry:
 *
 *   1. cameras and punctual lights are never part of a prop
 *   2. a large, flat, low mesh under everything else is a backdrop, not ground
 *   3. when the remaining meshes form separated clusters of similar size, the
 *      file is a comparison layout — keep one cluster
 *
 * Each step is conservative and reports what it did, so an asset that really is
 * a multi-part object (a lamp post with a separate lantern head and chain) is
 * left intact.
 */

import { getBounds } from '@gltf-transform/functions'

/** World-space AABB of a single node and its descendants. */
function nodeBounds(node) {
  const bounds = getBounds({ listChildren: () => [node], propertyType: 'Scene' })
  if (!bounds || bounds.min.some((v) => !Number.isFinite(v))) return null
  return {
    min: bounds.min.slice(),
    max: bounds.max.slice(),
    size: [bounds.max[0] - bounds.min[0], bounds.max[1] - bounds.min[1], bounds.max[2] - bounds.min[2]],
    center: [
      (bounds.max[0] + bounds.min[0]) / 2,
      (bounds.max[1] + bounds.min[1]) / 2,
      (bounds.max[2] + bounds.min[2]) / 2,
    ],
  }
}

/** Every node in the scene that carries a mesh, with its measured box. */
function meshNodes(scene) {
  const out = []
  const walk = (node) => {
    const mesh = node.getMesh()
    if (mesh) {
      const bounds = nodeBounds(node)
      if (bounds) {
        let triangles = 0
        for (const prim of mesh.listPrimitives()) {
          const indices = prim.getIndices()
          const position = prim.getAttribute('POSITION')
          triangles += indices ? indices.getCount() / 3 : (position?.getCount() ?? 0) / 3
        }
        out.push({ node, bounds, triangles: Math.round(triangles) })
      }
    }
    for (const child of node.listChildren()) walk(child)
  }
  for (const child of scene.listChildren()) walk(child)
  return out
}

/**
 * Strip cameras and punctual lights.
 *
 * The scene has its own camera path and its own sun; an asset's studio rig can
 * only fight them.
 */
function stripRig(doc) {
  let removed = 0
  for (const node of doc.getRoot().listNodes()) {
    if (node.getCamera()) {
      node.setCamera(null)
      removed += 1
    }
    const light = node.getExtension('KHR_lights_punctual')
    if (light) {
      node.setExtension('KHR_lights_punctual', null)
      removed += 1
    }
  }
  for (const camera of doc.getRoot().listCameras()) camera.dispose()
  return removed
}

/**
 * Remove a backdrop / display plane.
 *
 * A backdrop is flat (near-zero thickness on one axis), large relative to the
 * rest of the scene, and sits at or below everything else. The project supplies
 * its own terrain, so any ground the asset brought with it is redundant at best
 * and z-fights at worst.
 */
function stripBackdrop(candidates) {
  if (candidates.length < 2) return []

  const total = candidates.reduce(
    (acc, item) => ({
      min: acc.min.map((v, i) => Math.min(v, item.bounds.min[i])),
      max: acc.max.map((v, i) => Math.max(v, item.bounds.max[i])),
    }),
    { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] },
  )

  const removed = []
  for (const item of candidates) {
    const [w, h, d] = item.bounds.size
    const footprint = w * d
    const thinnest = Math.min(w, h, d)
    const others = candidates.filter((other) => other !== item)
    if (!others.length) continue
    const othersFootprint = Math.max(
      ...others.map((other) => other.bounds.size[0] * other.bounds.size[2]),
    )

    const flat = thinnest < Math.max(w, h, d) * 0.03
    const dominant = footprint > othersFootprint * 3.5
    const low = item.bounds.max[1] <= total.min[1] + (total.max[1] - total.min[1]) * 0.12

    if (flat && dominant && low) removed.push(item)
  }
  return removed
}

/**
 * Remove a leftover oversized backdrop / presentation grid.
 *
 * `stripBackdrop` above requires the flat mesh to sit low and dominate the
 * scene's own bounds, which stops it deleting real canopies or roofs. This
 * sweep is the safer cousin for files whose units were scaled up so far that
 * the studio grid dwarfs everything: a near-2D mesh whose footprint is larger
 * than the combined footprint of every other mesh is never part of a real
 * object — nothing real is that flat *and* that dominant.
 */
function stripOversizedBackdrop(candidates) {
  const removed = []
  // A backdrop plane can lie in any of the three planes (Sketchfab grids often
  // stand in X/Y), so its "area" is the product of its two largest axes, not
  // the x-z footprint.
  const faceArea = (item) => {
    const [a, b, c] = [...item.bounds.size].sort((x, y) => y - x)
    return a * b
  }
  const othersTotal = (item) =>
    candidates
      .filter((other) => other !== item)
      .reduce((sum, other) => sum + faceArea(other), 0)

  for (const item of candidates) {
    const [w, h, d] = item.bounds.size
    const thinnest = Math.min(w, h, d)
    const thickest = Math.max(w, h, d)
    // tolerant: `grid_floor` planes are 2-triangle quads, but a real quad roof
    // would still be vastly smaller than everything else combined
    if (thinnest > thickest * 0.06) continue
    if (faceArea(item) < othersTotal(item) * 1.8) continue
    removed.push(item)
  }
  return removed
}

/**
 * Remove a leftover presentation grid that is smaller than the subject.
 *
 * Signature: ultra-flat (thickness < 1% of its own largest side), nearly free
 * (under 1% of the scene's triangles), and not the largest thing in the file.
 * A 2-triangle checker quad sitting under a panel is exactly that; a real
 * thin object that cheap (a decal sheet, a wire) is not worth keeping either.
 */
function stripLeftoverGrid(candidates) {
  if (candidates.length < 2) return []
  const totalTriangles = candidates.reduce((sum, item) => sum + item.triangles, 0)
  const largestArea = Math.max(
    ...candidates.map((item) => {
      const [a, b] = [...item.bounds.size].sort((x, y) => y - x)
      return a * b
    }),
  )
  const removed = []
  for (const item of candidates) {
    const [w, h, d] = item.bounds.size
    const thinnest = Math.min(w, h, d)
    const thickest = Math.max(w, h, d)
    const [a, b] = [w, h, d].sort((x, y) => y - x)
    const area = a * b
    if (thinnest > thickest * 0.01) continue
    if (item.triangles * 100 > totalTriangles) continue
    if (area >= largestArea * 0.5) continue // the subject itself is never "leftover"
    removed.push(item)
  }
  return removed
}

/**
 * Group mesh nodes into spatially connected clusters.
 *
 * Two parts belong to the same object when their bounding boxes touch or
 * overlap (with a small tolerance for panel gaps and shutlines). A car's body,
 * doors, four wheels and mirrors all chain together into one cluster; two
 * traffic cones standing a metre apart do not.
 *
 * This is the distinction that makes duplicate removal safe. Comparing
 * individual meshes cannot make it — a car has four identically sized wheels,
 * and deleting three of them is catastrophic.
 */
function cluster(candidates) {
  const parent = candidates.map((_, index) => index)
  const find = (i) => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]]
      i = parent[i]
    }
    return i
  }
  const union = (a, b) => {
    const ra = find(a)
    const rb = find(b)
    if (ra !== rb) parent[rb] = ra
  }

  // Tolerance scales with the scene so it works in metres or centimetres.
  const extent = candidates.reduce((max, item) => Math.max(max, ...item.bounds.size), 0)
  const slack = extent * 0.02

  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      const a = candidates[i].bounds
      const b = candidates[j].bounds
      const touching = [0, 1, 2].every(
        (axis) => a.min[axis] - slack <= b.max[axis] && b.min[axis] - slack <= a.max[axis],
      )
      if (touching) union(i, j)
    }
  }

  const groups = new Map()
  candidates.forEach((item, index) => {
    const root = find(index)
    const group = groups.get(root) ?? []
    group.push(item)
    groups.set(root, group)
  })

  return [...groups.values()].map((items) => {
    const min = [Infinity, Infinity, Infinity]
    const max = [-Infinity, -Infinity, -Infinity]
    let triangles = 0
    for (const item of items) {
      for (let axis = 0; axis < 3; axis++) {
        min[axis] = Math.min(min[axis], item.bounds.min[axis])
        max[axis] = Math.max(max[axis], item.bounds.max[axis])
      }
      triangles += item.triangles
    }
    return {
      items,
      triangles,
      bounds: { min, max, size: [max[0] - min[0], max[1] - min[1], max[2] - min[2]] },
    }
  })
}

/**
 * Detect a side-by-side comparison layout and keep one copy.
 *
 * The signature is two or more *whole clusters* — separate objects, not parts —
 * with matching size and matching triangle count, laid out horizontally in the
 * same height band. That is a material-variant display, and only one copy
 * belongs in the world.
 *
 * Matching triangle counts is the safety catch: two renderings of the same cone
 * are the same mesh twice, whereas a lamp post's head and its column are
 * different geometry even when their boxes happen to be similar.
 */
function findDuplicateLayout(clusters) {
  if (clusters.length < 2) return []

  const volume = (c) => Math.max(1e-9, c.bounds.size[0] * c.bounds.size[1] * c.bounds.size[2])
  const groups = []

  for (const item of clusters) {
    const match = groups.find((group) => {
      const reference = group[0]
      const ratio = volume(item) / volume(reference)
      if (ratio < 0.92 || ratio > 1.09) return false
      // The same mesh twice, not two different parts that happen to be similar.
      const triRatio = item.triangles / Math.max(1, reference.triangles)
      if (triRatio < 0.95 || triRatio > 1.05) return false
      // Separated horizontally, sharing a height band: a display row.
      const gapX = Math.max(item.bounds.min[0] - reference.bounds.max[0], reference.bounds.min[0] - item.bounds.max[0])
      const gapZ = Math.max(item.bounds.min[2] - reference.bounds.max[2], reference.bounds.min[2] - item.bounds.max[2])
      const verticalOverlap =
        Math.min(item.bounds.max[1], reference.bounds.max[1]) - Math.max(item.bounds.min[1], reference.bounds.min[1])
      return (gapX > 0 || gapZ > 0) && verticalOverlap > item.bounds.size[1] * 0.7
    })
    if (match) match.push(item)
    else groups.push([item])
  }

  return groups.filter((group) => group.length > 1).flatMap((group) => group.slice(1))
}

/**
 * Reduce a showcase file to the object it is showing.
 *
 * @returns {{ notes: string[] }}
 */
export function isolateSubject(doc) {
  const notes = []
  const scene = doc.getRoot().listScenes()[0]
  if (!scene) return { notes }

  const rig = stripRig(doc)
  if (rig) notes.push(`removed ${rig} camera/light node(s) from the asset's own studio rig`)

  let candidates = meshNodes(scene)
  if (candidates.length < 2) return { notes }

  // Some Sketchfab exports leave a grid/backdrop plane in place after the
  // studio camera is removed. `stripBackdrop` requires the plane to dominate
  // the *remaining* scene, which an oversized scale can defeat — a 200-unit
  // checker grid still dwarfs a model whose units were scaled up. Sweep any
  // near-2D mesh whose own footprint is larger than everything else's put
  // together: nothing a real object needs is that flat and that dominant.
  const oversized = stripOversizedBackdrop(candidates)
  for (const item of oversized) item.node.dispose()
  if (oversized.length) {
    notes.push(
      `removed ${oversized.length} oversized backdrop/floor plane(s) (${oversized.length} nodes) — leftover presentation grid, the scene supplies its own ground`,
    )
    candidates = candidates.filter((item) => !oversized.includes(item))
  }

  // Grids that are *smaller* than the subject (a 200-unit grid under a
  // 500-unit panel) escape the dominance test above. The other signature of a
  // presentation grid is cost: a 2-triangle ultra-flat quad among real
  // geometry. Sweep those too — a genuinely flat real object that cheap and
  // that thin does not exist on a construction site.
  const leftovers = stripLeftoverGrid(candidates)
  for (const item of leftovers) item.node.dispose()
  if (leftovers.length) {
    notes.push(
      `removed ${leftovers.length} leftover grid/backdrop plane(s) (${leftovers.length} nodes) — presentation floor, the scene supplies its own ground`,
    )
    candidates = candidates.filter((item) => !leftovers.includes(item))
  }
  if (candidates.length < 2) return { notes }

  const backdrops = stripBackdrop(candidates)
  for (const item of backdrops) {
    item.node.dispose()
  }
  if (backdrops.length) {
    notes.push(`removed ${backdrops.length} backdrop/display plane(s) — the scene supplies its own ground`)
    candidates = candidates.filter((item) => !backdrops.includes(item))
  }

  // Duplicate detection operates on whole connected objects, never on
  // individual parts — a car's four wheels must survive.
  const clusters = cluster(candidates)
  const duplicates = findDuplicateLayout(clusters)
  let removedNodes = 0
  for (const group of duplicates) {
    for (const item of group.items) {
      item.node.dispose()
      removedNodes += 1
    }
  }
  if (duplicates.length) {
    notes.push(
      `removed ${duplicates.length} duplicate specimen(s) (${removedNodes} nodes) — the file was a side-by-side comparison layout, one kept`,
    )
  }

  return { notes }
}
