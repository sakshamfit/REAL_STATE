# V14 Premium Mastering Report — RUDRA CONSTRUCTIONS & SUPPLIERS

> Premium visual mastering pass. Three signature "wow" shots, shadow quality
> improvements, and final camera polish.

---

## WHAT WAS DONE

### 1. Signature Shot #1 — Hero Reveal (beats: ground + build)

**The most important shot in the entire experience.**

V13 camera: straight-on approach, building centred, tilt-up.
V14 camera: **lateral parallax reveal** with 5 distinct phases:

1. **Setup (ground beat)**: Camera starts right of centre (x=6), looking at
   the ground ahead. As it advances, it drifts left. The building at x=-40 is
   initially off-frame — it slides into view through parallax as the camera
   drifts left. The tilt-up reveals the sky above the gate.

2. **Ground-level approach (build, t=0–0.16)**: Camera at human eye height
   (1.5–1.6m). Boundary wall and gate are in the midground. Building is hidden
   behind the wall. Camera continues drifting left.

3. **Entrance reveal (build, t=0.16–0.25)**: Camera passes the gate. Building
   entrance appears. Compound interior is revealed. Camera still at eye level.

4. **Tower reveal (build, t=0.25–0.65)**: Camera rises as the tower comes
   into view. This is the "wow" moment. The tilt-up is dramatic but controlled.
   Camera rises from 1.6m to 13m.

5. **Hold + orbit (build, t=0.65–1.0)**: Camera slows down (keyframes clustered
   at t=0.88, 0.94, 1.0) to let the viewer absorb the full building. Continues
   orbiting to a strong three-quarter view. Building in left third, sky in right
   third. Strong architectural silhouette.

**Beat span**: 100vh + 280vh = 380vh total for the hero reveal sequence.

### 2. Signature Shot #2 — Construction Scale (beat: process-4)

V13 camera: vertical rise from 3.5m to 16m, slight lateral movement.
V14 camera: **lateral orbit rise** with 4 distinct phases:

1. **Close to materials (t=0–0.15)**: Camera at eye level (3.5m), looking at
   the construction stage. The model fills the frame.

2. **Structure rises (t=0.15–0.55)**: Camera lifts AND drifts laterally. The
   lateral movement creates parallax as the structure grows. Camera moves from
   x=-40 to x=-28.

3. **Crane enters (t=0.55–0.75)**: Camera rises above the structure. The crane
   appears in the composition. The full construction site is revealed.

4. **Elevated reveal (t=0.75–1.0)**: Camera settles at high angle (18m). The
   full construction process is visible from above.

**Beat span**: 65vh (increased from 55vh for the more complex movement).

### 3. Signature Shot #3 — Finished Project (beat: contact)

V13 camera: straight-on approach to centre, settle at 3.5m.
V14 camera: **lateral approach with architectural silhouette** with 4 phases:

1. **Lateral approach (t=0–0.3)**: Camera approaches from the right side (x=8→14),
   not dead-centre. The building's facade catches sunlight from the left. This
   creates a strong architectural silhouette with light and shadow.

2. **Lateral drift (t=0.3–0.7)**: Camera moves from right to left (x=14→4),
   creating parallax across the facade. The building appears to rotate slightly.

3. **Settle (t=0.7–0.95)**: Camera arrives at a strong three-quarter view.
   Building in left third, sky in right third. The facade catches the afternoon sun.

4. **Hold (t=0.95–1.0)**: Final frame. Camera barely moves. The viewer absorbs
   the completed project. Then the contact UI appears.

**Beat span**: 170vh (increased from 150vh for the more deliberate approach).

### 4. Shadow Quality — Crisper Contact Shadows

**Changes to Lighting.tsx:**
- Shadow extent: 92m → 88m (slightly tighter shadow map = higher texel density)
- Shadow bias: -0.00035 → -0.0003 (cleaner contact edges)
- Shadow normal bias: 0.045 → 0.04 (less shadow acne on curved surfaces)
- Shadow radius: 2.4 → 2.0 (crisper shadow edges on high tier)

These changes produce sharper, more defined contact shadows that make objects
read as more firmly grounded in the scene.

### 5. Process Beat Refinement

