/**
 * THE STORY — one continuous camera move, described as beats.
 *
 * Every beat owns:
 *   • a slice of the scroll (span, in vh)
 *   • camera keyframes (world position + look target)
 *   • the HTML typography that travels with it
 *
 * Progress is derived from the real DOM height of the sections, so the camera
 * and the typography can never drift apart.
 */

export type CameraKey = {
  /** local time inside the beat, 0..1 */
  t: number
  pos: [number, number, number]
  look: [number, number, number]
}

export type TextBlock = {
  align?: 'left' | 'right' | 'center'
  eyebrow?: string
  index?: string
  lines?: string[]
  sub?: string
  body?: string[]
  meta?: { value: string; label: string }[]
  note?: string
  /** relative share of the beat's scroll height */
  weight?: number
  /** extra html blocks (contact details, client list, state rail…) */
  slot?: 'hero' | 'contact' | 'clients' | 'footer' | 'map'
}

export type Beat = {
  id: string
  /** label shown in the progress rail */
  label: string
  /** scroll length of the beat in vh */
  span: number
  keys: CameraKey[]
  blocks?: TextBlock[]
  /** world anchor used for distance culling */
  anchor?: [number, number, number]
  /** local t window where the interactive India map owns the camera */
  mapWindow?: [number, number]
}

const k = (t: number, pos: [number, number, number], look: [number, number, number]): CameraKey => ({
  t,
  pos,
  look,
})

