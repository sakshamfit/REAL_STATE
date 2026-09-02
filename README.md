# Rudra Constructions & Suppliers — 3D brand site

An interactive architectural experience rather than a template: the page builds a
building as you scroll, walks the client's five-step execution model on a
miniature site, and climaxes on an **extruded 3D map of India** with the
company's confirmed locations.

> Engineering Trust. Constructing Excellence.

---

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router) + React 19 + TypeScript |
| Styling | Tailwind CSS 4 |
| 3D | Three.js via React Three Fiber + Drei |
| Motion | GSAP + ScrollTrigger, Lenis smooth scrolling |
| Assets | **None** — every model, texture and environment map is generated at runtime |

No GLB/GLTF, no HDRI, no image or font downloads. The 3D assets are procedural,
so the payload stays tiny and nothing waits on an external CDN. The only data
file is `public/data/india-states.geojson` (~400 KB, served statically).

## Sections (page order = approved user journey)

1. **Hero** — scroll-linked construction sequence: survey grid → footings →
   columns → beams → slabs → glazing → roof, with a tower crane that
   demobilises at handover. Camera flies a Catmull-Rom path around the build.
2. **About** — "From ground to growth" as a 3D construction timeline (founded
   2025 → capabilities → regional expansion → future).
3. **What we do** — six live 3D scenes: civil & structural, residential,
   commercial, infrastructure, solar & renewable, renovation. Hover to turn.
4. **How we build** — pinned miniature site walking the five-step model:
   requirement analysis → design & planning → procurement → execution →
   quality & safety.
5. **Quality / Safety / Compliance / Sustainability** — helmet and lattice
   under a scanning pass.
6. **Trusted by** — cinematic corridor fly-through of the client list.
7. **Our presence across India** — 3D extruded map, state hover readout, click
   for detail, arcs running from the Bihar operations bases.
8. **Let's build the future together** — dusk skyline, enquiry form, contacts.

## The items are 3D

Every item list on the page is rendered as real geometry inside its section's
**existing** canvas — the page already runs eight canvases and browsers silently
evict WebGL contexts beyond roughly four live ones, so items are added to the rig
they belong to rather than given a canvas each (`useContextGate` enforces this).

| Section | Items | What they became |
| --- | --- | --- |
| Services | 6 | already individual 3D scenes (`ServiceModel`) |
| Trust | 4 | a distinct object per commitment — test cube under calipers, helmet and barrier, stamped document stack, tilted solar array — on plinths around the central helmet |
| Clients | 10 | a monolith per client, alternating sides of the corridor, swinging to face the camera as it passes |
| Process | 5 | a numbered colonnade of pylons standing behind the site, lighting as each stage is framed |
| About | 4 | a different structure per milestone: corner stone → four-vertical frame → site network → tower |

`src/components/three/ItemLabel.tsx` holds the shared pieces: `ItemLabel` (a drei
`Html` plate pinned to an object, polled per frame so fades never re-render
React, and hidden from compositing once faded out), `ItemPlinth`, and
`SelectionBeam`.

Trust is two-way: selecting a commitment in the copy flies the camera to its
object, and hovering or clicking the object selects it back in the copy. The
text always stays in the DOM, so it is still readable with WebGL unavailable or
motion reduced.

## Motion language

The motion follows the reference the client supplied (velaarmon.com):

- **Intro loader** — "Composing the descent" counts to 100%, tracking real
  readiness (`document` complete + webfonts settled) with a minimum duration and
  a hard cap so it can neither flash by nor stall, then the plate lifts on a
  clip-path wipe.
- **Chapter rail** — a hairline reading-progress bar plus the current chapter in
  roman numerals (I · Descent → VIII · Enquiry), crossfading as you descend.
- **Word-mask headlines** — every heading is split per word, each word rising out
  of an overflow-hidden mask on a stagger (`components/SplitWords.tsx`).
- **Counters** — the About numbers count up once on reveal.
- **Client marquee** — the client list runs as an infinite band, pausing on hover.

All of it is disabled or collapsed to its end state under
`prefers-reduced-motion`.

## Editing content

