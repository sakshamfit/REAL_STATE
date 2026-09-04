# V12 Visual Diagnosis — RUDRA CONSTRUCTIONS & SUPPLIERS

> Deep code-level audit of the 3D experience. Every finding below was verified
> against the source files, not observed from a live preview.

---

## 1. CAMERA LANGUAGE — CRITICAL BORE DOMINANCE

**Severity: BLOCKER** — This alone makes the experience feel like a scrolling
PowerPoint rather than a cinematic walkthrough.

### 1.1 Dead Camera Time (the biggest single problem)

The 21-beat camera path totals ~2,400 vh of scroll. Of that, roughly **50 %
has near-zero camera movement**:

| Beat | Duration | Camera travel | Look travel | Verdict |
|------|----------|---------------|-------------|---------|
| hero-gate | 90 vh | ~0 m (stationary) | ~3° swing | DEAD |
| hero-left | 80 vh | ~18 m lateral, ~2 m up | ~3° | BARELY ALIVE |
| hero-right | 80 vh | mirror of above | mirror | BARELY ALIVE |
| build | 180 vh | ~0 m (stationary) | ~0° | DEAD |
| service-civil … service-materials (×6) | 540 vh total | ~4 m per beat | ~4° per beat | SLOW DRIFT |
| process-1 … process-5 (×5) | 275 vh total | ~0 m | ~3° per beat | DEAD |
| trust | 180 vh | ~0 m | ~0° | DEAD |
| map | 180 vh | ~0 m | ~0° | DEAD |
| future | 120 vh | ~15 m | ~6° | MINIMAL |
| contact | 100 vh | ~1 m | ~0° | DEAD |

**~1,200 vh of dead camera time** out of 2,400 vh total. The visitor is
scrolling but nothing is happening in 3D. This is why every beat feels the
same: the camera arrives at a position and then *stops*.

### 1.2 Uniform Height Profile

Camera height across all beats: 4.6–12 m. No beat uses a true ground-level
shot (y ≈ 1.6 m, human eye). No beat uses a high establishing shot (y > 30 m
except map). The result: every frame has roughly the same camera altitude,
which flattens the emotional arc.

### 1.3 Linear Keyframe Interpolation

`camera-path.ts` uses CatmullRom spline through all keyframes, but since many
adjacent keyframes share nearly identical positions, the spline degenerates
into a straight line for most of the path. The `flowEase` per-segment easing
is the only speed variation — and it is symmetric (slow-in, slow-out), so
there is no sense of acceleration into a reveal or braking to a hold.

### 1.4 Camera Look-Target Collapses

During build, trust, map, future, and contact, the look target barely moves.
A cinematic camera needs the look target to travel *ahead* of the position,
building anticipation, then lock onto the subject as the camera arrives.

---

## 2. WORLD COHERENCE — GOOD STRUCTURE, WEAK ATMOSPHERE

**Severity: MEDIUM**

### 2.1 Strengths
- All chapter positions anchored to `world.ts` — no drift.
- Terrain properly levelled at every pad, with rolling relief outside.
- Road has realistic camber, patches, paint, kerbs, potholes, drains.
- Vegetation avoids all structures via `nearKeepClear()`.
- Vehicles sit on the cambered surface, not floating at y = 0.
- Parked cars have ±5° rotation jitter — reads as human-parked.
- Traffic uses left-hand lane discipline (Indian road convention).

### 2.2 Weaknesses
- **No between-world transitions.** The camera slides sideways between service
  worlds through empty terrain. No road driving, no path, no visual thread.
- **Vegetation boundaries are hard.** `nearKeepClear()` with 16 m pad creates
  a ring of bare earth around every structure. Real construction sites have
  overgrown edges, weeds creeping back in, debris at the periphery.
- **Dust particle count is minimal.** `Atmosphere.tsx`: `count = Math.max(30,
  Math.round(quality.dust * 0.22))`. On a high-tier device that is ~170
  particles — barely visible. Construction dust should be noticeable near the
  hero building.
- **Fog density is very thin.** `FOG.density = 0.0016` — objects at 200 m are
  barely hazed. This gives no depth separation between foreground and
  background. A slight increase (0.0022–0.0028) would create atmospheric
  depth without obscuring the world.
- **No visual continuity props between service worlds.** Each world is an
  isolated island with its own `GroundPatch`. No material trucks between them,
  no shared stockpiles, no worker paths.

