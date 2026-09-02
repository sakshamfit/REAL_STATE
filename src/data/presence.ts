/**
 * RUDRA — presence data.
 *
 * HARD RULE: never invent Rudra projects. Only verified states / cities /
 * coordinates may live in this file. When only the state is verified, the UI
 * falls back to "PRESENCE INFORMATION COMING SOON".
 *
 * Adding a project later = adding an object to `presenceLocations`. Nothing in
 * the 3D map has to be rewritten.
 */

export type Coordinates = {
  lat: number
  lng: number
}

export type PresenceLocation = {
  state: string
  city: string
  projectName?: string
  projectType?: string
  year?: number
  description?: string
  coordinates: Coordinates
}

/** Backwards compatible alias used by the design document. */
export type Location = {
  state: string
  city: string
  projectName?: string
  projectType?: string
  year?: number
  coordinates?: Coordinates
}

/** Verified office / presence locations. */
export const presenceLocations: PresenceLocation[] = [
  {
    state: 'Bihar',
    city: 'Patna',
    coordinates: { lat: 25.5941, lng: 85.1376 },
  },
  {
    state: 'Bihar',
    city: 'Bettiah',
    coordinates: { lat: 26.8025, lng: 84.5116 },
  },
  {
    state: 'Assam',
    city: 'Biswanath',
    coordinates: { lat: 26.7333, lng: 93.1667 },
  },
  {
    state: 'Assam',
    city: 'Jorhat',
    coordinates: { lat: 26.7509, lng: 94.2036 },
  },
]

/**
 * Rudra's "Where We Are" states. Every entry is selectable in the 3D map —
 * states without location data show verified-state-only information.
 */
export const presenceStates: PresenceState[] = [
  { name: 'Bihar', label: 'BIHAR' },
  { name: 'Uttar Pradesh', label: 'UTTAR PRADESH' },
  { name: 'Jharkhand', label: 'JHARKHAND' },
  { name: 'Odisha', label: 'ODISHA' },
  { name: 'Assam', label: 'ASSAM' },
  { name: 'Meghalaya', label: 'MEGHALAYA' },
  { name: 'Tripura', label: 'TRIPURA' },
  { name: 'Arunachal Pradesh', label: 'ARUNACHAL PRADESH' },
  { name: 'Haryana', label: 'HARYANA' },
  { name: 'Punjab', label: 'PUNJAB' },
  { name: 'Jammu & Kashmir', label: 'JAMMU & KASHMIR' },
]

export type PresenceState = {
  name: string
  label: string
  /** Short framing line used by the information layer. */
  note?: string
}

/** Same id scheme as `scripts/build-map-data.mjs`. */
export function stateId(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

const LOCATIONS_BY_STATE = presenceLocations.reduce<Record<string, PresenceLocation[]>>((acc, location) => {
  const key = stateId(location.state)
  acc[key] = acc[key] ? [...acc[key], location] : [location]
  return acc
}, {})

const PRESENCE_IDS = new Set(presenceStates.map((state) => stateId(state.name)))

export function isPresenceState(id: string): boolean {
  return PRESENCE_IDS.has(id)
}

export function locationsForState(id: string): PresenceLocation[] {
  return LOCATIONS_BY_STATE[id] ?? []
}

export function presenceStateByName(id: string): PresenceState | undefined {
  return presenceStates.find((state) => stateId(state.name) === id)
}
