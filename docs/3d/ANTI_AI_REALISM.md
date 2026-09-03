# ANTI_AI_REALISM

> §55–56: every important asset scored on how it behaves at the distance the
> camera actually sees it — not on whether it is a valid GLB.

## What this score is, and how it was produced

Twelve categories per asset (§55). The scores come from three kinds of
evidence, in this order of authority:

1. **Measurement.** Dimensions from `scripts/glb/bounds.mjs`, triangle counts
   from the build, texel density computed from tile size and texture
   resolution, material constants read from the source.
2. **Structural inspection.** Reading the generator: what is actually built —
   reveals, jambs, chajjas, balustrades, twigs, leaf profiles — versus what is
   faked.
3. **Reasoned judgement.** Whether the construction would survive being
   photographed. This is the weakest kind and it is marked as such.

**The limit, stated first: I cannot see the rendered site.** There is no
browser in the authoring environment. Every "close-range" score below is
inferred from what the geometry and materials *are*, not from looking at them
at close range. That is a real limitation on the close-range, reflection and
anti-AI categories in particular, and they are scored accordingly — where I
cannot verify a thing, the score stays where the evidence puts it rather than
where I would like it to be.

Scores are not averaged into a single number per asset, because an asset can be
excellent at eight things and ruined by one (a perfect facade with holes behind
the glass is still a hole).

## Scale

| Score | Meaning |
| --- | --- |
| 10 | indistinguishable from professional architectural visualisation |
| 8 | very convincing real-time visualisation |
| 6 | recognisable CG |
| 4 | obvious procedural / AI asset |
| 2 | cartoon / low-poly |
| 0 | primitive placeholder |

§56 targets: hero ≥ 9, trees ≥ 8.5, road ≥ 9, building ≥ 9, vehicles ≥ 8.5,
construction equipment ≥ 8.5.

---

## Summary

**V9 scores.** The V8 numbers are kept for comparison. Full change log and cost
in [`PHOTOREALISM_V9_REPORT.md`](PHOTOREALISM_V9_REPORT.md).

| Asset | V8 | V9 | Target | Met |
| --- | ---: | ---: | ---: | :--: |
| Hero building | 8.2 | **8.8** | 9.2 | ✗ |
| Trees (LOD 0) | 8.4 | **8.7** | 8.8 | ✗ |
| Road | 8.6 | **8.8** | 9.0 | ✗ |
| Cars | 8.1 | **8.6** | 8.8 | ✗ |
| Crane | 8.6 | **8.7** | 8.7 | ✓ |
| Entrance gate | 8.4 | 8.4 | — | — |
| Residential | 8.1 | **8.6** | 8.7 | ✗ |
| Warehouse | 7.8 | **8.4** | 8.5 | ✗ |
| Bridge | 8.1 | **8.6** | 8.7 | ✗ |
| Solar panel | 8.4 | **8.7** | 8.7 | ✓ |
| Scaffolding | 7.7 | **8.5** | 8.5 | ✓ |
| Construction shed | 7.8 | **8.4** | 8.5 | ✗ |
| Boundary wall | 7.9 | 7.9 | — | — |

Four of eleven targets met. The hero moved 8.2 → 8.8 on chamfers, a real window
system and per-opening occupancy; it is not 9.2, because chamfers fix the edge
and the brief's 9.2 needs the *mass* to change — a setback, a change of section,
a modelled podium-to-tower transition. That is still outstanding.

The boundary wall is untouched this pass and is now the weakest asset in the set
at 7.9: one 12.5 m segment repeated around the compound.

## What V8 changed, asset by asset

### Trees — the largest single change

The old close-range foliage was three alpha cards rotated about an axis, each
card printed with ellipses at binary alpha. Four things were wrong: the card is
a plane, the ellipse is not a leaf, binary alpha is a cut-out, and nothing
attached the cards to the tree.

