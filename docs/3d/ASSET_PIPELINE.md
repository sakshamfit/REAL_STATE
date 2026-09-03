# Asset Pipeline

The REAL_STATE experience uses a repeatable 3D production pipeline:

```
DESIGN
   ↓
GENERATE      scripts/glb/generate-assets.mjs
   ↓
OPTIMIZE      scripts/glb/optimize-assets.mjs
   ↓
TECHNICAL QA  inspect → validate        (measured, not declared)
   ↓
VISUAL QA     scripts/glb/visual-qa.mjs (technical proxy — see caveat)
   ↓
INTEGRATE     src/data/assets.ts → chapters
   ↓
WORLD QA      scripts/qa/world-shots.mjs  LABELS=1 / HIST=1
   ↓
LIVE SCENE QA npm run build && next start, then walk the beats
   ↓
PHOTOREALISM GATE   docs/3d/PHOTOREALISM_GATE.md
   ↓
AUDIO / MOBILE / PERFORMANCE QA
```

## 1. Generate

`npm run assets:generate` runs `scripts/glb/generate-assets.mjs`.

- Authors all 15 production assets procedurally with three.js geometry:
  hero building, entrance gate, tree-a, tree-b, bush, car-a, crane,
  boundary-wall, street-light, construction-shed, residential-building,
  bridge, solar-panel, warehouse and scaffolding.
- Exports valid glTF 2.0 binary files through `@gltf-transform/core`.
- Keeps raw output in `assets/raw/` (git-ignored) for traceability.
- Authors 28 assets: hero building, entrance gate (+ sliding leaf), four tree
  species, bush, dry shrub, grass tuft, three cars, a pickup, crane,
  excavator, boundary wall, street light, construction shed, residential
  building, bridge, solar panel, warehouse, scaffolding, rebar, cement bags,
  material stack, barrier.
- Materials are left as semantic keys (`concrete`, `glass`, `metal`, …) so the
  runtime material library can remap them with realistic PBR maps.

## 2. Optimize

`npm run assets:optimize` runs `scripts/glb/optimize-assets.mjs`.

- `flatten` — removes unnecessary scene graph depth.
- `weld` — merges duplicated vertices without smoothing hard facet edges.
- `quantize` — 14-bit positions, 10-bit normals, 12-bit UVs, normalised shorts.
- `prune({ keepAttributes: true })` — removes unused buffers/materials/nodes
  while keeping UVs required by the material system.
- Writes production GLBs to `public/assets/glb/`.

**Consequence for every QA tool:** after this step POSITION is a quantised
normalised short inside an interleaved buffer view, and the real size lives in
the node transform. Reading `accessor.getArray()` raw yields either ±32767
"metres" or a mixture of positions, normals and UVs. Every measurement in the
pipeline goes through `scripts/glb/bounds.mjs`, which de-quantises, honours the
byte stride and applies the node hierarchy. Against a float (pre-optimise) GLB
it agrees to two decimal places.

## 3. Inspect

`npm run assets:inspect` runs `scripts/glb/inspect-assets.mjs`.

- Reads the binary GLB JSON chunk via `@gltf-transform`.
- Reports file size, triangles, vertices, mesh/material/texture/node counts,
  normal and UV presence, and the **world-space** bounding box.
- Writes `docs/3d/ASSET_QA_REPORT.md`.

## 4. Validate

`npm run assets:validate` runs `scripts/glb/validate-assets.mjs`.

The validation stage enforces production gates:

- Size < 4 MB
- Triangles < 250 000
- Normals present
- UVs present
- Finite vertex data (no NaN / Infinity)
- Correct real-world-metre scale, orientation and y≈0 grounding

## 5. Visual QA

`npm run assets:visual-qa` runs `scripts/glb/visual-qa.mjs`.

- Scores silhouette, structural geometry, real-world scale and material/normal
  richness per asset without using raw polygon count as a realism proxy.
- Writes `docs/3d/VISUAL_ASSET_QA.md` with per-asset overall scores.
- Gates: hero ≥ 8.5, major assets ≥ 8.0, secondary assets ≥ 7.5. An asset below
  target is marked `REJECTED — rebuild`.
- **Caveat, stated in the report itself:** this is a technical proxy, not a
  photorealism verdict. Material count and normal richness cannot tell you
  whether something looks real. The realism verdict lives in
  `PHOTOREALISM_GATE.md` and rests on rendered evidence.

## 6. Integrate

- `src/data/assets.ts` registers each asset with priority, LOD, transform,
  scene, preload policy and material map.
- `src/lib/glb.tsx` loads assets with `useGLTF`, clones them per placement,
  remaps GLB materials to the shared PBR material library and provides an
  ErrorBoundary fallback so a failed GLB never crashes the site.
- Service / process chapters place real GLBs with `lod="auto"` and keep a
  procedural fallback so a missing asset never breaks a scene.

## 7. World QA (offline renderer)

`scripts/qa/world-shots.mjs` renders the real scene — the same placement data
(`src/lib/layout.ts`), the same terrain and road builders, the same GLBs — with
a software rasteriser, at the real chapter cameras.

```
# semantic map: one character per object per cell
LABELS=1 WIDTH=320 HEIGHT=180 COLS=118 \
  node --experimental-strip-types --import ./scripts/qa/ts-hook.mjs scripts/qa/world-shots.mjs ground

# which objects occupy the frame, by pixel share
HIST=1  ... world-shots.mjs build

# any camera
CAM="0,60,20,0,0,-80" ... world-shots.mjs
```

It exists because "does this shot work" is a composition question, and a
composition question cannot be answered by a triangle count. Three real defects
were caught this way that no technical gate could see: the road ribbon was wound
backwards (carriageway invisible), the terrain was wound backwards, and the
opening frame cropped the hero building.

The renderer does **not** backface-cull, so winding bugs are invisible in its
output: check those numerically (face-normal probe) or in the browser.

## 8. Test

- `npm run assets:build` runs the whole chain.
- `npm run build` and `npm run typecheck` gate release.
- `npx next start` then walk the beats: hero, scroll, trees, road, ground,
  building, cars, construction, services, map, audio, mobile, loading.
- Findings and fixes are recorded in `LIVE_SCENE_QA.md`.

## Drop-in replacement

To replace an asset with a Blender / photogrammetry export:

1. Export as GLB with the same material names (or JSON keys in
   `src/data/assets.ts`).
2. Place it in `public/assets/glb/`.
3. Run `npm run assets:optimize && npm run assets:inspect`.
4. No application code changes are required.
