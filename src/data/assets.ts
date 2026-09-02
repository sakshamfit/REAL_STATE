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
    cullDistance: 460,
    materialMap: {
      render: 'render',
      stone: 'stone',
      concrete: 'concrete',
      glass: 'glass',
      metal: 'metal',
      paintMuted: 'mutedPaint',
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
    cullDistance: 300,
    materialMap: {
      stone: 'stone',
      darkMetal: 'darkMetal',
      metal: 'metal',
      render: 'render',
    },
  },
  {
    id: 'tree-a',
    path: '/assets/glb/tree-a.glb',
    category: 'vegetation',
    priority: 2,
    scale: [1, 1, 1],
    scene: ['environment', 'hero', 'approach', 'india'],
    lod: ['high', 'medium', 'low'],
    preload: true,
    cullDistance: 220,
    materialMap: {
      wood: 'wood',
      foliage: 'foliage',
      foliageB: 'foliageB',
    },
  },
  {
    id: 'tree-b',
    path: '/assets/glb/tree-b.glb',
    category: 'vegetation',
    priority: 2,
    scale: [1, 1, 1],
    scene: ['environment', 'hero', 'approach', 'india'],
    lod: ['high', 'medium', 'low'],
    preload: true,
    cullDistance: 220,
    materialMap: {
      wood: 'wood',
      foliage: 'foliage',
      foliageB: 'foliageB',
    },
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
    cullDistance: 160,
    materialMap: {
      foliage: 'foliage',
      foliageB: 'foliageB',
    },
  },
  {
    id: 'car-a',
    path: '/assets/glb/car-a.glb',
    category: 'vehicle',
    priority: 3,
    scale: [1, 1, 1],
    scene: ['road', 'environment'],
    lod: ['high', 'medium', 'low'],
    preload: false,
    cullDistance: 140,
    materialMap: {
      paintMuted: 'mutedPaint',
      glass: 'glass',
      darkMetal: 'darkMetal',
      terracotta: 'terracotta',
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
    cullDistance: 340,
    materialMap: {
      metal: 'metal',
      darkMetal: 'darkMetal',
      concrete: 'concrete',
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
    cullDistance: 220,
    materialMap: {
      render: 'render',
      stone: 'stone',
    },
  },
  {
    id: 'street-light',
    path: '/assets/glb/street-light.glb',
    category: 'infrastructure',
    priority: 3,
    scale: [1, 1, 1],
    scene: ['road', 'environment', 'construction'],
    lod: ['high', 'medium', 'low'],
    preload: false,
    cullDistance: 150,
    materialMap: {
      darkMetal: 'darkMetal',
      metal: 'metal',
    },
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
    cullDistance: 240,
    materialMap: {
      metal: 'metal',
      darkMetal: 'darkMetal',
      concrete: 'concrete',
      glass: 'glass',
      render: 'render',
    },
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
    cullDistance: 260,
    materialMap: {
      render: 'render',
      concrete: 'concrete',
      stone: 'stone',
      glass: 'glass',
      metal: 'metal',
      paintMuted: 'mutedPaint',
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
    cullDistance: 300,
    materialMap: {
      concrete: 'concrete',
      stone: 'stone',
      metal: 'metal',
    },
  },
  {
    id: 'solar-panel',
    path: '/assets/glb/solar-panel.glb',
    category: 'infrastructure',
    priority: 3,
    scale: [1, 1, 1],
    scene: ['solar', 'services'],
    lod: ['high', 'medium', 'low'],
    preload: true,
    cullDistance: 180,
    materialMap: {
      metal: 'metal',
      darkMetal: 'darkMetal',
    },
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
    cullDistance: 260,
    materialMap: {
      render: 'render',
      concrete: 'concrete',
      stone: 'stone',
      glass: 'glass',
      metal: 'metal',
      darkMetal: 'darkMetal',
    },
  },
  {
    id: 'scaffolding',
    path: '/assets/glb/scaffolding.glb',
    category: 'construction',
    priority: 2,
    scale: [1, 1, 1],
    scene: ['construction', 'process', 'details'],
    lod: ['high', 'medium', 'low'],
    preload: true,
    cullDistance: 220,
    materialMap: {
      metal: 'metal',
      darkMetal: 'darkMetal',
      wood: 'wood',
    },
  },
]

export const assetById = new Map(ASSETS.map((asset) => [asset.id, asset]))

export const preloadAssetIds = ASSETS.filter((asset) => asset.preload).map((asset) => asset.id)

export function assetCriticality(id: string): AssetPriority {
  return assetById.get(id)?.priority ?? 4
}