| Defect | Before | After |
| --- | --- | --- |
| Flat plane | one quad per blade | **folded and twisted blade** — three rows along the midrib, creased at ~0.55 × width, twisted ±0.22–0.72 rad, so the surface catches light progressively instead of as one flat sheet |
| Ellipse | `|ly| ≤ 1 − 0.28·|lx|` | **ovate leaf profile** `w(u) = 2.354·u^0.5·(1−u)^0.8`, peaked at 38 % of the length, pointed tip, narrow base, serrated margin |
| Cut-out edge | alpha 0 or 255 | **antialiased coverage ramp**, ~6.8 % of the atlas is now partial alpha |
| Solid green sheet | no gaps | **holes punched near every margin** — sky reads through the spray |
| Uniform green | one albedo | **two-tone crown**: leaves inside 52 % of the crown radius use `leafDeep` (darker, greener, rougher 0.84), outer leaves use the bright atlas |
| Floating cards | none | **shoot geometry** — every third cluster grows a tapered twig from its branch point |
| Cloned trees | per-instance scale/rotation only | **per-instance colour** (`InstancedMesh.setColorAt`), derived from position: ±10 % brightness, ±6 % warm/cool |
| Even spacing | uniform dart-throw at fixed min distance | **density-weighted scatter**: a 48 m clumping field, plus verge and boundary bias; min spacing tightens inside a clump |

Measured effect on spacing (86 trees, high tier): nearest-neighbour distances
now run 5.0 m (p25 12.5, median 18.0, p75 32.5, max 75.2), spread sd/mean
**0.59** — planted landscaping sits near 0.2, natural stands above 0.5.

Cost: LOD 0 rose from 9,326 to 14,534 triangles (tree-a); LOD 1 from 5,482 to
7,086; LOD 2 unchanged at 3,400 because a crease is invisible at 150 m.
Bounding boxes still agree across levels to within 3 %, so nothing changes
size on a swap.

**Why trees score 8.4 and not 8.5+:** at 1 m you would still see that each
blade is a printed spray of leaves rather than individual leaves on a stem.
The silhouette, the two-tone depth and the twigs carry it from 8 m; they do not
carry it from arm's length.

### Road — texel density was the defect

A 512² asphalt map over a 6.5 m tile is 79 px/m — **12.7 mm per texel**,
coarser than the 5–12 mm aggregate it is meant to show. Close up the road was
smooth noise. Tiles are now halved:

| Surface | Tile before → after | Texel before → after |
| --- | ---: | ---: |
| asphalt | 6.5 → 3.4 m | 12.7 → **6.6 mm** |
| gravel shoulder | 5 → 2.8 m | 9.8 → **5.5 mm** |
| soil verge | 9 → 5 m | 17.6 → **9.8 mm** |
| terrain | 8 → 4.5 m | 15.6 → **8.8 mm** |

This is the same density as moving every one of those maps to 1024², for zero
memory and zero generation time (a 1024² asphalt map costs 1.14 s of main
thread to generate; the site cannot afford it during load).

**The trade, stated plainly:** the repeat period halved. It is paid for by the
things that do not repeat — the per-vertex macro tint at 40–110 m, the patch
and dust-film overlays at their own scales, the markings, and the verge spill
patches. If the live site shows asphalt tiling, the fix is to raise the surface
resolution to 1024 for the high tier only and take the load-time hit, not to
put the tile back to 6.5 m.

### Windows — the building was hollow, and the back was inside-out

`punchedFacade` builds piers, spandrels, headers, reveals, jambs, mullions and
chajjas, but nothing behind the glass: you could look through a window and see
the sky on the far side of the building. Every facade now gets a solid interior
volume behind the reveal, in a material with linear albedo ≈ 0.005 — dark
enough to stay darker than any exterior surface even where direct sun finds the
opening, which is what a real room does.

