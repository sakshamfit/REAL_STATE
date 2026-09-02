# RUDRA CONSTRUCTIONS & SUPPLIERS

> Engineering Trust. Constructing Excellence.

A premium, scroll-driven **3D construction / infrastructure experience** built for
Rudra Constructions & Suppliers — not a corporate template. The website itself
demonstrates the company's scale: a building assembles as you scroll, a miniature
construction site runs its five-phase process, and an interactive extruded **3D
India map** closes the story.

**Visual direction:** dark architectural studio — graphite / charcoal / concrete
with warm bone-white type, amber metallic accents, blueprint lines, glass, steel,
subtle particles and cinematic lighting. Every 3D scene has a matching premium
dark fallback (and the map has a real SVG India render) so the experience never
breaks on devices or iframes without WebGL.

## Stack

- **Next.js 15 (App Router) · React 19 · TypeScript**
- **Three.js 0.172 + React Three Fiber 9 + Drei 10** — all 3D is procedural (no external GLB/HDR downloads, everything runs offline)
- **GSAP + ScrollTrigger** — pinned scroll scenes (scrub-driven)
- **Lenis** — smooth scrolling (disabled for `prefers-reduced-motion`)
- **Tailwind CSS 3**

## Sections (scroll journey)

| # | Section | 3D / interaction |
|---|---------|------------------|
| 1 | Hero — *Build the Future* | Pinned cinematic build sequence: grid → foundation → columns → floors → glass → crane → beacon. Camera orbits with scroll. Stage readout + progress rail + final brand reveal. |
| 2 | About — *From Ground to Growth* | 3D skyline canvas + revealed 2025 → capabilities → expansion → future timeline. |
| 3 | What We Do | Six procedural 3D service objects (civil, residential, commercial, infrastructure, solar, renovation). Hover spins the model. |
| 4 | How We Build | Pinned miniature construction site synced to the five-phase process (analysis → design → procurement → execution → quality). |
| 5 | Trust & Quality | Rotating 3D steel lattice tower + four pillars (quality, safety, compliance, sustainability). |
| 6 | Trusted By | Pinned cinematic horizontal corridor panning through the client list. |
| 7 | ⭐ 3D India Map | Extruded interactive India: states rise, presence states glow, known city markers (Patna, Bettiah, Biswanath, Jorhat) activate sequentially, animated dashed route lines from the HQ. Hover = highlight + tooltip, click = info panel & state chips. |
| 8 | Final CTA | Let's build the future together + phone / email. |

## Content is data-driven

Everything textual lives in **`data/content.ts`**:

- `COMPANY` — name, tagline, phone, email, location
- `SERVICES` — six verticals (title, tagline, description, bullet points)
- `PROCESS`, `TIMELINE`, `TRUST_PILLARS`, `CLIENTS`
- `PRESENCE` — state presence + city markers (only the locations documented by the client)

### Adding real project data (client-supplied later)

The India map is built to accept a project database. Extend `PROJECTS` in
`data/content.ts` (or serve `/public/projects.json` and fetch it):

```ts
export type ProjectRecord = {
  state: string;      // must match GeoJSON feature name, e.g. "Bihar"
  city: string;
  project: string;
  type: string;
  year: number;
  lat: number;
  lon: number;
  description?: string;
  image?: string;
};
```

The map will then render markers, routes and hover cards automatically. To keep the
site honest today, no project names or project-level locations have been invented.

## India map source

State boundaries come from **amCharts 4 geo data (`india2023Low`)** — served as
static GeoJSON at `public/geojson/india.json` (72 KB). Validated licenses apply to
the source package (`@amcharts/amcharts4-geodata`); replace the file with any
GeoJSON whose features carry a `properties.name` to swap data source.

## Commands

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
npm run start
npm run typecheck
```

## Resilience (why it can't white-screen)

1. **WebGL is verified before any 3D mounts** — `useDeviceInfo()` defaults to
   no-WebGL; support is confirmed in an effect. If unsupported (or blocked by the
   preview iframe), premium SVG fallbacks render instead.
2. **Every 3D scene sits in a `SceneBoundary`** — a React error boundary that
   catches any canvas/scene exception and swaps in the same premium fallback.
3. **`app/error.tsx`** — a branded, on-brand recovery screen for anything else.
4. **Dev telemetry** — caught errors POST to `/api/client-log` and are appended to
   `client-errors.log` (git-ignored), so we can see exactly what failed.

## Performance & accessibility

- Lazy-mounted canvases (IntersectionObserver) + `ssr: false` dynamic imports
- Mobile fallback: SVG map + premium blueprint/illustration fallbacks per scene
- WebGL detection before mounting 3D
- `prefers-reduced-motion` disables Lenis, scrubbing and decorative animation
- Capped device pixel ratios, no downloadable HDR/GLB assets, single low-res GeoJSON
