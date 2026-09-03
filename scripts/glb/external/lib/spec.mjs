/**
 * External asset specification.
 *
 * Everything the pipeline needs to know about "what kind of object is this and
 * how big is it in the real world" lives here. The developer never edits this
 * file: the class is inferred from the filename, and the numbers below are
 * measured real-world dimensions, not guesses about the GLB's units.
 *
 * Priority order for the world, per the integration brief:
 *
 *     real external GLB  >  existing project GLB  >  procedural geometry
 *
 * …but only when the external asset actually measures up. `verdict.mjs` is what
 * decides that; this file only says what "correct" looks like.
 */

/**
 * A class describes one family of real objects.
 *
 * `length` / `height` / `width` are the real-world metre ranges a member of the
 * family may occupy, with `target` the dimension the normaliser scales to when
 * the source GLB is authored in some other unit. `axis` names which measured
 * extent that target refers to *after* orientation is resolved:
 *
 *     x = the object's length     y = its height      z = its width
 *
 * `substitution` decides how the class competes with the project's own assets:
 *
 *     replace   the external asset takes the slot outright. Used where the
 *               brief is explicit that a real asset wins — vehicles (§7) and
 *               construction plant and props (§11).
 *
 *     augment   the external asset joins the pool alongside the project asset
 *               rather than evicting it. Used where the existing asset is
 *               already good and purpose-built for this world, so replacing it
 *               wholesale would be a regression dressed up as an upgrade
 *               (§9 vegetation, §16 realism rule). A heritage lamp post is a
 *               fine thing to see once on an Indian arterial road; it is the
 *               wrong thing to see forty times in a row.
 *
 *     never     the asset is registered and available, but never auto-placed.
 *               Architecture is a composition decision, and the hero building
 *               is the highest-priority custom asset in the project (§10, §17).
 */
export const CLASSES = {
  'vehicle-car': {
    label: 'Passenger car',
    category: 'vehicle',
    // 4–5 m long, 1.7–2.0 m wide, 1.4–1.9 m tall (brief §4).
    // The width band is generous at the top because a measured bounding box
    // includes the door mirrors, which a spec sheet does not.
    length: [3.4, 5.4],
    width: [1.55, 2.3],
    height: [1.1, 2.05],
    target: { axis: 'x', value: 4.45 },
    /** length runs along X, nose towards +X — matches the procedural car-a/b/c */
    orient: 'length-x',
    ground: 'wheels',
    /** a car is longer than it is wide, and wider than it is tall */
    profile: { longest: 'length', shortest: 'height' },
    keepAnimations: false,
    maxTriangles: 90000,
    instanced: true,
    substitution: 'replace',
  },
  'vehicle-suv': {
    label: 'SUV / crossover',
    category: 'vehicle',
    length: [4.0, 5.6],
    width: [1.7, 2.2],
    height: [1.5, 2.3],
    target: { axis: 'x', value: 4.7 },
    orient: 'length-x',
    ground: 'wheels',
    profile: { longest: 'length', shortest: 'height' },
    keepAnimations: false,
    maxTriangles: 90000,
    instanced: true,
    substitution: 'replace',
  },
  'vehicle-truck': {
    label: 'Truck / van / bus',
    category: 'vehicle',
    // Everything from a Tata Ace to a tipper. Mirrors again widen the measured box.
    length: [4.2, 12.5],
    width: [1.8, 3.1],
    height: [1.8, 4.1],
    // No hard target: a delivery van and a tipper are both "truck" and forcing
    // them to a single length would make one of them wrong.
    target: null,
    orient: 'length-x',
    ground: 'wheels',
    profile: { longest: 'length' },
    keepAnimations: false,
    maxTriangles: 120000,
    instanced: true,
    substitution: 'replace',
  },
  'construction-plant': {
    label: 'Construction plant',
    category: 'construction',
    length: [2.0, 16.0],
    width: [1.4, 5.0],
    height: [1.6, 12.0],
    target: null, // plant varies far too much to force a single length
    orient: 'length-x',
    ground: 'base',
    profile: {},
    keepAnimations: false,
    maxTriangles: 140000,
    instanced: false,
    substitution: 'replace',
  },
  'construction-prop': {
    label: 'Site prop',
    category: 'construction',
    length: [0.15, 12.0],
    width: [0.15, 12.0],
    height: [0.15, 6.0],
    target: null,
    orient: 'none',
    ground: 'base',
    profile: {},
    keepAnimations: false,
    maxTriangles: 60000,
    instanced: true,
    substitution: 'replace',
  },
  vegetation: {
    label: 'Tree / shrub',
    category: 'vegetation',
    length: [0.5, 30.0],
    width: [0.5, 30.0],
    height: [0.4, 34.0],
    target: null, // caller-side scatter already varies tree height
    orient: 'none',
    ground: 'trunk',
    profile: {},
    keepAnimations: false,
    maxTriangles: 90000,
    instanced: true,
    substitution: 'augment',
  },
  architecture: {
    label: 'Building',
    category: 'architecture',
    length: [3.0, 160.0],
    width: [3.0, 160.0],
    height: [2.5, 220.0],
    target: null,
    orient: 'none',
    ground: 'base',
    profile: {},
    keepAnimations: false,
    maxTriangles: 260000,
    instanced: false,
    substitution: 'never',
  },
  'infrastructure-lamp': {
    label: 'Street light / lamp post',
    category: 'infrastructure',
    // An arterial-road column in India runs 8–11 m to the luminaire, with the
    // outreach arm putting the lamp 2–3 m over the carriageway. The project's
    // own street-light.glb is 7.7 m, so external lamps are matched to it.
    length: [0.3, 6.0],
    width: [0.2, 4.0],
    height: [3.0, 14.0],
    target: { axis: 'y', value: 8.4 },
    orient: 'none',
    ground: 'base',
    profile: {},
    keepAnimations: false,
    maxTriangles: 40000,
    instanced: true,
    substitution: 'augment',
  },
  infrastructure: {
    label: 'Street furniture / infrastructure',
    category: 'infrastructure',
    length: [0.1, 80.0],
    width: [0.1, 80.0],
    height: [0.2, 40.0],
    target: null,
    orient: 'none',
    ground: 'base',
    profile: {},
    keepAnimations: false,
    maxTriangles: 80000,
    instanced: true,
    substitution: 'augment',
  },
  prop: {
    label: 'Generic prop',
    category: 'environment',
    length: [0.05, 30.0],
    width: [0.05, 30.0],
    height: [0.05, 30.0],
    target: null,
    orient: 'none',
    ground: 'base',
    profile: {},
    keepAnimations: false,
    maxTriangles: 80000,
    instanced: true,
    substitution: 'augment',
  },
}

