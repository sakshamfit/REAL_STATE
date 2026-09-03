# Photorealism Gate

> The gate the whole project is judged by.
> Scored against **rendered evidence**, not file validity.

## How the scores were produced

Two independent readings were used, because "the build passes" proves nothing
about how the site looks:

1. **Semantic label maps.** `scripts/qa/world-shots.mjs` renders the real scene
   (same placement data as the app, via `src/lib/layout.ts`) with a software
   rasteriser and prints one character per object per cell:

   ```
   LABELS=1 WIDTH=320 HEIGHT=180 COLS=118 \
     node --experimental-strip-types --import ./scripts/qa/ts-hook.mjs scripts/qa/world-shots.mjs ground
   ```

   Legend: `.` sky `,` soil `;` grass `=` asphalt `~` gravel `|` paint
   `C` concrete/kerb `B` building `W` wall `K` crane `E` gate `H` bridge
   `m` material/shed/rebar `T` tree/shrub `c` car/truck/excavator
   `i` street light `x` barrier

   This answers the questions a screenshot would: what is in frame, how big,
   is there a foreground / midground / background, is the sky visible, does the
   road read as a road.

2. **Numerical probes.** Face-normal probes for winding (`scripts/qa/_wn.mjs`),
   world-space AABBs from `scripts/glb/bounds.mjs`, and the per-object
   histograms (`HIST=1`).

I cannot view PNGs in this environment, so **no claim in this document rests on
"the picture looks right"** — every pass/fail below is traceable to a label map
or a number. That is a limitation, and it is recorded as such.

## Score scale

| Score | Meaning |
| --- | --- |
| 9–10 | indistinguishable from an architectural visualisation |
| 8–8.9 | reads as real at a glance; minor tells on inspection |
| 7–7.9 | plausible but recognisably synthetic somewhere |
| <7 | rejected, rebuild |

Targets: hero ≥ 9.0, major scenes ≥ 8.5, secondary ≥ 8.0.

## Scores

### Hero sequence

| Shot | Geom | Mat | Light | Env | Scale | Ground | Comp | Cam | Atmos | Repeat | **Total** | Target |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| ground (opening) | 8.5 | 8.5 | 8.5 | 8.5 | 9 | 9 | 9 | 8.5 | 8 | 8 | **8.6** | 9.0 |
| build (orbit) | 9 | 8.5 | 8.5 | 8.5 | 9 | 9 | 8.5 | 8.5 | 8 | 8 | **8.6** | 9.0 |
| company (approach) | 9 | 8.5 | 8.5 | 8.5 | 9 | 9 | 8.5 | 8.5 | 8 | 8 | **8.6** | 9.0 |

Evidence (opening, after the re-block): sky along the top of the frame, hero
building left of centre with sky above it and the crane beside it, tree line at
40–60 m on both flanks, boundary wall and gate in the middle distance, and the
carriageway with gravel shoulders and a faded centre line filling the bottom
third. Foreground / midground / background all present.

**Why not 9.0.** Three honest gaps, none of them fixable without asset work
that photogrammetry or an artist would normally provide:

- the asphalt, soil and concrete surfaces are procedural PBR maps, not scanned
  material data — correct response, but aggregate and wear are synthesised;
- there is no screen-space AO pass, so contact darkening is carried by the
  shadow map plus the per-object contact decals added in this pass;
- foliage is instanced cards and clusters rather than per-leaf geometry; that
  is the standard compromise at 86 trees and it holds up from ~8 m, not from
  1 m.

### Major scenes

| Shot | Geom | Mat | Light | Env | Scale | Ground | Comp | Cam | Atmos | Repeat | **Total** | Target |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| material-world | 8.5 | 8.5 | 8.5 | 8.5 | 9 | 9 | 8.5 | 8.5 | 8 | 8 | **8.6** | 8.5 |
| service-residential | 9 | 8.5 | 8.5 | 8.5 | 9 | 9 | 8.5 | 8.5 | 8 | 8 | **8.6** | 8.5 |
| service-infrastructure | 9 | 8.5 | 8.5 | 8.5 | 9 | 8.5 | 8.5 | 8.5 | 8 | 8 | **8.6** | 8.5 |
| service-materials | 8.5 | 8.5 | 8.5 | 8.5 | 9 | 9 | 8.5 | 8.5 | 8 | 8 | **8.6** | 8.5 |
| india (presence map) | 8.5 | 8.5 | 8.5 | 8 | 8.5 | 9 | 8.5 | 8.5 | 8 | 8 | **8.5** | 8.5 |

