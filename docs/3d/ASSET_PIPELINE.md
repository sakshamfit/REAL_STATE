# Asset Pipeline

The REAL_STATE experience uses a repeatable 3D production pipeline:

```
GENERATE
   ↓
OPTIMIZE
   ↓
INSPECT
   ↓
VALIDATE
   ↓
VISUAL QA
   ↓
INTEGRATE
   ↓
TEST
```

## 1. Generate

`npm run assets:generate` runs `scripts/glb/generate-assets.mjs`.

- Authors all 15 production assets procedurally with three.js geometry:
  hero building, entrance gate, tree-a, tree-b, bush, car-a, crane,
  boundary-wall, street-light, construction-shed, residential-building,
  bridge, solar-panel, warehouse and scaffolding.
- Exports valid glTF 2.0 binary files through `@gltf-transform/core`.
- Keeps raw output in `public/assets/glb/raw/` for traceability.
- Materials are left as semantic keys (`concrete`, `glass`, `metal`, …) so the
  runtime material library can remap them with realistic PBR maps.

## 2. Optimize

`npm run assets:optimize` runs `scripts/glb/optimize-assets.mjs`.

- `flatten` — removes unnecessary scene graph depth.
- `weld` — merges duplicated vertices without smoothing hard facet edges.
- `prune({ keepAttributes: true })` — removes unused buffers/materials/nodes
  while keeping UVs required by the material system.
- Writes production GLBs to `public/assets/glb/`.

## 3. Inspect

`npm run assets:inspect` runs `scripts/glb/inspect-assets.mjs`.

- Reads the binary GLB JSON chunk via `@gltf-transform`.
- Reports file size, triangles, vertices, mesh/material/texture/node counts,
  normal and UV presence, and world bounding box.
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
- The report is an engineering-informed baseline; the final production label is
  still confirmed during the on-screen render pass.

## 6. Integrate

- `src/data/assets.ts` registers each asset with priority, LOD, transform,
  scene, preload policy and material map.
- `src/lib/glb.tsx` loads assets with `useGLTF`, clones them per placement,
  remaps GLB materials to the shared PBR material library and provides an
  ErrorBoundary fallback so a failed GLB never crashes the site.
- Service / process chapters place real GLBs with `lod="auto"` and keep a
  procedural fallback so a missing asset never breaks a scene.

## 7. Test

- `npm run assets:build` runs the whole 5-stage chain.
- `npm run build` and `npm run typecheck` gate release.
- The 3D QA loop checks every scroll position for popped / floating /
  missing-object artifacts.

## Drop-in replacement

To replace an asset with a Blender / photogrammetry export:

1. Export as GLB with the same material names (or JSON keys in
   `src/data/assets.ts`).
2. Place it in `public/assets/glb/`.
3. Run `npm run assets:optimize && npm run assets:inspect`.
4. No application code changes are required.
