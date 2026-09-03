/**
 * Correct, world-space asset measurement.
 *
 * Production GLBs store POSITION as *quantised normalised shorts* and keep the
 * real size in the node transform, and their buffer views are interleaved. Any
 * reader that takes `accessor.getArray()` at face value therefore measures
 * either ±32767 "metres" or a mix of positions, normals and UVs.
 *
 * This helper parses the container directly — accessor → buffer view → byte
 * stride → component type → de-quantise, then walks the node hierarchy exactly
 * as a renderer would — and reports the world-space AABB in metres.
 */

import fs from 'node:fs'
import { Matrix4, Quaternion, Vector3 } from 'three'

const COMPONENT = {
  5120: { array: Int8Array, size: 1, max: 127 },
  5121: { array: Uint8Array, size: 1, max: 255 },
  5122: { array: Int16Array, size: 2, max: 32767 },
  5123: { array: Uint16Array, size: 2, max: 65535 },
  5125: { array: Uint32Array, size: 4, max: 4294967295 },
  5126: { array: Float32Array, size: 4, max: 1 },
}

const COMPONENTS_PER_TYPE = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }

export function readGlb(file) {
  const buffer = fs.readFileSync(file)
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength)
  if (view.getUint32(0, true) !== 0x46546c67) throw new Error(`${file} is not a GLB`)
  const length = view.getUint32(8, true)
  let offset = 12
  let json = null
  let bin = null
  while (offset < length) {
    const chunkLength = view.getUint32(offset, true)
    const chunkType = view.getUint32(offset + 4, true)
    const start = offset + 8
    if (chunkType === 0x4e4f534a) {
      json = JSON.parse(buffer.subarray(start, start + chunkLength).toString('utf8'))
    } else if (chunkType === 0x004e4942) {
      bin = buffer.subarray(start, start + chunkLength)
    }
    offset = start + chunkLength + ((4 - (chunkLength % 4)) % 4)
  }
  if (!json) throw new Error(`${file} has no JSON chunk`)
  return { json, bin: bin ?? Buffer.alloc(0) }
}

/** De-quantised, de-interleaved positions for one accessor index. */
export function readPositions({ json, bin }, accessorIndex) {
  const accessor = json.accessors[accessorIndex]
  if (!accessor) return null
  const count = accessor.count
  const components = COMPONENTS_PER_TYPE[accessor.type] ?? 3
  const component = COMPONENT[accessor.componentType] ?? COMPONENT[5126]
  const divisor = accessor.normalized ? component.max : 1
  const bufferView = json.bufferViews[accessor.bufferView]
  const byteStride = bufferView.byteStride ?? component.size * components
  const base = (bufferView.byteOffset ?? 0) + (accessor.byteOffset ?? 0)
  const out = new Float32Array(count * 3)
  const little = true
  for (let i = 0; i < count; i++) {
    const element = base + i * byteStride
    for (let c = 0; c < 3; c++) {
      const at = element + c * component.size
      let value = 0
      if (component.size === 4 && component.array === Float32Array) value = bin.readFloatLE(at)
      else if (component.size === 4) value = bin.readUInt32LE(at) / (accessor.normalized ? component.max : 1)
      else if (component.size === 2 && component.array === Int16Array) value = bin.readInt16LE(at) / divisor
      else if (component.size === 2) value = bin.readUInt16LE(at) / divisor
      else if (component.size === 1 && component.array === Int8Array) value = bin.readInt8(at) / divisor
      else value = bin.readUInt8(at) / divisor
      out[i * 3 + c] = value
      void little
    }
  }
  return out
}

function nodeMatrix(node) {
  const m = new Matrix4()
  if (node.matrix) return m.fromArray(node.matrix)
  const t = node.translation ?? [0, 0, 0]
  const r = node.rotation ?? [0, 0, 0, 1]
  const s = node.scale ?? [1, 1, 1]
  return m.compose(
    new Vector3(t[0], t[1], t[2]),
    new Quaternion(r[0], r[1], r[2], r[3]),
    new Vector3(s[0], s[1], s[2]),
  )
}

/** World-space positions for every primitive in the file. */
export function worldPositions(file) {
  const glb = readGlb(file)
  const { json } = glb
  const out = []
  const scratch = new Vector3()
  const identity = new Matrix4()

  const walk = (index, parentWorld) => {
    const node = json.nodes[index]
    if (!node) return
    const world = new Matrix4().multiplyMatrices(parentWorld, nodeMatrix(node))
    if (typeof node.mesh === 'number') {
      for (const prim of json.meshes[node.mesh].primitives) {
        const positions = readPositions(glb, prim.attributes?.POSITION)
        if (!positions) continue
        for (let i = 0; i < positions.length; i += 3) {
          scratch.set(positions[i], positions[i + 1], positions[i + 2]).applyMatrix4(world)
          out.push(scratch.x, scratch.y, scratch.z)
        }
      }
    }
    for (const child of node.children ?? []) walk(child, world)
  }

  const scene = json.scenes?.[json.scene ?? 0]
  for (const root of scene?.nodes ?? []) walk(root, identity)
  return out
}

/** World-space AABB in metres, or null when the file has no geometry. */
export function boundsForFile(file) {
  const points = worldPositions(file)
  if (!points.length) return null
  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]
  let nonFinite = false
  for (let i = 0; i < points.length; i += 3) {
    for (let c = 0; c < 3; c++) {
      const v = points[i + c]
      if (!Number.isFinite(v)) {
        nonFinite = true
        continue
      }
      if (v < min[c]) min[c] = v
      if (v > max[c]) max[c] = v
    }
  }
  return {
    min,
    max,
    size: [max[0] - min[0], max[1] - min[1], max[2] - min[2]],
    points,
    nonFinite,
  }
}

// ---------------------------------------------------------------- glTF-Transform shims

/**
 * Document-based convenience wrappers kept for the existing call sites. They
 * re-read the file, so pass the path as the second argument.
 */
export function documentBounds(doc, file) {
  if (!file) throw new Error('documentBounds(doc, file) needs the source path')
  return boundsForFile(file)
}

export function documentVertices(doc, file) {
  if (!file) throw new Error('documentVertices(doc, file) needs the source path')
  return worldPositions(file)
}

export function documentHasNonFinite(doc, file) {
  return Boolean(boundsForFile(file)?.nonFinite)
}
