# CRITICAL FEATURE — 3D INDIA PRESENCE MAP

## NON-NEGOTIABLE

The website MUST contain an interactive **3D map of India**.

This is a primary feature of the website and must NOT be replaced with:

* A flat SVG
* A normal Google map
* A static India image
* A 2D infographic
* A simple hover tooltip
* A card-based state selector

The map must be a real 3D interactive experience.

---

# 01 — INDIA MAP EXPERIENCE

Section heading:

```text
OUR PRESENCE
ACROSS INDIA
```

Subheading:

```text
Building stronger communities
across regions.
```

The India map sits in the center of a large cinematic viewport.

Background:

```text
#080909
```

Map:

```text
Dark concrete / brushed metal
```

State borders:

```text
Thin subtle lines
```

Lighting:

```text
Soft cinematic directional light
+
subtle rim light
```

---

# 02 — MAP INITIAL STATE

The camera is positioned above the map.

India is displayed as a single 3D geographical object.

Each state must exist as an **independent mesh**.

Architecture:

```text
IndiaMap
│
├── BiharMesh
├── UttarPradeshMesh
├── JharkhandMesh
├── OdishaMesh
├── AssamMesh
├── MeghalayaMesh
├── TripuraMesh
├── ArunachalPradeshMesh
├── HaryanaMesh
├── PunjabMesh
├── JammuKashmirMesh
└── OtherStatesMeshes
```

Do NOT merge all states into one mesh.

Each state must be independently selectable.

---

# 03 — REAL GEOGRAPHICAL DATA

Use actual state boundary geometry.

Preferred source:

```text
GeoJSON / TopoJSON
```

The geometry must be converted into Three.js geometry.

Recommended pipeline:

```text
GeoJSON
      ↓
Parse coordinates
      ↓
Project coordinates
      ↓
Create Shape
      ↓
ExtrudeGeometry
      ↓
Three.js Mesh
```

TopoJSON is preferred for the production web version when it materially reduces payload size. Existing India map datasets provide both GeoJSON and TopoJSON state boundaries.

---

# 04 — 3D EXTRUSION

Every state should have physical depth.

Default:

```text
depth: 0.15–0.30
```

Active state:

```text
depth: 0.8–1.5
```

The exact values should be responsive to the overall map scale.

When selected:

```text
STATE
    ↓
moves upward
    ↓
extrusion increases
    ↓
camera approaches
```

The state must visibly separate from neighboring states.

---

# 05 — HOVER

Desktop:

When cursor enters a state:

```text
State slightly raises
+
Border becomes brighter
+
Small elevation animation
+
Cursor changes
```

Example:

```text
BIHAR
```

appears near the cursor or in the information layer.

Hover animation:

```text
duration: 0.35s
ease: power3.out
```

Do NOT make the hover effect flashy.

---

# 06 — CLICK

Clicking a state triggers the primary interaction.

Example:

```text
USER CLICKS BIHAR
```

### Step 1

All other states become slightly darker.

### Step 2

Bihar rises vertically.

### Step 3

Camera smoothly zooms toward Bihar.

### Step 4

Bihar rotates slightly toward the camera.

### Step 5

Project markers appear.

### Step 6

Information panel enters.

---

# 07 — STATE POP-UP

The state information must NOT be an ordinary modal.

It should feel like a **3D architectural information panel**.

Example:

```text
                         BIHAR
                 ─────────────────

                    OUR PRESENCE

                  ● PATNA
                  ● BETTIAH


                 REGIONAL PRESENCE

                  VIEW DETAILS →
```

Panel characteristics:

```text
transparent dark surface
subtle blur
thin border
minimal typography
```

The panel should feel integrated into the 3D scene.

---

# 08 — BIHAR

Initial verified locations from the supplied material:

```text
PATNA
BETTIAH
```

The supplied document gives addresses for Patna and Bettiah.

Do NOT invent project names.

If project information is not available:

```text
REGIONAL PRESENCE
```

rather than creating fake projects.

---

# 09 — ASSAM

Clicking Assam:

```text
ASSAM

OUR PRESENCE

● BISWANATH
● JORHAT
```

The supplied document lists Biswanath and Jorhat locations.

Again:

Do NOT invent project names.

---

# 10 — OTHER STATES

The initial presence layer should support:

```text
BIHAR
UTTAR PRADESH
JHARKHAND
ODISHA
ASSAM
MEGHALAYA
TRIPURA
ARUNACHAL PRADESH
HARYANA
PUNJAB
JAMMU & KASHMIR
```

These states come from the supplied Rudra “Where We Are” information.

States without detailed project/location data should still be selectable but display only verified information.

---

# 11 — PROJECT MARKERS

Once a state is selected:

```text
STATE
 ↓
CITY MARKERS
 ↓
PROJECT INFORMATION
```

Markers should look like tiny architectural beacons.

Example:

```text
       ●
       │
       │
     PATNA
```

Animation:

```text
marker rises from map
+
small light pulse
+
thin vertical line
```

Avoid Google Maps-style pins.

---

# 12 — PROJECT DATA ARCHITECTURE

The map must be data-driven.

Use:

```ts
type PresenceLocation = {
  state: string
  city: string
  projectName?: string
  projectType?: string
  year?: number
  description?: string
  coordinates: {
    lat: number
    lng: number
  }
}
```

Example:

```ts
const presenceLocations = [
  {
    state: "Bihar",
    city: "Patna",
    coordinates: {
      lat: 25.5941,
      lng: 85.1376
    }
  },
  {
    state: "Bihar",
    city: "Bettiah",
    coordinates: {
      lat: 26.8025,
      lng: 84.5116
    }
  }
]
```

Future projects should be added through data rather than rewriting the 3D map.

