/**
 * External asset normalisation.
 *
 * Applies the repair plan produced by `verdict.mjs` and writes a production GLB
 * that behaves exactly like a project-authored one:
 *
 *   • real-world metres          (brief §4 — measured, never assumed)
 *   • y = 0 is the ground plane  (brief §5 — tyres on road, trunk on soil)
 *   • footprint centred on the origin so `layout.ts` can place it by position
 *   • no baked transforms left in the node graph
 *   • textures inside a sane memory budget, duplicates gone
 *   • triangle budget respected without gutting the silhouette (brief §18)
 *
 * Materials are deliberately left alone here. The brief (§6) says not to
 * replace good materials, and the runtime is the only place with enough context
 * to decide — so correction happens there, per material, and reversibly.
 */

import {
  center,
  dedup,
  flatten,
  join,
  prune,
  simplify,
  quantize,
  textureCompress,
  weld,
} from '@gltf-transform/functions'
import { MeshoptSimplifier } from 'meshoptimizer'
import sharp from 'sharp'

const HALF_PI = Math.PI / 2

/** Rotate every root node by `yaw` radians about Y. */
function applyYaw(doc, yaw) {
  if (!yaw) return
  const scene = doc.getRoot().listScenes()[0]
  const half = yaw / 2
  const qy = Math.sin(half)
  const qw = Math.cos(half)
  const pivot = doc.createNode('external-yaw').setRotation([0, qy, 0, qw])
  for (const child of scene.listChildren()) {
    scene.removeChild(child)
    pivot.addChild(child)
  }
  scene.addChild(pivot)
}

/** Uniformly scale the whole scene. */
function applyScale(doc, scale) {
  if (!scale || Math.abs(scale - 1) < 1e-6) return
  const scene = doc.getRoot().listScenes()[0]
  const pivot = doc.createNode('external-scale').setScale([scale, scale, scale])
  for (const child of scene.listChildren()) {
    scene.removeChild(child)
    pivot.addChild(child)
  }
  scene.addChild(pivot)
}

/** Translate the whole scene. */
function applyOffset(doc, offset) {
  if (offset.every((v) => Math.abs(v) < 1e-6)) return
  const scene = doc.getRoot().listScenes()[0]
  const pivot = doc.createNode('external-seat').setTranslation(offset)
  for (const child of scene.listChildren()) {
    scene.removeChild(child)
    pivot.addChild(child)
  }
  scene.addChild(pivot)
}

/**
 * Ground the asset.
 *
 * `mode` decides which part of the object is expected to touch the ground:
 *
 *   wheels  the tyre contact patch — the lowest geometry, exactly on y=0
 *   trunk   the root flare, seated 2 cm into the soil so there is no gap
 *   base    the footing, flat on y=0
 *
 * Horizontally the footprint centre goes to the origin, so `layout.ts` places
 * the object by where it actually stands rather than by wherever the exporter
 * happened to leave the pivot.
 */
function groundOffset(bounds, mode) {
  const sink = mode === 'trunk' ? 0.02 : 0
  return [-(bounds.min[0] + bounds.max[0]) / 2, -bounds.min[1] - sink, -(bounds.min[2] + bounds.max[2]) / 2]
}

/** Drop every animation and the sampler data behind it. */
function stripAnimations(doc) {
  for (const animation of doc.getRoot().listAnimations()) animation.dispose()
}

/** Detach skins; static placement has no skeleton to drive them. */
function stripSkins(doc) {
  for (const node of doc.getRoot().listNodes()) node.setSkin(null)
  for (const skin of doc.getRoot().listSkins()) skin.dispose()
}

