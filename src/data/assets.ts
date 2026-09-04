/**
 * Asset registry — the single place that describes every production GLB.
 *
 * Adding a future building / vehicle / environment asset is one entry here.
 * The runtime `AssetModel` component loads the GLB, applies the shared PBR
 * material library and registers it for progressive preload by priority.
 *
 * Two kinds of asset live in this registry:
 *
 *   **project GLBs** — authored by `scripts/glb/generate-assets.mjs`, listed
 *   explicitly below, materials supplied at runtime from the shared library.
 *
 *   **external GLBs** — dropped by the developer into `public/assets/external/`
 *   and registered automatically by `npm run assets:build`. They are appended
 *   from the generated manifest at the bottom of this file, so an external
 *   asset is never hard-coded into a React component (brief §13).
 */

import manifest from './external-manifest.json'

export type AssetPriority = 1 | 2 | 3 | 4

export type AssetCategory =
  | 'architecture'
  | 'gate'
  | 'vegetation'
  | 'vehicle'
  | 'construction'
  | 'environment'
  | 'infrastructure'

export type AssetLod = 'high' | 'medium' | 'low'

export type AssetMaterialMap = Record<string, string>

/**
 * How the runtime should treat one material inside an external GLB.
 *
 * Produced by the external build from a measured inspection of the material —
 * never hand-written. `preserve` means the asset shipped real textures for this
 * surface and they are kept; `corrections` are the numeric defects worth fixing
 * regardless (brief §6).
 */
export type ExternalMaterialRule = {
  /** nearest project material-library key, used when substituting */
  key: string
  /** the external material has its own textures and should be kept */
  preserve: boolean
  /** this is a flat body-paint surface that may be recoloured per instance */
  paintSlot: boolean
  corrections: {
    metalness?: number
    roughness?: number
    alphaMode?: 'BLEND' | 'OPAQUE'
    clampColor?: [number, number]
    /** replace outright with the project material library */
    substitute?: boolean
  }
}

export type AssetEntry = {
  id: string
  /** browser path under /public */
  path: string
  category: AssetCategory
  priority: AssetPriority
  /** default unit scale applied before the caller's placement transform */
  scale: [number, number, number]
  /** optional default rotation in radians */
  rotation?: [number, number, number]
  /** worlds in which the asset is expected — used for streaming */
  scene: string[]
  lod: AssetLod[]
  /** preload this asset during the loading screen */
  preload: boolean
  /** GLB material name -> shared material library key */
  materialMap: AssetMaterialMap
  /** optional additional draw-distance culling hints */
  cullDistance: number
  /** developer-supplied asset, normalised by the external pipeline */
  external?: boolean
  /** keep the asset's own PBR materials and only correct defects */
  preserveMaterials?: boolean
  /** per-material runtime policy, for external assets only */
  externalMaterials?: Record<string, ExternalMaterialRule>
  /** measured, shipped dimensions in metres */
  dimensions?: [number, number, number]
  /** licence recorded in public/assets/external/CREDITS.json */
  license?: string | null
  /** safe to draw as an instanced mesh */
  instanced?: boolean
}

