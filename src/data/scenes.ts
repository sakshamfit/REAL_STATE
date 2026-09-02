/**
 * Scene / cinematic story configuration.
 *
 * The camera continues to be driven by `src/lib/chapters.ts`; this file is the
 * editorial layer that describes the ten cinematic scenes, their environment,
 * audio, depth composition and primary assets. Components that need to know
 * "which scene am I in?" read from here.
 */

export type SceneId =
  | 'road'
  | 'approach'
  | 'gate'
  | 'reveal'
  | 'facade'
  | 'details'
  | 'wide'
  | 'environment'
  | 'construction'
  | 'india'

export type SceneDefinition = {
  id: SceneId
  label: string
  /** first beat id that belongs to this scene */
  fromBeat: string
  /** last beat id that belongs to this scene */
  toBeat: string
  environment: string
  camera: {
    height: number
    speed: 'slow' | 'medium' | 'fast'
    foreground: boolean
  }
  audio: {
    wind: number
    birds: number
    traffic: number
    construction: number
  }
  composition: {
    foreground: string[]
    midground: string[]
    background: string[]
  }
  assets: string[]
}

export const SCENES: SceneDefinition[] = [
  {
    id: 'road',
    label: 'Real Road',
    fromBeat: 'ground',
    toBeat: 'ground',
    environment: 'clearDay',
    camera: { height: 1.6, speed: 'slow', foreground: true },
    audio: { wind: 0.55, birds: 0.2, traffic: 0.26, construction: 0.08 },
    composition: {
      foreground: ['road', 'grass', 'street-lights'],
      midground: ['boundary-wall', 'distant-trees'],
      background: ['sky', 'distant-buildings'],
    },
    assets: ['street-light', 'boundary-wall', 'tree-a', 'tree-b'],
  },
  {
    id: 'approach',
    label: 'Approach to Property',
    fromBeat: 'build',
    toBeat: 'build',
    environment: 'clearDay',
    camera: { height: 2.4, speed: 'medium', foreground: true },
    audio: { wind: 0.5, birds: 0.18, traffic: 0.18, construction: 0.16 },
    composition: {
      foreground: ['gate', 'boundary-wall', 'grass'],
      midground: ['hero-building', 'construction-shed'],
      background: ['sky', 'distant-buildings', 'tree-line'],
    },
    assets: ['hero-building', 'entrance-gate', 'construction-shed', 'crane', 'boundary-wall'],
  },
  {
    id: 'gate',
    label: 'Entrance Gate',
    fromBeat: 'build',
    toBeat: 'build',
    environment: 'clearDay',
    camera: { height: 2.2, speed: 'slow', foreground: true },
    audio: { wind: 0.5, birds: 0.14, traffic: 0.12, construction: 0.12 },
    composition: {
      foreground: ['gate', 'name-plate'],
      midground: ['driveway', 'podium', 'landscaping'],
      background: ['sky', 'hero-building'],
    },
    assets: ['entrance-gate', 'hero-building', 'tree-a'],
  },
  {
    id: 'reveal',
    label: 'Property Reveal',
    fromBeat: 'company',
    toBeat: 'company',
    environment: 'clearDay',
    camera: { height: 12, speed: 'medium', foreground: true },
    audio: { wind: 0.52, birds: 0.16, traffic: 0.11, construction: 0.8 },
    composition: {
      foreground: ['trees', 'crane'],
      midground: ['hero-building', 'grounds'],
      background: ['sky', 'distant-buildings'],
    },
    assets: ['hero-building', 'crane', 'tree-a', 'tree-b'],
  },
  {
    id: 'facade',
    label: 'Building Facade',
    fromBeat: 'services-intro',
    toBeat: 'service-residential',
    environment: 'clearDay',
    camera: { height: 8, speed: 'medium', foreground: false },
    audio: { wind: 0.45, birds: 0.14, traffic: 0.1, construction: 0.1 },
    composition: {
      foreground: ['columns', 'deck'],
      midground: ['building', 'residence'],
      background: ['sky', 'trees'],
    },
    assets: ['hero-building', 'tree-a'],
  },
  {
    id: 'details',
    label: 'Architectural Details',
    fromBeat: 'service-infrastructure',
    toBeat: 'material-world',
    environment: 'clearDay',
    camera: { height: 8, speed: 'medium', foreground: false },
    audio: { wind: 0.42, birds: 0.1, traffic: 0.06, construction: 0.55 },
    composition: {
      foreground: ['bridge', 'solar', 'materials'],
      midground: ['services', 'crane'],
      background: ['sky', 'ground'],
    },
    assets: ['crane', 'construction-shed', 'boundary-wall'],
  },
  {
    id: 'wide',
    label: 'Wide Property View',
    fromBeat: 'trust',
    toBeat: 'corridor',
    environment: 'clearDay',
    camera: { height: 6, speed: 'slow', foreground: true },
    audio: { wind: 0.5, birds: 0.12, traffic: 0.08, construction: 0.12 },
    composition: {
      foreground: ['corridor', 'columns'],
      midground: ['property', 'clients'],
      background: ['sky', 'tree-line'],
    },
    assets: ['hero-building', 'tree-a', 'tree-b'],
  },
  {
    id: 'environment',
    label: 'Environment',
    fromBeat: 'india',
    toBeat: 'india',
    environment: 'clearDay',
    camera: { height: 9, speed: 'medium', foreground: false },
    audio: { wind: 0.5, birds: 0.15, traffic: 0.04, construction: 0.05 },
    composition: {
      foreground: ['india-map'],
      midground: ['presence-states', 'locations'],
      background: ['sky', 'earth'],
    },
    assets: ['tree-a', 'tree-b'],
  },
  {
    id: 'construction',
    label: 'Construction Environment',
    fromBeat: 'process-1',
    toBeat: 'process-5',
    environment: 'clearDay',
    camera: { height: 11, speed: 'medium', foreground: true },
    audio: { wind: 0.45, birds: 0.08, traffic: 0.1, construction: 0.9 },
    composition: {
      foreground: ['scaffolding', 'concrete', 'steel'],
      midground: ['crane', 'site-plate', 'materials'],
      background: ['sky', 'distant-buildings'],
    },
    assets: ['crane', 'construction-shed', 'boundary-wall'],
  },
  {
    id: 'india',
    label: 'India Presence',
    fromBeat: 'india',
    toBeat: 'india',
    environment: 'clearDay',
    camera: { height: 13, speed: 'slow', foreground: false },
    audio: { wind: 0.65, birds: 0.08, traffic: 0.03, construction: 0.03 },
    composition: {
      foreground: ['geo-plan', 'states'],
      midground: ['presence-markers'],
      background: ['sky', 'earth'],
    },
    assets: ['tree-a', 'tree-b'],
  },
]

export const sceneForBeat = (beatId: string): SceneDefinition =>
  SCENES.find((scene) => scene.fromBeat === beatId || scene.toBeat === beatId) ?? SCENES[0]