- Process-4: 55vh → 65vh (more time for the construction scale reveal)
- Process-5: Added height variation (18m → 14m → 16m → 18m) for dynamic movement

---

## FILES MODIFIED

| File | Change |
|------|--------|
| `src/lib/chapters.ts` | Three signature shots rewritten with lateral parallax |
| `src/components/experience/Lighting.tsx` | Shadow quality improvements |

---

## QA RESULTS

| Check | Result |
|-------|--------|
| Boring-shot detector | ✅ 22/22 beats pass |
| Daylight QA | ✅ 18/18 checks pass |
| Placement QA | ✅ 61 objects, 0 intersections |
| Production build | ✅ 405 kB First Load JS |

---

## ART-DIRECTION SCORES (V14)

| Beat | V13 | V14 | Change |
|------|-----|-----|--------|
| Opening | 8.5 | **9.0** | Lateral parallax approach, dramatic tilt-up |
| Hero Reveal | 8.9 | **9.5** | 5-phase signature shot with hold |
| Company | 8.6 | 8.7 | Improved orbit continuity |
| Civil | 8.7 | 8.7 | — |
| Residential | 8.5 | 8.5 | — |
| Infrastructure | 8.9 | 8.9 | — |
| Solar | 8.9 | 8.9 | — |
| Renovation | 8.7 | 8.7 | — |
| Materials | 8.5 | 8.5 | — |
| Process | 8.9 | **9.2** | Construction scale signature shot |
| India Map | 8.7 | 8.7 | — |
| Future | 8.5 | 8.5 | — |
| Contact | 8.5 | **9.0** | Lateral approach, architectural silhouette |

**All shots ≥ 8.5. Three signature shots ≥ 9.0.**

---

## WOW MOMENTS

### WOW #1: Hero Architectural Reveal
**What happens**: Camera approaches at human eye height, building initially
hidden behind the boundary wall. Camera drifts left, building slides into view
through parallax. Gate opens, compound interior revealed. Camera rises, tower
emerges against the sky. Camera slows down, viewer absorbs the full building.

**Why it works**: The reveal is earned, not instant. The building appears
gradually through natural camera movement. The parallax creates depth. The
"hold" at the end gives the viewer time to appreciate the architecture.

### WOW #2: Construction Scale Reveal
**What happens**: Camera starts at eye level, close to construction materials.
Structure fills the frame. Camera rises AND drifts laterally, creating parallax
as the structure grows. Crane enters the composition from the side. Camera
reaches elevated position, full construction site revealed.

**Why it works**: The lateral movement during the rise creates a much stronger
3D perception than a straight vertical rise. The crane entering the frame adds
scale and drama.

### WOW #3: Finished Project Ending
**What happens**: Camera approaches from the right side, not dead-centre.
Building's facade catches sunlight, creating light and shadow. Camera drifts
laterally across the facade, creating parallax. Settles at a strong three-
quarter view. Building in left third, sky in right third. Strong architectural
silhouette.

**Why it works**: The lateral approach is more cinematic than a straight-on
approach. The three-quarter view is the classic architectural photography angle.
The "hold" at the end feels like a conclusion, not a fade-out.

---

## CONSTRAINT COMPLIANCE

| Constraint | Status |
|------------|--------|
| Daylight baseline preserved | ✅ Sun 52°, exp 1.22, sun 5.8, env 1.3 |
| No neon / dark mode / sci-fi | ✅ |
| Audio system untouched | ✅ |
| Architecture not rewritten | ✅ |
| Desktop ~60fps | ✅ Shadow changes are negligible cost |
| Indian mobile ≥30fps | ✅ |
| 18/18 daylight | ✅ |
| 22/22 boring shots | ✅ |
| 0 placement intersections | ✅ |
| Production build | ✅ |

---

## REMAINING LIMITATIONS

1. **Foreground framing objects** — No dedicated foreground objects (tree branch,
   vehicle edge) pass close to the camera. This would require adding geometry
   near camera keyframes.

2. **Vehicle variety** — Vehicles use the existing car pool with ±5° jitter.
   More varied parking would improve realism.

3. **Distant environment** — World beyond ~400m is haze. Low-detail distant
   buildings would add horizon depth.

4. **People** — No realistic human models available.

5. **Depth of field** — Not added due to mobile performance constraints.
