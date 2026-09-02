# RUDRA — what this site contains

An inventory of everything that ships, scene by scene.

The site is **one continuous camera move** through one 3D world. Scroll = timeline.
There are no page transitions: 22 *beats* make up a single ~2,455vh scroll, and the
HTML typography travels above the canvas while the camera travels through it.

```
RUDRA — beat map (scroll % of the whole experience)

  0%   THE GROUND ................ 100vh   darkness → concrete → dust → grid
  4%   THE BUILD ................. 260vh   the tower is assembled in front of you
 15%   THE COMPANY ............... 170vh   orbit + ₹14.65 Cr + founded 2025
 22%   SERVICES (intro) ..........  70vh
 24%   01 CIVIL & STRUCTURAL .....  75vh   camera flies through a structural frame
 28%   02 RESIDENTIAL & COMMERCIAL 75vh   cantilevered villa, lit interior, pool
 31%   03 INFRASTRUCTURE .........  75vh   road + arch bridge, passing underneath
 34%   04 SOLAR & RENEWABLE ......  75vh   camera rises over a tracking solar field
 37%   05 RENOVATION & RETROFIT ..  75vh   old mass dissolves, new volume rises
 40%   06 BUILDING MATERIALS .....  75vh   open canopy warehouse, stock, racking
 43%   HOW WE BUILD (intro) ......  60vh
 45%   01 REQUIREMENT ANALYSIS ...  55vh   site scan
 48%   02 DESIGN & PLANNING ......  55vh   blueprint + drawings
 50%   03 PROCUREMENT ............  55vh   material deliveries
 52%   04 EXECUTION ..............  55vh   miniature structure rises
 54%   05 QUALITY & SAFETY .......  55vh   inspection markers
 56%   MATERIAL WORLD ............ 130vh   macro gates: CONCRETE / STEEL / GLASS / STONE
 62%   TRUST ..................... 120vh   near blackness, one structure, four words
 67%   CLIENTS ................... 170vh   names live inside the corridor
 74%   OUR PRESENCE (3D INDIA) ... 340vh   the interactive map       ← core feature
 87%   THE FUTURE ................ 160vh   twisted solar tower rises
 94%   CONTACT + FOOTER .......... 150vh   CTA, phone, email, footer
```

---

## 1. Loading

Black screen. `RUDRA / CONSTRUCTIONS & SUPPLIERS`, `LOADING EXPERIENCE`, a live
percentage and a progress rule. Progress is real: webfonts → India boundary data
→ procedural textures → first compiled frames.

When ready: **ENTER EXPERIENCE →** and **SKIP 3D →** (the typographic fallback).

## 2. Navigation

`RUDRA` (left) · `WORK  SERVICES  PRESENCE  CONTACT` (right) · `MENU` on mobile.
Transparent over the world; `rgba(8,9,9,.65)` + blur after 60vh. Never a bar.

## 3. HUD

Bottom-left: current chapter + a hairline progress bar + `043%`.
Right edge: a chapter rail (hover reveals the label, click jumps).

---

## 4. Scene notes

### THE GROUND
Camera 1 metre off a concrete plane, looking almost horizontally. Light ramps up
over the first 4% of scroll. Dust motes drift (recycled around the camera, so the
field is infinite). A thin architectural grid fades in.
Text: `RUDRA / CONSTRUCTIONS & SUPPLIERS / ENGINEERING TRUST. CONSTRUCTING EXCELLENCE.`

### THE BUILD
A 24×24×46 m tower is built in front of the visitor, part by part:
foundation slab → 16 columns per floor → floor slabs → service core → glazing →
interior light strips. Nothing fades in as one object; every instance grows and
drops into place on its own timeline. A tower crane works the site and withdraws
as the camera starts to orbit; site debris sits around the footprint; a soft
contact shadow grounds the mass.

