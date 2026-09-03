# MODEL SLOTS — drop your real GLB models here

> RUDRA — every 3D model in the experience has a **named slot**. Give us your
> real GLB (buildings, cars, JCB, excavators, solar panels, site material…) and
> it automatically replaces the placeholder model in that slot — re-scaled to
> real-world metres, seated on the ground, corrected and verified.

## The one rule

**Drop the file into `public/assets/external/` and run:**

```bash
npm run assets:build
```

The pipeline reads the **filename** to learn what the object is, checks it,
repairs it (units → metres, rotation → correct axis, floor → y=0, triangles →
budget, textures → kept, licence → verified), and registers it. Nothing else to
do. No Blender, no JSON sidecar, no coordinate maths.

> ⚠️ Every dropped file needs one licence line first — see
> [Licences](#licences) below. Files without a licence are repaired but held
> out of the scene until one is recorded.

---

## Slot chart

Legend for "used by": where in the scroll journey the model appears.

| # | Slot | File name should contain… | Used by | Notes for a good drop |
| --- | --- | --- | --- | --- |
| 1 | **Hero building** (flagship tower + podium) | `hero`, `office`, `tower`, `corporate`, `skyscraper`, `high-rise` | Opening hero chapter (close fly-around, scaffolding + crane beside it) | Auto-fit to the 29 × 33 m podium footprint. Max ~320k tris. Taller than wide reads best. |
| 2 | **Residential / commercial building** | `residential`, `apartment`, `house`, `villa`, `bungalow`, `commercial`, `building` | Residential & Commercial service world, Renovation world, Trust chapter (close-up at dusk-light) | Auto-fit to the 22 × 15 m footprint. Low-rise slab/block forms read best. |
| 3 | **Warehouse / store** | `warehouse`, `godown`, `storehouse`, `factory`, `mill`, `industrial` | Building-materials service world (stockyard + shed deck) | Kept at real size. Large clear-span hall with a high roof works best. |
| 4 | **Solar panel / array** | `solar`, `solar-panel`, `solar-array`, `photovoltaic` | Solar service world (3 foreground mounts), matches the solar field | Kept at real size. A clean single tracker/panel ~2–4 m reads best up close. |
| 5 | **Passenger cars** | `car`, `sedan`, `hatchback`, `suv`, `crossover`, `jeep` | Parked bays along the corridor + moving traffic, solar field visitor car, yard | Real-metre cars (3.4–5.4 m). Drop 2–4 variants; each gets its own random body colour. First file = foreground slots. |
| 6 | **Trucks** | `truck`, `tipper`, `lorry`, `van`, `bus`, `pickup`, `delivery` | Yard deliveries, freight stops along the corridor | 4.2–12.5 m. A tipper/lorry fits the construction story best. |
| 7 | **JCB / excavator / plant** | `jcb`, `backhoe`, `excavator`, `poclain`, `loader`, `bulldozer`, `crane`, `dumper`, `roller` | Working yard inside the hero compound | Real size kept. `jcb.glb` or `excavator.glb` both work — one machine wins the yard slot per file dropped. |
| 8 | **Street lights** | `street-light`, `street-lamp`, `lamp-post`, `lantern` | Every ~46 m along the corridor road | Real columns 8–11 m tall. Joins the pool — older/varied columns appear every 5th pole, they don't replace the whole run. |
| 9 | **Site props** | `cone`, `barrier`, `barricade`, `drum`, `jersey`, `pallet`, `pipe`, `cabin`, `container`, `site-office`, `shed`, `wheelbarrow`, `signboard`, `cement`, `brick`, `sandbag`, `rebar` | Gate line, yard edge, corridor stock staging | Small objects (< 2 m) only — they are scattered in groups of 8 around the gate. One good cone = the whole site wakes up. |
| 10 | **Trees** | `tree`, `palm`, `neem`, `banyan`, `shrub`, `bush` | Whole corridor / site greenery | Adds variety beside the existing trees (never replaces them). Real trunks + leaves must have an alpha/`cutout` texture. |

### Scene-owned building slots (1–4)

These four are **composition slots** — a dropped file replaces the built-in
model *only in that role*, not everywhere on the site:

- Hero building → auto-scaled onto the 29.2 × 33.1 m podium footprint.
- Residential/commercial → auto-scaled onto the 22.4 × 15.0 m footprint.
- Warehouse and solar panels → kept at real measured size.

If you drop several files for the same slot, the **first one in filename
order** wins — rename to `hero-building-v1.glb`, `hero-building-v2.glb` to
choose.

### Where the road vehicles already use external files

Cars/trucks/plant/lights/props were *already* wired to prefer real files over
the procedural ones — dropping one file changes the whole road immediately.

---

## What the pipeline checks (and fixes for you)

| Check | What happens |
| --- | --- |
| Units | Any unit scale (cm, inch, "1 unit = 1 m" or not) is measured against real-world metre envelopes and normalised |
| Orientation | Long objects (cars, trucks) are rotated so length runs along X; `crane`, `jcb` etc. get no forced rotation |
| Grounding | Object is re-seated so its floor/wheels sit on y = 0 |
| File size / triangles | Over-budget meshes are simplified; textures down-scaled to ≤ 2048 px |
| Materials | Real PBR textures are **kept**; only measurable defects (mirror-flat paint, fully-rough metal) are corrected at runtime |
| Studio junk | Cameras, lights, backdrops, duplicate specimens and unused animations are removed automatically |
| Licence | Must permit commercial use — see below |

## Licences

Add one line per file to `public/assets/external/CREDITS.json` before building:

```json
{
  "jcb.glb": { "license": "CC-BY-4.0", "author": "…", "source": "https://…" },
  "hero-building.glb": { "license": "Royalty-free", "author": "…", "source": "https://…" }
}
```

Accepted: CC0 / CC-BY (attribution listed on the credits page) / MIT / Apache /
BSD / Royalty-free / licensed. Refused: non-commercial (CC-BY-NC), no-derivatives (ND),
unlicensed.

## Good source, file format

- **GLB** (single file, textures embedded). GLTF with external `.bin`/`.png` is
  supported too but a single `.glb` is easiest.
- DRACO and Meshopt compressed files are decoded automatically.
- 5–20 MB is normal for a hero building; keep cars/props under ~8 MB and
  prefer ≤ 1–2k textures. The site streams assets while you scroll — a 40 MB
  hero tower will visibly pause at the gate.
- Units/metres don't matter before you drop it — the pipeline measures and
  re-scales everything to real metres.

## How to confirm it worked

```bash
npm run assets:build
```

Then open `docs/3d/EXTERNAL_ASSETS.md` — every processed file gets a row with
its class, shipped size in metres, triangle count and warnings. Or just scroll
the site and look.

**Attribution:** CC-BY assets are credited automatically in the asset report
(`docs/3d/EXTERNAL_ASSETS.md`); the site itself doesn't display credits inline.
