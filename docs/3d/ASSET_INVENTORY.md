# 3D Asset Inventory

> Production asset registry for the REAL_STATE cinematic experience.
> Every asset lives in `src/data/assets.ts` at runtime; geometry lives in
> `public/assets/glb/`. The inventory below is the authoritative list of what
> the final world needs, its material requirements and its pipeline state.

| Asset | Category | Scene | Priority | Format | LOD | Preload | Generation | Optimization | Validation | Integration |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Hero Building | Architecture | Hero / Reveal | Critical | GLB | Yes | Yes | ✅ Done | ✅ Done | ✅ Passed | ✅ Integrated |
| Entrance Gate | Gate | Approach / Gate | High | GLB | Yes | Yes | ✅ Done | ✅ Done | ✅ Passed | ✅ Integrated |
| Tree A | Vegetation | Environment | High | GLB | Yes | Yes | ✅ Done | ✅ Done | ✅ Passed | ✅ Integrated |
| Tree B | Vegetation | Environment | High | GLB | Yes | Yes | ✅ Done | ✅ Done | ✅ Passed | ✅ Integrated |
| Construction Shed | Construction | Construction / Hero | Medium | GLB | Yes | Yes | ✅ Done | ✅ Done | ✅ Passed | ✅ Integrated |
| Boundary Wall | Environment | Approach / Construction | Medium | GLB | Yes | Yes | ✅ Done | ✅ Done | ✅ Passed | ✅ Integrated |
| Car A | Vehicle | Road / Environment | Medium | GLB | Yes | No | ✅ Done | ✅ Done | ✅ Passed | ✅ Integrated |
| Crane | Construction | Hero / Details | High | GLB | Yes | Yes | ✅ Done | ✅ Done | ✅ Passed | ✅ Integrated |
| Street Light | Infrastructure | Road / Environment | Low | GLB | Yes | No | ✅ Done | ✅ Done | ✅ Passed | ✅ Integrated |

## Material requirements

| Material | Roughness | Metalness | Notes |
| --- | --- | --- | --- |
| Render | ~0.72 | 0.02 | warm plaster / painted cement |
| Stone | ~0.82 | 0.04 | sandstone / granite |
| Concrete | ~0.88 | 0.04 | board-formed + subtle weathering |
| Glass | ~0.12 | ~0.88 | transparent, double-sided |
| Metal | ~0.34 | ~0.88 | brushed railings / frames |
| Dark Metal | ~0.42 | ~0.80 | gate leaves / equipment |
| Wood | ~0.68 | 0.02 | tree trunks |
| Foliage | ~0.82 | 0 | multiple green variations |
| Terracotta | ~0.76 | 0.02 | accents / clay details |
| Asphalt | ~0.95 | 0.01 | road surface |

## LOD requirements

All important assets have three LOD levels (`high`, `medium`, `low`) registered
in `src/data/assets.ts`. At runtime the loader chooses the GLB asset for close
views and falls back to simplified / instanced geometry for far views. Small
decorations are removed beyond their `cullDistance`.

## Streaming priority

1. Hero Building
2. Entrance Gate
3. Trees / Boundary wall / Crane / Shed
4. Vehicles / Street lights

Low-priority assets are lazy-loaded only when the camera is near them.