/** Give every primitive a NORMAL / TEXCOORD_0 so the material path never breaks. */
function fillMissingAttributes(doc, { normals, uvs }) {
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const position = prim.getAttribute('POSITION')
      if (!position) continue

      if (normals && !prim.getAttribute('NORMAL')) {
        const count = position.getCount()
        const indices = prim.getIndices()
        const data = new Float32Array(count * 3)
        const pos = position.getArray()
        const triangleCount = indices ? indices.getCount() / 3 : count / 3
        const idx = indices ? indices.getArray() : null
        for (let t = 0; t < triangleCount; t++) {
          const a = idx ? idx[t * 3] : t * 3
          const b = idx ? idx[t * 3 + 1] : t * 3 + 1
          const c = idx ? idx[t * 3 + 2] : t * 3 + 2
          const ax = pos[a * 3], ay = pos[a * 3 + 1], az = pos[a * 3 + 2]
          const bx = pos[b * 3], by = pos[b * 3 + 1], bz = pos[b * 3 + 2]
          const cx = pos[c * 3], cy = pos[c * 3 + 1], cz = pos[c * 3 + 2]
          const nx = (by - ay) * (cz - az) - (bz - az) * (cy - ay)
          const ny = (bz - az) * (cx - ax) - (bx - ax) * (cz - az)
          const nz = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax)
          for (const v of [a, b, c]) {
            data[v * 3] += nx
            data[v * 3 + 1] += ny
            data[v * 3 + 2] += nz
          }
        }
        for (let i = 0; i < count; i++) {
          const x = data[i * 3], y = data[i * 3 + 1], z = data[i * 3 + 2]
          const length = Math.hypot(x, y, z) || 1
          data[i * 3] = x / length
          data[i * 3 + 1] = y / length
          data[i * 3 + 2] = z / length
        }
        prim.setAttribute(
          'NORMAL',
          doc.createAccessor().setType('VEC3').setArray(data),
        )
      }

      if (uvs && !prim.getAttribute('TEXCOORD_0')) {
        const count = position.getCount()
        // Planar XZ projection normalised to the primitive's own box: better
        // than zeros, and the runtime material library is triplanar-ish anyway.
        const pos = position.getArray()
        let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity
        for (let i = 0; i < count; i++) {
          minX = Math.min(minX, pos[i * 3])
          maxX = Math.max(maxX, pos[i * 3])
          minZ = Math.min(minZ, pos[i * 3 + 2])
          maxZ = Math.max(maxZ, pos[i * 3 + 2])
        }
        const spanX = maxX - minX || 1
        const spanZ = maxZ - minZ || 1
        const uv = new Float32Array(count * 2)
        for (let i = 0; i < count; i++) {
          uv[i * 2] = (pos[i * 3] - minX) / spanX
          uv[i * 2 + 1] = (pos[i * 3 + 2] - minZ) / spanZ
        }
        prim.setAttribute('TEXCOORD_0', doc.createAccessor().setType('VEC2').setArray(uv))
      }
    }
  }
}

/**
 * Normalise a document in place.
 *
 * @param doc      glTF-Transform document, already read
 * @param plan     the repair plan from `judge()`
 * @param options  { ground, maxTexture, maxTriangles, triangles }
 */
