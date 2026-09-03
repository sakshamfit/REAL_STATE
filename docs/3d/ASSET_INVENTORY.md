# 3D Asset Inventory

> Production asset registry for the RUDRA cinematic experience.
> Runtime registry: `src/data/assets.ts`. Geometry: `public/assets/glb/`.
> Dimensions below are **measured**, not declared: they come from
> `scripts/glb/bounds.mjs`, which de-quantises the optimised GLBs and applies
> the node transforms, so the numbers are true world-space metres.

## Measured production assets (28)

| Asset | File size | World size W × H × D (m) | Lowest y (m) |
| --- | ---: | --- | ---: |
| barrier | 12.1 kB | 4.56 × 1.10 × 0.96 | -0.00 |
| boundary-wall | 9.2 kB | 12.52 × 3.09 × 0.52 | -0.00 |
| bridge | 105.7 kB | 72.01 × 24.75 × 19.00 | -0.60 |
| bush | 28.9 kB | 1.71 × 1.67 × 1.50 | -0.16 |
| car-a | 105.8 kB | 4.74 × 2.07 × 2.01 | 0.00 |
| car-b | 109.4 kB | 4.94 × 2.14 × 2.13 | -0.00 |
| car-c | 104.1 kB | 4.04 × 2.08 × 1.93 | 0.00 |
| cement-bags | 32.6 kB | 4.00 × 1.00 × 2.15 | -0.00 |
| construction-shed | 76.0 kB | 10.20 × 4.07 × 8.00 | 0.00 |
| crane | 107.5 kB | 35.81 × 41.16 × 7.20 | -0.00 |
| entrance-gate-leaf | 17.1 kB | 9.22 × 2.90 × 0.25 | 0.05 |
| entrance-gate | 20.6 kB | 14.70 × 6.00 × 4.38 | -0.00 |
| excavator | 58.8 kB | 12.45 × 5.90 × 3.76 | -0.04 |
| grass-tuft | 3.8 kB | 0.88 × 0.71 × 0.83 | 0.00 |
| hero-building | 1136.7 kB | 25.20 × 47.02 × 22.88 | -0.00 |
| material-stack | 49.0 kB | 8.48 × 1.67 × 7.86 | -0.53 |
| rebar-stack | 22.7 kB | 3.90 × 0.66 × 3.76 | 0.00 |
| residential-building | 618.3 kB | 25.10 × 23.40 × 18.18 | -0.00 |
| scaffolding | 74.2 kB | 11.95 × 12.32 × 1.44 | -0.02 |
| shrub-dry | 29.1 kB | 1.59 × 1.51 × 1.58 | -0.08 |
| solar-panel | 35.6 kB | 8.83 × 2.16 × 8.60 | 0.00 |
| street-light | 11.1 kB | 3.59 × 7.70 × 0.62 | 0.00 |
| tree-a | 209.5 kB | 20.67 × 20.11 × 23.73 | -0.02 |
| tree-b | 102.1 kB | 15.94 × 21.65 × 13.55 | -0.01 |
| tree-c | 220.0 kB | 19.71 × 13.70 × 15.00 | -0.02 |
| tree-d | 184.4 kB | 10.72 × 9.21 × 7.89 | -0.00 |
| truck-a | 113.1 kB | 4.82 × 2.17 × 2.05 | 0.00 |
| warehouse | 267.6 kB | 48.50 × 15.09 × 41.90 | -0.00 |

Every asset sits at y ≈ 0. Two values are intentionally negative: `bridge`
(-0.60, pier footings below the deck) and `bush` / `shrub-dry` (-0.16, root
ball below the soil line). Both are legitimate and neither floats.

## What changed in this pass

| Change | Why |
| --- | --- |
| `entrance-gate` split into a static frame + `entrance-gate-leaf` | the gate can now slide open as the camera arrives, instead of the whole gate scaling |
| `crane` GLB replaces the hand-built box crane in `HeroBuilding.tsx` | the procedural crane was visibly cube-based; the GLB has a lattice mast, joints, cables, counterweight and cab |
| `TowerCrane` component deleted | dead primitive geometry |
| Measurement rewritten (`scripts/glb/bounds.mjs`) | every previous bounds report read quantised shorts raw (±32767 m), so no asset had ever been measured |
| Mobile IBL enabled (`Sky.tsx`), shadows kept on `low` tier | PBR without an environment map reads as plastic, and objects without contact shadows float |

## Material requirements

| Material | Roughness | Metalness | Notes |
| --- | --- | --- | --- |
| Render | ~0.72 | 0.02 | warm plaster / painted cement |
| Stone | ~0.82 | 0.04 | sandstone / granite |
| Concrete | ~0.88 | 0.04 | board-formed, subtle weathering |
| Glass | ~0.12 | ~0.88 | tinted, framed, recessed |
| Metal | ~0.34 | ~0.88 | brushed railings / frames |
| Dark Metal | ~0.42 | ~0.80 | gate leaves / equipment |
| Wood | ~0.68 | 0.02 | trunks, branches |
| Foliage | ~0.82 | 0 | several green values per tree |
| Terracotta | ~0.76 | 0.02 | clay accents |
| Asphalt | ~0.95 | 0.01 | road surface |
| Soil / Dust | ~0.98 | 0.00 | compacted construction ground |

## LOD and streaming

Three LOD levels (`high`, `medium`, `low`) are registered per asset in
`src/data/assets.ts`; `AssetModel lod="auto"` picks by camera distance. Beyond
an asset's `cullDistance` it is not drawn at all.

Streaming priority:

1. Hero building, entrance gate, entrance-gate leaf, crane
2. Trees, bush, boundary wall, construction shed, street light
3. Residential building, bridge, solar panel, warehouse, scaffolding
4. Vehicles, small site props

`src/lib/asset-loader.ts` streams the priority set with `fetch` and reports the
real fraction of files received. Nothing in the loader invents progress.

## V8 — foliage levels and texel density

Trees are generated at three levels that share one skeleton, so a swap is
invisible; the level-0 and level-2 assets are only fetched once a tree enters
that distance band (52 m / 135 m on the high tier, 36 m / 100 m on mid, no
close level on low).

| Level | Leaf construction | tree-a / b / c / d triangles |
| --- | --- | ---: |
| 0 close | folded twisted blades ×3 per leaf, shoots on every third cluster | 14,534 / 6,576 / 15,912 / 11,598 |
| 1 medium | folded blade, one per leaf | 7,086 / 3,988 / 7,924 / 7,114 |
| 2 far | flat card, fewer and larger | 3,400 / 1,892 / 3,720 / 2,450 |

Surface tile sizes were halved in V8 to bring texel density inside the real
material grain. A 512² map over 3.4 m is 6.6 mm per texel — inside the 5–12 mm
of dense-graded asphalt aggregate — where the previous 6.5 m tile was 12.7 mm,
coarser than the stones it was meant to show.

| Surface | Tile | At 512² |
| --- | ---: | ---: |
| asphalt | 3.4 m | 6.6 mm/texel |
| gravel shoulder | 2.8 m | 5.5 mm/texel |
| soil verge | 5.0 m | 9.8 mm/texel |
| terrain | 4.5 m | 8.8 mm/texel |
