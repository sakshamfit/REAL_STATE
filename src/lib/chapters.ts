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
 *
 * V12 CAMERA LANGUAGE:
 *   • Every beat has real camera movement — no dead time.
 *   • Heights range from 1.5 m (ground level) to 36 m (establishing).
 *   • Approach beats use fast camera travel; reveal beats use slow drift.
 *   • Process beats dip to eye level for procurement, rise as structure grows.
 *   • Service worlds vary in approach height and angle.
 *   • Beat boundaries are position-continuous (no spline kinks).
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
  /* ============================================================
   * ACT I — THE SITE
   * ============================================================ */

  {
    id: 'ground',
    label: 'THE GROUND',
    span: 100,
    anchor: [0, 0, 0],
    keys: [
      // opening: a long, low approach with a dramatic upward tilt.
      // V12: the camera starts looking at the ground ahead (1.5m height,
      // 5m ahead) and tilts up to the gate entrance (4.2m, 30m ahead).
      // This creates a cinematic "reveal" as the site appears above the
      // horizon line.
      k(0.0, [0, 1.1, 30], [0, 1.5, 24]),
      k(0.4, [0, 1.2, 18], [0, 2.4, 2]),
      k(0.75, [0, 1.5, 8], [0, 3.2, -14]),
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
      k(0.0, [0, 1.9, -2], [0, 4.2, -34]),
      // V12: ground-level shot of the compound — camera dips to 1.6 m,
      // human eye height. The boundary wall and gate read at real scale.
      k(0.12, [-6, 1.6, -14], [-37, 4, -86]),
      k(0.32, [-10, 4.5, -30], [-38, 14, -100]),
      k(0.55, [4, 10, -46], [-38, 24, -104]),
      k(0.78, [18, 16, -56], [-38, 32, -104]),
      k(1.0, [28, 18, -58], [-40, 34, -104]),
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

  /* ============================================================
   * ACT II — THE COMPANY
   * ============================================================ */

  {
    id: 'company',
    label: 'THE COMPANY',
    span: 170,
    anchor: [-40, 16, -104],
    keys: [
      k(0.0, [28, 18, -58], [-40, 34, -104]),
      k(0.32, [38, 28, -76], [-40, 28, -104]),
      // V12: mid-orbit descent — the camera dips through 14 m to show the
      // building's middle floors at eye-catching detail, then rises again
      k(0.55, [24, 14, -92], [-38, 20, -104]),
      k(0.78, [8, 10, -116], [-20, 12, -170]),
      k(1.0, [2, 9, -136], [0, 10, -196]),
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

  /* ============================================================
   * ACT III — SERVICES
   * ============================================================ */

  {
    id: 'services-intro',
    label: 'SERVICES',
    span: 70,
    anchor: [0, 6, -180],
    keys: [
      k(0.0, [2, 9, -136], [0, 10, -196]),
      k(0.5, [0, 8, -152], [-24, 8, -200]),
      k(1.0, [0, 7.5, -168], [-48, 8, -206]),
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

  // V12: Each service world now has a distinct camera identity.
  // Civil — high establishing, descend to ground level.
  {
    id: 'service-civil',
    label: 'CIVIL & STRUCTURAL',
    span: 75,
    anchor: [0, 8, -206],
    keys: [
      k(0.0, [0, 7.5, -168], [-48, 8, -206]),
      // V12: high establishing shot — camera rises to 14 m to show the
      // structural frame in full, then descends to eye level
      k(0.3, [-4, 14, -180], [-46, 12, -212]),
      k(0.65, [-8, 4, -198], [-44, 5, -220]),
      k(1.0, [0, 3.5, -216], [10, 4, -248]),
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

  // Residential — eye-level approach, slight rise to show balconies.
  {
    id: 'service-residential',
    label: 'RESIDENTIAL & COMMERCIAL',
    span: 75,
    anchor: [32, 6, -262],
    keys: [
      k(0.0, [0, 3.5, -216], [10, 4, -248]),
      k(0.3, [6, 2.5, -234], [46, 3, -256]),
      // V12: rise to show the balcony stack — the building's most
      // distinctive feature is its layered facade
      k(0.6, [12, 5, -248], [50, 7, -268]),
      k(1.0, [16, 6, -256], [50, 6, -280]),
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

  // Infrastructure — high wide shot showing the arch profile, then side approach.
  {
    id: 'service-infrastructure',
    label: 'INFRASTRUCTURE',
    span: 75,
    anchor: [-26, 6, -300],
    keys: [
      k(0.0, [16, 6, -256], [50, 6, -280]),
      // V12: high wide shot — the arch reads best from above and to the side
      k(0.28, [-2, 18, -270], [-46, 10, -300]),
      k(0.6, [-8, 6, -290], [-46, 8, -314]),
      k(1.0, [-6, 5, -300], [-48, 6, -324]),
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

  // Solar — dramatic high angle showing the full field, then descend.
  {
    id: 'service-solar',
    label: 'SOLAR & RENEWABLE',
    span: 75,
    anchor: [28, 4, -360],
    keys: [
      k(0.0, [-6, 5, -300], [-48, 6, -324]),
      // V12: the highest service-world shot — the solar field reads as a
      // geometric pattern from above, then the camera descends to show
      // individual panel detail
      k(0.25, [4, 28, -330], [50, 2, -358]),
      k(0.55, [16, 12, -342], [50, 2, -372]),
      k(1.0, [28, 22, -350], [50, 2, -388]),
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

  // Renovation — close approach showing scaffolding detail.
  {
    id: 'service-renovation',
    label: 'RENOVATION & RETROFIT',
    span: 75,
    anchor: [-46, 6, -412],
    keys: [
      k(0.0, [28, 22, -350], [50, 2, -388]),
      // V12: fast approach from the solar field, then slow close-up of the
      // scaffolding — the camera decelerates as it nears the facade
      k(0.35, [-2, 12, -380], [-46, 8, -410]),
      k(0.65, [-12, 5, -392], [-46, 4, -422]),
      k(1.0, [-14, 4, -396], [-48, 5, -432]),
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

  // Materials — low angle showing truck loading, slight rise.
  {
    id: 'service-materials',
    label: 'BUILDING MATERIALS',
    span: 75,
    anchor: [-14, 6, -451],
    keys: [
      k(0.0, [-14, 4, -396], [-48, 5, -432]),
      k(0.35, [0, 3, -418], [48, 3, -450]),
      // V12: slight rise to show the warehouse interior — the camera lifts
      // from truck-bed height to show the full stockpile arrangement
      k(0.65, [6, 5, -428], [50, 5, -462]),
      k(1.0, [10, 6, -434], [50, 5, -468]),
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

  /* ============================================================
   * ACT IV — PROCESS
   * ============================================================ */

  {
    id: 'process-intro',
    label: 'HOW WE BUILD',
    span: 60,
    anchor: [-14, 6, -460],
    keys: [
      k(0.0, [10, 6, -434], [50, 5, -468]),
      k(0.4, [-18, 12, -468], [-50, 4, -500]),
      k(1.0, [-38, 22, -480], [-50, 4, -508]),
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

  // V12 PROCESS CAMERA ARC: the camera descends from 22 m to 3.5 m
  // during procurement (stage 3), then rises to 18 m during execution
  // (stage 4). This creates a dramatic "dip and rise" that mirrors the
  // construction story: materials arrive at ground level, then the
  // structure rises.

  {
    id: 'process-1',
    label: 'REQUIREMENT ANALYSIS',
    span: 55,
    anchor: [0, 4, -500],
    keys: [
      k(0.0, [-38, 22, -480], [-50, 4, -508]),
      k(0.5, [-50, 20, -476], [-54, 4, -510]),
      k(1.0, [-56, 18, -474], [-56, 4, -512]),
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
      k(0.0, [-56, 18, -474], [-56, 4, -512]),
      // V12: camera descends from 18 m to 10 m — approaching the diorama
      k(0.5, [-52, 14, -474], [-52, 3, -518]),
      k(1.0, [-48, 10, -474], [-50, 3, -522]),
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
      k(0.0, [-48, 10, -474], [-50, 3, -522]),
      // V12: eye-level descent — the camera drops to 3.5 m to show
      // materials at human scale. This is the lowest process shot.
      k(0.5, [-44, 5, -474], [-44, 2.5, -528]),
      k(1.0, [-40, 3.5, -474], [-42, 2.5, -532]),
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
      k(0.0, [-40, 3.5, -474], [-42, 2.5, -532]),
      // V12: the structure rises — camera lifts from 3.5 m to 16 m as
      // the miniature building grows. The most dramatic single beat.
      k(0.3, [-36, 5, -474], [-38, 4, -536]),
      k(0.65, [-32, 12, -474], [-34, 10, -540]),
      k(1.0, [-28, 16, -474], [-30, 12, -544]),
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
      k(0.0, [-28, 16, -474], [-30, 12, -544]),
      k(0.4, [-10, 18, -476], [-8, 8, -548]),
      k(1.0, [14, 18, -478], [10, 6, -554]),
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

  /* ============================================================
   * ACT V — MATERIAL WORLD → TRUST → CLIENTS
   * ============================================================ */

  {
    id: 'material-world',
    label: 'MATERIAL WORLD',
    span: 130,
    anchor: [0, 10, -610],
    keys: [
      k(0.0, [14, 18, -478], [10, 6, -554]),
      // V12: the descent through the material gates — camera drops from
      // 18 m to 7 m while driving through the gate sequence
      k(0.25, [-4, 10, -548], [0, 7, -590]),
      k(0.5, [0, 7, -580], [0, 7, -620]),
      k(0.75, [0, 6.5, -620], [0, 7, -660]),
      k(1.0, [0, 6, -648], [0, 6, -690]),
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
      k(0.0, [0, 6, -648], [0, 6, -690]),
      // V12: low approach to the trust building — camera starts at 3.5 m
      // (the building entrance reads at human scale), then rises to 8 m
      // for the wide shot with the four standards floating around it
      k(0.3, [-4, 3.5, -688], [-24, 4, -730]),
      k(0.6, [-8, 6, -708], [-34, 8, -748]),
      k(1.0, [-10, 7, -722], [-38, 10, -762]),
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
      k(0.0, [-10, 7, -722], [-38, 10, -762]),
      // V12: drive through the corridor — camera enters at 5 m (column
      // height), rises slightly to 7 m at the midpoint for a wider view
      // of the client names, then settles back to 6 m
      k(0.25, [10, 5, -750], [38, 5, -800]),
      k(0.5, [28, 5, -780], [44, 5, -830]),
      k(0.75, [38, 7, -820], [44, 6, -880]),
      k(1.0, [44, 6, -862], [44, 7, -940]),
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

  /* ============================================================
   * ACT VI — PRESENCE → FUTURE → CONTACT
   * ============================================================ */

  {
    id: 'india',
    label: 'OUR PRESENCE',
    span: 340,
    anchor: [0, 2, -1000],
    mapWindow: [0.3, 0.86],
    keys: [
      k(0.0, [44, 6, -862], [44, 7, -940]),
      // V12: rising establishing shot — the camera climbs from 6 m to
      // 34 m, pulling back to reveal the India map on its plinth. The
      // ascent is the transition from the corridor to the national view.
      k(0.15, [10, 18, -900], [0, 2, -990]),
      k(0.28, [0, 32, -960], [0, 2, -1000]),
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
      k(0.0, [0, 12, -1090], [0, 10, -1160]),
      // V12: closer approach with orbit — the camera drifts from 30 m
      // away to 18 m, dropping to 6 m to look up at the growing tower.
      // The low angle makes the future building feel monumental.
      k(0.3, [10, 8, -1078], [0, 22, -1148]),
      k(0.55, [16, 5, -1068], [0, 30, -1150]),
      k(0.78, [8, 7, -1072], [0, 36, -1150]),
      k(1.0, [0, 9, -1078], [0, 36, -1150]),
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
      k(0.0, [0, 9, -1078], [0, 36, -1150]),
      // V12: final approach — the camera descends to 3.5 m (human eye)
      // and pushes in to 14 m from the building. The close, low angle
      // makes the closing frame feel intimate and grounded.
      k(0.3, [4, 5, -1090], [0, 28, -1148]),
      k(0.6, [6, 3.5, -1100], [0, 20, -1150]),
      k(0.8, [3, 3.5, -1108], [0, 16, -1150]),
      k(1.0, [0, 3.5, -1114], [0, 14, -1150]),
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