---

# 13 — STATE SELECTION CAMERA

Camera animation is critical.

Never instantly teleport.

Use:

```text
current camera
       ↓
smooth interpolation
       ↓
target state
```

Animation:

```text
1.2–2.0 seconds
```

Camera should:

```text
zoom
+
slightly orbit
+
lower elevation
```

The selected state becomes the hero object.

---

# 14 — STATE DESELECTION

Clicking outside the selected state:

```text
State returns to normal height
+
markers disappear
+
panel closes
+
camera returns to India view
```

Transition:

```text
1.0–1.5 seconds
```

---

# 15 — STATE-TO-STATE TRANSITION

If user selects:

```text
BIHAR
```

then:

```text
ASSAM
```

Do not reset the whole scene.

Instead:

```text
Bihar lowers
       ↓
Camera travels
       ↓
Assam rises
       ↓
Assam becomes active
```

This makes the map feel like an actual 3D environment.

---

# 16 — VISUAL HIERARCHY

At all times:

```text
ACTIVE STATE
      ↑
PROJECT MARKERS
      ↑
STATE INFORMATION
      ↑
INDIA MAP
      ↑
BACKGROUND
```

The selected state should always be the visual focus.

---

# 17 — CAMERA STATES

Create predefined camera states.

```ts
const cameraStates = {
  overview: {...},
  bihar: {...},
  uttarPradesh: {...},
  jharkhand: {...},
  odisha: {...},
  assam: {...},
  meghalaya: {...},
  tripura: {...},
  arunachalPradesh: {...},
  haryana: {...},
  punjab: {...},
  jammuKashmir: {...}
}
```

Camera transitions should interpolate between states.

---

# 18 — 3D LIGHTING

Use realistic architectural lighting.

```text
Ambient Light
Directional Light
Rim Light
Very subtle environment lighting
```

Active state receives a stronger rim light.

No neon rainbow lighting.

No excessive bloom.

---

# 19 — MAP MATERIAL

Base:

```text
Dark concrete
```

Active state:

```text
Slightly brighter metallic/concrete material
```

Selected state should feel like a physical architectural model.

---

# 20 — SCROLL + MAP

The map should also work as part of the main cinematic scroll experience.

When entering the section:

```text
camera comes from previous scene
       ↓
India appears
       ↓
map settles
       ↓
title appears
```

Once the map settles:

```text
mouse interaction enabled
```

The user can freely explore states.

---

# 21 — DESKTOP INTERACTION

Support:

```text
Hover
Click
Drag/orbit
Scroll
Reset
```

But do not allow unrestricted camera movement to destroy the composition.

Use controlled OrbitControls:

```text
enableZoom: false/limited
enablePan: false
limited polar angle
limited azimuth
```

The website controls the camera.

The user interacts with the map, not with a generic 3D viewer.

---

# 22 — MOBILE INTERACTION

On mobile:

```text
Tap state
```

instead of hover.

Selected state:

```text
Rises
+
Camera zooms
+
Information appears
```

Use touch gestures carefully.

Do not require complex multi-touch interaction.

---

# 23 — MAP RESET

Small control:

```text
← INDIA OVERVIEW
```

Clicking it returns to:

```text
full India
```

Camera:

```text
smoothly zooms out
```

---

# 24 — ACCESSIBILITY

Every state must have an accessible HTML representation.

Example:

```text
Bihar
Uttar Pradesh
Jharkhand
Assam
...
```

Keyboard users must be able to navigate states.

The 3D canvas cannot be the only way to access the information.

---

# 25 — PERFORMANCE

The map must be optimized.

Preferred:

```text
TopoJSON
+
simplified geometry
+
single shared materials
+
instanced markers
+
lazy-loaded map
```

Do not ship a huge high-resolution GeoJSON if a web-optimized representation is sufficient.

There are existing India map datasets offering a small TopoJSON representation specifically intended for web applications.

---

# 26 — IMPORTANT DATA RULE

Never fabricate Rudra's presence.

Use only:

```text
Verified state
Verified city
Verified project
Verified project type
Verified coordinates
```

If information is missing:

```text
PRESENCE INFORMATION
COMING SOON
```

The supplied document provides regional states and several office/presence locations but does not provide a complete project database.

---

# 27 — VISUAL RESULT

The final interaction should look conceptually like:

```text
                    RUDRA

              OUR PRESENCE
                ACROSS INDIA


                    INDIA
             ╱──────────────╲
           ╱                  ╲
          │                    │
          │      ●             │
          │    ┌─────┐         │
          │    │BIHAR│ ↑       │
          │    └─────┘         │
          │                    │
           ╲                  ╱
             ╲──────────────╱


                 BIHAR

            OUR PRESENCE

             ● PATNA
             ● BETTIAH

          VIEW DETAILS →
```

But the actual implementation must be **fully 3D**.

---

# 28 — NON-NEGOTIABLE ACCEPTANCE TEST

The feature is considered incomplete if:

* India is only a flat SVG
* States cannot be individually selected
* Clicking a state does not change its elevation
* Camera does not move toward the state
* The state does not visually separate from neighboring states
* Location markers are missing
* State information is only a generic HTML modal
* The map is not interactive
* Mobile cannot select states
* The map is replaced by an image

### Definition of Done

A visitor must be able to:

```text
ENTER MAP
    ↓
SEE 3D INDIA
    ↓
SELECT STATE
    ↓
STATE RISES
    ↓
CAMERA ZOOMS
    ↓
CITY MARKERS APPEAR
    ↓
STATE INFORMATION APPEARS
    ↓
EXPLORE
    ↓
RETURN TO INDIA
```

**This feature is a core identity of the Rudra website.**
