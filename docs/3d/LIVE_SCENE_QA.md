# Live Scene QA

> What was actually inspected, what was found, what was changed.
> Run: `npm run build && npx next start -H 0.0.0.0 -p 3000` (served 200,
> `/assets/glb/hero-building.glb` 1.16 MB, 28 GLBs reachable).

The running site is the final authority, so this pass inspected the app as it
ships rather than only its source. Because PNG inspection is not available in
this environment, visual judgement was made through the offline renderer that
consumes the same placement data (`src/lib/layout.ts`) and the same materials,
plus numeric probes. Everything below is reproducible with the commands given.

## Bugs found and fixed

| # | Defect | How it was found | Fix |
| --- | --- | --- | --- |
| 1 | **The carriageway was invisible.** The road ribbon was wound so its face normals pointed at −Y; with front-side runtime materials the asphalt and its markings were being culled. | Face-normal probe of the first road triangle: `0.788, -18.750, -0.045` | `src/lib/road-geometry.ts` re-wound to `a,b,c / b,d,c`. Re-probe: `-0.788, 18.750, 0.045`. The label map now shows `~===~` running through the frame. |
| 2 | **The terrain was wound backwards too.** Soil and grass quads faced −Y. | Same probe technique on `src/lib/terrain.ts` | Re-wound to `a,c,b / b,c,d`. Invisible in the QA raster (it does not backface-cull), but fatal for `FrontSide` materials in the browser. |
| 3 | **Every asset had been measured wrong for the whole life of the project.** All QA reports read quantised normalised shorts raw, so every GLB reported ±32767 m dimensions — and the previous "27 assets ✅" rested on that. | Comparing a float (raw) GLB against its optimised twin | New `scripts/glb/bounds.mjs` de-quantises, honours byte stride, walks node transforms. Raw and optimised now agree to 2 decimals. `inspect-assets.mjs`, `validate-assets.mjs` and `visual-qa.mjs` all use it. |
| 4 | **The opening frame cropped the hero building.** At 111 m the 47 m tower subtended 23° against a 21° frame half-angle, so its top was cut by the first frame of the experience. | Label map of the `ground` beat | `src/lib/chapters.ts`: opening camera pulled back (z 18 → 30) and tilted up (look y 1.2 → 3.4). Sky is now visible above the tower with the site fully in frame. |
| 5 | **Floating black decal plates.** Six chapter scenes carried a 70–120 m black plane at y ≈ 0.05 as a shadow catcher. Over the new terrain they read as tar squares laid on the ground. | Reading the chapter components | Replaced with `GroundPatch` pads (soil, gravel, concrete) that dissolve into the terrain. |
| 6 | **Cartoon animation.** Buildings grew out of the ground (`Grow`), the renovation block dissolved into nothing and threw debris, stage plates pulsed, city markers pulsed rings. | Reading the chapter components | `Grow` deleted; the world simply exists and the camera travels through it. Renovation is now a scaffolded building with static rubble. Marker rings are static. |
| 7 | **Neon / template leftovers.** Emissive accent bollards, glowing road dashes, a glowing blueprint table, glowing survey rings, a glowing beam in the trust scene. | Grep for `emissiveMaterial` across chapters | All replaced with concrete, paint or metal. The trust scene was rebuilt as a finished building in daylight on a stone plinth; the India map is now a physical model on a plinth at ground level (`INDIA_MAP.y` 14 → 1.2) with restrained highlight (emissive 0.32 → 0.06). |
| 8 | **Trees, shrubs and vehicles floated.** Nothing bared the ground beneath them. | Label maps + shadow reasoning | `ContactRings`: one instanced disc per group (leaf litter / drips), 1 extra draw call per species. |
| 9 | **Mobile PBR read as plastic.** The `low` tier skipped the environment map, and shadows were off entirely — objects without contact shadows float. | `src/lib/quality.ts`, `Sky.tsx` | IBL now on every tier; shadows stay on at 512 px with a tight 42 m volume. |
| 10 | **The vignette was a game filter** (0.72 corner falloff plus 0.55/0.60 bands). | `app/globals.css` | Softened to 0.30 with 0.34/0.40 bands — photographic falloff that still protects the typography. Grain 0.05 → 0.035. |
| 11 | **The crane was a stack of boxes.** `TowerCrane` in `HeroBuilding.tsx` hand-built the mast and jib from `boxGeometry`. | Source read | Replaced with the `crane` GLB (lattice, joints, cables, counterweight, cab) with a slow, irregular slew. |
| 12 | **The hero plot sat in the wrong place for the camera.** | Label maps | Plot pushed to x −40, z −104; gate, wall, yard, pads, keep-clear and camera look-targets moved with it. `EntranceGate.tsx` now reads `GATE` from `src/lib/layout.ts` instead of a private copy. |

## Checks run

| Check | Command | Result |
| --- | --- | --- |
| Types | `npm run typecheck` | clean |
| Production build | `npm run build` | compiled, 4/4 static pages |
| Asset pipeline | `npm run assets:build` | 28 assets, all pass validate + visual QA |
| Asset measurement | `node scripts/glb/_dbg.mjs <raw> <optimised>` | raw and optimised agree |
| Scene composition | `LABELS=1 … world-shots.mjs` | 24 beats rendered, hero shots reviewed |
| Object occupancy | `HIST=1 … world-shots.mjs` | per-object pixel share per beat |
| Served site | `curl localhost:3000`, `/assets/glb/*.glb` | 200, 1.16 MB hero building |

## Known limitations

- **No headless browser.** Playwright/Chromium downloads are blocked in this
  sandbox, so runtime console errors, real frame timings and true mobile GPU
  behaviour could not be measured. Performance claims are structural
  (instancing, LOD, culling, adaptive DPR), not measured FPS.
- **No screenshot inspection.** Composition was verified through semantic label
  maps, which prove what is on screen and how large it is, but not shading
  detail or texture quality.
- **No SSAO/GTAO pass.** Contact darkening is shadow map + contact decals.
- **Service worlds are only partly mirrored in the QA scene** (which contains
  the corridor world: terrain, road, vegetation, walls, gate, yard, props,
  traffic). Their composition was reviewed in source and through the app build.
