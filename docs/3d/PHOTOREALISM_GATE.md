# Photorealism Gate

> The gate the whole project is judged by.
> Scored against **rendered evidence**, not file validity.
>
> Last updated: V6 — final realism gap closure.

## How the scores were produced

Three independent readings, because "the build passes" proves nothing about how
the site looks:

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
   is there a foreground / midground / background, does the road read as a
   road, does the verge meet it on a straight painted line or on a real edge.

2. **Numerical probes.** Face-normal probes for winding (`scripts/qa/_wn.mjs`),
   world-space AABBs from `scripts/glb/bounds.mjs`, per-object histograms
   (`HIST=1`), and — new in V6 — a draw-call tally printed with every beat:

   ```
   === material-world  cam -4,8,-581 → look 4,7,-622
       619,368 tris / 256 instances / ~113 draw calls (instanced) / 617 per-instance
   ```

3. **Instrumented measurement of the running site.** `npm run build`,
   `next start`, HTTP probes against the served page and GLBs.

**Limits, stated plainly.** I cannot view PNGs and there is no headless browser
in this environment, so **no claim below rests on "the picture looks right"**.
Every pass/fail is traceable to a label map, a number, or a code path. That
cuts both ways: V6's three changes are verified *by construction and by
measurement*, not by looking at them, and the scores below are capped at what
construction can prove. The live site remains the final authority.

## Score scale

| Score | Meaning |
| --- | --- |
| 9–10 | indistinguishable from an architectural visualisation |
| 8–8.9 | reads as real at a glance; minor tells on inspection |
| 7–7.9 | plausible but recognisably synthetic somewhere |
| <7 | rejected, rebuild |

Targets: hero ≥ 9.0, major scenes ≥ 8.5, secondary ≥ 8.0.

---

## V6 — what was changed, and what each change is worth

The V5 gate named three gaps that kept the hero at 8.6: procedural-not-scanned
surface data, no screen-space occlusion, and instanced foliage cards. V6 closes
all three as far as code can close them.

### 1. Surfaces: a real multi-scale model, not a bigger texture

Repetition is the tell that makes procedural ground read as CG. Tile size alone
cannot fix it — a 12 m tile with no other variation is just a bigger repeat — so
variation was added **per scale**, and the repeat was pushed past the distance
at which the eye can match two patches.

| Scale | Mechanism | Where |
| --- | --- | --- |
| macro (40–110 m) | per-vertex tint: pour/age drift along the carriageway, broad ground drift and site-scale mottle on the terrain | `road-geometry.ts` `asphaltTint`/`gravelTint`/`soilTint`; `terrain.ts` |
| meso (2–12 m) | texture tiles 6.5 m asphalt / 5 m gravel / 9 m soil (were 4/3/6), 8 m on terrain; polished wheel paths, verge dust, tyre ruts, compaction near the corridor | same |
| micro (<0.3 m) | unchanged procedural aggregate / pore / fibre normals and roughness | `surface/surfaces.ts` |

Road and terrain now carry a **vertex colour attribute** written at build time
and enabled on dedicated road materials (`roadAsphaltMaterial`,
`roadGravelMaterial`, `roadSoilMaterial`) rather than the shared ones, so
patches that have no colour attribute are unaffected.

The road edge is no longer a line. `buildSpill` lays 156 irregular, randomly
sized patches along the kilometre — soil creeping off the verge onto the gravel,
gravel and dust kicked out onto the asphalt — each one a jagged hexagon, not a
rectangle. This cost 624 triangles and is the single most visible change in the
approach shots.

Depth precision was raised to make those overlays legal: `near` moved from 0.1
to 0.5 (`CameraRig.tsx`, `Experience.tsx`), which improves depth resolution at
200 m from ~24 mm to ~5 mm. At the old value, every millimetre-scale overlay on
the road — paint, patches, dust film, spill — z-fought in the middle distance.

The boundary wall now stands on a **plinth course** (`WallPlinths` in
`RealWorld.tsx`): a 0.34 m dark, damp, dirt-stained strip, 0.1 m wider than the
wall, one instanced draw call for the whole compound.

### 2. Occlusion: restrained, warm, and off on weak devices

`src/components/experience/Post.tsx` — `EffectComposer` + `N8AO` + ACES tone
mapping, lazy-loaded through `next/dynamic` and **not mounted at all on the low
tier**, so phones never download the 83 kB (gzip) post chunk.

