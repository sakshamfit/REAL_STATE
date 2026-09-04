/**
 * RUDRA — project records (public Projects section + admin panel).
 *
 * The rows in `seedProjects` are EDITABLE PLACEHOLDERS so the Projects page
 * and the /admin panel have something real to show and manage. Replace them
 * with Rudra's verified project records — either by editing this file or,
 * without touching code, from the /admin panel (your changes are saved in the
 * browser and applied instantly to the public Projects page).
 */

export type ProjectStatus = 'Completed' | 'Ongoing' | 'Planning'

export type Project = {
  id: string
  name: string
  category: string
  client: string
  state: string
  city: string
  year: number | ''
  status: ProjectStatus
  /** Optional value string such as "₹3.2 Cr" (never fabricated; leave blank until verified). */
  value: string
  description: string
  featured: boolean
}

/** Categories mirror the six services shown in the 3D experience. */
export const PROJECT_CATEGORIES = [
  'CIVIL & STRUCTURAL',
  'RESIDENTIAL & COMMERCIAL',
  'INFRASTRUCTURE',
  'SOLAR & RENEWABLE',
  'RENOVATION & RETROFIT',
  'BUILDING MATERIALS',
] as const

export const PROJECT_STATUSES: ProjectStatus[] = ['Completed', 'Ongoing', 'Planning']

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  Completed: 'COMPLETED',
  Ongoing: 'ONGOING',
  Planning: 'PLANNING',
}

export const seedProjects: Project[] = [
  {
    id: 'seed-1',
    name: 'G+4 Group Housing — 48 Units',
    category: 'RESIDENTIAL & COMMERCIAL',
    client: 'AASHRAY FOUNDATION',
    state: 'Bihar',
    city: 'Patna',
    year: 2026,
    status: 'Ongoing',
    value: '',
    description:
      'RCC-framed group housing delivered from concept through finishing: foundations, columns, slabs, brickwork, MEP coordination and finishing trades.',
    featured: true,
  },
  {
    id: 'seed-2',
    name: 'Panchayat Road, Culvert & Drain Network',
    category: 'INFRASTRUCTURE',
    client: 'PANCHAYATI RAJ',
    state: 'Bihar',
    city: 'Bettiah',
    year: 2025,
    status: 'Completed',
    value: '',
    description:
      'Rural road with cross-drainage culvert and lined side drains — built for load, longevity and the community that depends on it daily.',
    featured: true,
  },
  {
    id: 'seed-3',
    name: 'School Block Renovation & Structural Retrofit',
    category: 'RENOVATION & RETROFIT',
    client: 'SEHGAL FOUNDATION',
    state: 'Assam',
    city: 'Biswanath',
    year: 2025,
    status: 'Completed',
    value: '',
    description:
      'Structural assessment, retrofit and renovation of an ageing school block — new life inside an old structure, completed on schedule.',
    featured: true,
  },
  {
    id: 'seed-4',
    name: 'Rooftop Solar EPC — 150 kWp',
    category: 'SOLAR & RENEWABLE',
    client: 'GVT',
    state: 'Assam',
    city: 'Jorhat',
    year: 2026,
    status: 'Ongoing',
    value: '',
    description:
      'Solar engineering, procurement and construction on an existing rooftop — renewable energy designed alongside the structure, not bolted on after.',
    featured: false,
  },
  {
    id: 'seed-5',
    name: 'Commercial Complex — Structural Frame & Civil Works',
    category: 'CIVIL & STRUCTURAL',
    client: 'BIHAR STATE BUILDING CORPORATION LTD.',
    state: 'Bihar',
    city: 'Patna',
    year: 2026,
    status: 'Planning',
    value: '',
    description:
      'Foundations, structural frame and civil works for a commercial building — certified materials and supervision on every pour.',
    featured: false,
  },
  {
    id: 'seed-6',
    name: 'Steel Warehouse Shell + Material Supply',
    category: 'BUILDING MATERIALS',
    client: 'SRIJJAN',
    state: 'Bihar',
    city: 'Bettiah',
    year: 2025,
    status: 'Ongoing',
    value: '',
    description:
      'Pre-engineered steel warehouse shell with steel, cement and stone supplied to site — materials that keep the site moving.',
    featured: false,
  },
]

export const ALL_INDIA_STATES = [
  'Andaman & Nicobar Islands',
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chandigarh',
  'Chhattisgarh',
  'Dadra & Nagar Haveli and Daman & Diu',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jammu & Kashmir',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Ladakh',
  'Lakshadweep',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Puducherry',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
] as const

/** Presence states where Rudra works (mirrors src/data/presence.ts). */
export const PRESENCE_STATES = [
  'Bihar',
  'Uttar Pradesh',
  'Jharkhand',
  'Odisha',
  'Assam',
  'Meghalaya',
  'Tripura',
  'Arunachal Pradesh',
  'Haryana',
  'Punjab',
  'Jammu & Kashmir',
] as const

export function makeProjectId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `p-${crypto.randomUUID().slice(0, 8)}`
  return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export const STORAGE_KEY = 'rudra.projects.v1'
export const ADMIN_PASSCODE = 'rudra@2025'
