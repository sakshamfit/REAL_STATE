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
 * V14 PREMIUM MASTERING:
 *   • Three signature "wow" shots: hero reveal, construction scale, finished project.
 *   • Lateral parallax reveals instead of straight-on approaches.
 *   • Camera "holds" through keyframe clustering at reveal moments.
 *   • Asymmetric compositions (building in left-third or right-third).
 *   • Every beat has intentional foreground/midground/background.
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
      // V14: dramatic low approach with lateral drift. The camera starts
      // right of centre (x=6), looking at the ground ahead. As it advances,
      // it drifts left, creating parallax. The building at x=-40 is initially
      // off-frame — it slides into view as the camera drifts left. The tilt-up
      // reveals the sky above the gate. This is Signature Shot #1's setup.
      k(0.0, [6, 1.1, 30], [2, 1.5, 24]),
      k(0.35, [4, 1.2, 18], [-2, 2.2, 4]),
      k(0.65, [2, 1.4, 8], [-4, 3.0, -10]),
      k(0.85, [0, 1.7, 0], [-6, 3.8, -24]),
      k(1.0, [-2, 1.9, -4], [-10, 4.2, -36]),
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

  /* ============================================================
   * SIGNATURE SHOT #1 — HERO REVEAL
   * "Low human-level approach. Building initially partially obscured.
   *  Foreground passes. Entrance appears. Camera tilts upward.
   *  Tower is revealed. Short cinematic hold."
   * ============================================================ */
  {
    id: 'build',
    label: 'THE BUILD',
    span: 280,
    anchor: [-40, 12, -104],
    keys: [
      k(0.0, [-2, 1.9, -4], [-10, 4.2, -36]),
      // Phase 1: ground-level approach — camera at human eye height (1.6m).
      // The boundary wall and gate are in the midground. Building is hidden
      // behind the wall. Camera drifts left, creating parallax.
      k(0.08, [-4, 1.6, -12], [-30, 3, -60]),
      k(0.16, [-6, 1.5, -20], [-36, 4, -80]),
      // Phase 2: entrance reveal — camera passes the gate, building entrance
      // appears. Camera still at eye level. The compound interior is revealed.
      k(0.25, [-8, 1.6, -28], [-38, 6, -96]),
      // Phase 3: tower reveal — camera rises as the tower comes into view.
      // This is the "wow" moment. The tilt-up is dramatic but controlled.
      k(0.38, [-10, 4, -36], [-38, 16, -104]),
      k(0.52, [-4, 8, -44], [-38, 26, -104]),
      // Phase 4: hold + orbit — camera slows down (keyframes clustered) to
      // let the viewer absorb the full building. Then continues orbiting.
      k(0.65, [6, 13, -50], [-38, 30, -104]),
      k(0.78, [16, 16, -54], [-38, 33, -104]),
      k(0.88, [24, 18, -56], [-40, 34, -104]),
      // Phase 5: settle — final hold position. Building in left third,
      // sky in right third. Strong architectural silhouette.
      k(0.94, [28, 18, -58], [-40, 34, -104]),
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
      k(0.28, [36, 26, -72], [-40, 28, -104]),
      // V14: mid-orbit descent with lateral parallax — the camera dips to
      // 12m to show the building's middle floors, then continues the orbit
      k(0.5, [22, 14, -88], [-38, 20, -104]),
      k(0.72, [8, 10, -112], [-24, 14, -160]),
      k(0.88, [4, 9, -128], [-8, 11, -186]),
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

  // Civil — high establishing, descend to ground level.
  {
    id: 'service-civil',
    label: 'CIVIL & STRUCTURAL',
    span: 75,
    anchor: [0, 8, -206],
    keys: [
      k(0.0, [0, 7.5, -168], [-48, 8, -206]),
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

  // Residential — eye-level lateral approach.
  {
    id: 'service-residential',
    label: 'RESIDENTIAL & COMMERCIAL',
    span: 75,
    anchor: [32, 6, -262],
    keys: [
      k(0.0, [0, 3.5, -216], [10, 4, -248]),
      k(0.3, [6, 2.5, -234], [46, 3, -256]),
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

  // Infrastructure — high wide shot showing the arch profile.
  {
    id: 'service-infrastructure',
    label: 'INFRASTRUCTURE',
    span: 75,
    anchor: [-26, 6, -300],
    keys: [
      k(0.0, [16, 6, -256], [50, 6, -280]),
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

  // Solar — dramatic high angle, then descend.
  {
    id: 'service-solar',
    label: 'SOLAR & RENEWABLE',
    span: 75,
    anchor: [28, 4, -360],
    keys: [
      k(0.0, [-6, 5, -300], [-48, 6, -324]),
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

  // Materials — low angle showing truck loading.
  {
    id: 'service-materials',
    label: 'BUILDING MATERIALS',
    span: 75,
    anchor: [-14, 6, -451],
    keys: [
      k(0.0, [-14, 4, -396], [-48, 5, -432]),
      k(0.35, [0, 3, -418], [48, 3, -450]),
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

  /* ============================================================
   * SIGNATURE SHOT #2 — CONSTRUCTION SCALE
   * "Camera starts close to materials. Then rises. Crane enters
   *  composition. Building structure becomes visible. Finish with
   *  elevated scale reveal."
   * ============================================================ */
  {
    id: 'process-4',
    label: 'EXECUTION',
    span: 65,
    anchor: [0, 4, -532],
    keys: [
      k(0.0, [-40, 3.5, -474], [-42, 2.5, -532]),
      // Phase 1: close to materials — camera at eye level, looking at
      // the construction stage. The model fills the frame.
      k(0.15, [-38, 3.5, -474], [-40, 3, -534]),
      // Phase 2: structure rises — camera lifts AND drifts laterally.
      // The lateral movement creates parallax as the structure grows.
      k(0.35, [-34, 6, -474], [-36, 6, -538]),
      k(0.55, [-28, 10, -472], [-32, 10, -540]),
      // Phase 3: crane enters — the camera rises above the structure,
      // and the crane appears in the composition. The full construction
      // site is revealed.
      k(0.75, [-20, 15, -470], [-28, 14, -542]),
      // Phase 4: elevated reveal — camera settles at high angle.
      // The full construction process is visible from above.
      k(0.9, [-14, 18, -468], [-24, 14, -544]),
      k(1.0, [-10, 18, -468], [-20, 12, -546]),
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
      k(0.0, [-10, 18, -468], [-20, 12, -546]),
      // V14: camera descends slightly during the quality scan — from 18m
      // to 14m — to show the inspection detail at closer range, then rises
      // back to 18m for the elevated overview
      k(0.35, [-6, 14, -470], [-14, 8, -548]),
      k(0.65, [0, 16, -474], [-6, 8, -550]),
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

  /* ============================================================
   * SIGNATURE SHOT #3 — FINISHED PROJECT
   * "Camera approaches finished architecture. Vehicle/landscape
   *  provides scale. Camera moves laterally. Facade catches
   *  natural sunlight. End on strong architectural silhouette."
   * ============================================================ */
  {
    id: 'contact',
    label: 'CONTACT',
    span: 170,
    anchor: [0, 10, -1150],
    keys: [
      k(0.0, [0, 9, -1078], [0, 36, -1150]),
      // Phase 1: lateral approach — camera approaches from the right side,
      // not dead-centre. The building's facade catches sunlight from the left.
      // This creates a strong architectural silhouette with light and shadow.
      k(0.15, [8, 6, -1086], [4, 28, -1148]),
      k(0.3, [14, 4, -1096], [2, 22, -1150]),
      // Phase 2: lateral drift — camera moves from right to left, creating
      // parallax across the facade. The building appears to rotate slightly.
      k(0.5, [10, 3.5, -1104], [0, 18, -1150]),
      k(0.7, [4, 3.5, -1110], [-2, 15, -1150]),
      // Phase 3: settle — camera arrives at a strong three-quarter view.
      // Building in left third, sky in right third. The facade catches
      // the afternoon sun. Strong architectural silhouette.
      k(0.85, [0, 3.5, -1114], [-2, 14, -1150]),
      k(0.95, [-2, 3.5, -1116], [-4, 13, -1150]),
      // Phase 4: hold — final frame. The camera barely moves. The viewer
      // absorbs the completed project. Then the contact UI appears.
      k(1.0, [-2, 3.5, -1116], [-4, 13, -1150]),
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