const PROJECT_ASSETS: AssetEntry[] = [
  {
    id: 'hero-building',
    path: '/assets/glb/hero-building.glb',
    category: 'architecture',
    priority: 1,
    scale: [1, 1, 1],
    scene: ['hero', 'company'],
    lod: ['high', 'medium', 'low'],
    preload: true,
    cullDistance: 520,
    materialMap: {
      render: 'render',
      renderWarm: 'renderWarm',
      concrete: 'concrete',
      stone: 'stone',
      glass: 'glass',
      glassDark: 'glassDark',
      metal: 'metal',
      darkMetal: 'darkMetal',
      paintMuted: 'paintMuted',
      leaf: 'leaf',
      plastic: 'plastic',
      panelDark: 'panelDark',
    },
  },
  {
    id: 'entrance-gate',
    path: '/assets/glb/entrance-gate.glb',
    category: 'gate',
    priority: 1,
    scale: [1, 1, 1],
    scene: ['approach', 'gate'],
    lod: ['high', 'medium', 'low'],
    preload: true,
    cullDistance: 320,
    materialMap: {
      stone: 'stone',
      render: 'render',
      darkMetal: 'darkMetal',
      metal: 'metal',
      glassDark: 'glassDark',
      light: 'light',
      paintMuted: 'paintMuted',
      paintB: 'paintB',
      safety: 'safety',
    },
  },
  ...(
    [
      ['tree-a', 'Neem-type broadleaf'],
      ['tree-b', 'Eucalyptus-type tall slim'],
      ['tree-c', 'Rain-tree wide canopy'],
      ['tree-d', 'Small ornamental'],
      ['tree-e', 'Mature roadside spreading'],
    ] as const
  ).map(([id]) => ({
    id,
    path: `/assets/glb/${id}.glb`,
    category: 'vegetation' as const,
    priority: 2 as const,
    scale: [1, 1, 1] as [number, number, number],
    scene: ['environment', 'hero', 'approach', 'india'],
    lod: ['high', 'medium', 'low'] as ('high' | 'medium' | 'low')[],
    preload: true,
    cullDistance: 300,
    materialMap: {
      wood: 'wood',
      leaf: 'leaf',
      leafB: 'leafB',
      leafDry: 'leafDry',
      // shaded interior of the crown — chosen per leaf by the builder
      leafDeep: 'leafDeep',
      leafBDeep: 'leafBDeep',
    },
  })),
  // Distance levels for the same four species. The silhouette and the bounding
  // box match the level-1 asset so a swap never reads as a pop: level 0 spends
  // triangles on leaf volume for trees you walk up to, level 2 spends them on
  // the outline you see across the site.
  ...(
    [
      ['tree-a-close', 'Neem-type broadleaf, hero detail'],
      ['tree-b-close', 'Eucalyptus-type tall slim, hero detail'],
      ['tree-c-close', 'Rain-tree wide canopy, hero detail'],
      ['tree-d-close', 'Small ornamental, hero detail'],
      ['tree-e-close', 'Mature roadside spreading, hero detail'],
      ['tree-a-far', 'Neem-type broadleaf, distant'],
      ['tree-b-far', 'Eucalyptus-type tall slim, distant'],
      ['tree-c-far', 'Rain-tree wide canopy, distant'],
      ['tree-d-far', 'Small ornamental, distant'],
      ['tree-e-far', 'Mature roadside spreading, distant'],
    ] as const
  ).map(([id]) => ({
    id,
    path: `/assets/glb/${id}.glb`,
    category: 'vegetation' as const,
    priority: 3 as const,
    scale: [1, 1, 1] as [number, number, number],
    scene: ['environment', 'hero', 'approach', 'india'],
    lod: ['high', 'medium', 'low'] as ('high' | 'medium' | 'low')[],
    // only fetched once a tree actually enters that distance band
    preload: false,
    cullDistance: 300,
    materialMap: {
      wood: 'wood',
      leaf: 'leaf',
      leafB: 'leafB',
      leafDry: 'leafDry',
      leafDeep: 'leafDeep',
      leafBDeep: 'leafBDeep',
    },
  })),
  {
    id: 'entrance-gate-leaf',
    path: '/assets/glb/entrance-gate-leaf.glb',
    category: 'gate',
    priority: 1,
    scale: [1, 1, 1],
    scene: ['approach', 'gate'],
    lod: ['high', 'medium', 'low'],
    preload: true,
    cullDistance: 320,
    materialMap: { darkMetal: 'darkMetal', metal: 'metal', safety: 'safety' },
  },
  {
    id: 'bush',
    path: '/assets/glb/bush.glb',
    category: 'vegetation',
    priority: 2,
    scale: [1, 1, 1],
    scene: ['environment', 'hero', 'approach'],
    lod: ['high', 'medium', 'low'],
    preload: true,
    cullDistance: 170,
    materialMap: { wood: 'wood', leaf: 'leaf', leafB: 'leafB', leafDry: 'leafDry' },
  },
  {
    id: 'shrub-dry',
    path: '/assets/glb/shrub-dry.glb',
    category: 'vegetation',
    priority: 3,
    scale: [1, 1, 1],
    scene: ['environment', 'hero', 'approach'],
    lod: ['high', 'medium', 'low'],
    preload: false,
    cullDistance: 140,
    materialMap: { wood: 'wood', leafDry: 'leafDry' },
  },
  {
    id: 'car-a',
    path: '/assets/glb/car-a.glb',
    category: 'vehicle',
    priority: 2,
    scale: [1, 1, 1],
    scene: ['road', 'environment'],
    lod: ['high', 'medium', 'low'],
    preload: true,
    cullDistance: 200,
    materialMap: {
      carA: 'carA',
      glass: 'glass',
      glassDark: 'glassDark',
      darkMetal: 'darkMetal',
      metal: 'metal',
      rim: 'rim',
      rubber: 'rubber',
      plastic: 'plastic',
      light: 'light',
      tail: 'tail',
      plate: 'plate',
      trim: 'trim',
      interior: 'interior',
    },
  },
  {
    id: 'car-b',
    path: '/assets/glb/car-b.glb',
    category: 'vehicle',
    priority: 3,
    scale: [1, 1, 1],
    scene: ['road', 'environment'],
    lod: ['high', 'medium', 'low'],
    preload: false,
    cullDistance: 200,
    materialMap: {
      paintB: 'paintB',
      glass: 'glass',
      glassDark: 'glassDark',
      darkMetal: 'darkMetal',
      metal: 'metal',
      rim: 'rim',
      rubber: 'rubber',
      plastic: 'plastic',
      light: 'light',
      tail: 'tail',
      plate: 'plate',
      trim: 'trim',
      interior: 'interior',
    },
  },
  {
    id: 'car-c',
    path: '/assets/glb/car-c.glb',
    category: 'vehicle',
    priority: 3,
    scale: [1, 1, 1],
    scene: ['road', 'environment'],
    lod: ['high', 'medium', 'low'],
    preload: false,
    cullDistance: 200,
    materialMap: {
      carC: 'carC',
      glass: 'glass',
      glassDark: 'glassDark',
      darkMetal: 'darkMetal',
      metal: 'metal',
      rim: 'rim',
      rubber: 'rubber',
      plastic: 'plastic',
      light: 'light',
      tail: 'tail',
      plate: 'plate',
      trim: 'trim',
      interior: 'interior',
    },
  },
  {
    id: 'truck-a',
    path: '/assets/glb/truck-a.glb',
    category: 'vehicle',
    priority: 3,
    scale: [1, 1, 1],
    scene: ['construction', 'road'],
    lod: ['high', 'medium', 'low'],
    preload: false,
    cullDistance: 220,
    materialMap: {
      carD: 'carD',
      trim: 'trim',
      interior: 'interior',
      glass: 'glass',
      glassDark: 'glassDark',
      darkMetal: 'darkMetal',
      metal: 'metal',
      rim: 'rim',
      rubber: 'rubber',
      plastic: 'plastic',
      light: 'light',
      tail: 'tail',
      plate: 'plate',
      sack: 'sack',
    },
  },
  {
    id: 'crane',
    path: '/assets/glb/crane.glb',
    category: 'construction',
    priority: 2,
    scale: [1, 1, 1],
    scene: ['construction', 'hero'],
    lod: ['high', 'medium', 'low'],
    preload: true,
    cullDistance: 420,
    materialMap: {
      metal: 'metal',
      darkMetal: 'darkMetal',
      concrete: 'concrete',
      glass: 'glass',
      safety: 'safety',
      tail: 'tail',
    },
  },
  {
    id: 'excavator',
    path: '/assets/glb/excavator.glb',
    category: 'construction',
    priority: 2,
    scale: [1, 1, 1],
    scene: ['construction', 'hero', 'process'],
    lod: ['high', 'medium', 'low'],
    preload: true,
    cullDistance: 260,
    materialMap: {
      safety: 'safety',
      darkMetal: 'darkMetal',
      metal: 'metal',
      rubber: 'rubber',
      glassDark: 'glassDark',
    },
  },
  {
    id: 'boundary-wall',
    path: '/assets/glb/boundary-wall.glb',
    category: 'environment',
    priority: 2,
    scale: [1, 1, 1],
    scene: ['approach', 'hero', 'construction'],
    lod: ['high', 'medium', 'low'],
    preload: true,
    cullDistance: 260,
    materialMap: { render: 'render', stone: 'stone', darkMetal: 'darkMetal' },
  },
  {
    id: 'street-light',
    path: '/assets/glb/street-light.glb',
    category: 'infrastructure',
    priority: 3,
    scale: [1, 1, 1],
    scene: ['road', 'environment', 'construction'],
    lod: ['high', 'medium', 'low'],
    preload: true,
    cullDistance: 200,
    materialMap: { darkMetal: 'darkMetal', metal: 'metal', light: 'light', panelDark: 'panelDark', concrete: 'concrete' },
  },
  {
    id: 'construction-shed',
    path: '/assets/glb/construction-shed.glb',
    category: 'construction',
    priority: 2,
    scale: [1, 1, 1],
    scene: ['construction', 'hero'],
    lod: ['high', 'medium', 'low'],
    preload: true,
    cullDistance: 260,
    materialMap: {
      metal: 'metal',
      darkMetal: 'darkMetal',
      concrete: 'concrete',
      glassDark: 'glassDark',
      render: 'render',
      paintMuted: 'paintMuted',
      paintB: 'paintB',
      plastic: 'plastic',
    },
  },
  {
    id: 'rebar-stack',
    path: '/assets/glb/rebar-stack.glb',
    category: 'construction',
    priority: 3,
    scale: [1, 1, 1],
    scene: ['construction', 'hero', 'materials'],
    lod: ['high', 'medium', 'low'],
    preload: false,
    cullDistance: 180,
    materialMap: { rust: 'rust', wood: 'wood' },
  },
  {
    id: 'cement-bags',
    path: '/assets/glb/cement-bags.glb',
    category: 'construction',
    priority: 3,
    scale: [1, 1, 1],
    scene: ['construction', 'hero', 'materials'],
    lod: ['high', 'medium', 'low'],
    preload: false,
    cullDistance: 180,
    materialMap: { sack: 'sack', render: 'render', wood: 'wood' },
  },
  {
    id: 'material-stack',
    path: '/assets/glb/material-stack.glb',
    category: 'construction',
    priority: 3,
    scale: [1, 1, 1],
    scene: ['construction', 'hero', 'materials'],
    lod: ['high', 'medium', 'low'],
    preload: false,
    cullDistance: 200,
    materialMap: {
      brick: 'brick',
      concrete: 'concrete',
      sand: 'sand',
      gravel: 'gravel',
      rust: 'rust',
      metal: 'metal',
    },
  },
  {
    id: 'barrier',
    path: '/assets/glb/barrier.glb',
    category: 'construction',
    priority: 4,
    scale: [1, 1, 1],
    scene: ['construction', 'hero'],
    lod: ['high', 'medium', 'low'],
    preload: false,
    cullDistance: 140,
    materialMap: { safety: 'safety', metal: 'metal', darkMetal: 'darkMetal', render: 'render' },
  },
  {
    id: 'residential-building',
    path: '/assets/glb/residential-building.glb',
    category: 'architecture',
    priority: 2,
    scale: [1, 1, 1],
    scene: ['residential', 'facade', 'services'],
    lod: ['high', 'medium', 'low'],
    preload: true,
    cullDistance: 320,
    materialMap: {
      renderWarm: 'renderWarm',
      render: 'render',
      concrete: 'concrete',
      stone: 'stone',
      glass: 'glass',
      glassDark: 'glassDark',
      metal: 'metal',
      darkMetal: 'darkMetal',
      paintMuted: 'paintMuted',
      plastic: 'plastic',
      panelDark: 'panelDark',
    },
  },
  {
    id: 'bridge',
    path: '/assets/glb/bridge.glb',
    category: 'infrastructure',
    priority: 2,
    scale: [1, 1, 1],
    scene: ['infrastructure', 'details', 'services'],
    lod: ['high', 'medium', 'low'],
    preload: true,
    cullDistance: 360,
    materialMap: { concrete: 'concrete', stone: 'stone', metal: 'metal', darkMetal: 'darkMetal', asphalt: 'asphalt' },
  },
  {
    id: 'solar-panel',
    path: '/assets/glb/solar-panel.glb',
    category: 'infrastructure',
    priority: 3,
    scale: [1, 1, 1],
    scene: ['solar', 'services'],
    lod: ['high', 'medium', 'low'],
    preload: false,
    cullDistance: 200,
    materialMap: { metal: 'metal', darkMetal: 'darkMetal', panelDark: 'panelDark' },
  },
  {
    id: 'warehouse',
    path: '/assets/glb/warehouse.glb',
    category: 'architecture',
    priority: 2,
    scale: [1, 1, 1],
    scene: ['materials', 'services'],
    lod: ['high', 'medium', 'low'],
    preload: true,
    cullDistance: 320,
    materialMap: {
      render: 'render',
      concrete: 'concrete',
      stone: 'stone',
      glassDark: 'glassDark',
      metal: 'metal',
      darkMetal: 'darkMetal',
      metalRib: 'metalRib',
      rubber: 'rubber',
    },
  },
  {
    id: 'scaffolding',
    path: '/assets/glb/scaffolding.glb',
    category: 'construction',
    priority: 3,
    scale: [1, 1, 1],
    scene: ['construction', 'process', 'details'],
    lod: ['high', 'medium', 'low'],
    preload: false,
    cullDistance: 240,
    materialMap: { metal: 'metal', darkMetal: 'darkMetal', wood: 'wood' },
  },
]

