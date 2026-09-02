# REAL_STATE 3D Architecture

## Overview

The experience is one continuous cinematic shot through a real Indian
construction world. It preserves the existing scroll-controlled camera story
and adds a photorealistic environment, real sky, GLB architecture, wind, audio
and an upgraded physical India map.

## Scene architecture

- `src/lib/chapters.ts` — the story timeline: beats own scroll span, camera
  keyframes and HTML typography.
- `src/lib/camera-path.ts` — flattens all beat keys into one centripetal
  Catmull-Rom camera spline in world space.
- `src/data/scenes.ts` — editorial scene registry mapping beats to scenes,
  environment, audio layers and depth composition.
- `src/lib/world.ts` — shared world coordinates every chapter reads.

## Asset system

- `src/data/assets.ts` — single registry: asset id, GLB path, category,
  priority, scale/rotation, scene, LOD, preload flag, material map.
- `src/lib/glb.tsx` — `AssetModel` component loads a registered GLB, clones it,
  maps its material names through `materialForKey()` to the shared PBR library,
  and falls back on load error.
- `src/lib/materials.ts` — procedural PBR materials (render, stone, concrete,
  glass, metal, wood, foliage, asphalt, terracotta etc).

## GLB pipeline

See `docs/3d/ASSET_PIPELINE.md`. The pipeline is:

`generate → optimize → inspect → validate → integrate → test`.

Scripts live in `scripts/glb/`; the QA report is `docs/3d/ASSET_QA_REPORT.md`.

## LOD

- Assets register three LOD levels and a `cullDistance`.
- Distant vegetation and small objects are removed or simplified.
- `AssetModel` keeps full geometry for close shots; far shots use instanced /
  simplified geometry via `RealWorld` and `WindSystem`.

## Environments

`src/data/environments.ts` defines `clearDay`, `morning`, `goldenHour` and
`overcast` presets. The production default is `clearDay`, which drives the real
sky (`Sky` + clouds), sun lighting, atmospheric fog, exposure, wind strength
and audio mix.

## Audio

`src/lib/audio.ts` is a WebAudio engine with four layers:

- wind (filtered noise)
- birds (scheduled chirps)
- distant traffic (filtered noise)
- construction (scheduled machinery impulses)

`src/components/ui/AudioControl.tsx` exposes an accessible floating button that
starts audio only after a user gesture, persists the mute preference and never
autoplays.

## Camera

The existing cinematic camera is preserved. It reads the scroll timeline,
samples the Catmull-Rom spline and chases it with heavy exponential damping. It
adds realistic eye height, subtle pointing parallax and no random spinning. In
the India chapter the map orbit controller takes over and hands control back
smoothly.

## Performance

- One shadow-casting sun that follows the camera.
- Distance culling per chapter.
- Instancing for grass, dust and repeated site elements.
- Three auto-detected quality tiers adjust DPR, shadows, texture resolution,
  particle count and density.
- GLBs are under ~55 kB each and load progressively by priority.

## Mobile strategy

- `getQuality()` detects pointer, cores, memory and viewport.
- Mobile uses lower DPR, no/4096 shadow maps, reduced vegetation, fewer
  particles and no cloud field.
- `prefers-reduced-motion` shortens camera damping, disables shadows and reduces
  dust/wind.

## Accessibility & fallbacks

- A complete typographic fallback (`FlatExperience`) exists for no-WebGL / SKIP
  3D.
- The map remains keyboard accessible and `aria-live`.
- `prefers-reduced-motion` is respected.
