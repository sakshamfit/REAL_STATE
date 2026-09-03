# RUDRA — Constructions & Suppliers

> Engineering Trust. Constructing Excellence.

A cinematic, scroll-driven 3D experience for Rudra Constructions & Suppliers, built
as **one continuous camera move** through an architectural world — with an
interactive **3D India presence map** at its core.

* Design brief: [`docs/DESIGN.md`](./docs/DESIGN.md)
* Map specification: [`docs/INDIA_MAP.md`](./docs/INDIA_MAP.md)
* What the site contains, scene by scene: [`docs/SITE-CONTENTS.md`](./docs/SITE-CONTENTS.md)
* **Give us your real 3D models** (buildings, JCB, cars, solar…): [`docs/MODEL_SLOTS.md`](./docs/MODEL_SLOTS.md)

---

## Quick start

```bash
npm install
npm run dev          # http://localhost:3000
```

```bash
npm run build && npm start   # production
npm run typecheck            # tsc --noEmit
npm run data:india           # rebuild public/data/india-states.json from TopoJSON
npm run assets:build         # full GLB generate → optimize → inspect + QA report
npx tsx scripts/check-world.ts   # camera continuity + collision report
```

Requires Node 18.18+. No environment variables, no backend, no external services.

---

## Stack

| | |
| --- | --- |
| Framework | Next.js 14 (App Router), React 18, TypeScript (strict) |
| 3D | three.js 0.170, React Three Fiber 8, drei 9 |
| Motion | GSAP 3 + ScrollTrigger, Lenis (smooth scroll) |
| State | zustand (React state) + a plain `runtime` object for per-frame values |
| Type | Space Grotesk (display) + Inter (body), self-hosted via `@fontsource` |
| Data | India state boundaries (TopoJSON → optimised GeoJSON), verified company data |

Everything visual is generated in code: geometry, textures (canvas noise → albedo /
roughness / normal maps), lighting and the environment map. The primary
architectural assets are valid GLB files generated through
`scripts/glb/` (`npm run assets:build`), then remapped at runtime to the shared
PBR material library. The full pipeline is documented in
[`docs/3d/ASSET_PIPELINE.md`](./docs/3d/ASSET_PIPELINE.md).

---

## How it works

1. **One timeline.** 22 *beats* (`src/lib/chapters.ts`) each own a slice of the
   scroll (total ~2,455vh), a set of camera keyframes, and the HTML typography
   shown while that slice plays. The DOM height of the sections *is* the timeline.
2. **One camera.** All keyframes are flattened into a single centripetal
   Catmull-Rom spline (`src/lib/camera-path.ts`); the camera chases it with heavy
   exponential damping, so it slows on beats and never stops dead.
3. **One world.** Chapter components place themselves at shared coordinates
   (`src/lib/world.ts`) and cull themselves by distance. Fog swallows everything
   the story is not looking at.
4. **The map takes over.** Inside the India beat (`mapWindow`), an orbit
   controller (`src/lib/map-camera.ts`) blends into the journey camera and hands
   control to the visitor: hover, click, drag, select state-to-state, reset.
5. **Two layers, one story.** The 3D canvas is fixed behind a `pointer-events:
   none` HTML layer. Typography, navigation, HUD, the map panel and the footer are
   real DOM (crisp, selectable, crawlable, keyboard accessible).

---

## Verified content only

All facts come from the supplied Rudra documents and live in `src/data/`:

* Founded **2025** · Total turnover **₹14.65 Cr**
* Six services, five process stages, six clients, four trust pillars
* Presence: **Bihar** (Patna, Bettiah) and **Assam** (Biswanath, Jorhat) with
  coordinates; the remaining presence states (Uttar Pradesh, Jharkhand, Odisha,
  Meghalaya, Tripura, Arunachal Pradesh, Haryana, Punjab, Jammu & Kashmir) are
  selectable and show `PRESENCE INFORMATION COMING SOON`
* Contact: **+91 8099588978** · **rudraconstructionsupplier14@gmail.com**

**Nothing is invented.** Adding a project is a data change:

```ts
// src/data/presence.ts
{ state: 'Bihar', city: 'Patna', projectName: '…', projectType: '…',
  year: 2026, coordinates: { lat: 25.5941, lng: 85.1376 } }
```

The 3D map, its markers, camera framing and information panel all update from
that array — no code changes.

---

## Map data pipeline

```
TopoJSON (udit-001/india-maps-data)
   → presimplify + simplify (shared arcs, no gaps between states)
   → topojson-client feature()
   → wind rings, drop slivers, round to 3 dp, centroid + bbox
   → public/data/india-states.json   (36 states, 86 KB)
```

The raw topology is not committed. Refresh `data/raw/india-topo.json` and run
`npm run data:india`. At runtime the scene converts each state to a
`THREE.Shape` (+ holes) and an `ExtrudeGeometry`, rotated so the extrusion is +Y.

---

## Performance

Targets: **60 fps desktop, 30+ fps on Indian mobile hardware.**

* Three tiers (`high` / `mid` / `low`) auto-detected from pointer type, cores,
  memory and viewport: DPR, shadow map size, texture resolution, particle count,
  instance density, environment map and grid.
* Distance culling per chapter, instancing everywhere, one shadow-casting light
  that travels with the camera, no post-processing stack (vignette and grain are CSS).
* Map data is fetched after fonts; geometry is built once; raycasting is disabled
  outside the map chapter; `AdaptiveDpr` drops resolution under load.

## Accessibility & fallbacks

* `prefers-reduced-motion`: motion is minimised, reveals render instantly.
* No WebGL, or **SKIP 3D**: a complete typographic version with all content
  (`src/components/ui/FlatExperience.tsx`) — also what search engines index.
* Every state in the map is a keyboard-focusable button; the panel is `aria-live`;
  client names appear as real HTML lists; all copy is server-rendered.

---

## Layout

```
app/                        layout, page, globals.css (design tokens + all styling)
public/data/                generated India boundaries
scripts/                    map data build + world sanity check
src/components/experience/  CameraRig, Lighting, Atmosphere, chapters/*, IndiaMap
src/components/ui/          Preloader, Navigation, ScrollContent, Hud, MapOverlay, FlatExperience
src/data/                   company, presence (verified content)
src/lib/                    chapters, camera-path, world, projection, geometry,
                            materials, textures, map-camera, store, scroll, quality
docs/                       DESIGN.md, INDIA_MAP.md, SITE-CONTENTS.md
```

© 2026 RUDRA CONSTRUCTIONS & SUPPLIERS