/* ------------------------------------------------------------- external */

/**
 * Developer-provided assets.
 *
 * The shape below mirrors what `scripts/glb/external/build-external.mjs`
 * writes. Nothing in the application reads the manifest directly — external
 * assets enter the world through the same `ASSETS` array, the same
 * `AssetModel` component and the same preload path as everything else, so a
 * caller never has to know where a model came from.
 */
type ExternalManifestEntry = {
  id: string
  path: string
  source: string
  category: string
  class: string
  priority: number
  scene: string[]
  cullDistance: number
  preload: boolean
  instanced: boolean
  dimensions: number[]
  triangles: number
  materials: number
  textures: number
  preserveMaterials: boolean
  materialMap: Record<string, ExternalMaterialRule>
  license: string | null
  author: string | null
  sourceUrl: string | null
  /** how this asset competes with the project's own: replace | augment | never */
  substitution?: 'replace' | 'augment' | 'never'
  /** how representative of its class the asset is; drives placement priority */
  typicality?: 'typical' | 'unusual' | 'atypical'
}

/**
 * The cast goes through `unknown` deliberately.
 *
 * TypeScript infers a structural union from the JSON literal — one member per
 * distinct `materialMap` shape — so a direct assertion fails as soon as two
 * external assets have different material names. The manifest's shape is
 * guaranteed by the generator, not by the checker, which is why it is validated
 * defensively below rather than trusted here.
 */
