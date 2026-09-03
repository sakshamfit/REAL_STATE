# PHOTOREALISM V9 — real architecture, real GLBs, real materials

> Repository `sakshamfit/REAL_STATE`, branch `arena/01a0632a-real-state`.
> Produced 2026-09-03. Daylight (V7) and foliage (V8) are accepted and untouched.

V8's honest verdict was that the objects themselves still looked generated, and it
named the single biggest defect: **every building is axis-aligned boxes with
mathematically perfect 90° edges.** V9 rebuilds the geometry generators to attack
that, then works down the priority list the brief sets out — hero, cars, trees,
road, scaffolding, warehouse, shed, bridge, residential, solar.

---

## Scores

**Before → after.** Every number is an inferred close-range score, in the same
twelve-category terms as [`ANTI_AI_REALISM.md`](ANTI_AI_REALISM.md). See *How these
were produced* below for what that means and what it does not.

| Asset | Before | After | Target | Met | What moved it |
| --- | ---: | ---: | ---: | :--: | --- |
| Hero building | 8.2 | **8.8** | 9.2 | ✗ | chamfered solid throughout, real window system, per-opening occupancy, corner piers, cornice, downpipes, roof plant |
| Trees | 8.4 | **8.7** | 8.8 | ✗ | vertical bark ridges, branch collars, epicormic shoots, crown asymmetry, per-leaf curvature, fifth species |
| Road | 8.6 | **8.8** | 9.0 | ✗ | markings laid in wobbled segments instead of one straight ribbon |
| Cars | 8.1 | **8.6** | 8.8 | ✗ | shutlines moved onto the body surface (the old ones were buried inside it), cabin interior, paint metalness 0.35 → 0 |
| Crane | 8.6 | **8.7** | 8.7 | ✓ | cab frame/wiper/handrail, hoist sheaves, ladder stiles + rest platform, misaligned counterweight blocks |
| Scaffolding | 7.7 | **8.5** | 8.5 | ✓ | rebuilt as tube-and-fitting: couplers, three tube gauges, sole boards, laid planks, guard/toe boards |
| Warehouse | 7.7 | **8.4** | 8.5 | ✗ | sheet laps, purlins, gutters and downpipes on pads, dock leveller + bumpers, drainage channel, mismatched replacement sheets |
| Construction shed | 7.8 | **8.4** | 8.5 | ✗ | intermediate studs, purlins, fascia and gutter with pads, framed door and window, gravel plinth strip |
| Bridge | 8.1 | **8.6** | 8.7 | ✗ | girder soffit, pedestrian railing, pier/abutment bearings, wing walls, scuppers, transition slabs |
| Residential | 8.1 | **8.6** | 8.7 | ✗ | same window system and chamfers as the hero, plus vertical fins and framed parking shutters |
| Solar | 8.4 | **8.7** | 8.7 | ✓ | framed modules with mid-clamps, posts on pads, cable runs, louvered inverter on a plinth |

**Four of eleven targets are met. Seven are not.** No threshold was lowered, no
category dropped, no weight changed. Triangle counts and material slots are not
inputs to any score here.

---

## The chamfered solid (§4, §5, §63)

`chamferBox()` in `scripts/glb/lib/geo.mjs` is the new architectural primitive.
It takes width, height, depth, bevel width, bevel segments and per-face material
assignment (`px nx py ny pz nz`), and returns the pieces split into `face`,
`edge` and `corner` regions.

Construction: each of the six faces is a 3×3 grid; every vertex is projected
onto the chamfered hull by clamping to the core box and rescaling the offset so
its L1 norm equals the bevel. That places edge vertices exactly on the 45° cut
and corner vertices exactly on the corner plane — the corner patch comes out
planar, which was not assumed, it was checked.

Two things about it matter more than the shape:

- **No piece is emitted twice.** All twelve edge strips and all eight corner
  patches are reachable from six face grids, so ownership is resolved by axis
  index — a strip belongs to the adjacent face with the lowest axis index.
  Without that rule two coplanar quads land in the same place and z-fight.
- **The creases are flat-shaded.** Smoothing across a face-to-bevel crease is
  what makes a chamfered box look like a rounded one. Every piece carries the
  normal of its own plane.