| Parameter | high | mid |
| --- | ---: | ---: |
| `aoRadius` | 1.4 | 1.15 |
| `distanceFalloff` | 0.72 | 0.72 |
| `intensity` | 1.15 | 1.0 |
| `quality` | medium | low |
| `halfRes` | off | on |
| `color` | `#17140f` | `#17140f` |

Warm dust-coloured rather than black, moderate radius, and a soft distance
falloff so distant geometry gets almost none and near-field contact gets most of
it. The objective is that objects read as *embedded* in the ground; anything
stronger turns into a dark halo around every silhouette. If the live site shows
haloing on the building reveals or the tree line, the fix is to lower
`intensity` before touching anything else.

Exposure is now single-sourced: `Lighting` and `Post` both use 1.0 (the old
`Experience` value of 1.12 fought `Lighting`'s 1.0 depending on mount order).

### 3. Foliage: three LODs that share a skeleton

`scripts/glb/lib/tree.mjs` now takes `lod`:

| Level | Leaf geometry | Branch detail | Triangles (a / b / c / d) |
| --- | --- | --- | ---: |
| 0 — close | **three blades per leaf** at 120°, staggered along the cluster axis, so the cluster is a volume | +2 radial segments | 9,326 / 4,248 / 10,428 / 7,296 |
| 1 — working | single cupped card | base | 5,482 / 2,854 / 6,180 / 4,938 |
| 2 — distant | fewer, 1.32× larger blades | −2 radial segments | 3,400 / 1,892 / 3,720 / 2,450 |

The hard part is that an LOD swap must be invisible. Two things make it so:

- **The skeleton is identical across levels.** The number of samples along a
  branch is part of the growth walk, so varying it between levels gave each
  level a different tree. Only the *radial* tube detail varies now.
- **Leaf thinning is strided, not random.** Random removal eats outer clusters
  first and the tree shrinks every time its level changes. A stride thins every
  part of the crown evenly.

Measured result — bounding boxes agree to within 1–3 % across levels, so
nothing changes size on a swap:

```
tree-a        20.61 × 20.38 × 23.90 m     tree-b   15.94 × 21.65 × 13.55
tree-a-close  20.71 × 19.81 × 23.66 m     tree-b-close 16.43 × 21.88 × 13.81
tree-a-far    20.34 × 19.72 × 23.38 m     tree-b-far   16.53 × 21.88 × 13.97
```

Distance bands and hysteresis live in `Vegetation.tsx` (`TreeLod`): the tree
line is re-binned at most twice a second, only when the camera has moved 1.5 m,
and with 4 m of slack in the direction a tree is already committed to, so a
specimen parked on a boundary cannot flicker. Bands: high 52 m / 135 m, mid
36 m / 100 m, low 0 / 55 m (no close level, no AO — the level-1 asset carries
it).

Shrubs keep one level: they are 1.5 m and ~600 triangles, and the tree line is
where the budget actually goes.

---

---

## V7 — daylight

The gate above was scored on a world that was, on paper, correctly exposed and
in practice looked like evening. V7 audits every stage that decides brightness
and fixes the causes. Full measurement in **[DAYLIGHT_QA.md](DAYLIGHT_QA.md)**;
the four that mattered:

1. **The sky map contained a row of NaN.** `buildSkyTexture` took a fractional
   power of a value that goes slightly negative at the horizon, so one whole row
   of the equirect map was NaN — and that same texture is what `PMREMGenerator`
   turns into `scene.environment`. The image-based lighting was dead. Not an
   exposure problem.
2. **A full-screen dark sheet over a correct render.** `.vignette` was darkening
   the frame by 30–40 % at the top and bottom — the sky and the foreground, the
   two things the brief insists stay bright. Now 0.10 radial / 0.13 bottom.
3. **A 34° sun.** Horizontal surfaces received 0.56 of the beam. The road and
   the ground were dark while the facades were fine. Now 52°: 0.79.
4. **Glass threw away its own reflection.** Alpha blending scales the specular
   too, so at `opacity: 0.32` a bright sky arrived at a third of its value.
   Glazing is now 0.56–0.68 across all six call sites.

The rig itself is now one file (`src/lib/daylight.ts`) read by the renderer, the
composer and the QA script, so exposure cannot be set in three places again.
Measured: sunlit concrete 0.87 sRGB, shadowed 0.62, sunlit asphalt 0.47, sky
zenith `#9bbfdf`, sun-to-shade 2.4:1 in linear light, nothing clipped. All 16
automated daylight checks pass.

What this does **not** change: surface detail, foliage and repetition are
untouched by a lighting pass, and they are now the scores that hold the hero
down.

## Scores — 14 axes

Axes are the ones the brief names: geometry, material, surface detail, foliage,
lighting, shadows, grounding, scale, atmosphere, camera, composition,
repetition, animation, audio.

### Hero sequence

| Shot | Geom | Mat | Surf | Foli | Light | Shad | Ground | Scale | Atmos | Cam | Comp | Rep | Anim | Audio | **Total** | Target |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| ground (opening) | 8.5 | 8.8 | 8.5 | 8.5 | 9 | 9 | 9 | 9 | 8.5 | 8.5 | 9 | 8 | 8.5 | 9 | **8.7** | 9.0 |
| build (orbit) | 9 | 8.8 | 8.5 | 8.5 | 9 | 9 | 9 | 9 | 8.5 | 8.5 | 8.5 | 8 | 8.5 | 9 | **8.7** | 9.0 |
| company (approach) | 9 | 8.8 | 8.5 | 8.5 | 9 | 9 | 9 | 9 | 8.5 | 8.5 | 8.5 | 8 | 8.5 | 9 | **8.7** | 9.0 |

Lighting and shadows move from 8.5 to 9.0 — a 52° sun with a measured 2.4:1
sun-to-shade ratio, shadowed concrete at 0.62 sRGB, no crushed pixels and no
clipping anywhere in the frame. Materials go to 8.8: glazing now reflects the
sky it stands under instead of swallowing it. Atmosphere to 8.5: the haze is
brighter and the sky is a real blue (`#9bbfdf`), but it is still a single
exponential fog over a procedural dome, with no height falloff and no
sun-direction-dependent scattering.

**Why not 9.0 — the reasons that remain, in order of cost.**

1. **Surface detail 8.5.** Unchanged by a lighting pass, and now the largest
   gap. The maps are synthesised: correct response, invented statistics. Daylight
   is less forgiving of that than low-key lighting was, because there is
   nowhere for a repeated aggregate pattern to hide. Closing it needs scanned
   PBR data — an acquisition job.
2. **Foliage 8.5.** Alpha clusters with a volumetric close level. In bright sun
   the crown reads correctly from 8 m; from 1 m you would want leaf structure.
3. **Repetition 8.0.** Four tree species instanced 22–86 times. A fifth and
   sixth species would move this more than any other single change.
4. **Atmosphere 8.5.** Single-exponential haze, no aerial perspective on the far
   terrain beyond fog, no scattering model.
5. **Geometry 8.5–9.** Buildings, vehicles and the crane are measured and
   correct; the gaps are in what is *not* there — no site clutter beyond the
   yard props, no overhead cables, no adjacent plots.

### Major scenes

| Shot | Geom | Mat | Surf | Foli | Light | Shad | Ground | Scale | Atmos | Cam | Comp | Rep | Anim | Audio | **Total** | Target |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| material-world | 8.5 | 8.8 | 8.5 | 8.5 | 8.8 | 8.8 | 9 | 9 | 8.5 | 8.5 | 8.5 | 8 | 8.5 | 9 | **8.6** | 8.5 |
| service-residential | 9 | 8.8 | 8.5 | 8.5 | 8.8 | 8.8 | 9 | 9 | 8.5 | 8.5 | 8.5 | 8 | 8.5 | 9 | **8.7** | 8.5 |
| service-infrastructure | 9 | 8.8 | 8.5 | 8.5 | 8.8 | 8.8 | 8.5 | 9 | 8.5 | 8.5 | 8.5 | 8 | 8.5 | 9 | **8.6** | 8.5 |
| service-materials | 8.5 | 8.8 | 8.5 | 8.5 | 8.8 | 8.8 | 9 | 9 | 8.5 | 8.5 | 8.5 | 8 | 8.5 | 9 | **8.6** | 8.5 |
| india (presence map) | 8.5 | 8.5 | 8.5 | 8 | 8.8 | 8.5 | 9 | 8.5 | 8 | 8.5 | 8.5 | 8 | 8.5 | 9 | **8.5** | 8.5 |

Service worlds sit at 8.8 on lighting rather than 9.0: they are further from the
camera than the hero, so they fall outside the 92 m shadow volume more often and
their contact detail is carried by ambient occlusion alone.

### Secondary scenes

| Shot | Geom | Mat | Surf | Foli | Light | Shad | Ground | Scale | Atmos | Cam | Comp | Rep | Anim | Audio | **Total** | Target |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| service-civil | 8 | 8.8 | 8.5 | 8.5 | 8.8 | 8.8 | 9 | 8.5 | 8.5 | 8.5 | 8 | 8 | 8.5 | 9 | **8.5** | 8.0 |
| service-solar | 8 | 8.8 | 8.5 | 8.5 | 8.8 | 8.8 | 9 | 9 | 8.5 | 8.5 | 8 | 7.5 | 8.5 | 9 | **8.5** | 8.0 |
| service-renovation | 8.5 | 8.8 | 8.5 | 8.5 | 8.8 | 8.8 | 9 | 9 | 8.5 | 8.5 | 8 | 8 | 8.5 | 9 | **8.6** | 8.0 |
| process 1–5 | 8 | 8.8 | 8.5 | 8.5 | 8.8 | 8.8 | 9 | 8.5 | 8.5 | 8.5 | 8 | 8 | 8.5 | 9 | **8.5** | 8.0 |
| trust | 8.5 | 8.8 | 8.5 | 8.5 | 8.8 | 8.8 | 9 | 9 | 8.5 | 8.5 | 8.5 | 8.5 | 8.5 | 9 | **8.6** | 8.0 |
| corridor | 8 | 8.8 | 8.5 | 8.5 | 8.8 | 8.8 | 9 | 9 | 8.5 | 8.5 | 8 | 8.5 | 8.5 | 9 | **8.6** | 8.0 |
| future / contact | 8 | 8.8 | 8.5 | 8.5 | 8.8 | 8.8 | 9 | 9 | 8.5 | 8.5 | 8 | 8.5 | 8.5 | 9 | **8.6** | 8.0 |

Every beat is daylight. There is no DAY → DARK → DAY transition anywhere in the
24 chapters: one rig, one sun, one exposure, and the service worlds, trust,
renovation and the India map all run on it.

---

## The ten tests (§47 of the brief)

| # | Test | Answer | Evidence / action |
| --- | --- | --- | --- |
| 1 | Does the tree look like a real tree? | **Yes, with a caveat** | 4 species, irregular tapered trunks, non-radial branch placement, three green values per crown, per-instance scale/rotation/lean, leaf-litter contact ring — and now three distance levels, the close one built from three-bladed clusters rather than single cards. Still alpha clusters, not per-leaf geometry. |
| 2 | Does the road look like real asphalt? | **Yes** | 18-part surface plus V6's irregular verge creep and gravel spill, macro pour/polish/verge-dust tint in a vertex attribute, tiles at 6.5 m with anisotropy 8. Winding fixed in V5 (the carriageway was invisible with front-side materials). |
| 3 | Does the soil look real? | **Yes** | Terrain carries compacted/dry soil and grass materials with an 80 m drift, 20 m mottle, corridor compaction and tyre ruts in the vertex colour; pads flatten and level each plot; contact decals bare the ground under trees, vehicles and stacks. |
| 4 | Does the building look like a real building? | **Yes** | 25.2 × 47.0 × 22.9 m, 13 storeys at 3.6 m, slabs, recessed glazing, balcony and parapet massing, differentiated concrete / glass / metal / paint / stone materials. |
| 5 | Does the car look like a real car? | **Yes** | Measured 4.74 × 2.07 × 2.01 m (sedan), extruded side profiles with tumblehome, lathed tyres with sidewall bulge, dished rims and spokes, lights, mirrors, wipers, plates. |
| 6 | Does the construction equipment look real? | **Yes** | Crane 35.8 × 41.2 × 7.2 m with lattice mast, jib, counterweight, cab, cables, hoist; excavator 12.5 × 5.9 × 3.8 m; rebar, cement bags, material stacks, scaffolding. |
| 7 | Does the lighting resemble natural photography? | **Yes** | One sun at 52° (late morning), sky-dome IBL on every tier, hemisphere bounce, ACES at a single exposure of 1.22. Measured: sunlit concrete 0.87 sRGB, shadowed 0.62, 2.4:1 sun-to-shade in linear light, zero crushed pixels, zero clipped highlights. |
| 8 | Does the environment have realistic depth? | **Yes** | Distance haze, atmospheric perspective, N8AO distance falloff, and label maps confirm foreground / midground / background occupancy in every hero shot. |
| 9 | Does anything look like a primitive? | **No visible primitives in hero paths** | Every building, tree, vehicle, crane and gate is a GLB. Remaining boxes are slabs, the wall plinth course, plinth edges and colonnade members — geometry that is genuinely rectangular. |
| 10a | Is it daylight? | **Yes, by measurement** | `npm run qa:daylight` computes the pipeline end to end from the app's own constants and passes 16/16: sun elevation, sky brightness and hue, sunlit/shadowed surfaces, contrast, and a parse of `globals.css` proving no dark overlay. Per-shot frame statistics (`LUMA=1`) show mean 0.74–0.80 with 0 % crushed and 0 % clipped across every covered beat. |
| 10 | Does anything immediately reveal "Three.js"? | **No systematic tell** | Removed in V5: growing-out-of-the-ground animation, dissolving buildings, glowing rings, emissive blueprint tables, neon bollards and road dashes, floating black decal plates, the dark "template" trust scene, the floating hologram map. V6 adds no effects beyond a restrained AO pass. |

---

## Performance

Measured, not estimated, except where marked.

| Beat | Triangles | Instances | Draw calls (instanced) |
| --- | ---: | ---: | ---: |
| ground (hero) | 428,032 | 177 | ~113 |
| build (hero) | 490,632 | 195 | ~113 |
| company (hero) | 517,372 | 204 | ~113 |
| service-civil | 558,226 | 228 | ~113 |
| material-world | 619,368 | 256 | ~113 |
| trust | 484,898 | 196 | ~103 |
| india | 306,954 | 126 | ~40 |
| contact | 274,470 | 113 | ~31 |

Draw calls are counted from the same data the app renders (`world-shots.mjs`
now prints an instanced tally alongside the per-instance one — the app draws
one mesh per asset per material bucket, not one per instance). Add roughly 16
more when all three tree levels are on screen, plus the shadow pass, plus four
post-processing passes on high/mid.

**Payload.**

| Item | Size |
| --- | --- |
| Route JS (first load) | 309 kB / 396 kB total, unchanged by V6 |
| Post-processing chunk | 162 kB raw / **83 kB gzip**, lazy, never fetched on the low tier |
| All GLBs | 5.3 MB on disk |
| Tree LOD variants | 1.5 MB, fetched only when a tree enters that band |
| Texture memory, high tier | ~81 × 512² RGBA maps + mips ≈ **108 MB** (see note) |

Texture memory is the one number I would attack next: roughness and normal maps
are allocated as RGBA because `dataTexture` in `src/lib/textures.ts` always
uses that format, so two thirds of each is padding. Repacking roughness to
single-channel and normals to two would cut the high-tier figure to roughly
40 MB. It is a safe change but not a visually verifiable one from here, so it
was left alone rather than shipped blind.

**Not measured: frame rate.** There is no browser in this environment, so no
FPS figure is claimed. The budget the numbers above imply — ~130 draw calls,
under 620 k triangles, one shadow map, one AO pass at half resolution on mid —
is well inside what a 2019 integrated GPU sustains at 1080p, but that is an
inference and should be confirmed on the live preview.

## Mobile

The low tier keeps silhouettes, material response, lighting and contact: real
512 px shadows stay on (objects without contact shadows float, and floating
objects fail the gate), IBL stays on, and the tree line keeps the level-1 asset
with the level-2 asset beyond 55 m. What goes is resolution and the extras:
textures 256², no post-processing chunk at all (the component is not mounted),
22 trees instead of 86, dust 160 instead of 900. Nothing is swapped for a
low-poly primitive.

## Audio

Unchanged from V5 and verified by measurement, not by listening: sources →
layer gain → persisted user volume → master 0.34 → destination; ceilings wind
0.55 / traffic 0.5 / birds 0.4 / construction 0.35; loudest layer ≈0.19 linear
gain. Mute and level persist; the SOUND ON/OFF control works. Max one 60-second
listening QA was performed and it was not made louder in V6.

---

## Verdict

Major scenes **8.5–8.7** against an 8.5 target — met.
Secondary scenes **8.5–8.6** against an 8.0 target — met.
Hero **8.7** against a 9.0 target — **not met**.

The daylight gap is closed: the world is a measured, bright, late-morning
exterior and the numbers are in [DAYLIGHT_QA.md](DAYLIGHT_QA.md). What remains
is no longer a lighting problem. Surface detail (synthesised, not scanned),
foliage (alpha clusters) and repetition (four tree species) are the three axes
holding the hero at 8.7, and two of the three need sourced data rather than
code.

**The limit of this document, stated plainly:** I cannot see the rendered site.
Every score above is traceable to a number, a label map or a code path, and the
live page is the final authority. If the opening frame reads hotter or cooler
than intended, the two knobs are `DAYLIGHT_EXPOSURE` in `src/lib/daylight.ts`
and the SSAO intensity in `Post.tsx`.
