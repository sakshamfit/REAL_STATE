import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { StateFeature } from './map-data'
import { latLngToShape, latLngToXZ } from './projection'

export type Ring = [number, number][]

export type StateMeshData = {
  id: string
  name: string
  geometry: THREE.BufferGeometry
  outline: THREE.BufferGeometry
  /** world XZ of the label / camera anchor (before the group transform) */
  center: THREE.Vector3
  /** local XZ bounds of the state */
  bounds: { width: number; depth: number; minX: number; minZ: number; maxX: number; maxZ: number }
  area: number
}

function signedArea(ring: Ring) {
  let area = 0
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    area += (ring[j][0] + ring[i][0]) * (ring[j][1] - ring[i][1])
  }
  return area / 2
}

function toPoints(ring: Ring) {
  const points: THREE.Vector2[] = []
  for (const [lng, lat] of ring) {
    const [x, y] = latLngToShape(lat, lng)
    points.push(new THREE.Vector2(x, y))
  }
  if (points.length > 2) {
    const first = points[0]
    const last = points[points.length - 1]
    if (first.distanceTo(last) < 1e-9) points.pop()
  }
  return points
}

function shapeFromRings(rings: Ring[]): THREE.Shape | null {
  if (!rings.length) return null
  const outer = rings[0]
  const outerPoints = toPoints(outer)
  if (outerPoints.length < 3) return null

  // outer ring: CCW, holes: CW (three's triangulator expects opposite winding)
  if (signedArea(outerPoints as unknown as Ring) < 0) outerPoints.reverse()
  const shape = new THREE.Shape(outerPoints)

  for (let i = 1; i < rings.length; i++) {
    const holePoints = toPoints(rings[i])
    if (holePoints.length < 3) continue
    if (signedArea(holePoints as unknown as Ring) > 0) holePoints.reverse()
    shape.holes.push(new THREE.Path(holePoints))
  }
  return shape
}

function outlineFromRings(rings: Ring[], y: number) {
  const segments: number[] = []
  for (const ring of rings) {
    const points = toPoints(ring)
    for (let i = 0; i < points.length; i++) {
      const a = points[i]
      const b = points[(i + 1) % points.length]
      // shape space (x, y) -> world (x, height, -y)
      segments.push(a.x, y, -a.y, b.x, y, -b.y)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(segments, 3))
  return geometry
}

function polygonsOf(feature: StateFeature): Ring[][] {
  const { type, coordinates } = feature.geometry
  if (type === 'Polygon') return [coordinates as Ring[]]
  if (type === 'MultiPolygon') return coordinates as Ring[][]
  return []
}

/** Extrude one state into a solid architectural slab + its top rim outline. */
export function buildStateMesh(feature: StateFeature, depth: number): StateMeshData | null {
  const polygons = polygonsOf(feature).filter((rings) => rings.length && rings[0].length >= 4)
  if (!polygons.length) return null

  const shapes: THREE.Shape[] = []
  for (const rings of polygons) {
    const shape = shapeFromRings(rings)
    if (shape) shapes.push(shape)
  }
  if (!shapes.length) return null

  const parts = shapes.map(
    (shape) =>
      new THREE.ExtrudeGeometry(shape, {
        depth,
        bevelEnabled: false,
        curveSegments: 1,
        steps: 1,
      }),
  )

  const merged = parts.length === 1 ? parts[0] : mergeGeometries(parts, false)
  if (!merged) return null
  if (parts.length > 1) parts.forEach((part) => part.dispose())
  merged.rotateX(-Math.PI / 2)
  merged.computeBoundingBox()
  merged.computeVertexNormals()

  const outlines = polygons.map((rings) => outlineFromRings(rings, depth))
  const outline = outlines.length === 1 ? outlines[0] : mergeGeometries(outlines, false) ?? outlines[0]
  if (outlines.length > 1) outlines.forEach((part) => part.dispose())

  const box = merged.boundingBox ?? new THREE.Box3()
  const bounds = {
    minX: box.min.x,
    minZ: box.min.z,
    maxX: box.max.x,
    maxZ: box.max.z,
    width: box.max.x - box.min.x,
    depth: box.max.z - box.min.z,
  }

  const [cx, cz] = latLngToXZ(feature.properties.centroid[1], feature.properties.centroid[0])
  const size = Math.max(bounds.width, bounds.depth)

  return {
    id: feature.properties.id,
    name: feature.properties.name,
    geometry: merged,
    outline,
    center: new THREE.Vector3(cx, depth, cz),
    bounds,
    area: size,
  }
}

export function buildIndiaMeshes(features: StateFeature[], depth: number) {
  const meshes: StateMeshData[] = []
  for (const feature of features) {
    const mesh = buildStateMesh(feature, depth)
    if (mesh) meshes.push(mesh)
  }
  return meshes
}

/** Concentric survey rings — the "satellite plane" under the map. */
export function buildSurveyRings(radius: number, count = 4, segments = 128) {
  const positions: number[] = []
  for (let i = 0; i < count; i++) {
    const r = radius * (0.55 + i * 0.22)
    for (let s = 0; s < segments; s++) {
      const a = (s / segments) * Math.PI * 2
      const b = ((s + 1) / segments) * Math.PI * 2
      positions.push(Math.cos(a) * r, 0, Math.sin(a) * r, Math.cos(b) * r, 0, Math.sin(b) * r)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  return geometry
}

export function disposeMeshes(meshes: StateMeshData[]) {
  meshes.forEach((mesh) => {
    mesh.geometry.dispose()
    mesh.outline.dispose()
  })
}