const EXTERNAL_MANIFEST = manifest as unknown as { generated: string; assets: ExternalManifestEntry[] }

const asCategory = (value: string): AssetCategory =>
  (['architecture', 'gate', 'vegetation', 'vehicle', 'construction', 'environment', 'infrastructure'] as const).includes(
    value as AssetCategory,
  )
    ? (value as AssetCategory)
    : 'environment'

const asPriority = (value: number): AssetPriority =>
  value === 1 || value === 2 || value === 3 || value === 4 ? value : 4

/**
 * Only entries the build actually completed are trusted.
 *
 * The manifest is generated, so this should never filter anything — but a
 * half-written entry would otherwise register an asset whose GLB does not
 * exist, and the failure would surface as a 404 mid-scroll rather than at
 * build time.
 */
const VALID_EXTERNAL = (EXTERNAL_MANIFEST.assets ?? []).filter(
  (entry) => Boolean(entry && entry.id && entry.path && entry.materialMap),
)

/**
 * Named model slots.
 *
 * These are the composition-owned scenes that always mount a specific model —
 * the hero tower, the residential/commercial mid-rise, the warehouse, the
 * solar service world. When the developer drops a real GLB whose class matches
 * a slot (see `docs/MODEL_SLOTS.md`), the runtime swaps it in everywhere that
 * slot is used. Nothing else in the app knows an external asset exists: one
 * lookup replaces the whole scene (brief §13).
 *
 * `fit` is the footprint the built-in model occupies, measured in metres
 * (`scripts/glb/measure-assets.mjs`). Replacement models are uniformly scaled
 * onto that footprint so camera framing, plinths and scaffolding stay valid —
 * the visitor sees the client's real building exactly where the procedural
 * one stood.
 */