### THE COMPANY
The completed tower stays in frame while the camera orbits it (24 m → 38 m →
behind → away). Interior strips light up.
Text: `FROM CONCEPT / TO CONCEPT…` → `FROM CONCEPT TO COMPLETION.`, the three
disciplines, and the verified numbers **₹14.65 Cr TOTAL TURNOVER** · **2025 FOUNDED**.

### SIX WORLDS (services)
Six environments, not six cards. Each one is entered, flown past or flown through:
a structural frame with an aisle down the middle, a cantilevered residence with a
lit interior and a reflecting pool, an arch bridge over a road the camera drives
under, a tracking solar field the camera climbs above, an ageing mass that
dissolves into a new glass volume mid-flight, and an open canopy warehouse of
steel, cement, stone and sand.

### HOW WE BUILD
A miniature site on a plate, seen from above: five stations light up one after
another (site scan → blueprint → deliveries → structure rising → inspection),
with a slow scanner line sweeping the whole model.

### MATERIAL WORLD
Four macro gates at architectural scale — concrete, brushed steel, glass, stone —
that the camera flies straight through, each labelled in 3D space.
Text: `QUALITY IS NOT A STEP. / IT IS THE STANDARD.`

### TRUST
Near blackness. A single gate-like monolith with one glowing accent line.
`QUALITY · SAFETY · COMPLIANCE · SUSTAINABILITY` float around it in 3D.

### CLIENTS
A 118 m concrete corridor: rhythmic columns, ceiling light strips, light at the
far end. Client names are placed *inside* the architecture — no logo wall, no
carousel. The same names also exist as real HTML text (SEO + screen readers).

### THE FUTURE
A twisted tower of eight rotating slabs with a glass core, vertical fins, solar
skin on the north face, accent-lit slab edges, a mast and a beacon. It rises as
the beat plays. Text: `THE NEXT STRUCTURE IS ALREADY TAKING SHAPE.`

### CONTACT
The world goes almost black; the tower stays ahead of the camera.
`LET'S BUILD THE FUTURE TOGETHER.` + `YOUR VISION. OUR ENGINEERING. BUILT TO LAST.`
+ `START A PROJECT →`, `+91 8099588978`, `rudraconstructionsupplier14@gmail.com`,
then the footer.

---

## 5. The 3D India presence map (core feature)

Full spec: [`docs/INDIA_MAP.md`](./INDIA_MAP.md). What ships:

| Requirement | Implementation |
| --- | --- |
| Real geography | `public/data/india-states.json` — 36 states/UTs built from the India states **TopoJSON** via `scripts/build-map-data.mjs` (TopoJSON → simplify → GeoJSON, 86 KB, 12.4k points) |
| One mesh per state | `buildStateMesh()` → `THREE.Shape` (+ holes) → `ExtrudeGeometry` → merged per state. 36 independent meshes, ~19.7k triangles total |
| Physical depth | baked depth 1.45 units; base thickness **0.25** (0.17×), hover **0.49**, selected **1.30** — the state visibly separates from its neighbours |
| Hover | state lifts 0.32, border brightens to accent, 3D name label appears, cursor changes |
| Click | other states dim, state lifts 0.9 and thickens, camera flies in (1.7 s, `power3.inOut`), city beacons rise, the information panel enters |
| Camera | orbit around a focus point: radius from the state's real extent (9.5–24 units), lower elevation (`phi 0.95 → 1.02`), drag to orbit within limits (no zoom, no pan) |
| State → state | continuous: the focus point and radius are tweened, never reset |
| Markers | architectural beacons — thin vertical line, octahedron light, pulsing ring, 3D city label. Never map pins |
| Information layer | translucent, blurred, hairline-bordered panel docked into the scene (bottom sheet on mobile), not a modal |
| Reset | `← INDIA OVERVIEW` + click-away deselect + auto-deselect when the chapter ends |
| Accessibility | every state is a real `<button>` in a keyboard-navigable rail (presence states first); `aria-live` on the panel |
| Performance | 86 KB lazy-fetched after fonts, one shared base material cloned per state, one shared border line material, geometry built once, raycasting disabled outside the chapter |
| Scroll integration | the map rises out of the ground as the chapter opens, owns the camera between 30%–86% of the beat, then sinks back into darkness as the story continues |

