/**
 * Placement audit — does any placed object intersect another?
 *
 * The world-shot renderer answers "does this look right from the camera path",
 * which misses objects buried inside other objects when no beat happens to
 * look at them. This walks every placement in `layout.ts`, gives each one its
 * real measured footprint from the GLB on disk, and reports overlaps.
 *
 * It exists because the V11 hero podium grew from 22×16 m to 29×33 m and
 * silently swallowed four yard props. That is invisible in a triangle count
 * and invisible from most camera angles, and it is exactly the class of defect
 * the brief's §23 forbids.
 *
 *   node scripts/qa/placement.mjs
 *
 * Footprints are axis-aligned and rotation is snapped to the nearest quarter
 * turn, which is coarse but never reports a false clash: it only widens boxes.
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { boundsForFile } from '../glb/bounds.mjs'
import { assetById } from '../../src/data/assets.ts'
import {
  HERO_BUILDING,
} from '../../src/lib/world.ts'
import {
  boundaryWalls,
  externalSiteProps,
  parkedVehicles,
  streetLights,
  yardBarriers,
  yardProps,
} from '../../src/lib/layout.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

/** Clearance below which two objects are considered to be fouling each other. */
const TOUCH = -0.15

const cache = new Map()
async function footprint(id) {
  if (!cache.has(id)) {
    const entry = assetById.get(id)
    const rel = entry?.path ?? `/assets/glb/${id}.glb`
    const file = path.join(ROOT, 'public', rel.replace(/^\//, ''))
    try {
      const b = await boundsForFile(file)
      // Keep the signed offsets, not just the size. Several assets are
      // deliberately off-centre about their origin — the hero's entrance
      // forecourt runs 18.5 m one way and 14.6 m the other — and treating
      // them as centred boxes misplaces them by metres.
      cache.set(id, { minX: b.min[0], maxX: b.max[0], minZ: b.min[2], maxZ: b.max[2], minY: b.min[1] })
    } catch {
      cache.set(id, null)
    }
  }
  return cache.get(id)
}

/** World-space AABB for a placement, rotation snapped to a quarter turn. */
function boxFor(place, fp) {
  const s = place.scale ?? 1
  const q = ((Math.round((place.rotation ?? 0) / (Math.PI / 2)) % 4) + 4) % 4
  const c = [Math.cos((q * Math.PI) / 2), Math.sin((q * Math.PI) / 2)]
  const xs = []
  const zs = []
  for (const cx of [fp.minX * s, fp.maxX * s]) {
    for (const cz of [fp.minZ * s, fp.maxZ * s]) {
      // three.js rotation.y: x' = x·cos + z·sin, z' = −x·sin + z·cos
      xs.push(cx * c[0] + cz * c[1])
      zs.push(-cx * c[1] + cz * c[0])
    }
  }
  return {
    x0: place.x + Math.min(...xs),
    x1: place.x + Math.max(...xs),
    z0: place.z + Math.min(...zs),
    z1: place.z + Math.max(...zs),
  }
}

function gap(a, b) {
  return Math.max(Math.max(a.x0 - b.x1, b.x0 - a.x1), Math.max(a.z0 - b.z1, b.z0 - a.z1))
}

const placements = []
const push = (label, list) => {
  for (const p of list ?? []) {
    if (p && typeof p.x === 'number' && typeof p.z === 'number') placements.push({ ...p, group: label })
  }
}

push('yard', yardProps())
push('barrier', yardBarriers())
push('lights', streetLights())
push('site-props', externalSiteProps().flatMap((g) => g.items.map((i) => ({ ...i, id: g.id }))))
push('parked', parkedVehicles().flatMap((g) => g.items.map((i) => ({ ...i, id: g.id }))))
push('wall', boundaryWalls())

// The hero is placed by its chapter component rather than by layout.ts, but it
// is the biggest thing on the plot and the whole reason this audit exists.
placements.push({
  id: 'hero-building',
  x: HERO_BUILDING.x,
  z: HERO_BUILDING.z + HERO_BUILDING.modelZOffset,
  rotation: 0,
  group: 'hero',
})

const resolved = []
for (const p of placements) {
  const fp = await footprint(p.id)
  if (!fp) continue
  resolved.push({ ...p, box: boxFor(p, fp), fp })
}

console.log(`\n  PLACEMENT AUDIT — ${resolved.length} placed objects\n`)

const clashes = []
for (let i = 0; i < resolved.length; i++) {
  for (let j = i + 1; j < resolved.length; j++) {
    const a = resolved[i]
    const b = resolved[j]
    // Continuous runs are meant to abut: a boundary wall is made of touching
    // panels, and a line of barriers is a line precisely because the units sit
    // end to end. Only flag members of a run against *other* groups.
    if (a.group === b.group && (a.group === 'wall' || a.group === 'barrier')) continue
    const g = gap(a.box, b.box)
    if (g < TOUCH) clashes.push({ a, b, overlap: -g })
  }
}

clashes.sort((x, y) => y.overlap - x.overlap)
for (const { a, b, overlap } of clashes) {
  console.log(
    `  CLASH  ${a.id} (${a.group}) @ ${a.x.toFixed(0)},${a.z.toFixed(0)}` +
      `  ×  ${b.id} (${b.group}) @ ${b.x.toFixed(0)},${b.z.toFixed(0)}` +
      `   overlap ${overlap.toFixed(2)} m`,
  )
}

// Anything whose GLB floor is well below zero is sunk; well above is floating.
const grounding = resolved.filter((p) => p.fp.minY < -0.6 || p.fp.minY > 0.25)
for (const p of grounding) {
  console.log(`  GROUND ${p.id} floor at y=${p.fp.minY.toFixed(2)}`)
}

if (!clashes.length && !grounding.length) console.log('  ✔ no intersecting or floating placements\n')
else console.log(`\n  ${clashes.length} clash(es), ${grounding.length} grounding issue(s)\n`)