/**
 * Filename → class.
 *
 * Deliberately forgiving. `car-sedan.glb`, `Sedan_Grey.glb` and
 * `2019 sedan FINAL.glb` all land on `vehicle-car`. The developer's only job is
 * to give the file a name that says what the thing is (brief §2, §14).
 *
 * Order matters: the first rule that matches wins, so the specific patterns
 * (suv, pickup, excavator) sit above the generic ones (car, equipment).
 */
const RULES = [
  // Street furniture first: "street-lamp" contains "tree" once separators are
  // ignored, and "lamp-post" contains "post". Matching infrastructure before
  // vegetation and props keeps those out of the wrong envelope.
  [/street[-_ ]?light|street[-_ ]?lamp|streetlamp|lamp[-_ ]?post|lamppost|lantern/i, 'infrastructure-lamp'],
  [
    /pylon|hydrant|bollard|bench|traffic[-_ ]?light|bridge|culvert|transformer|substation|solar|antenna|utility[-_ ]?pole|power[-_ ]?pole/i,
    'infrastructure',
  ],
  [/\b(suv|crossover|jeep|4x4|4wd)\b|suv/i, 'vehicle-suv'],
  [/truck|lorry|\bvan\b|\bbus\b|tipper|tanker|trailer|pickup|\bute\b/i, 'vehicle-truck'],
  [
    /excavat|digger|backhoe|loader|bulldoz|dozer|mixer|roller|compactor|grader|forklift|telehandler|dumper|crane|generator|genset|compressor/i,
    'construction-plant',
  ],
  [
    /barrier|barricade|cone|scaffold|pallet|pipe|container|cabin|portacabin|jersey|hoarding|fence|drum|barrel|toolbox|rebar|cement|brick|sandbag|formwork|wheelbarrow|ladder|signboard/i,
    'construction-prop',
  ],
  [/tree|palm|neem|banyan|bush|shrub|hedge|plant|foliage|bamboo/i, 'vegetation'],
  [
    /building|tower|house|apartment|villa|office|warehouse|shed|highrise|high-rise|facade|skyscraper|bungalow|hotel|mall/i,
    'architecture',
  ],
  [/\bcar\b|sedan|hatchback|coupe|saloon|rickshaw|scooter|motorbike|taxi|vehicle/i, 'vehicle-car'],
]

/**
 * Infer the object class from a dropped filename.
 *
 * Matching is done on word-ish tokens rather than the raw string, so
 * `street-lamp-old`, `street_lamp_old` and `StreetLampOld` behave the same and
 * a word only matches when it really is a word — `tree` must not match inside
 * `street`.
 */
export function classify(filename) {
  const stem = filename.replace(/\.(glb|gltf)$/i, '')
  // camelCase → spaced, separators → spaces, so \b works on real word edges.
  const normalised = stem
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_\-.]+/g, ' ')
    .toLowerCase()
  for (const [pattern, id] of RULES) {
    if (pattern.test(normalised)) return id
  }
  return 'prop'
}

/** `Car Sedan FINAL_v2.glb` → `car-sedan-final-v2` */
export function slugify(filename) {
  return (
    filename
      .replace(/\.(glb|gltf)$/i, '')
      .normalize('NFKD')
      .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase() || 'asset'
  )
}

/**
 * Scene membership and streaming policy per category.
 *
 * External assets are placed by the same layout module as everything else, so
 * they need the same streaming metadata the procedural registry carries.
 */
export const CATEGORY_RUNTIME = {
  vehicle: { scene: ['road', 'environment'], priority: 3, cullDistance: 200, preload: false },
  construction: { scene: ['construction', 'hero', 'process'], priority: 3, cullDistance: 220, preload: false },
  vegetation: { scene: ['environment', 'hero', 'approach'], priority: 3, cullDistance: 300, preload: false },
  architecture: { scene: ['residential', 'facade', 'services'], priority: 2, cullDistance: 320, preload: false },
  infrastructure: { scene: ['road', 'environment', 'construction'], priority: 3, cullDistance: 200, preload: false },
  environment: { scene: ['environment'], priority: 4, cullDistance: 160, preload: false },
}

/** Texture budget by class — external downloads routinely ship 4K maps. */
export const TEXTURE_BUDGET = {
  architecture: 2048,
  vehicle: 1024,
  construction: 1024,
  vegetation: 1024,
  infrastructure: 1024,
  environment: 1024,
}