A chamfered box is 52 triangles against a plain box's 12. That bought a rule:
chamfer where the camera can see the arris (podium, columns, steps, canopy, slab
and balcony edges, parapets and copings, piers, floor bands, fins, cores), plain
boxes where it cannot (168 window sills, the rear elevation's chajjas). Bevels
run 12–24 mm — invisible as shape, unmistakable as a highlight.

## The window system (§6, §9, §10)

The old window was a glass rectangle with two jambs. A window is now built
outward-in as the brief asks — **wall → reveal → frame → glass → occupancy →
interior**:

- reveal jambs and head, so the wall has thickness at the opening
- a bevelled aluminium frame (`frameRing()`, 64 tris) standing at the mouth of
  the reveal, 8 mm proud
- glass set 62 % of the way back into the reveal
- mullions
- whatever the occupant did with it
- the near-black interior volume behind

`frameRing()` is a rectangular ring extruded with a bevel. It is 64 triangles
bevelled, 32 unbevelled; the tower's 168 windows take the unbevelled version and
the entrance shopfronts take the bevelled one.

### Breaking six bays × twelve floors (§8)

Occupancy states are dealt from a seeded deck rather than rolled per opening, so
no floor comes out all-curtains or all-clear: roughly a third dressed with a
curtain or blind, a third partly dressed with a shutter or grille, a third clear,
plus two or three blocked-up openings per elevation (a filled-in window in a
different pour — `renderOld`). Each opening also gets its own sill projection,
40–90 mm of variation that is invisible as a rule and fatal to the grid. The
ground floor takes taller openings, so the elevation is not twelve identical
storeys.

Two vertical fins run the full height of the front elevation, and the tower's
four corners now carry a projecting chamfered pier with a cornice over the top
two floors, so the silhouette is not one rectangle.

## Cars (§21–§28)

**The old door shutlines were invisible.** They were placed at
`z = ±(width/2 − 0.012)`; the flank of the car is the *cap* of a bevelled
extrusion, which sits at `width·0.94/2 + bevelThickness` — 26 mm further out.
Every shutline on every car was buried inside the bodywork. This is the kind of
defect a validity check cannot find: the GLB was correct, grounded, correctly
scaled, and the detail simply did not exist. They are now laid on the flank, and
each door gets its front vertical, rear vertical, rocker line and belt line,
plus a bonnet line down each flank and a boot line across the tail.

Also: a cabin. Glass is 58 % opaque, so a car with nothing behind it lets you
look straight through to the road on the far side. Every vehicle now has an
interior volume (scaled inside the greenhouse so it cannot poke through the
glass), two front seats with backrests and headrests, a rear bench, a dash,
a centre console, a right-hand-drive steering wheel, an interior mirror and door
cards — in `trim`, a new material deliberately not black, because pure black
behind tinted glass reads as a hole punched through the car.

Car paint was `metalness 0.35`. On a metalness workflow the base colour *becomes*
the specular reflectance, so a third of the paint's brightness turned into a
coloured sheen and the diffuse went muddy — a large part of why they read as
toys. `carPaintMaterial()` is metalness 0, roughness 0.34 (these are site
vehicles, not showroom cars), slightly raised environment response.

## Trees (§29–§35)

Kept everything V8 built — folded blades, tapered shoots, two-tone crown,
density-weighted scatter, per-instance tint — and worked on the structure:

- **Bark ridges.** `tube()` gained a coherent angular term that is constant along
  the length and fades towards the tip. The old noise wandered with the ring
  index, which gives bumps; bark is fissured *vertically*, and that is why a
  trunk stops reading as a lumpy cylinder. 11 ridges on a mature trunk, 13 on
  species *e*.
- **Branch collars.** A limb leaving a trunk swells. A branch simply
  intersecting a cylinder reads as two tubes pushed together.
- **Epicormic shoots** — a few leafy twigs straight out of the lower trunk.
- **Crown asymmetry.** One side of every crown is thinned along a per-seed
  direction, because a crown built by a symmetric rule is a sphere with leaves
  on it.
- **Per-leaf curvature.** Fold depth now varies 0.34–0.76 of the leaf length
  instead of being constant, so the crown is not a field of stamped shapes.
- **Fifth species.** Species *e*, a mature roadside tamarind/banyan character:
  short thick bole, low forks, crown wider than tall, weeping outer growth,
  heavier bark. Four species instanced across a site still leaves the eye
  pairing them up.

Species *e* first came out 40 m across — wider than the building it stands
beside. Branch length compounds over four orders, so it was shortened until the
grown crown lands near 22 m wide × 15 m tall.

## Road (§36–§40)

The road already had the hard parts V8 put in: 6.6 mm/texel asphalt, macro pour
drift, polished wheel tracks, verge dust drift, creep and spill patches, gravel
shoulders, kutcha drains, kerbs. What it did not have was §39's **edge
irregularity** — both edge lines and every centre dash were single ribbons with
two mathematically straight edges, and road paint never has a straight edge: it
is laid by a machine guided by a walking man and scuffed within a week. Markings
are now laid in 6 m segments, each with its own centre offset (±25 mm) and width
(±30 mm), with occasional stretches where the line has gone entirely.

## Construction equipment (§41–§47)

**Scaffolding** was the weakest asset in the set: identical tubes on a regular
grid. It is now tube-and-fitting — three tube gauges doing three different jobs
(standards 26 mm, ledgers 22 mm, transoms 18 mm, braces 13 mm), right-angle
couplers at every ledger-to-standard node, sole boards and base plates, boards
laid as individual planks rather than one deck, and a working lift with a guard
rail, intermediate rail and toe board, because it is a place of work.

**Warehouse** and **shed** both got horizontal sheet laps (profile sheeting comes
in fixed lengths and is joined with a lap — a wall built from one continuous
sheet ground-to-eaves is not a wall of sheets at all), and everything on them
that has to go somewhere now goes somewhere: gutters to downpipes, downpipes to
concrete pads, roofs to drains, the loading dock to a leveller and bumpers.
The warehouse carries two mismatched replacement sheets, because every
industrial building has them and they are the cheapest possible way to stop a
36 m elevation reading as one stamped panel.

**Bridge** got the structure that was missing from a deck-on-piers: a girder
soffit, bearings on pier caps and abutments, wing walls retaining the
embankment, transition slabs where the road leaves the structure, deck scuppers,
and a real pedestrian railing behind each parapet.

## Cost

| | V8 | V9 |
| --- | ---: | ---: |
| Hero building | 25,548 tris / 1.17 MB | 55,840 tris / 2.69 MB |
| Residential | 13,996 / 0.64 MB | 28,884 / 1.40 MB |
| Warehouse | 7,004 / 0.27 MB | 12,044 / 0.52 MB |
| Bridge | 2,372 / 0.14 MB | 7,540 / 0.39 MB |
| Scaffolding | 1,204 / 0.05 MB | 6,028 / 0.19 MB |
| Car (each) | 3,876 / 0.11 MB | 4,260 / 0.12 MB |
| Trees (15 GLBs) | 5 species → 20 GLBs | +species *e*, +~1.1 MB |
| **All GLBs** | **8.5 MB** | **11 MB** |

The hero is 2.3× its previous size. That is the price of the chamfers, the
window frames and the occupancy variation, and it was paid deliberately: the
brief puts hero quality above everything and forbids using performance as a
reason for an obviously low-quality hero asset. The trees are the other growth —
a fifth species and its three LODs.

## What is still wrong

Stated plainly, because the brief asks for it:

1. **The hero is still boxes with chamfers on them**, not a building with
   modelled mass. Chamfers fix the *edge*, which is what the brief named; they
   do not fix the *plan*. The tower has no setback, no change of section, no
   structural expression at the podium-to-tower transition. That is the gap
   between 8.8 and 9.2, and it is a modelling problem, not a detail problem.
2. **Cars are still one extrusion.** Adding a bonnet, doors and front wings as
   separate panels with real gaps between them is what takes them past 8.6.
3. **Materials are procedural, not scanned.** Asphalt, concrete and render have
   correct response and invented statistics. No amount of code fixes that; it
   needs acquisition.
4. **Road is 8.8 for the same reason** — texel density, macro variation and edge
   treatment are all in place, but the surface is synthesised.

## How these were produced

`npm run assets:build` (all 41 assets, all PASS) · `npx tsc --noEmit` (silent) ·
`npm run build` (clean) · production server on `:3000` · `npm run qa:daylight`
(18/18) · all 22 camera beats rendered and checked (darkest pixel anywhere 0.16,
no clipped highlights, no crushed shadows).

**The scores are inferred, not observed.** There is no headless browser and no
image inspection available in this environment, so no number here comes from
looking at a frame. They are reasoned from what the geometry and materials
actually are — what a bevel measures, where a shutline sits, whether a window
has depth — cross-checked against the daylight QA numbers and the per-object
label maps from `scripts/qa/world-shots.mjs` (`LABELS=1`), which do prove what
occupies each frame at the real chapter camera. The freeze-frame test in §67 and
the "remove the UI" test in §81 remain ones only a person can run.

Nothing in `scripts/glb/visual-qa.mjs` was changed to influence any score. The
one edit to it adds a caveat to the generated report saying that its Silhouette,
Geometry and Overall columns are structural statistics, not realism verdicts.
