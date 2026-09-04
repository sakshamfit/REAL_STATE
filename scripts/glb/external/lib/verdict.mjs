/**
 * External asset verdict.
 *
 * Turns an inspection report into ACCEPT / REPAIR / REJECT.
 *
 * The brief's realism rule (§16) says it plainly: external is not automatically
 * realistic, and a bad downloaded asset is worse than a good procedural one. So
 * this module is deliberately willing to say no. Anything it *can* fix without
 * a human (units, origin, orientation, oversized textures, stray animation)
 * comes back as REPAIR with an explicit list of what normalise will do.
 *
 * Errors reject the asset. Repairs are applied automatically. Warnings are
 * recorded, shown, and otherwise tolerated.
 */

import { CLASSES } from './spec.mjs'

const MAX_FILE_BYTES = 12_000_000
const MAX_TEXTURE_BYTES = 24_000_000

/**
 * Does the measured box plausibly belong to this class at *some* uniform scale?
 *
 * This is the unit-agnostic test. A car exported in centimetres measures
 * 445 × 130 × 180; a car exported in metres measures 4.45 × 1.3 × 1.8. Both are
 * cars. What tells them apart from a non-car is the *ratio* between the sides,
 * which no unit change can alter.
 */
function shapeMatches(spec, size) {
  const sorted = [...size].sort((a, b) => b - a)
  const [longest, , shortest] = sorted
  if (longest <= 0) return { ok: false, reason: 'zero-sized bounding box' }
  if (shortest <= 0) return { ok: false, reason: 'flat bounding box (a degenerate axis)' }

  // The widest aspect ratio the class can legitimately reach, derived from the
  // envelope itself: longest possible side over shortest possible side. A class
  // with a broad envelope (site props run from a cone to a container) therefore
  // gets a broad tolerance automatically, and a tightly specified class like a
  // car gets a tight one.
  const bounds = [spec.length, spec.width, spec.height]
  const maxSide = Math.max(...bounds.map(([, hi]) => hi))
  const minSide = Math.min(...bounds.map(([lo]) => lo))
  const permitted = (maxSide / minSide) * 1.3

  const actual = longest / shortest
  if (actual > permitted) {
    return {
      ok: false,
      reason: `aspect ratio ${actual.toFixed(1)}:1 is not a plausible ${spec.label.toLowerCase()} (max ${permitted.toFixed(
        1,
      )}:1)`,
    }
  }

  // A class that states a definite profile also states which axis must win.
  // For a car: longer than it is wide, wider than it is tall. This is what
  // catches a model imported on its side or nose-up.
  if (spec.profile?.longest === 'length' && size[0] < Math.max(size[1], size[2]) * 0.98) {
    return { ok: false, reason: 'the longest axis is not the length — asset is rotated or mis-classified' }
  }
  if (spec.profile?.shortest === 'height' && size[1] > Math.min(size[0], size[2]) * 1.02) {
    return { ok: false, reason: 'taller than it is wide — not a passenger car silhouette' }
  }

  return { ok: true }
}

/** Uniform scale that puts the asset into real-world metres for its class. */
export function scaleFor(spec, size) {
  if (!size || size.every((v) => v === 0)) return 1

  if (spec.target) {
    const index = spec.target.axis === 'x' ? 0 : spec.target.axis === 'y' ? 1 : 2
    // The target axis is stated in the object's own frame; the caller has
    // already oriented the asset, so the measured extent on that axis is the
    // one to match.
    const measured = size[index]
    const [lo, hi] = spec.target.axis === 'y' ? spec.height : spec.target.axis === 'z' ? spec.width : spec.length
    // An asset already authored at a believable real-world size is left alone.
    // The target exists to rescue centimetre and inch exports, not to force
    // every car in the world to be exactly 4.45 m long — that would erase the
    // variation between a hatchback and an estate (brief §8).
    if (measured >= lo && measured <= hi) return 1
    if (measured > 0) return spec.target.value / measured
  }

  // No hard target: bring the asset inside the class envelope with the smallest
  // uniform correction that makes every axis plausible. This is what catches
  // centimetre and inch exports for trees, plant and buildings.
  // Axis alignment: size is oriented [x, y, z] — x length, y height, z width.
  const axes = [
    { band: spec.length, value: size[0] },
    { band: spec.height, value: size[1] },
    { band: spec.width, value: size[2] },
  ]
  const fits = (candidate) =>
    axes.every(({ band, value }) => {
      const scaled = value * candidate
      return scaled >= band[0] && scaled <= band[1]
    })

  let scale = 1
  const longest = Math.max(...axes.map(({ value }) => value))
  const loosest = [...axes].sort((a, b) => (b.band[0] + b.band[1]) / 2 - (a.band[0] + a.band[1]) / 2)[0]
  if (longest > loosest.band[1]) scale = loosest.band[1] / longest
  else if (longest < loosest.band[0]) scale = loosest.band[0] / longest

  // The largest-axis correction can still leave a *different* axis outside its
  // band (a tall export whose height, not length, is the constraint). Try
  // scaling each measured axis onto the top of its own band and keep the first
  // candidate that lands every axis inside the envelope.
  if (!fits(scale)) {
    const fallbacks = axes
      .map(({ band, value }) => (value > 0 ? band[1] / value : 1))
      .sort((a, b) => b - a)
    for (const candidate of fallbacks) {
      if (fits(candidate)) {
        scale = candidate
        break
      }
    }
  }

  // Snap to a recognisable unit conversion when we are close to one: assets are
  // almost always authored in m, cm, mm or inches, and a clean 0.01 reads far
  // better than 0.0103.
  for (const candidate of [1, 0.01, 0.001, 0.0254, 0.3048, 100, 1000]) {
    if (scale > 0 && Math.abs(scale / candidate - 1) < 0.12) return candidate
  }
  return scale
}

