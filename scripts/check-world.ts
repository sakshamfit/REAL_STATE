/**
 * Dev sanity check (not shipped): samples the camera spline and validates the
 * world — continuity, speed, ground clearance and collisions with the big
 * pieces of architecture.
 *
 *   npx tsx scripts/check-world.ts
 */
import * as THREE from 'three'
import fs from 'node:fs'
import path from 'node:path'
import { beatTimings, beats } from '../src/lib/chapters'
import { sampleCamera } from '../src/lib/camera-path'
import { buildIndiaMeshes } from '../src/lib/geometry'
import { INDIA_MAP, HERO_BUILDING, SERVICE_WORLDS, FUTURE_BUILDING, CORRIDOR, TRUST_STRUCTURE, PROCESS_MODEL } from '../src/lib/world'

type Box = { min: THREE.Vector3; max: THREE.Vector3; name: string }

const box = (name: string, cx: number, cy: number, cz: number, sx: number, sy: number, sz: number): Box => ({
  name,
  min: new THREE.Vector3(cx - sx / 2, cy - sy / 2, cz - sz / 2),
  max: new THREE.Vector3(cx + sx / 2, cy + sy / 2, cz + sz / 2),
})

const obstacles: Box[] = [
  box('hero building', HERO_BUILDING.x, HERO_BUILDING.height / 2, HERO_BUILDING.z, HERO_BUILDING.width + 2, HERO_BUILDING.height, HERO_BUILDING.depth + 2),
  box('hero foundation', HERO_BUILDING.x, 0.7, HERO_BUILDING.z, HERO_BUILDING.width + 9, 1.4, HERO_BUILDING.depth + 9),
  box('civil deck', SERVICE_WORLDS.civil.x, 0.3, SERVICE_WORLDS.civil.z, 36, 0.6, 42),
  ...[-13, -4.5, 4.5, 13].map((cx) => box(`civil column ${cx}`, cx, 10, SERVICE_WORLDS.civil.z, 1.25, 20, 1.25)),
  ...[-15, -5, 5, 15].map((cz) => box(`civil beam ${cz}`, SERVICE_WORLDS.civil.x, 20.8, SERVICE_WORLDS.civil.z + cz, 28, 1.2, 1.2)),
  box('residence', SERVICE_WORLDS.residential.x, 6, SERVICE_WORLDS.residential.z, 24, 12, 18),
  box('bridge deck', SERVICE_WORLDS.infrastructure.x, 16, SERVICE_WORLDS.infrastructure.z, 44, 1.4, 16),
  box('bridge pier L', SERVICE_WORLDS.infrastructure.x - 18, 6.5, SERVICE_WORLDS.infrastructure.z, 4.4, 13, 9),
  box('bridge pier R', SERVICE_WORLDS.infrastructure.x + 18, 6.5, SERVICE_WORLDS.infrastructure.z, 4.4, 13, 9),
  box('solar field', SERVICE_WORLDS.solar.x, 1.5, SERVICE_WORLDS.solar.z, 34, 2.6, 26),
  box('renovation mass', SERVICE_WORLDS.renovation.x, 7, SERVICE_WORLDS.renovation.z, 24, 15, 18),
  box('warehouse canopy roof', SERVICE_WORLDS.materials.x, 15.4, SERVICE_WORLDS.materials.z, 36, 1.2, 26),
  box('process model', PROCESS_MODEL.x, 1.5, (PROCESS_MODEL.zFrom + PROCESS_MODEL.zTo) / 2, 42, 3, 70),
  ...[-13, 13].flatMap((cx) => [-9, 9].map((cz) => box(`trust column ${cx}/${cz}`, TRUST_STRUCTURE.x + cx, 13, TRUST_STRUCTURE.z + cz, 4.4, 26, 4.4))),
  box('trust lintel', TRUST_STRUCTURE.x, 28.2, TRUST_STRUCTURE.z, 34, 4.4, 26),
  box('trust base', TRUST_STRUCTURE.x, 0.6, TRUST_STRUCTURE.z, 40, 1.2, 30),
  box('corridor ceiling', 0, CORRIDOR.height + 0.45, (CORRIDOR.from + CORRIDOR.to) / 2, CORRIDOR.width + 3, 0.9, Math.abs(CORRIDOR.to - CORRIDOR.from) + 8),
  box('corridor floor', 0, 0.3, (CORRIDOR.from + CORRIDOR.to) / 2, CORRIDOR.width, 0.6, Math.abs(CORRIDOR.to - CORRIDOR.from) + 8),
  box('india map', INDIA_MAP.x, INDIA_MAP.y + 0.8, INDIA_MAP.z, 26, 2.4, 30),
  ...[-580, -600, -620, -640].flatMap((gz) => [
    box(`gate L ${gz}`, -11.5, 12, gz, 9, 30, 5),
    box(`gate R ${gz}`, 11.5, 12, gz, 9, 30, 5),
    box(`gate top ${gz}`, 0, 21.5, gz, 32, 9, 5),
    box(`gate bottom ${gz}`, 0, -1, gz, 32, 6, 5),
  ]),
  box('crane mast', -30, 32, -94, 2.6, 64, 2.6),
  box('future building', FUTURE_BUILDING.x, FUTURE_BUILDING.height / 2, FUTURE_BUILDING.z, FUTURE_BUILDING.width + 12, FUTURE_BUILDING.height, FUTURE_BUILDING.depth + 12),
]

