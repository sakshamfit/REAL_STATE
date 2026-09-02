/**
 * Environment presets.
 *
 * These are the physical atmosphere states available to the cinematic world.
 * `clearDay` is the default production state; the others can be selected by
 * editing `env` in `src/data/scenes.ts` or `src/lib/store.ts`.
 */

export type EnvironmentPresetId = 'clearDay' | 'morning' | 'goldenHour' | 'overcast'

export type EnvironmentPreset = {
  id: EnvironmentPresetId
  label: string
  /** drei <Sky> parameters */
  sky: {
    sunPosition: [number, number, number]
    turbidity: number
    rayleigh: number
    mieCoefficient: number
    mieDirectionalG: number
  }
  light: {
    sunColor: string
    sunIntensity: number
    ambientColor: string
    ambientIntensity: number
    hemiSky: string
    hemiGround: string
    hemiIntensity: number
    fillColor: string
    fillIntensity: number
  }
  fog: { color: string; density: number }
  exposure: number
  wind: number
  audio: {
    wind: number
    birds: number
    traffic: number
    construction: number
  }
}

export const ENVIRONMENTS: Record<EnvironmentPresetId, EnvironmentPreset> = {
  clearDay: {
    id: 'clearDay',
    label: 'Clear Day',
    sky: {
      sunPosition: [0.55, 0.58, 0.62],
      turbidity: 5.2,
      rayleigh: 2.4,
      mieCoefficient: 0.004,
      mieDirectionalG: 0.78,
    },
    light: {
      sunColor: '#fff4e0',
      sunIntensity: 5.4,
      ambientColor: '#b8c5c9',
      ambientIntensity: 0.6,
      hemiSky: '#cfe2ec',
      hemiGround: '#8c8578',
      hemiIntensity: 1.35,
      fillColor: '#a9c2d4',
      fillIntensity: 1.0,
    },
    fog: { color: '#c9d6d6', density: 0.0061 },
    exposure: 1.12,
    wind: 1,
    audio: { wind: 0.5, birds: 0.14, traffic: 0.12, construction: 0.11 },
  },
  morning: {
    id: 'morning',
    label: 'Morning',
    sky: {
      sunPosition: [0.82, 0.28, 0.38],
      turbidity: 6.2,
      rayleigh: 3.1,
      mieCoefficient: 0.005,
      mieDirectionalG: 0.78,
    },
    light: {
      sunColor: '#ffe9c9',
      sunIntensity: 4.7,
      ambientColor: '#b8bec0',
      ambientIntensity: 0.58,
      hemiSky: '#d8e7ec',
      hemiGround: '#938c7b',
      hemiIntensity: 1.2,
      fillColor: '#a9c2d4',
      fillIntensity: 0.9,
    },
    fog: { color: '#d8dbd7', density: 0.0075 },
    exposure: 1.08,
    wind: 0.7,
    audio: { wind: 0.42, birds: 0.2, traffic: 0.08, construction: 0.07 },
  },
  goldenHour: {
    id: 'goldenHour',
    label: 'Golden Hour',
    sky: {
      sunPosition: [0.92, 0.08, 0.42],
      turbidity: 7.4,
      rayleigh: 4.2,
      mieCoefficient: 0.009,
      mieDirectionalG: 0.78,
    },
    light: {
      sunColor: '#ffca83',
      sunIntensity: 4.1,
      ambientColor: '#b2a99d',
      ambientIntensity: 0.5,
      hemiSky: '#f3d9b4',
      hemiGround: '#8d7a61',
      hemiIntensity: 1.1,
      fillColor: '#c9a37a',
      fillIntensity: 0.85,
    },
    fog: { color: '#e8c9a3', density: 0.0082 },
    exposure: 1.05,
    wind: 0.8,
    audio: { wind: 0.6, birds: 0.1, traffic: 0.1, construction: 0.08 },
  },
  overcast: {
    id: 'overcast',
    label: 'Overcast',
    sky: {
      sunPosition: [0.5, 0.42, 0.55],
      turbidity: 9.5,
      rayleigh: 2.2,
      mieCoefficient: 0.02,
      mieDirectionalG: 0.62,
    },
    light: {
      sunColor: '#dfe3e4',
      sunIntensity: 2.4,
      ambientColor: '#a3adb2',
      ambientIntensity: 1.0,
      hemiSky: '#c2ccce',
      hemiGround: '#7e776c',
      hemiIntensity: 1.5,
      fillColor: '#aeb8bb',
      fillIntensity: 1.2,
    },
    fog: { color: '#b9c1c1', density: 0.01 },
    exposure: 1.0,
    wind: 1.2,
    audio: { wind: 0.78, birds: 0.04, traffic: 0.14, construction: 0.1 },
  },
}

export const DEFAULT_ENVIRONMENT: EnvironmentPreset = ENVIRONMENTS.clearDay