Everything the client owns lives in **`src/lib/data/content.ts`**:
company details, the six verticals, timeline, process steps, trust pillars,
client list, and presence (states + cities).

### Adding projects to the India map

The brief confirms presence (states and cities) but not a project-by-project
database, so nothing has been invented. When the client supplies the register,
add entries to the `projects` array in `content.ts`:

```ts
{
  state: "Bihar",            // must match the state name in `presence`
  city: "Patna",
  name: "Project name",
  type: "Civil construction",
  year: "2025",
  lat: 25.6093,
  lon: 85.1376,
  image: "/projects/….jpg",   // optional
  description: "…",           // optional
}
```

Markers, arcs and the state detail panel pick the entries up automatically —
no map code changes needed. To add a **state**, add it to `presence`; to add a
**city**, add it to that state's `cities` with coordinates.

### Map data

`public/data/india-states.geojson` is the DataMeet India state boundary set,
simplified with a topology-preserving mapshaper pass (`-simplify 10%
keep-shapes`, `snap-interval=0.001`, Andaman & Nicobar and Lakshadweep
removed). `src/lib/three/indiaMap.ts` projects it (local equirectangular),
earcut-triangulates each polygon and extrudes it; extrusion height is driven by
presence tier.

## Performance & accessibility

- Device tier detection (`prefers-reduced-motion`, coarse pointer, viewport)
  scales pixel ratio, shadow maps and particle counts.
- A **Full / Lite** toggle in the nav drops DPR, shadows and antialiasing; the
  choice persists in `localStorage`.
- Canvases pause (`frameloop="never"`) while off-screen; service cards mount
  their canvas only once seen.
- `prefers-reduced-motion` disables Lenis, the camera fly-throughs and the
  auto-rotation; scroll-linked states snap instead of easing.
- WebGL is feature-detected. Without it the page stays fully readable and says
  so in a banner.
- Scroll-linked sections use a sticky stage plus a normal document flow, so
  keyboard and assistive scrolling work throughout.

## Commands

```bash
npm run dev            # dev server
npm run build          # production build (includes typecheck)
npm run start          # serve the production build
npm run typecheck      # tsc --noEmit
npm run lint           # eslint
npm test               # both test suites below
npm run test:render    # client-render smoke test (happy-dom)
npm run test:scenes    # headless verification of every 3D scene
```

### Previewing behind a proxy

`next dev` blocks cross-origin requests to its own dev resources by default.
When the site is previewed through a proxied host, `/_next/hmr` is refused, the
dev client never connects, and the page shows its HTML but never executes a
chunk — an endless loading screen with no error anywhere. `next.config.ts`
therefore sets `allowedDevOrigins`. For a stable preview prefer
`npm run build && npm run start`: it has no dev channel to block and ships
1.66 MB of JS instead of 7.7 MB.

### `npm run test:render`

`tools/client-render.mjs` renders every section with real React — to a string
first, then hydrated into happy-dom with effects running. It fails on a
render-phase throw, a client crash, or a section that produces no readable text.
happy-dom has no WebGL, so this doubles as a test of the no-3D fallback path.

### `npm run test:scenes`

`tools/headless-scene.mjs` transpiles the real components with the project's
TypeScript, swaps `react` / `@react-three/fiber` / `drei` for small shims that
build actual `THREE` objects, then drives each scene's `useFrame` loop. It
reports object/triangle counts per scene and fails on:

- a render or frame-loop exception
- non-finite transforms or geometry
- an India map whose extruded solids fall outside the expected world extent
- missing state solids, boundary outlines, city markers or labels

It is a verification tool only — never imported by the app.

## Layout

```
src/
  app/                 layout, page, theme
  sections/            Hero, About, Services, Process, Trust, Clients, Presence, Contact
  components/three/    Studio rig, HeroBuilding, ServiceModels, scenes/*
  components/ui/       Nav, ProgressRail, BootOverlay, NoWebGLNote
  hooks/               useSectionProgress, useInView
  lib/                 content.ts (editable), motion.tsx, three/{materials,indiaMap}.ts
public/data/           india-states.geojson
tools/                 headless-scene.mjs (verification harness)
```