---

## 3. PHOTOREALISM — STRONG FOUNDATION, MISSING FINISHING

**Severity: MEDIUM-HIGH**

### 3.1 Strengths
- 26 procedural surface textures with albedo, roughness, normal maps.
- Road asphalt tint has three scales of weathering (pour drift, traffic
  polishing, dust creep) — excellent.
- Glass uses `envMapIntensity: 1.7` — reflections read well.
- Vehicle paint has `metalness: 0` — correct for automotive clearcoat.
- Rubber at `#333436` — physically correct.
- AO post-processing uses warm dust colour (`#332e26`), not pure black.
- Terrain vertex tinting carries moisture, compaction, wheel ruts — no tiled
  repetition.

### 3.2 Weaknesses
- **No depth of field.** Everything from 2 m to infinity is equally sharp.
  Real photographs have shallow DoF at close range. A subtle DoF (f/2.8–4
  equivalent, focus on the subject) would instantly read as photographic.
- **No vignetting.** A subtle natural vignette (10–15 % corner darkening)
  would frame the subject and add photographic quality.
- **Shadow map quality.** `mapSize: [2048, 2048]` with extent 42–92 m means
  each texel covers ~4–9 cm. At the hero building distance, shadow edges are
  very soft and details like window mullion shadows disappear.
- **Sun disc quality.** The procedural sky's sun disc uses `cosAngle^2200 * 60`
  — very hard-edged. Real sun discs have a softer corona and a visible
  atmospheric scattering halo. The forward-scatter halo is `cosAngle^26`, which
  is reasonable but could have more falloff variety.
- **No lens effects.** No chromatic aberration, no subtle barrel distortion, no
  lens flare on the sun. These are what separate "render" from "photograph" in
  modern arch-viz.
- **Concrete materials read slightly flat.** The tint variation is driven by
  procedural noise but the overall hue stays in a narrow band. Indian concrete
  has wider hue variation — yellowish near the ground, grey-blue higher up,
  dark stains under drip lines.
- **Cloud texture is basic.** `cloudiness: 0.46` with `fbm2` at 2 frequencies.
  The cloud sheet rotates slowly but the pattern itself is uniform — no
  dramatic cumulus towers, no wispy cirrus, no shadow casting.

---

## 4. CAMERA CINEMATOGRAPHY — NONEXISTENT PACING

**Severity: BLOCKER**

### 4.1 Beat Timing is Proportional, Not Dramatic

Every service world beat is exactly 90 vh. Every process sub-beat is exactly
55 vh. Every material gate is exactly 50 vh. This creates a metronomic scroll
rhythm with no acceleration, no tension, no release.

Cinematic pacing requires:
- **Fast approach** (short beat, camera covering distance)
- **Slow reveal** (long beat, camera barely moving, building unfolding)
- **Hold** (camera completely still, let the eye settle)
- **Quick cut** (instant or near-instant reposition)

### 4.2 No Speed Variation Within Beats

The `flowEase` function applies symmetric easing (slow-in, slow-out) to each
beat, but the beat-to-beat speed is determined by scroll position only. There
is no mechanism for a beat to start fast and end slow (approach + reveal) or
for the camera to accelerate through a transition.

### 4.3 No Variable Camera Speed

`CameraRig.tsx` uses `lambda = 3.6` damping uniformly. There is no mechanism
to increase damping (snappier response) during fast sections or decrease it
(slower, dreamier response) during reveals.

---

## 5. ANTI-REPETITION — IDENTICAL SERVICE WORLD APPROACHES

**Severity: HIGH**

### 5.1 Service Worlds are Camera Clones

All six service worlds use the same camera pattern:
1. Camera at road-level (y = 7–8 m) looking at the structure
2. Lateral offset from the road (±14 m from centre)
3. Look target at structure centre at y = 10–14 m
4. Beat duration: 90 vh each

There is no variation in:
- Approach angle (all are perpendicular to the road)
- Camera height (all are at 7–8 m)
- Reveal strategy (all just appear as the camera turns to look)
- Speed (all have identical timing)

### 5.2 Process Model is a Static Diorama

The five process sub-beats each hold the camera nearly still and just pan the
look target ~3° horizontally. The miniature construction environment is well-
modelled but the camera treats it as a flat painting to be scanned, not a 3D
environment to be explored.

