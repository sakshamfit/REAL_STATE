# Performance

## Budgets

| Metric | Target |
| --- | --- |
| Desktop FPS | 60 fps |
| Mobile FPS | 30+ fps |
| First load JS | < 400 kB (current: ~387 kB) |
| Per-asset GLB | < 55 kB |
| Triangles / asset | < 250k |
| Draw calls | bounded, instanced where possible |
| Visible shadow casters | only near the camera |

## LOD

- Every asset registers `high`, `medium`, `low` levels in `src/data/assets.ts`.
- `AssetModel` loads full detail for close shots; far shots use instanced
  procedural replacements or the GLB with reduced culling detail.
- Small decorations are removed beyond `cullDistance`.

## Texture compression

The GLB assets intentionally have no baked textures. Materials are generated
procedurally at runtime at a resolution driven by `QualitySettings.textureSize`
(256 on mobile, 512 on desktop). This avoids texture memory spikes and makes
textures trivially compressible (they never enter the network payload).

## Streaming

Assets preload by priority during the loading screen:

1. Hero building / gate / trees / crane / shed / walls
2. Vehicles / street lights

At runtime, the route is one continuous camera path, so proximity is the only
streaming signal. We keep the first hero cluster high-priority and lazy-load
peripheral objects on demand.

## Adaptive quality

`src/lib/quality.ts` detects device tier (high/mid/low). Lower tiers reduce:

- DPR (down to 0.8)
- shadow map size
- texture size
- dust/particle count
- vegetation density
- cloud field
- environment reflections

`prefers-reduced-motion` additionally disables shadows, cuts particles and
shortens camera damping.

## Measurement

- `scripts/check-world.ts` reports camera continuity / collision drift.
- `scripts/glb/inspect-assets.mjs` reports total size, triangle and attribute
  health for every asset.
- Manual QA should sample every scroll stop (`docs/3d/ARCHITECTURE.md`) and
  profile with DevTools Performance / WebGL inspector.

## Memory management

- GLBs are cached by `useGLTF`.
- Asset clones share cached geometry; materials are memoised in
  `src/lib/materials.ts`.
- Scene resources are disposed when chapters unmount / on teardown.
- The map geometry and outlines are explicitly disposed on feature/data change.
