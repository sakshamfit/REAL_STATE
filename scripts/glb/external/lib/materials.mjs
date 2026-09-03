/**
 * External material mapping.
 *
 * The project's own GLBs carry semantic material names (`concrete`, `glass`,
 * `rubber`) and get their PBR from the runtime library. External assets carry
 * whatever the original artist called them — `Paint 1 Carmine`, `Tiretread`,
 * `LanternPost_Mat` — and usually carry real textures too.
 *
 * The brief (§6) is explicit: do not automatically replace good materials.
 * So this module produces a *hint* map, not a replacement map. For each
 * external material it records which project material key the surface most
 * resembles. The runtime uses that hint only where the external material has no
 * texture of its own to lose; a textured external material keeps its textures
 * and receives at most a numeric correction.
 */

/**
 * Name fragments → project material key.
 *
 * Ordered: the first match wins, so `tiretread` resolves to rubber before the
 * generic `tread` or the substring `re` in anything else could interfere.
 */
const NAME_HINTS = [
  [/tire|tyre|rubber|tread/i, 'rubber'],
  [/rim|wheel|alloy|hubcap/i, 'rim'],
  [/glass|window|windshield|windscreen|screen|glazing/i, 'glass'],
  [/headlight|headlamp|light|lamp|lens/i, 'light'],
  [/taillight|brakelight|tail|signal|indicator/i, 'tail'],
  [/mirror|chrome|polished/i, 'metal'],
  [/paint|body|carpaint|shell|bodywork/i, 'carA'],
  [/interior|seat|dash|cabin|upholst|leather|fabric|floormat/i, 'interior'],
  [/plate|licen|number/i, 'plate'],
  [/plastic|trim|bumper|panel/i, 'plastic'],
  [/rust|corro|oxid/i, 'rust'],
  [/steel|metal|iron|alum|mechanical|hardware|chassis|frame/i, 'metal'],
  [/concrete|cement|kerb|curb/i, 'concrete'],
  [/brick|masonry/i, 'brick'],
  [/stone|granite|marble/i, 'stone'],
  [/asphalt|tarmac|road/i, 'asphalt'],
  [/soil|dirt|mud|earth|ground/i, 'soil'],
  [/sand/i, 'sand'],
  [/gravel|aggregate|ballast/i, 'gravel'],
  [/grass|turf|lawn/i, 'grass'],
  [/bark|trunk|wood|timber|log|branch/i, 'wood'],
  [/leaf|leaves|foliage|canopy|frond|needle/i, 'leaf'],
  [/render|plaster|stucco|paint(ed)?wall/i, 'render'],
  [/safety|hazard|hi-?vis|orange|warning/i, 'safety'],
  [/tarp|canvas|cover/i, 'tarp'],
  [/sack|bag|cloth/i, 'sack'],
  [/solar|panel(dark)?|pv\b/i, 'panelDark'],
]

/** Luminance of a linear RGB triple. */
const luma = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b

/**
 * Guess a project material key from the numbers alone.
 *
 * Used when the name says nothing (`Material.001`, `(unnamed)`). It is a coarse
 * classification — metal vs glass vs dark rubber vs painted surface — but it is
 * enough for the runtime to pick a believable substitute for an untextured
 * material.
 */
function keyFromNumbers(material) {
  if (material.alphaMode !== 'OPAQUE' && material.opacity < 0.9) return 'glass'
  if (material.emissive) return 'light'
  if (material.metallic > 0.75) return material.roughness < 0.35 ? 'metal' : 'darkMetal'
  const brightness = luma(material.baseColor)
  if (brightness < 0.06 && material.roughness > 0.7) return 'rubber'
  if (material.roughness > 0.85) return brightness > 0.55 ? 'concrete' : 'soil'
  if (material.roughness < 0.35) return 'carA'
  return 'plastic'
}

/**
 * Build the material map for one built external asset.
 *
 * @returns Record<glbMaterialName, { key, preserve, corrections }>
 */
export function materialMapFor(report, spec) {
  const map = {}

  for (const material of report.materialReport) {
    const name = material.name
    let key = null
    for (const [pattern, candidate] of NAME_HINTS) {
      if (pattern.test(name)) {
        key = candidate
        break
      }
    }
    if (!key) key = keyFromNumbers(material)

    // Vehicles are the one class where the project has body-paint variants, so
    // a paint material becomes a *slot* the runtime can recolour per instance
    // (brief §8: vary colour where the material setup permits).
    const paintSlot = spec.category === 'vehicle' && /paint|body|shell/i.test(name) && !material.slots.baseColor

    /**
     * Corrections are numeric nudges applied at runtime to an otherwise
     * preserved material. Each one addresses a defect named in brief §6, and
     * each is skipped when the material has a texture that already answers it.
     */
    const corrections = {}
    if (material.flags.ambiguousMetalness && !material.slots.metallicRoughness) {
      // Metalness is physically binary. Anything in between is an authoring
      // error and reads as dirty plastic under a real sun.
      corrections.metalness = material.metallic > 0.5 ? 1 : 0
    }
    if (material.flags.mirrorFinish && !material.slots.metallicRoughness) {
      // Nothing outdoors is a perfect mirror; even fresh clearcoat has micro-roughness.
      corrections.roughness = 0.08
    }
    if (material.flags.chalk) {
      corrections.roughness = 0.62
    }
    if (material.flags.brokenTransparency) {
      corrections.alphaMode = material.opacity < 0.995 ? 'BLEND' : 'OPAQUE'
    }
    if (material.flags.unrealisticColor && !material.slots.baseColor) {
      // Pull an out-of-gamut albedo back towards a physically plausible range.
      corrections.clampColor = [0.03, 0.9]
    }
    if (material.flags.plasticLook) {
      // No texture, mid roughness, low metalness: the runtime library has a
      // better version of this surface than the export does.
      corrections.substitute = true
    }

    map[name] = {
      key,
      /** keep the external material and only correct it */
      preserve: material.textured,
      paintSlot,
      corrections,
    }
  }

  return map
}