export const ROLE_SLOTS: Record<string, { classes: string[]; fit?: { x: number; z: number } }> = {
  'hero-building': { classes: ['architecture-hero'], fit: { x: 29.2, z: 33.1 } },
  'residential-building': { classes: ['architecture-residential'], fit: { x: 22.4, z: 15.0 } },
  warehouse: { classes: ['architecture-warehouse'] },
  'solar-panel': { classes: ['infrastructure-solar'], fit: { x: 8.87, z: 8.6 } },
}

const ROLE_FILL_CLASSES = new Set(Object.values(ROLE_SLOTS).flatMap((slot) => slot.classes))

export const EXTERNAL_ASSETS: AssetEntry[] = VALID_EXTERNAL.map((entry) => ({
  id: entry.id,
  path: entry.path,
  category: asCategory(entry.category),
  priority: asPriority(entry.priority),
  // The build already normalised the GLB to real-world metres, so no scale
  // correction belongs here — that is the whole point of the pipeline.
  scale: [1, 1, 1],
  scene: entry.scene,
  lod: ['high', 'medium', 'low'],
  // an external model that fills a named slot is part of the opening shots
  // (hero / services), so it warms the cache during the loading screen
  preload: entry.preload || ROLE_FILL_CLASSES.has(entry.class),
  cullDistance: entry.cullDistance,
  materialMap: Object.fromEntries(Object.entries(entry.materialMap).map(([name, rule]) => [name, rule.key])),
  external: true,
  preserveMaterials: entry.preserveMaterials,
  externalMaterials: entry.materialMap,
  dimensions: (entry.dimensions.length === 3 ? entry.dimensions : [0, 0, 0]) as [number, number, number],
  license: entry.license,
  instanced: entry.instanced,
}))