export async function normalizeDocument(doc, plan, options) {
  const { ground = 'base', maxTexture = 1024, maxTriangles = 100000, triangles = 0 } = options
  const applied = []

  if (plan.dropAnimations) {
    stripAnimations(doc)
    applied.push('animations dropped')
  }
  stripSkins(doc)

  if (plan.recomputeNormals || plan.generateUvs) {
    fillMissingAttributes(doc, { normals: plan.recomputeNormals, uvs: plan.generateUvs })
    applied.push('missing attributes generated')
  }

  // Orientation and unit scale, then bake the whole hierarchy flat so nothing
  // downstream has to know an external asset was ever transformed.
  applyYaw(doc, plan.yaw)
  applyScale(doc, plan.scale)
  await doc.transform(flatten())
  if (plan.yaw || Math.abs(plan.scale - 1) > 1e-6) applied.push('orientation and unit scale baked')

  // Grounding, measured after the scale is real.
  const { getBounds } = await import('@gltf-transform/functions')
  const scene = doc.getRoot().listScenes()[0]
  const bounds = getBounds(scene)
  const offset = groundOffset(bounds, ground)
  if (offset.some((v) => Math.abs(v) > 1e-6)) {
    applyOffset(doc, offset)
    await doc.transform(flatten())
    applied.push(`grounded (${ground})`)
  }
  void center

  // Triangle budget. `simplify` preserves the silhouette by construction — it
  // is an error-bounded edge collapse, not a decimation — and the brief (§18)
  // is explicit that quality must not be sacrificed to hit a number, so the
  // ratio is only ever as aggressive as the budget requires.
  if (triangles > maxTriangles) {
    const ratio = Math.max(0.25, maxTriangles / triangles)
    await doc.transform(
      weld({ tolerance: 1e-4 }),
      simplify({ simplifier: MeshoptSimplifier, ratio, error: 0.0012, lockBorder: true }),
    )
    applied.push(`simplified to ~${Math.round(ratio * 100)}% of source triangles`)
  } else {
    await doc.transform(weld({ tolerance: 1e-4 }))
  }

  // Texture budget. Downscale first — a 4K normal map costs the same GPU memory
  // whether or not anyone can see the difference at 40 m.
  const textures = doc.getRoot().listTextures()
  const oversized = textures.filter((texture) => {
    const size = texture.getSize()
    return size && (size[0] > maxTexture || size[1] > maxTexture)
  })
  if (oversized.length) {
    await doc.transform(
      textureCompress({
        encoder: sharp,
        resize: [maxTexture, maxTexture],
        resizeFilter: 'lanczos3',
      }),
    )
    applied.push(`${oversized.length} texture(s) resized to ${maxTexture}px`)
  }

  /**
   * Re-encode opaque PNGs as JPEG.
   *
   * Downloaded assets very often ship every map as PNG, including base colour,
   * normal, ORM and emissive maps that carry no alpha at all. Lossless PNG on a
   * photographic map is pure download cost: the lantern's four maps alone were
   * 2.8 MB of PNG for what JPEG carries in a tenth of that, at a quality
   * difference nobody can see on a lamp post 20 m away.
   *
   * Textures that genuinely use alpha are left as PNG — foliage cut-outs and
   * decals depend on it, and destroying them to save bytes is exactly the
   * trade-off the brief (§18) says not to make.
   */
  const reencoded = []
  for (const texture of doc.getRoot().listTextures()) {
    if (texture.getMimeType() !== 'image/png') continue
    const image = texture.getImage()
    if (!image) continue
    try {
      const pipeline = sharp(Buffer.from(image))
      const stats = await pipeline.stats()
      // `isOpaque` is true when the alpha channel is absent or uniformly 255.
      if (!stats.isOpaque) continue
      const before = image.byteLength
      const jpeg = await sharp(Buffer.from(image)).jpeg({ quality: 88, mozjpeg: true }).toBuffer()
      if (jpeg.byteLength >= before) continue
      texture.setImage(new Uint8Array(jpeg)).setMimeType('image/jpeg')
      const uri = texture.getURI()
      if (uri) texture.setURI(uri.replace(/\.png$/i, '.jpg'))
      reencoded.push(before - jpeg.byteLength)
    } catch {
      // An image sharp cannot decode is left exactly as it arrived.
    }
  }
  if (reencoded.length) {
    const saved = reencoded.reduce((a, b) => a + b, 0)
    applied.push(
      `${reencoded.length} opaque PNG(s) re-encoded as JPEG, saving ${(saved / 1024 / 1024).toFixed(2)} MB`,
    )
  }

  // Duplicate materials and textures, dead nodes, unused accessors.
  await doc.transform(
    dedup(),
    join({ keepNamed: true }),
    prune({ keepAttributes: false, keepLeaves: false }),
  )
  applied.push('deduplicated and pruned')

  /**
   * Drop the second UV set where nothing reads it.
   *
   * Exporters routinely write TEXCOORD_1 for a lightmap or AO channel that the
   * shipped materials never sample. It is a full float2 per vertex — on a
   * 95 000-vertex car that is three quarters of a megabyte of nothing.
   */
  const usedUVSets = new Set()
  for (const material of doc.getRoot().listMaterials()) {
    for (const info of [
      material.getBaseColorTextureInfo(),
      material.getNormalTextureInfo(),
      material.getMetallicRoughnessTextureInfo(),
      material.getOcclusionTextureInfo(),
      material.getEmissiveTextureInfo(),
    ]) {
      if (info) usedUVSets.add(info.getTexCoord())
    }
  }
  let droppedUVs = 0
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      for (const semantic of prim.listSemantics()) {
        const match = /^TEXCOORD_(\d+)$/.exec(semantic)
        if (match && Number(match[1]) > 0 && !usedUVSets.has(Number(match[1]))) {
          prim.setAttribute(semantic, null)
          droppedUVs += 1
        }
      }
    }
  }
  if (droppedUVs) applied.push(`dropped ${droppedUVs} unused UV set(s)`)

  /**
   * Quantise, exactly as the project's own optimiser does.
   *
   * External GLBs almost always ship float32 positions, normals and UVs, which
   * is four times the memory the GPU actually needs for an object a few metres
   * across. The project's `optimize-assets.mjs` already quantises its own
   * assets to 14-bit positions and 10-bit normals, and every measurement tool
   * in the repo reads through `bounds.mjs`, which de-quantises. Matching that
   * treatment is what makes an external asset cost the same as a native one.
   */
  await doc.transform(
    quantize({
      pattern: /^(POSITION|NORMAL|TEXCOORD)/,
      quantizePosition: 14,
      quantizeNormal: 10,
      quantizeTexcoord: 12,
    }),
    prune({ keepAttributes: true }),
  )
  applied.push('quantised to the project vertex budget')

  return applied
}

export { HALF_PI }
