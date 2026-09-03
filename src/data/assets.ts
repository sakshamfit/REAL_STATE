/**
 * Asset registry — the single place that describes every production GLB.
 *
 * Adding a future building / vehicle / environment asset is one entry here.
 * The runtime `AssetModel` component loads the GLB, applies the shared PBR
 * material library and registers it for progressive preload by priority.
 */

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
}

export const ASSETS: AssetEntry[] = [
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
    materialMap: { wood: 'wood', leaf: 'leaf', leafB: 'leafB', leafDry: 'leafDry' },
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
      ['tree-a-far', 'Neem-type broadleaf, distant'],
      ['tree-b-far', 'Eucalyptus-type tall slim, distant'],
      ['tree-c-far', 'Rain-tree wide canopy, distant'],
      ['tree-d-far', 'Small ornamental, distant'],
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
    materialMap: { wood: 'wood', leaf: 'leaf', leafB: 'leafB', leafDry: 'leafDry' },
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
      paintA: 'paintA',
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
      paintC: 'paintC',
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
      paintD: 'paintD',
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

export const assetById = new Map(ASSETS.map((asset) => [asset.id, asset]))

export const preloadAssetIds = ASSETS.filter((asset) => asset.preload).map((asset) => asset.id)

export function assetCriticality(id: string): AssetPriority {
  return assetById.get(id)?.priority ?? 4
}