**Verified data only.** Bihar (Patna, Bettiah) and Assam (Biswanath, Jorhat) carry
cities; the other nine presence states are selectable and show
`PRESENCE INFORMATION COMING SOON`. Nothing is invented — add projects by adding
objects to `src/data/presence.ts`; the map needs no changes.

---

## 6. Data

| File | Contents |
| --- | --- |
| `src/data/company.ts` | name, tagline, founded (2025), turnover (₹14.65 Cr), phone, email, 6 services, 5 process stages, 6 clients, 4 trust pillars, nav |
| `src/data/presence.ts` | `PresenceLocation[]` (verified cities + coordinates), the 11 presence states, `stateId()`, `locationsForState()` |
| `public/data/india-states.json` | generated state boundaries (never edited by hand) |

## 7. Architecture

```
app/                     Next.js App Router shell (layout, page, globals.css)
src/lib/
  chapters.ts            the story: 22 beats → scroll span, camera keys, typography
  camera-path.ts         all keys flattened into one centripetal Catmull-Rom spline
  world.ts               shared world coordinates (every scene reads the same numbers)
  projection.ts          lat/lng → world XZ (equirectangular, cos(lat) corrected)
  geometry.ts            GeoJSON → extruded state meshes + rim outlines
  materials.ts           shared procedural materials (concrete / metal / glass / emissive)
  textures.ts            canvas-generated concrete, brushed metal, dust, grid, radial
  map-camera.ts          the map's orbit controller (focus, reset, drag, emergence)
  store.ts               React state (zustand) + `runtime` (per-frame values, no re-renders)
  scroll.ts              Lenis ↔ GSAP ScrollTrigger, progress, beat jumps, scroll lock
  quality.ts             device tiering (high/mid/low), WebGL detection, reduced motion
src/components/experience/          the 3D world (CameraRig, Lighting, Atmosphere, chapters/)
src/components/ui/                  the HTML layer (Preloader, Nav, ScrollContent, Hud, MapOverlay, FlatExperience)
scripts/build-map-data.mjs          TopoJSON → optimised GeoJSON
scripts/check-world.ts              dev check: camera continuity + collision report
```

**Rules the code follows**

* Camera and HTML read the same timeline; scroll height *is* the timeline.
* Per-frame values never touch React — they live in `runtime` and are read in `useFrame`.
* Everything 3D is procedural (no binary assets to download): geometry, textures, lighting.
* Chapters cull themselves by distance; dust is recycled around the camera.
* Three quality tiers change DPR, shadows, texture size, particle count and instance density.
* `prefers-reduced-motion`, no-WebGL and **SKIP 3D** all fall back to a full typographic site.

## 8. Acceptance test (manual)

1. Load → percentage climbs → `ENTER EXPERIENCE →`.
2. Scroll: the camera never stops dead, never jumps, never clips architecture
   (`npx tsx scripts/check-world.ts` proves the second and third numerically).
3. Reach **OUR PRESENCE**: India rises out of the ground, settles, heading appears.
4. Hover a state → it lifts and brightens.
5. Click **BIHAR** → it rises and thickens, camera flies in, **PATNA / BETTIAH**
   beacons rise, the panel shows `OUR PRESENCE · PATNA · BETTIAH`.
6. Click **ASSAM** → Bihar lowers, camera travels, Assam rises (**BISWANATH / JORHAT**).
7. Click a state with no data → `PRESENCE INFORMATION COMING SOON`.
8. `← INDIA OVERVIEW` (or click away) → camera pulls back to the whole country.
9. Keyboard: Tab to the state rail, Enter selects — the 3D reacts identically.
10. Mobile: tap a state, camera zooms, panel becomes a bottom sheet.
11. Reload with **SKIP 3D** → complete typographic version with all content.
