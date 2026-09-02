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
npm run typecheck      # tsc --noEmit
npm run lint           # eslint
npm run test:scenes    # headless verification of every 3D scene
```

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