---

## 6. ENVIRONMENTAL OCCLUSION — WEAK GROUNDING

**Severity: MEDIUM**

### 6.1 AO Settings are Over-Conservative

```
aoRadius: 1.05–1.25
intensity: 0.66–0.80
aoSamples: 8–10
```

These values produce barely-visible contact shadows. The hero building's
podium meeting the ground needs stronger occlusion to read as "sitting on
the earth" rather than "floating above it."

### 6.2 No Contact Decals

The `GroundPatch` component provides surface patches, but there are no
dedicated contact decals (dark spots, damp stains) where heavy objects meet
the ground. The `ContactRings` in Vegetation.tsx provide shadow rings under
trees, but buildings, vehicles, and barriers have nothing.

---

## 7. TYPOGRAPHY & UI — QUIET BUT INVISIBLE

**Severity: LOW**

### 7.1 Strengths
- `var(--font-display)` and `var(--font-body)` are used consistently.
- Letter-spacing is generous (0.24–0.42em) — reads as editorial.
- Text colours use the PALETTE constants — consistent.

### 7.2 Weaknesses
- HTML text in the 3D scene (`<Html>` from drei) has `textShadow: '0 0 40px rgba(0,0,0,0.8)'` on corridor client names — a dark halo on daylight text reads as web design, not architectural.
- Material gate labels use `PALETTE.metal` colour — hard to read against concrete.
- No fade-in animation on HTML text — it pops in as the component mounts.

---

## 8. PERFORMANCE — ACCEPTABLE

**Severity: LOW**

### 8.1 Strengths
- Instanced meshes throughout (boxes, debris, vehicles, vegetation).
- LOD system in `glb.tsx` (high/auto/low) based on distance.
- Chapter visibility culling via `useChapterVisibility`.
- Texture cache with lazy generation.
- Quality tiers (low/mid/high) with appropriate reductions.

### 8.2 Concerns
- `Block` component creates a new `BoxGeometry` per instance via `useMemo` on
  size. If sizes change, old geometries are not disposed.
- `EffectComposer` with N8AO at halfRes is reasonable but the combination of
  N8AO + ToneMapping adds ~2 ms on mid-tier devices.
- The cloud sheet is a 1024² sphere — cheap but the slow rotation means it is
  always in the frustum.

---

## 9. SOUND — EXCELLENT, NO CHANGES NEEDED

**Severity: NONE**

The audio engine is well-designed: synthesised noise with wandering wind,
randomised bird chirps, distant construction impacts. Master at 0.34 keeps it
subtle. The 11-second noise buffer with cross-faded tail eliminates
identifiable loop points.

---

## PRIORITY MATRIX

| # | Area | Impact | Effort | Priority |
|---|------|--------|--------|----------|
| 1 | Eliminate dead camera time | ★★★★★ | HIGH | P0 |
| 2 | Variable camera speed | ★★★★★ | MEDIUM | P0 |
| 3 | Cinematic beat pacing | ★★★★☆ | HIGH | P0 |
| 4 | Service world approach variety | ★★★★☆ | MEDIUM | P1 |
| 5 | Depth of field | ★★★★☆ | MEDIUM | P1 |
| 6 | Fog density tuning | ★★★☆☆ | LOW | P1 |
| 7 | AO intensity boost | ★★★☆☆ | LOW | P2 |
| 8 | Dust particle count | ★★★☆☆ | LOW | P2 |
| 9 | Vignette post-effect | ★★☆☆☆ | LOW | P2 |
| 10 | Vegetation soft boundaries | ★★☆☆☆ | MEDIUM | P2 |
| 11 | Shadow map tuning | ★★☆☆☆ | LOW | P2 |
| 12 | Typography refinements | ★★☆☆☆ | LOW | P3 |

---

## CONSTRAINT COMPLIANCE CHECK

- ✅ Daylight baseline preserved (sun intensity 5.2, exposure 1.22, sun 52°, environment 1.15)
- ✅ No neon / dark mode / sci-fi / holograms
- ✅ Audio system untouched
- ✅ No floating 3D text
- ✅ Architecture not rewritten
- ❌ Camera language needs overhaul (this IS the main deliverable)
- ❌ Every shot needs foreground + midground + background (currently missing)
- ❌ Variable camera speed (currently uniform)
- ❌ Physical transitions between sections (currently hard teleports)