/**
 * Decide what happens to an inspected asset.
 *
 * @returns {{status:'accept'|'repair'|'reject', errors:string[], warnings:string[], repairs:string[], plan:object}}
 */
export function judge(report, classId) {
  const spec = CLASSES[classId] ?? CLASSES.prop
  const errors = []
  const warnings = []
  const repairs = []
  const plan = {
    scale: 1,
    /** yaw in radians applied before scaling, to put length on +X */
    yaw: 0,
    /** re-seat the lowest geometry on y=0 and centre the footprint */
    reseat: false,
    dropAnimations: false,
    resizeTextures: 0,
    dedupe: false,
    recomputeNormals: false,
    generateUvs: false,
  }

  /* ------------------------------------------------------- hard rejections */

  if (report.scenes < 1) errors.push('no scene')
  if (report.meshes < 1) errors.push('no meshes')
  if (report.primitives < 1) errors.push('no primitives')
  if (report.degenerateSets > 0) errors.push(`${report.degenerateSets} primitive(s) without POSITION`)
  if (report.nonFinite) errors.push('non-finite vertex data (NaN / Infinity)')
  if (!report.bounds) errors.push('bounding box could not be measured')
  if (report.nonTriangleModes > 0) {
    errors.push(`${report.nonTriangleModes} primitive(s) are not triangle meshes`)
  }
  if (report.transforms.negativeScale) {
    errors.push('negative node scale (inverted winding — re-export with applied transforms)')
  }
  if (report.materials < 1) errors.push('no materials')

  if (errors.length) return { status: 'reject', errors, warnings, repairs, plan, spec }

  /* --------------------------------------------------------------- scale */

  const size = report.bounds.size

  // Orientation first: `length-x` classes want their longest horizontal axis
  // running along X, because that is how the procedural vehicles are authored
  // and how `layout.ts` rotates them into lanes.
  if (spec.orient === 'length-x' && size[2] > size[0] * 1.15) {
    plan.yaw = Math.PI / 2
    repairs.push('rotated 90° so the length runs along X')
  }
  const oriented = plan.yaw !== 0 ? [size[2], size[1], size[0]] : size.slice()

  const shape = shapeMatches(spec, oriented)
  if (!shape.ok) {
    errors.push(`${shape.reason} — wrong asset for its filename, or a broken export`)
    return { status: 'reject', errors, warnings, repairs, plan, spec }
  }

  const scale = scaleFor(spec, oriented)
  plan.scale = scale
  const scaled = oriented.map((v) => v * scale)

  if (Math.abs(scale - 1) > 0.02) {
    repairs.push(
      `scaled ×${scale < 0.01 ? scale.toExponential(2) : scale.toFixed(4)} — measured ${oriented
        .map((v) => v.toFixed(2))
        .join('×')} → ${scaled.map((v) => v.toFixed(2)).join('×')} m`,
    )
  }

  // Post-scale sanity: the class envelope is the last word on real-world size.
  const axes = [
    ['length', scaled[0], spec.length],
    ['height', scaled[1], spec.height],
    ['width', scaled[2], spec.width],
  ]
  /**
   * Typicality — how ordinary an example of its class this asset is.
   *
   * Passing the envelope means the object is *plausible*. It does not mean it
   * is *representative*, and for placement those are different questions. A
   * 1.15 m-tall concept supercar is a real car and clears every structural
   * check, but making it the hero vehicle on an Indian construction site is
   * the same mistake as lining the road with heritage lamp posts: technically
   * valid, contextually wrong (§6).
   *
   * Each axis outside its band costs a point. The runtime uses the score to
   * decide whether an asset leads the pool or fills the background, so an
   * unusual model still earns its place — just not in the foreground.
   */
  let offAxis = 0
  for (const [name, value, [lo, hi]] of axes) {
    if (value < lo * 0.72 || value > hi * 1.38) {
      errors.push(`${name} ${value.toFixed(2)} m is outside the plausible ${lo}–${hi} m for a ${spec.label.toLowerCase()}`)
    } else if (value < lo || value > hi) {
      offAxis += 1
      warnings.push(`${name} ${value.toFixed(2)} m sits just outside the typical ${lo}–${hi} m band`)
    }
  }
  plan.typicality = offAxis === 0 ? 'typical' : offAxis === 1 ? 'unusual' : 'atypical'
  if (offAxis >= 2) {
    warnings.push(
      `proportions are atypical for a ${spec.label.toLowerCase()} — kept, but placed in the background rather than the foreground`,
    )
  }
  if (errors.length) return { status: 'reject', errors, warnings, repairs, plan, spec }

  /* ------------------------------------------------------------ grounding */

  const floor = report.bounds.min[1] * scale
  const lateral = [report.bounds.center[0] * scale, report.bounds.center[2] * scale]
  if (Math.abs(floor) > 0.01 || Math.hypot(...lateral) > 0.01) {
    plan.reseat = true
    const parts = []
    if (Math.abs(floor) > 0.01) {
      parts.push(floor > 0 ? `lifted ${floor.toFixed(2)} m off the ground` : `sunk ${Math.abs(floor).toFixed(2)} m`)
    }
    if (Math.hypot(...lateral) > 0.01) parts.push(`origin ${Math.hypot(...lateral).toFixed(2)} m off centre`)
    repairs.push(`re-seated on y=0 and centred (${parts.join(', ')})`)
  }

  /* ------------------------------------------------------------ geometry */

  if (!report.hasNormals) {
    plan.recomputeNormals = true
    repairs.push(`recomputed normals for ${report.missingNormals} primitive(s)`)
  }
  if (!report.hasUvs) {
    plan.generateUvs = true
    warnings.push(`${report.missingUvs} primitive(s) have no UVs — flat UVs generated, textures may look wrong`)
  }
  if (report.triangles > spec.maxTriangles) {
    warnings.push(`${report.triangles.toLocaleString()} triangles exceeds the ${spec.maxTriangles.toLocaleString()} budget — simplified`)
  }
  if (report.transforms.skinned) {
    warnings.push('asset is skinned; skinning is dropped for static placement')
  }

  /* ---------------------------------------------------------- animations */

  if (report.animations.length && !spec.keepAnimations) {
    plan.dropAnimations = true
    repairs.push(`dropped ${report.animations.length} unused animation(s)`)
  }

  /* ------------------------------------------------------------ textures */

  if (report.missingTextures > 0) {
    errors.push(`${report.missingTextures} texture(s) could not be resolved (missing image files)`)
  }
  if (report.textureBytes > MAX_TEXTURE_BYTES) {
    warnings.push(`${(report.textureBytes / 1e6).toFixed(1)} MB of texture data — downscaled`)
  }
  if (report.duplicateTextures > 0 || report.duplicateMaterials > 0) {
    plan.dedupe = true
    repairs.push(
      `de-duplicated ${report.duplicateTextures} texture(s) and ${report.duplicateMaterials} material(s)`,
    )
  }
  if (report.orphanMeshes > 0) {
    repairs.push(`pruned ${report.orphanMeshes} mesh(es) not referenced by the scene`)
  }

  /* ----------------------------------------------------------- materials */

  const plastic = report.materialReport.filter((m) => m.flags.plasticLook)
  const ambiguous = report.materialReport.filter((m) => m.flags.ambiguousMetalness && !m.slots.metallicRoughness)
  const mirrors = report.materialReport.filter((m) => m.flags.mirrorFinish && !m.slots.metallicRoughness)
  const chalk = report.materialReport.filter((m) => m.flags.chalk)
  const broken = report.materialReport.filter((m) => m.flags.brokenTransparency)
  const neon = report.materialReport.filter((m) => m.flags.unrealisticColor)

  // Note, do not auto-fix: the brief (§6) is explicit that good materials must
  // be preserved. Correction happens at runtime, per material, and only where
  // the material has no texture of its own to lose.
  if (plastic.length) warnings.push(`${plastic.length} untextured material(s) read as plastic — runtime PBR applied`)
  if (ambiguous.length) warnings.push(`${ambiguous.length} material(s) have ambiguous metalness — clamped at runtime`)
  if (mirrors.length) warnings.push(`${mirrors.length} material(s) are near-mirror — roughness floored at runtime`)
  if (chalk.length) warnings.push(`${chalk.length} metallic material(s) are fully rough — corrected at runtime`)
  if (broken.length) warnings.push(`${broken.length} material(s) have inconsistent transparency — corrected at runtime`)
  if (neon.length) warnings.push(`${neon.length} material(s) use out-of-gamut colour — tamed at runtime`)

  if (report.materials > 0 && report.textures === 0) {
    warnings.push('no textures — the runtime material library supplies the surface')
  }

  /* ---------------------------------------------------------------- size */

  if (report.fileBytes > MAX_FILE_BYTES) {
    warnings.push(`${(report.fileBytes / 1e6).toFixed(1)} MB source — optimised output is what ships`)
  }

  return {
    status: repairs.length ? 'repair' : 'accept',
    errors,
    warnings,
    repairs,
    plan,
    spec,
    measured: { raw: size, oriented, scaled },
  }
}