const samples = 4000
const positions: THREE.Vector3[] = []
const looks: THREE.Vector3[] = []
let minY = Infinity
let maxStep = 0
let totalLength = 0

for (let i = 0; i <= samples; i++) {
  const p = i / samples
  const pos = new THREE.Vector3()
  const look = new THREE.Vector3()
  sampleCamera(p, pos, look)
  if (!Number.isFinite(pos.x + pos.y + pos.z)) throw new Error(`non finite camera at ${p}`)
  positions.push(pos)
  looks.push(look)
  minY = Math.min(minY, pos.y)
  if (i > 0) {
    const step = pos.distanceTo(positions[i - 1])
    totalLength += step
    maxStep = Math.max(maxStep, step)
  }
}

console.log(`camera path length      : ${totalLength.toFixed(1)} units`)
console.log(`max step (1/${samples})    : ${maxStep.toFixed(3)} units`)
console.log(`lowest camera Y         : ${minY.toFixed(2)}`)
console.log(`beats                   : ${beats.length}`)
console.log(`scroll length           : ${beats.reduce((sum, b) => sum + b.span, 0)}vh`)

// collisions
const hits: { name: string; p: number; distance: number }[] = []
for (let i = 0; i <= samples; i++) {
  const point = positions[i]
  for (const obstacle of obstacles) {
    const clamped = new THREE.Vector3(
      Math.max(obstacle.min.x, Math.min(point.x, obstacle.max.x)),
      Math.max(obstacle.min.y, Math.min(point.y, obstacle.max.y)),
      Math.max(obstacle.min.z, Math.min(point.z, obstacle.max.z)),
    )
    const distance = clamped.distanceTo(point)
    if (distance < 1.2) hits.push({ name: obstacle.name, p: i / samples, distance })
  }
}

if (hits.length) {
  const grouped = new Map<string, { count: number; min: number }>()
  for (const hit of hits) {
    const entry = grouped.get(hit.name) ?? { count: 0, min: Infinity }
    entry.count += 1
    entry.min = Math.min(entry.min, hit.distance)
    grouped.set(hit.name, entry)
  }
  console.log('\nCOLLISION WARNINGS')
  for (const [name, entry] of grouped) {
    const sample = hits.find((hit) => hit.name === name)!
    const index = Math.round(sample.p * samples)
    const at = positions[Math.min(index, samples)].toArray().map((v) => v.toFixed(1)).join(', ')
    console.log(`  ${name}: ${entry.count} samples, closest ${entry.min.toFixed(2)}  e.g. p=${(sample.p * 100).toFixed(1)}% at (${at})`)
  }
} else {
  console.log('\nno camera collisions ✓')
}

// beat coverage
console.log('\nbeat timing')
for (const timing of beatTimings) {
  const index = Math.round(timing.start * samples)
  const pos = positions[Math.min(index, samples)]
  console.log(
    `  ${timing.beat.id.padEnd(22)} ${(timing.start * 100).toFixed(1).padStart(5)}% → ${(timing.end * 100)
      .toFixed(1)
      .padStart(5)}%   cam ${pos.toArray().map((v) => v.toFixed(0)).join(', ')}`,
  )
}

// map geometry
const geo = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'public/data/india-states.json'), 'utf8'))
const meshes = buildIndiaMeshes(geo.features, INDIA_MAP.depth)
let triangles = 0
for (const mesh of meshes) triangles += (mesh.geometry.getAttribute('position').count ?? 0) / 3
const bihar = meshes.find((m) => m.id === 'bihar')
const assam = meshes.find((m) => m.id === 'assam')
console.log(`\nmap: ${meshes.length} states, ~${Math.round(triangles)} triangles`)
console.log(`bihar center ${bihar?.center.toArray().map((v) => v.toFixed(2)).join(', ')} area ${bihar?.area.toFixed(2)}`)
console.log(`assam center ${assam?.center.toArray().map((v) => v.toFixed(2)).join(', ')} area ${assam?.area.toFixed(2)}`)
const bounds = new THREE.Box3()
for (const mesh of meshes) bounds.expandByObject(new THREE.Mesh(mesh.geometry))
console.log(`map bounds ${bounds.min.toArray().map((v) => v.toFixed(1)).join(', ')} → ${bounds.max.toArray().map((v) => v.toFixed(1)).join(', ')}`)