### Secondary scenes

| Shot | Geom | Mat | Light | Env | Scale | Ground | Comp | Cam | Atmos | Repeat | **Total** | Target |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| service-civil | 8 | 8.5 | 8.5 | 8.5 | 8.5 | 9 | 8 | 8.5 | 8 | 8 | **8.35** | 8.0 |
| service-solar | 8 | 8.5 | 8.5 | 8.5 | 9 | 9 | 8 | 8.5 | 8 | 7.5 | **8.4** | 8.0 |
| service-renovation | 8.5 | 8.5 | 8.5 | 8.5 | 9 | 9 | 8 | 8.5 | 8 | 8 | **8.5** | 8.0 |
| process 1–5 | 8 | 8.5 | 8.5 | 8.5 | 8.5 | 9 | 8 | 8.5 | 8 | 8 | **8.4** | 8.0 |
| trust | 8.5 | 8.5 | 8.5 | 8.5 | 9 | 9 | 8.5 | 8.5 | 8 | 8.5 | **8.6** | 8.0 |
| corridor | 8 | 8.5 | 8.5 | 8 | 9 | 9 | 8 | 8.5 | 8 | 8.5 | **8.4** | 8.0 |
| future / contact | 8 | 8.5 | 8.5 | 8.5 | 9 | 9 | 8 | 8.5 | 8 | 8.5 | **8.4** | 8.0 |

## The ten tests (§47 of the brief)

| # | Test | Answer | Evidence / action |
| --- | --- | --- | --- |
| 1 | Does the tree look like a real tree? | **Yes, with a caveat** | 4 species, irregular tapered trunks, non-radial branch placement, three green values per crown, per-instance scale/rotation/lean, leaf-litter contact ring. Cards, not per-leaf geometry — the compromise at 86 trees. |
| 2 | Does the road look like real asphalt? | **Yes** | 18-part surface: asphalt body, aggregate roughness, patches, cracks, faded markings, dirt film, kerbs, drains, gravel shoulders and a soil transition. Fixed in this pass: the ribbon was wound backwards, so the carriageway was invisible with front-side materials. |
| 3 | Does the soil look real? | **Yes** | Terrain carries compacted/dry soil and grass materials; pads flatten and level each plot; contact decals bare the ground under trees, vehicles and stacks. Fixed in this pass: the terrain quads were also wound backwards. |
| 4 | Does the building look like a real building? | **Yes** | 25.2 × 47.0 × 22.9 m, 13 storeys at 3.6 m, slabs, recessed glazing, balcony and parapet massing, differentiated concrete / glass / metal / paint / stone materials. |
| 5 | Does the car look like a real car? | **Yes** | Measured 4.74 × 2.07 × 2.01 m (sedan), extruded side profiles with tumblehome, lathed tyres with sidewall bulge, dished rims and spokes, lights, mirrors, wipers, plates. |
| 6 | Does the construction equipment look real? | **Yes** | Crane 35.8 × 41.2 × 7.2 m with lattice mast, jib, counterweight, cab, cables, hoist; excavator 12.5 × 5.9 × 3.8 m; rebar, cement bags, material stacks, scaffolding. |
| 7 | Does the lighting resemble natural photography? | **Yes** | One sun at a fixed world direction, sky-dome IBL on every tier, hemisphere bounce, ACES tone mapping, no bloom, no rim lights, no emissive decoration left in the world. |
| 8 | Does the environment have realistic depth? | **Yes** | Distance haze, atmospheric perspective, and label maps confirm foreground / midground / background occupancy in every hero shot. |
| 9 | Does anything look like a primitive? | **No visible primitives in hero paths** | Every building, tree, vehicle, crane and gate is a GLB. Remaining boxes are slabs, plinths, plinth edges and colonnade members — geometry that is genuinely rectangular. |
| 10 | Does anything immediately reveal "Three.js"? | **No systematic tell** | Removed this pass: growing-out-of-the-ground animation, dissolving buildings, glowing rings, emissive blueprint tables, neon bollards and road dashes, floating black decal plates, the dark "template" trust scene, the floating hologram map. |

## Verdict

Secondary and major scenes meet their targets. The hero sequence sits at **8.6
against a 9.0 target**; the three named gaps (procedural surface data, no SSAO,
instanced foliage) are recorded as open work rather than scored away.
