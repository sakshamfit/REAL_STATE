/** Verified company facts — from the supplied Rudra company document. */

export const company = {
  name: 'RUDRA',
  legalName: 'RUDRA CONSTRUCTIONS & SUPPLIERS',
  tagline: 'ENGINEERING TRUST. CONSTRUCTING EXCELLENCE.',
  founded: 2025,
  turnover: '₹14.65 Cr',
  turnoverLabel: 'TOTAL TURNOVER',
  phone: '+91 8099588978',
  phoneHref: 'tel:+918099588978',
  email: 'rudraconstructionsupplier14@gmail.com',
  emailHref: 'mailto:rudraconstructionsupplier14@gmail.com',
  copyright: '© 2026 RUDRA CONSTRUCTIONS & SUPPLIERS',
} as const

export const services = [
  {
    index: '01',
    title: ['CIVIL &', 'STRUCTURAL'],
    body: 'Built from the ground up.',
    detail:
      'Foundations, structural frames and civil works executed with certified materials and supervised on every pour.',
  },
  {
    index: '02',
    title: ['RESIDENTIAL &', 'COMMERCIAL'],
    body: 'Spaces people live and work in.',
    detail: 'Homes, housing and commercial built form delivered from concept through completion.',
  },
  {
    index: '03',
    title: ['INFRA', 'STRUCTURE'],
    body: 'Bridges. Roads. Structures.',
    detail: 'Public infrastructure built for load, longevity and the communities that depend on it.',
  },
  {
    index: '04',
    title: ['SOLAR &', 'RENEWABLE'],
    body: 'Energy engineered into the build.',
    detail: 'Solar and renewable installations designed alongside the structure, not bolted on after.',
  },
  {
    index: '05',
    title: ['RENOVATION &', 'RETROFIT'],
    body: 'Old structure. New life.',
    detail: 'Structural assessment, retrofit and renovation of ageing buildings and infrastructure.',
  },
  {
    index: '06',
    title: ['BUILDING', 'MATERIALS'],
    body: 'Supply that keeps sites moving.',
    detail: 'Steel, cement, stone and building materials sourced, certified and delivered to site.',
  },
] as const

export const processStages = [
  {
    index: '01',
    title: ['REQUIREMENT', 'ANALYSIS'],
    body: 'Site scan. Brief. Constraints.',
  },
  {
    index: '02',
    title: ['DESIGN &', 'PLANNING'],
    body: 'Drawings. Structure. Programme.',
  },
  {
    index: '03',
    title: ['PROCURE', 'MENT'],
    body: 'Certified materials to site.',
  },
  {
    index: '04',
    title: ['EXECU', 'TION'],
    body: 'The structure rises.',
  },
  {
    index: '05',
    title: ['QUALITY &', 'SAFETY'],
    body: 'Inspection at every stage.',
  },
] as const

/** Clients named in the supplied Rudra client list. */
export const clients = [
  'PANCHAYATI RAJ',
  'AASHRAY FOUNDATION',
  'SEHGAL FOUNDATION',
  'SRIJJAN',
  'GVT',
  'BIHAR STATE BUILDING CORPORATION LTD.',
] as const

export const trustPillars = ['QUALITY', 'SAFETY', 'COMPLIANCE', 'SUSTAINABILITY'] as const

export const navigation = [
  { label: 'WORK', target: 'work' },
  { label: 'SERVICES', target: 'services' },
  { label: 'PRESENCE', target: 'presence' },
  { label: 'CONTACT', target: 'contact' },
] as const