export const beats: Beat[] = [
  {
    id: 'ground',
    label: 'THE GROUND',
    span: 100,
    anchor: [0, 0, 0],
    keys: [
      // opening: a long, low approach with a slight upward tilt so the site
      // sits inside the frame with sky above it, never cropped by the top edge
      k(0.0, [0, 1.1, 30], [0, 3.4, -14]),
      k(1.0, [0, 1.9, -2], [0, 4.2, -34]),
    ],
    blocks: [
      {
        align: 'center',
        slot: 'hero',
        lines: ['RUDRA'],
        sub: 'CONSTRUCTIONS & SUPPLIERS',
        body: ['ENGINEERING TRUST.', 'CONSTRUCTING EXCELLENCE.'],
      },
    ],
  },
  {
    id: 'build',
    label: 'THE BUILD',
    span: 260,
    anchor: [-40, 12, -104],
    keys: [
      k(0.0, [0, 1.9, -2], [0, 2.4, -34]),
      k(0.3, [0, 4.2, -26], [-40, 10, -104]),
      k(0.62, [13, 8, -42], [-40, 21, -104]),
      k(1.0, [24, 15, -52], [-40, 30, -104]),
    ],
    blocks: [
      {
        align: 'left',
        eyebrow: 'THE BUILD',
        lines: ['BUILDING', 'THE FUTURE'],
      },
      {
        align: 'right',
        lines: ['WITH STRENGTH,', 'INTEGRITY &', 'INNOVATION.'],
      },
    ],
  },
  {
    id: 'company',
    label: 'THE COMPANY',
    span: 170,
    anchor: [-40, 16, -104],
    keys: [
      k(0.0, [24, 15, -52], [-40, 30, -104]),
      k(0.38, [38, 24, -74], [-40, 27, -104]),
      k(0.72, [20, 13, -108], [-40, 22, -104]),
      k(1.0, [2, 10, -130], [0, 12, -196]),
    ],
    blocks: [
      {
        align: 'left',
        eyebrow: 'THE COMPANY',
        lines: ['FROM CONCEPT', 'TO COMPLETION.'],
        body: ['Construction.', 'Infrastructure.', 'Renewable Energy.'],
        meta: [
          { value: '₹14.65 Cr', label: 'TOTAL TURNOVER' },
          { value: '2025', label: 'FOUNDED' },
        ],
      },
    ],
  },
  {
    id: 'services-intro',
    label: 'SERVICES',
    span: 70,
    anchor: [0, 6, -180],
    keys: [
      k(0.0, [2, 10, -130], [0, 12, -196]),
      k(1.0, [0, 9, -168], [-48, 9, -206]),
    ],
    blocks: [
      {
        align: 'left',
        eyebrow: 'SERVICES',
        lines: ['SIX', 'WORLDS'],
        body: ['Six disciplines.', 'One engineering standard.'],
      },
    ],
  },
  {
    id: 'service-civil',
    label: 'CIVIL & STRUCTURAL',
    span: 75,
    anchor: [0, 8, -206],
    keys: [
      k(0.0, [0, 9, -168], [-48, 9, -206]),
      k(0.55, [0, 7.5, -196], [-48, 7.5, -230]),
      k(1.0, [0, 7, -218], [10, 7, -252]),
    ],
    blocks: [
      {
        align: 'left',
        index: '01',
        lines: ['CIVIL &', 'STRUCTURAL'],
        body: ['Built from the ground up.'],
        note: 'Foundations, structural frames and civil works — certified materials, supervised on every pour.',
      },
    ],
  },
  {
    id: 'service-residential',
    label: 'RESIDENTIAL & COMMERCIAL',
    span: 75,
    anchor: [32, 6, -262],
    keys: [
      k(0.0, [0, 7, -218], [12, 7, -252]),
      k(0.5, [11, 8, -242], [50, 7, -262]),
      k(1.0, [16, 7.5, -256], [50, 7, -276]),
    ],
    blocks: [
      {
        align: 'right',
        index: '02',
        lines: ['RESIDENTIAL &', 'COMMERCIAL'],
        body: ['Spaces people live and work in.'],
        note: 'Homes, housing and commercial built form delivered from concept through completion.',
      },
    ],
  },
  {
    id: 'service-infrastructure',
    label: 'INFRASTRUCTURE',
    span: 75,
    anchor: [-26, 6, -300],
    keys: [
      k(0.0, [16, 7.5, -256], [50, 7, -276]),
      k(0.45, [-4, 13, -274], [-48, 8, -300]),
      k(1.0, [-6, 7, -300], [-48, 7, -320]),
    ],
    blocks: [
      {
        align: 'left',
        index: '03',
        lines: ['INFRA', 'STRUCTURE'],
        body: ['Bridge. Road. Structure.'],
        note: 'Public infrastructure built for load, longevity and the communities that depend on it.',
      },
    ],
  },
  {
    id: 'service-solar',
    label: 'SOLAR & RENEWABLE',
    span: 75,
    anchor: [28, 4, -360],
    keys: [
      k(0.0, [-6, 7, -300], [-48, 7, -336]),
      k(0.45, [6, 24, -330], [50, 4, -360]),
      k(1.0, [30, 26, -348], [50, 2, -384]),
    ],
    blocks: [
      {
        align: 'right',
        index: '04',
        lines: ['SOLAR &', 'RENEWABLE'],
        body: ['Energy engineered into the build.'],
        note: 'Solar and renewable installations designed alongside the structure, not bolted on after.',
      },
    ],
  },
  {
    id: 'service-renovation',
    label: 'RENOVATION & RETROFIT',
    span: 75,
    anchor: [-46, 6, -412],
    keys: [
      k(0.0, [30, 26, -348], [50, 2, -384]),
      k(0.5, [-2, 13, -382], [-48, 9, -412]),
      k(1.0, [-16, 8, -394], [-48, 7, -430]),
    ],
    blocks: [
      {
        align: 'left',
        index: '05',
        lines: ['RENOVATION', '& RETROFIT'],
        body: ['Old structure. New life.'],
        note: 'Structural assessment, retrofit and renovation of ageing buildings and infrastructure.',
      },
    ],
  },
  {
    id: 'service-materials',
    label: 'BUILDING MATERIALS',
    span: 75,
    anchor: [-14, 6, -451],
    keys: [
      k(0.0, [-16, 8, -394], [-48, 7, -432]),
      k(0.5, [2, 8, -420], [50, 6, -455]),
      k(1.0, [10, 7, -432], [50, 6, -466]),
    ],
    blocks: [
      {
        align: 'right',
        index: '06',
        lines: ['BUILDING', 'MATERIALS'],
        body: ['Steel. Concrete. Stone.'],
        note: 'Certified building materials sourced, checked and delivered so the site never waits.',
      },
    ],
  },
  {
    id: 'process-intro',
    label: 'HOW WE BUILD',
    span: 60,
    anchor: [-14, 6, -460],
    keys: [
      k(0.0, [10, 7, -432], [50, 6, -466]),
      k(0.5, [-20, 9, -470], [-50, 4, -500]),
      k(1.0, [-40, 22, -482], [-50, 4, -505]),
    ],
    blocks: [
      {
        align: 'left',
        eyebrow: 'HOW WE BUILD',
        lines: ['FIVE', 'STAGES'],
        body: ['Every project runs the same method.', 'From first scan to final audit.'],
      },
    ],
  },
  {
    id: 'process-1',
    label: 'REQUIREMENT ANALYSIS',
    span: 55,
    anchor: [0, 4, -500],
    keys: [
      k(0.0, [-40, 22, -482], [-50, 4, -505]),
      k(1.0, [-59, 23, -474], [-58, 4, -510]),
    ],
    blocks: [
      {
        align: 'left',
        index: '01',
        lines: ['REQUIREMENT', 'ANALYSIS'],
        body: ['Site scan appears.'],
      },
    ],
  },
  {
    id: 'process-2',
    label: 'DESIGN & PLANNING',
    span: 55,
    anchor: [0, 4, -512],
    keys: [
      k(0.0, [-59, 23, -474], [-58, 4, -510]),
      k(1.0, [-50, 24, -474], [-50, 4, -520]),
    ],
    blocks: [
      {
        align: 'left',
        index: '02',
        lines: ['DESIGN &', 'PLANNING'],
        body: ['Blueprint appears.'],
      },
    ],
  },
  {
    id: 'process-3',
    label: 'PROCUREMENT',
    span: 55,
    anchor: [0, 4, -522],
    keys: [
      k(0.0, [-50, 24, -474], [-50, 4, -520]),
      k(1.0, [-41, 23, -474], [-42, 4, -530]),
    ],
    blocks: [
      {
        align: 'left',
        index: '03',
        lines: ['PROCURE', 'MENT'],
        body: ['Materials arrive.'],
      },
    ],
  },
  {
    id: 'process-4',
    label: 'EXECUTION',
    span: 55,
    anchor: [0, 4, -532],
    keys: [
      k(0.0, [-41, 23, -474], [-42, 4, -530]),
      k(1.0, [-32, 22, -474], [-34, 4, -540]),
    ],
    blocks: [
      {
        align: 'left',
        index: '04',
        lines: ['EXECU', 'TION'],
        body: ['Structure rises.'],
      },
    ],
  },
  {
    id: 'process-5',
    label: 'QUALITY & SAFETY',
    span: 55,
    anchor: [0, 4, -542],
    keys: [
      k(0.0, [-32, 22, -474], [-34, 4, -540]),
      k(1.0, [14, 20, -478], [10, 4, -552]),
    ],
    blocks: [
      {
        align: 'left',
        index: '05',
        lines: ['QUALITY &', 'SAFETY'],
        body: ['Inspection begins.'],
      },
    ],
  },
  {
    id: 'material-world',
    label: 'MATERIAL WORLD',
    span: 130,
    anchor: [0, 10, -610],
    keys: [
      k(0.0, [-36, 20, -478], [-40, 4, -552]),
      k(0.35, [-8, 9, -556], [0, 7, -600]),
      k(1.0, [0, 7, -648], [0, 7, -690]),
    ],
    blocks: [
      {
        align: 'center',
        lines: ['QUALITY', 'IS NOT A STEP.'],
      },
      {
        align: 'center',
        lines: ['IT IS THE', 'STANDARD.'],
      },
    ],
  },
  {
    id: 'trust',
    label: 'TRUST',
    span: 120,
    anchor: [0, 6, -744],
    keys: [
      k(0.0, [0, 7, -648], [0, 7, -690]),
      k(0.5, [-4, 6, -700], [-20, 5, -730]),
      k(1.0, [-10, 5.5, -722], [-38, 5, -762]),
    ],
    blocks: [
      {
        align: 'center',
        eyebrow: 'TRUST',
        lines: ['BUILT ON', 'STANDARD.'],
        note: 'Certified materials. Safety protocols. Industry standards. Supervised audits. Eco-friendly practice.',
      },
    ],
  },
  {
    id: 'corridor',
    label: 'CLIENTS',
    span: 170,
    anchor: [0, 5, -830],
    keys: [
      k(0.0, [-10, 5.5, -722], [-38, 5, -762]),
      k(0.5, [26, 5, -780], [44, 5, -830]),
      k(1.0, [44, 5, -862], [44, 5, -940]),
    ],
    blocks: [
      {
        align: 'left',
        eyebrow: 'CLIENTS',
        lines: ['WHO', 'TRUSTS US.'],
        slot: 'clients',
      },
    ],
  },
  {
    id: 'india',
    label: 'OUR PRESENCE',
    span: 340,
    anchor: [0, 2, -1000],
    mapWindow: [0.3, 0.86],
    keys: [
      k(0.0, [44, 5, -862], [44, 5, -940]),
      k(0.2, [0, 24, -916], [0, 2, -990]),
      k(0.32, [0, 34, -969], [0, 2, -1000]),
      k(0.86, [0, 34, -969], [0, 2, -1000]),
      k(1.0, [0, 12, -1090], [0, 10, -1160]),
    ],
    blocks: [
      {
        align: 'center',
        eyebrow: 'PRESENCE',
        lines: ['OUR PRESENCE', 'ACROSS INDIA'],
        body: ['Building stronger communities', 'across regions.'],
        slot: 'map',
      },
    ],
  },
  {
    id: 'future',
    label: 'THE FUTURE',
    span: 160,
    anchor: [0, 20, -1150],
    keys: [
      k(0.0, [0, 12, -1090], [0, 16, -1150]),
      k(0.45, [14, 10, -1086], [0, 24, -1150]),
      k(1.0, [0, 9, -1078], [0, 30, -1150]),
    ],
    blocks: [
      {
        align: 'left',
        eyebrow: 'THE FUTURE',
        lines: ['THE NEXT', 'STRUCTURE IS', 'ALREADY TAKING', 'SHAPE.'],
      },
    ],
  },
  {
    id: 'contact',
    label: 'CONTACT',
    span: 150,
    anchor: [0, 10, -1150],
    keys: [
      k(0.0, [0, 9, -1078], [0, 30, -1150]),
      k(0.5, [0, 7.5, -1092], [0, 26, -1150]),
      k(1.0, [0, 7, -1106], [0, 22, -1150]),
    ],
    blocks: [
      {
        align: 'left',
        lines: ["LET'S BUILD", 'THE FUTURE', 'TOGETHER.'],
        body: ['YOUR VISION.', 'OUR ENGINEERING.', 'BUILT TO LAST.'],
        slot: 'contact',
      },
      {
        align: 'left',
        slot: 'footer',
        weight: 0.7,
      },
    ],
  },
]