/** Project assets first, then whatever the developer dropped in. */
export const ASSETS: AssetEntry[] = [...PROJECT_ASSETS, ...EXTERNAL_ASSETS]

export const assetById = new Map(ASSETS.map((asset) => [asset.id, asset]))

export const preloadAssetIds = ASSETS.filter((asset) => asset.preload).map((asset) => asset.id)

export function assetCriticality(id: string): AssetPriority {
  return assetById.get(id)?.priority ?? 4
}

/* -------------------------------------------------- external resolution */

/**
 * Every registered external asset of a given class, in registration order.
 *
 * `class` is what the build inferred from the filename (`vehicle-car`,
 * `vehicle-suv`, `construction-plant`, …), which is the level of granularity
 * placement code actually wants: "give me the cars", not "give me
 * external-car-sedan-grey-v2".
 */
const BY_CLASS = new Map<string, AssetEntry[]>()
for (const [index, entry] of VALID_EXTERNAL.entries()) {
  const list = BY_CLASS.get(entry.class) ?? []
  list.push(EXTERNAL_ASSETS[index])
  BY_CLASS.set(entry.class, list)
}

export function externalAssetsOfClass(...classes: string[]): AssetEntry[] {
  return classes.flatMap((name) => BY_CLASS.get(name) ?? [])
}

const SUBSTITUTION = new Map(VALID_EXTERNAL.map((entry) => [entry.id, entry.substitution ?? 'augment']))

const substitutionFor = (id: string): 'replace' | 'augment' | 'never' => SUBSTITUTION.get(id) ?? 'augment'

// Manifest ids already carry the `external-` prefix; do not add it again.
const TYPICALITY = new Map(VALID_EXTERNAL.map((entry) => [entry.id, entry.typicality ?? 'typical']))

/**
 * How ordinary an example of its class an asset is.
 *
 * Measured by the ingest pipeline from the object's own proportions. An asset
 * whose dimensions sit outside the class envelope on two or more axes is real
 * and usable but not representative — a concept supercar is still a car — and
 * putting it in the foreground of an Indian construction site is the vehicle
 * version of lining the road with heritage lamp posts (§6).
 */
export const typicalityOf = (id: string): 'typical' | 'unusual' | 'atypical' =>
  TYPICALITY.get(id) ?? 'typical'

const TYPICALITY_RANK = { typical: 0, unusual: 1, atypical: 2 } as const

/**
 * Resolve an asset slot to the best available model.
 *
 *     real external GLB  →  existing project GLB  →  procedural geometry
 *
 * This is the priority ladder from brief §1, expressed once so no component has
 * to re-implement it. Callers ask for a *role* ("a parked car", "a tree") and
 * get whichever tier is actually present, with the project GLB as the fallback
 * that always exists.
 *
 * How hard an external asset pushes depends on its class policy, because
 * "external" is not a synonym for "better" (§16):
 *
 *   - a real car or a real excavator **replaces** the procedural one outright,
 *     which is what §7 and §11 ask for;
 *   - a heritage lamp post or a single downloaded tree **augments** the pool
 *     instead, so the world gains variety without one downloaded object being
 *     stamped across every slot in the scene.
 */