Two constraints fix its size, and both were got wrong on the first attempt. It
must never be larger than the facade itself, or it shows as a black fin past the
building corner. And it must be deep enough that a glancing view down the reveal
lands on it rather than past it, or the oblique angles stay hollow. It is
exactly the facade's footprint and 1.6 m deep.

**The bigger find was next to it.** Every offset in `punchedFacade` was authored
as "negative is into the building", which is only true when the outward normal
points +z. Both generators call it twice — once for the front elevation at
`z = +D/2`, once for the rear at `z = -D/2` — and the rear call was running
mirrored. Its glazing sat 0.24 m *proud* of the wall instead of recessed 0.24 m
into it, and its chajjas, the projecting sun shades that give an Indian facade
its shadow, grew inwards into the rooms where nothing could ever see them.

That is not a cosmetic slip. A window that bulges out of the wall instead of
sitting inside it is one of the fastest ways to read a building as fake, and the
brief asks specifically for a real recess. The builder now derives a `facing`
sign from the plane coordinate and mirrors every offset with it. Verified by
building a facade at z = +8 and z = −8 and reading the geometry back:

```
facade wall plane z=8   interior is toward z=0
   glass      z    7.70 ..    7.74   inward
   interior   z    5.97 ..    7.57   inward
   stone      z    7.52 ..    8.26   straddles (chajja projects outward)

facade wall plane z=-8  interior is toward z=0
   glass      z   -7.74 ..   -7.70   inward
   interior   z   -7.57 ..   -5.97   inward
   stone      z   -8.26 ..   -7.52   straddles (chajja projects outward)
```

Both elevations now recess the same way round. Triangle count is unchanged —
this was a placement bug, not a detail budget.

### Tyres and PV glass

Both were reading as holes; both are covered in `DAYLIGHT_QA.md`. Tyres went
from 0.006 to 0.033 linear albedo (0.13 → 0.31 sRGB sunlit). Solar panels went
from `metalness 0.9` over near-black — which reflects almost nothing, because
high metalness makes the base colour *be* the reflectance — to a glossy
dark-blue dielectric.

---

## The remaining defects, in priority order

0. **Done this pass, and worth recording as a defect class:** the rear
   elevations of both the hero and the residential building were mirrored —
   glazing proud of the wall, sun shades inside the building. Fixed by deriving
   the facade's facing from its plane coordinate. It is listed here because it
   is the kind of error a technical QA pass never catches: the GLB was valid,
   grounded, correctly scaled and completely wrong.

1. **Everything is boxes.** The hero building is 25,548 triangles of
   axis-aligned boxes. Real cast concrete has chamfered edges, formwork lines,
   and tolerances. §7 asks for small bevels where visually important; the
   builder has no chamfered primitive yet, so every edge on every building is a
   mathematically perfect 90°. This is the single biggest thing standing
   between 8.2 and 9 on the building.
2. **Facade repetition.** Six identical bays × twelve identical floors on the
   front elevation, broken only by grilles and AC units. It needs per-bay
   variation — different sill projections, the odd blocked-up opening, a
   mismatch in the render between pours.
3. **Vehicle interiors and shutlines.** Cars are measured and correctly
   proportioned but have no door panel gaps, no interior behind the glass, and
   no number plates visible at close range.
4. **Warehouse, shed and scaffolding are the weakest assets** (7.7–7.8): they
   are the least detailed generators in the set and read as simple volumes at
   the distances the service chapters actually frame them.
5. **Boundary wall repetition** (6.5): a single 12.5 m segment repeated around
   the compound with only scale variation.

## Method notes

- Dimensions: `scripts/glb/bounds.mjs` (raw and optimised agree to 2 dp).
- Triangles: reported by `npm run assets:build`.
- Texel density: `size / tile`, converted to mm.
- Spacing statistics: nearest-neighbour distribution over `trees('high')`.
- Nothing here scores triangle count, material-slot count or polygon density as
  realism (§57). It never has.