export type BeatTiming = {
  beat: Beat
  index: number
  /** fraction of total scroll at which the beat starts / ends */
  start: number
  end: number
}

export const totalSpan = beats.reduce((sum, beat) => sum + beat.span, 0)

export const beatTimings: BeatTiming[] = (() => {
  let cursor = 0
  return beats.map((beat, index) => {
    const start = cursor / totalSpan
    cursor += beat.span
    return { beat, index, start, end: cursor / totalSpan }
  })
})()

export const beatById = new Map(beats.map((beat) => [beat.id, beat]))

export function findBeatAt(progress: number): BeatTiming {
  for (let i = 0; i < beatTimings.length; i++) {
    const timing = beatTimings[i]
    if (progress < timing.end || i === beatTimings.length - 1) return timing
  }
  return beatTimings[0]
}

export function beatProgress(timing: BeatTiming, progress: number) {
  const span = timing.end - timing.start
  return span <= 0 ? 0 : Math.min(1, Math.max(0, (progress - timing.start) / span))
}

/** Local 0..1 progress inside a named beat. */
export function beatLocal(id: string, progress: number) {
  const timing = beatTimings.find((item) => item.beat.id === id)
  if (!timing) return 0
  const span = timing.end - timing.start
  return span <= 0 ? 0 : Math.min(1, Math.max(0, (progress - timing.start) / span))
}
