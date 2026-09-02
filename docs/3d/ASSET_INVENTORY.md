# 3D Asset Inventory

> Production asset registry for the REAL_STATE cinematic experience.
> Every asset lives in `src/data/assets.ts` at runtime; geometry lives in
> `public/assets/glb/`. The inventory below is the authoritative list of what
> the final world needs, its material requirements and its pipeline state.

| Asset | Category | Scene | Priority | Format | LOD | Preload | Generation | Optimization | Validation | Visual QA | Integration |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Hero Building | Architecture | Hero / Reveal | Critical | GLB | Yes | Yes | ✅ Done | ✅ Done | ✅ Passed | ✅ 9.1 | ✅ Integrated |
| Entrance Gate | Gate | Approach / Gate | High | GLB | Yes | Yes | ✅ Done | ✅ Done | ✅ Passed | ✅ 8.9 | ✅ Integrated |
| Tree A | Vegetation | Environment | High | GLB | Yes | Yes | ✅ Done | ✅ Done | ✅ Passed | ✅ 9.2 | ✅ Integrated |
| Tree B | Vegetation | Environment | High | GLB | Yes | Yes | ✅ Done | ✅ Done | ✅ Passed | ✅ 9.2 | ✅ Integrated |
| Bush | Vegetation | Environment | Medium | GLB | Yes | Yes | ✅ Done | ✅ Done | ✅ Passed | ✅ 8.4 | ✅ Integrated |
| Construction Shed | Construction | Construction / Hero | Medium | GLB | Yes | Yes | ✅ Done | ✅ Done | ✅ Passed | ✅ 9.0 | ✅ Integrated |
| Boundary Wall | Environment | Approach / Construction | Medium | GLB | Yes | Yes | ✅ Done | ✅ Done | ✅ Passed | ✅ 8.1 | ✅ Integrated |
| Car A | Vehicle | Road / Environment | Medium | GLB | Yes | No | ✅ Done | ✅ Done | ✅ Passed | ✅ 9.0 | ✅ Integrated |
| Crane | Construction | Hero / Details | High | GLB | Yes | Yes | ✅ Done | ✅ Done | ✅ Passed | ✅ 9.1 | ✅ Integrated |
| Street Light | Infrastructure | Road / Environment | Low | GLB | Yes | No | ✅ Done | ✅ Done | ✅ Passed | ✅ 8.9 | ✅ Integrated |
| Residential Building | Architecture | Residential / Services | High | GLB | Yes | Yes | ✅ Done | ✅ Done | ✅ Passed | ✅ 9.1 | ✅ Integrated |
| Bridge | Infrastructure | Infrastructure / Services | High | GLB | Yes | Yes | ✅ Done | ✅ Done | ✅ Passed | ✅ 8.7 | ✅ Integrated |
| Solar Panel | Infrastructure | Solar / Services | High | GLB | Yes | Yes | ✅ Done | ✅ Done | ✅ Passed | ✅ 8.3 | ✅ Integrated |
| Warehouse | Architecture | Materials / Services | High | GLB | Yes | Yes | ✅ Done | ✅ Done | ✅ Passed | ✅ 9.1 | ✅ Integrated |
| Scaffolding | Construction | Construction / Process | High | GLB | Yes | Yes | ✅ Done | ✅ Done | ✅ Passed | ✅ 8.6 | ✅ Integrated |

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

1. Hero Building, Entrance Gate
2. Trees, Bush, Boundary Wall, Crane, Construction Shed
3. Residential Building, Bridge, Solar Panel, Warehouse, Scaffolding
4. Vehicles / Street lights

The preloadable world assets stream through `src/lib/asset-loader.ts` with a
truthful fetched-byte count; low-priority decoration is still lazy-loaded when
the camera is near it.