export function resolveAssetIds(role: {
  /** external classes that can fill this role, best first */
  external: string[]
  /** project asset ids to use when no external asset is registered */
  project: string[]
}): string[] {
  const external = externalAssetsOfClass(...role.external).filter(
    (asset) => substitutionFor(asset.id) !== 'never',
  )
  if (external.length === 0) return role.project

  const ids = external.map((asset) => asset.id)
  const replaces = external.some((asset) => substitutionFor(asset.id) === 'replace')
  if (!replaces) {
    // `augment`: stand beside the project assets so the pool keeps its variety.
    return [...role.project, ...ids]
  }

  /**
   * `replace`: the external asset wins the slot (§7).
   *
   * But §8 forbids stamping one model across the whole scene, and a single
   * dropped car cannot fill a road on its own. So a lone external asset keeps
   * enough of the project pool behind it to break up the repetition, while two
   * or more external assets are considered sufficient variety on their own.
   *
   * The result: drop one good car and it becomes the star of the road without
   * every vehicle in the world becoming its clone; drop three and the
   * procedural cars retire.
   */
  if (ids.length >= 2 || role.project.length === 0) return ids
  return [...ids, ...role.project.slice(0, 2)]
}

/**
 * Order a pool for staged placement: foreground first, background last.
 *
 * §4 asks for the best realistic vehicle in the foreground, a second variant
 * in the midground and simpler models in the distance. That only works if the
 * pool is ordered by how well each model survives close inspection, which is
 * not the same as whether it is external.
 *
 * A typical external asset earns the foreground — real materials and real
 * geometry are exactly what close range rewards. An *atypical* one is pushed
 * behind the project assets instead: the concept car reads fine as a shape
 * parked down the road, and badly as the first thing the camera meets.
 */
export function stageByRealism(ids: string[]): string[] {
  return [...ids].sort((a, b) => {
    const rank = (id: string) => {
      const t = typicalityOf(id)
      if (!id.startsWith('external-')) return 1 // project assets: solid midground
      return t === 'typical' ? 0 : 2 // typical external leads, atypical trails
    }
    return rank(a) - rank(b)
  })
}

/** True when at least one external asset covers this role. */
export function hasExternal(...classes: string[]): boolean {
  return externalAssetsOfClass(...classes).length > 0
}

/* -------------------------------------------------------- role resolution */

export type RoleResolution = {
  /** id of the entry that actually plays the slot (external when supplied) */
  id: string
  /** undefined when the role id is unknown — callers keep their null guard */
  entry: AssetEntry | undefined
  /** uniform scale applied to fit an external model onto the slot footprint */
  fitScale: number
}

/**
 * Resolve a named model slot to the asset that plays it.
 *
 *     real external GLB for the role  →  built-in project GLB
 *
 * First registered external of a matching class (filename order) wins the
 * slot; `fit` re-scales it onto the footprint the built-in occupied. This is
 * the single seam where client-supplied buildings / solar hardware enter the
 * composition — `AssetModel` calls it for every mounted model.
 */
export function resolveRoleSlot(role: string): RoleResolution {
  const slot = ROLE_SLOTS[role]
  if (!slot) {
    return { id: role, entry: assetById.get(role), fitScale: 1 }
  }
  const external = externalAssetsOfClass(...slot.classes).filter(
    (asset) => substitutionFor(asset.id) !== 'never',
  )
  if (external.length === 0) {
    return { id: role, entry: assetById.get(role), fitScale: 1 }
  }
  const winner = external[0]
  let fitScale = 1
  if (slot.fit && winner.dimensions && winner.dimensions[0] > 0.1 && winner.dimensions[2] > 0.1) {
    fitScale = Math.min(slot.fit.x / winner.dimensions[0], slot.fit.z / winner.dimensions[2])
    fitScale = Math.min(2.5, Math.max(0.25, fitScale))
  }
  return { id: winner.id, entry: winner, fitScale }
}
