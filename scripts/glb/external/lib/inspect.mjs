/**
 * External asset inspection.
 *
 * Reads a dropped GLB/GLTF and reports everything the integration brief (§3)
 * asks for: dimensions, triangles, materials, textures, texture resolution,
 * bounding box, origin, transforms, normals, UVs, animations, transparency,
 * metallic workflow, roughness and missing textures.
 *
 * It reports. It does not judge — `verdict.mjs` does that, so the numbers stay
 * separable from the policy applied to them.
 */

import fs from 'node:fs'
import { getBounds } from '@gltf-transform/functions'

const IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]

function isIdentityTRS(node) {
  const t = node.getTranslation()
  const r = node.getRotation()
  const s = node.getScale()
  return (
    t[0] === 0 && t[1] === 0 && t[2] === 0 &&
    r[0] === 0 && r[1] === 0 && r[2] === 0 && Math.abs(r[3]) === 1 &&
    s[0] === 1 && s[1] === 1 && s[2] === 1
  )
}

/** Inspect one already-parsed glTF-Transform document. */
export function inspectDocument(doc, sourcePath) {
  const root = doc.getRoot()
  const scenes = root.listScenes()
  const scene = scenes[0] ?? null
  const meshes = root.listMeshes()
  const materials = root.listMaterials()
  const textures = root.listTextures()
  const animations = root.listAnimations()
  const nodes = root.listNodes()

  /* ------------------------------------------------------------- geometry */

  let triangles = 0
  let vertices = 0
  let primitives = 0
  let missingNormals = 0
  let missingUvs = 0
  let nonTriangleModes = 0
  let degenerateSets = 0
  const semantics = new Set()

  for (const mesh of meshes) {
    for (const prim of mesh.listPrimitives()) {
      primitives += 1
      const position = prim.getAttribute('POSITION')
      if (!position) {
        degenerateSets += 1
        continue
      }
      const indices = prim.getIndices()
      const mode = prim.getMode()
      // 4 === TRIANGLES; anything else can't be rasterised by our material path
      if (mode !== 4) nonTriangleModes += 1
      triangles += indices ? indices.getCount() / 3 : position.getCount() / 3
      vertices += position.getCount()
      for (const semantic of prim.listSemantics()) semantics.add(semantic)
      if (!prim.getAttribute('NORMAL')) missingNormals += 1
      if (!prim.getAttribute('TEXCOORD_0')) missingUvs += 1
    }
  }

  /* --------------------------------------------------------------- bounds */

  let bounds = null
  let nonFinite = false
  if (scene) {
    const measured = getBounds(scene)
    const finite = [...measured.min, ...measured.max].every((v) => Number.isFinite(v))
    nonFinite = !finite
    if (finite) {
      bounds = {
        min: measured.min.slice(),
        max: measured.max.slice(),
        size: [
          measured.max[0] - measured.min[0],
          measured.max[1] - measured.min[1],
          measured.max[2] - measured.min[2],
        ],
        center: [
          (measured.max[0] + measured.min[0]) / 2,
          (measured.max[1] + measured.min[1]) / 2,
          (measured.max[2] + measured.min[2]) / 2,
        ],
      }
    }
  }

  /* -------------------------------------------------------------- origin */

  // Where the author put 0,0,0 relative to the object's own footprint. An
  // origin at the centre of the bounding box means the asset will be buried to
  // its waist unless we re-seat it — which is exactly what normalise does.
  const origin = bounds
    ? {
        /** vertical offset of the lowest geometry from y=0, in metres */
        floorOffset: bounds.min[1],
        /** horizontal offset of the footprint centre from x=0,z=0 */
        lateral: [bounds.center[0], bounds.center[2]],
        centred: Math.abs(bounds.center[0]) < 0.02 && Math.abs(bounds.center[2]) < 0.02,
        grounded: Math.abs(bounds.min[1]) < 0.02,
      }
    : null

  /* ---------------------------------------------------------- transforms */

  const rootNodes = scene ? scene.listChildren() : []
  const transforms = {
    rootCount: rootNodes.length,
    /** true when every root node is at the identity transform */
    identityRoots: rootNodes.every(isIdentityTRS),
    /** negative scale flips winding and breaks lighting */
    negativeScale: nodes.some((node) => node.getScale().some((v) => v < 0)),
    /** non-uniform scale in the hierarchy distorts normals */
    nonUniformScale: nodes.some((node) => {
      const [x, y, z] = node.getScale()
      return Math.abs(x - y) > 1e-4 || Math.abs(y - z) > 1e-4
    }),
    maxDepth: (() => {
      let depth = 0
      const walk = (node, level) => {
        depth = Math.max(depth, level)
        for (const child of node.listChildren()) walk(child, level + 1)
      }
      for (const node of rootNodes) walk(node, 1)
      return depth
    })(),
    skinned: root.listSkins().length > 0,
  }
  void IDENTITY

  /* ----------------------------------------------------------- materials */

  const materialReport = materials.map((material) => {
    const base = material.getBaseColorFactor()
    const alphaMode = material.getAlphaMode()
    const slots = {
      baseColor: Boolean(material.getBaseColorTexture()),
      normal: Boolean(material.getNormalTexture()),
      metallicRoughness: Boolean(material.getMetallicRoughnessTexture()),
      occlusion: Boolean(material.getOcclusionTexture()),
      emissive: Boolean(material.getEmissiveTexture()),
    }
    return {
      name: material.getName() || '(unnamed)',
      metallic: material.getMetallicFactor(),
      roughness: material.getRoughnessFactor(),
      baseColor: base.slice(0, 3),
      opacity: base[3],
      alphaMode,
      alphaCutoff: material.getAlphaCutoff(),
      doubleSided: material.getDoubleSided(),
      emissive: material.getEmissiveFactor().some((v) => v > 0.001),
      textured: Object.values(slots).some(Boolean),
      slots,
      /**
       * Diagnostics the brief calls out in §6. These are *observations*: a bare
       * material is not automatically wrong (this project's own GLBs are bare
       * by design and get their PBR at runtime), it just means the runtime has
       * to supply the surface.
       */
      flags: {
        // untextured + mid metalness + mid roughness = the "grey plastic" look
        plasticLook: !Object.values(slots).some(Boolean) && material.getRoughnessFactor() > 0.45 && material.getMetallicFactor() < 0.25,
        // half-metal is not a real material: metals are 1, dielectrics are 0
        ambiguousMetalness: material.getMetallicFactor() > 0.15 && material.getMetallicFactor() < 0.85,
        mirrorFinish: material.getRoughnessFactor() < 0.04,
        chalk: material.getRoughnessFactor() > 0.97 && material.getMetallicFactor() > 0.5,
        // transparency declared but fully opaque, or opaque mode with alpha < 1
        brokenTransparency:
          (alphaMode === 'BLEND' && base[3] > 0.995 && !slots.baseColor) ||
          (alphaMode === 'OPAQUE' && base[3] < 0.995),
        // out-of-gamut / neon albedo: real surfaces sit under ~0.9 linear
        unrealisticColor: base.slice(0, 3).some((v) => v > 0.94) && base.slice(0, 3).some((v) => v < 0.06),
      },
    }
  })

  /* ------------------------------------------------------------ textures */

  let textureBytes = 0
  let missingTextures = 0
  let maxTextureSize = 0
  const textureReport = textures.map((texture) => {
    const image = texture.getImage()
    const size = texture.getSize()
    if (!image || image.byteLength === 0) missingTextures += 1
    if (image) textureBytes += image.byteLength
    if (size) maxTextureSize = Math.max(maxTextureSize, size[0], size[1])
    return {
      name: texture.getName() || texture.getURI() || '(embedded)',
      mimeType: texture.getMimeType(),
      size: size ? [size[0], size[1]] : null,
      bytes: image ? image.byteLength : 0,
      uri: texture.getURI() || null,
      resolved: Boolean(image && image.byteLength),
    }
  })

  /* ---------------------------------------------------------- duplicates */

  // Cheap content hash: identical byte length AND identical first/last 64 bytes.
  const seen = new Map()
  let duplicateTextures = 0
  for (const texture of textures) {
    const image = texture.getImage()
    if (!image || !image.byteLength) continue
    const head = Buffer.from(image.buffer, image.byteOffset, Math.min(64, image.byteLength)).toString('hex')
    const tail = Buffer.from(
      image.buffer,
      image.byteOffset + Math.max(0, image.byteLength - 64),
      Math.min(64, image.byteLength),
    ).toString('hex')
    const key = `${image.byteLength}:${head}:${tail}`
    if (seen.has(key)) duplicateTextures += 1
    else seen.set(key, true)
  }

  const materialSignatures = new Set(
    materialReport.map((m) =>
      [m.metallic.toFixed(3), m.roughness.toFixed(3), m.baseColor.map((v) => v.toFixed(3)).join(','), m.alphaMode].join('|'),
    ),
  )
  const duplicateMaterials = Math.max(0, materials.length - materialSignatures.size)

  /* ----------------------------------------------------------- hidden geometry */

  // Meshes referenced by no node in the active scene are dead weight.
  const usedMeshes = new Set()
  if (scene) {
    const walk = (node) => {
      const mesh = node.getMesh()
      if (mesh) usedMeshes.add(mesh)
      for (const child of node.listChildren()) walk(child)
    }
    for (const node of scene.listChildren()) walk(node)
  }
  const orphanMeshes = meshes.filter((mesh) => !usedMeshes.has(mesh)).length

  const fileBytes = sourcePath && fs.existsSync(sourcePath) ? fs.statSync(sourcePath).size : 0

  return {
    file: sourcePath,
    fileBytes,
    scenes: scenes.length,
    meshes: meshes.length,
    primitives,
    nodes: nodes.length,
    triangles: Math.round(triangles),
    vertices,
    materials: materials.length,
    textures: textures.length,
    textureBytes,
    maxTextureSize,
    missingTextures,
    duplicateTextures,
    duplicateMaterials,
    orphanMeshes,
    animations: animations.map((animation) => ({
      name: animation.getName() || '(unnamed)',
      channels: animation.listChannels().length,
    })),
    extensions: root.listExtensionsUsed().map((extension) => extension.extensionName),
    hasNormals: missingNormals === 0 && primitives > 0,
    hasUvs: missingUvs === 0 && primitives > 0,
    missingNormals,
    missingUvs,
    nonTriangleModes,
    degenerateSets,
    semantics: [...semantics].sort(),
    nonFinite,
    bounds,
    origin,
    transforms,
    materialReport,
    textureReport,
    transparent: materialReport.filter((m) => m.alphaMode !== 'OPAQUE').length,
  }
}
