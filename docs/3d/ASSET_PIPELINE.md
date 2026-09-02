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
INTEGRATE
   ↓
TEST
```

## 1. Generate

`npm run assets:generate` runs `scripts/glb/generate-assets.mjs`.

- Authors every primary asset procedurally with three.js geometry (building,
  gate, trees, vehicle, crane, wall, light, shed).
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

The QA report enforces production gates:

- Size < 4 MB
- Triangles < 250 000
- Normals present
- UVs present
- Correct scale / orientation / origin

## 5. Integrate

- `src/data/assets.ts` registers each asset with priority, LOD, transform,
  scene, preload policy and material map.
- `src/lib/glb.tsx` loads assets with `useGLTF`, clones them per placement,
  remaps GLB materials to the shared PBR material library and provides an
  ErrorBoundary fallback so a failed GLB never crashes the site.

## 6. Test

- `npm run assets:build` runs the whole chain.
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
