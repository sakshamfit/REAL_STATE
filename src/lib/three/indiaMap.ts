/**
 * India map → 3D geometry.
 *
 * Source: `public/data/india-states.geojson` (DataMeet India state boundaries,
 * topology-preserving simplification via mapshaper). No network request beyond
 * the local static file, no external tiles.
 *
 * Projection: local equirectangular around the map centre —
 *   x =  (lon - lonC) * cos(latC)
 *   z = -(lat - latC)
 * which keeps the map undistorted enough for an interactive brand visual while
 * staying trivially invertible for markers and arcs.
 */
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import earcut from "earcut";

export type MapState = {
  id: string;
  name: string;
  /** polygon centroid in map space (y = 0) */
  centroid: THREE.Vector2;
  /** extrusion depth, driven by presence tier */
  height: number;
  geometry: THREE.BufferGeometry;
  edges: THREE.BufferGeometry;
};

export type IndiaMapData = {
  states: MapState[];
  center: { lon: number; lat: number };
  bounds: { min: THREE.Vector2; max: THREE.Vector2 };
};

export const GEOJSON_URL = "/data/india-states.geojson";

/** name cleanup: source file spellings → names used across the site */
const NAME_FIX: Record<string, string> = {
  "Arunanchal Pradesh": "Arunachal Pradesh",
  "Dadara & Nagar Havelli": "Dadra & Nagar Haveli",
  "NCT of Delhi": "Delhi",
  "Orissa": "Odisha",
};

type Ring = [number, number][];

function cloneRings(rings: Ring[]): Ring[] {
  return rings.map((r) => r.slice() as Ring);
}

export function normaliseName(raw: string): string {
  return NAME_FIX[raw] ?? raw;
}

/** [lon,lat] → map space around a centre point. */
export function projectPoint(
  lon: number,
  lat: number,
  center: { lon: number; lat: number },
): THREE.Vector2 {
  const x = (lon - center.lon) * Math.cos((center.lat * Math.PI) / 180);
  const z = -(lat - center.lat);
  return new THREE.Vector2(x, z);
}

/** Signed area of a ring (shoelace). Positive = counter-clockwise. */
export function ringArea(ring: [number, number][]): number {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    a += (ring[j][0] - ring[i][0]) * (ring[j][1] + ring[i][1]);
  }
  return a / 2;
}

/** Area-weighted centroid of a polygon (outer ring + holes ignored for weight). */
export function polygonCentroid(rings: Ring[]): THREE.Vector2 {
  const outer = rings[0];
  let a = 0;
  let cx = 0;
  let cz = 0;
  for (let i = 0, j = outer.length - 1; i < outer.length; j = i++) {
    const f = outer[j][0] * outer[i][1] - outer[i][0] * outer[j][1];
    a += f;
    cx += (outer[j][0] + outer[i][0]) * f;
    cz += (outer[j][1] + outer[i][1]) * f;
  }
  if (Math.abs(a) < 1e-12) {
    // degenerate: fall back to bbox centre
    const xs = outer.map((p) => p[0]);
    const zs = outer.map((p) => p[1]);
    return new THREE.Vector2(
      (Math.min(...xs) + Math.max(...xs)) / 2,
      (Math.min(...zs) + Math.max(...zs)) / 2,
    );
  }
  a *= 0.5;
  return new THREE.Vector2(cx / (6 * a), cz / (6 * a));
}

/**
 * Extrude a set of rings (first = outer, rest = holes) upward by `height`.
 * Top faces come from earcut; walls are hand-built quads with correct winding.
 */
export function extrudeRings(rings: Ring[], height: number): THREE.BufferGeometry {
  const flat: number[] = [];
  const holeIndices: number[] = [];
  let cursor = 0;

  for (let r = 0; r < rings.length; r++) {
    const ring = rings[r];
    // drop the duplicated closing vertex if present
    const closed =
      ring.length > 1 &&
      ring[0][0] === ring[ring.length - 1][0] &&
      ring[0][1] === ring[ring.length - 1][1]
        ? ring.slice(0, -1)
        : ring;
    rings[r] = closed;
    if (r > 0) holeIndices.push(cursor);
    for (const [x, z] of closed) {
      flat.push(x, z);
      cursor++;
    }
  }

  const triangles = earcut(flat, holeIndices.length ? holeIndices : undefined);

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  let v = 0;

  // --- top cap
  const base = v;
  for (const [x, z] of rings.flat()) {
    positions.push(x, height, z);
    uvs.push(x, -z);
    v++;
  }
  for (let i = 0; i < triangles.length; i += 3) {
    indices.push(base + triangles[i], base + triangles[i + 1], base + triangles[i + 2]);
  }

  // --- walls
  for (const ring of rings) {
    const n = ring.length;
    for (let i = 0; i < n; i++) {
      const a = ring[i];
      const b = ring[(i + 1) % n];
      const start = v;
      positions.push(a[0], 0, a[1]);
      positions.push(b[0], 0, b[1]);
      positions.push(b[0], height, b[1]);
      positions.push(a[0], height, a[1]);
      uvs.push(0, 0, 1, 0, 1, height, 0, height);
      indices.push(start, start + 1, start + 2, start, start + 2, start + 3);
      v += 4;
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  g.computeBoundingBox();
  return g;
}

/** Wireframe outline of every ring, for the glowing boundary pass. */
export function ringEdges(rings: Ring[]): THREE.BufferGeometry {
  const pts: number[] = [];
  for (const ring of rings) {
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i];
      const b = ring[(i + 1) % ring.length];
      pts.push(a[0], 0.012, a[1], b[0], 0.012, b[1]);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  return g;
}

type GeoFeature = {
  properties: Record<string, string>;
  geometry: { type: "Polygon" | "MultiPolygon"; coordinates: number[][][] | number[][][][] };
};

export type BuildOptions = {
  /** state name → extrusion height */
  heightFor?: (name: string) => number;
};

/** FeatureCollection (lon/lat) → flat map-space geometry, centred on India. */
export function buildIndiaMap(fc: unknown, options: BuildOptions = {}): IndiaMapData {
  const features = (fc as { features: GeoFeature[] }).features;
  const heightFor = options.heightFor ?? (() => 0.3);

  // geographic centre of the whole collection
  let lonSum = 0;
  let latSum = 0;
  let lonMin = Infinity;
  let lonMax = -Infinity;
  let latMin = Infinity;
  let latMax = -Infinity;
  let ptCount = 0;

  for (const f of features) {
    const polys =
      f.geometry.type === "MultiPolygon"
        ? (f.geometry.coordinates as number[][][][])
        : [f.geometry.coordinates as number[][][]];
    for (const poly of polys) {
      for (const ring of poly) {
        for (const pt of ring) {
          lonSum += pt[0];
          latSum += pt[1];
          lonMin = Math.min(lonMin, pt[0]);
          lonMax = Math.max(lonMax, pt[0]);
          latMin = Math.min(latMin, pt[1]);
          latMax = Math.max(latMax, pt[1]);
          ptCount++;
        }
      }
    }
  }

  const center = { lon: lonSum / ptCount, lat: latSum / ptCount };
  const states: MapState[] = [];
  const bounds = {
    min: projectPoint(lonMin, latMin, center),
    max: projectPoint(lonMax, latMax, center),
  };

  for (const f of features) {
    const rawName = f.properties?.ST_NM ?? f.properties?.name ?? "Unknown";
    const name = normaliseName(rawName);
    const polys =
      f.geometry.type === "MultiPolygon"
        ? (f.geometry.coordinates as number[][][][])
        : [f.geometry.coordinates as number[][][]];

    // keep only rings above a minimum area — drops tiny coastal specks
    const keep: Ring[][] = [];
    let biggest: Ring[] | null = null;
    let biggestArea = 0;
    for (const poly of polys) {
      const rings = poly.map((r) => r.map((p) => [p[0], p[1]] as [number, number]));
      const area = Math.abs(ringArea(rings[0]));
      if (area < 0.004) continue;
      keep.push(rings);
      if (area > biggestArea) {
        biggestArea = area;
        biggest = rings;
      }
    }
    if (!biggest) continue;

    // Project first, then take the centroid *in map space* — mixing the
    // geographic centroid into projected coordinates misplaces every solid.
    const projectedRaw = keep.map((rings) =>
      rings.map((ring) =>
        ring.map(([lon, lat]) => {
          const p = projectPoint(lon, lat, center);
          return [p.x, p.y] as [number, number];
        }),
      ),
    );
    const c = polygonCentroid(projectedRaw[0]);
    const projected = projectedRaw.map((rings) =>
      rings.map((ring) =>
        ring.map(([x, z]) => [x - c.x, z - c.y] as [number, number]),
      ),
    );

    const height = heightFor(name);
    // one extruded solid per polygon (islands stay separate solids, not holes)
    const solids = projected.map((rings) => extrudeRings(cloneRings(rings), height));
    const outlines = projected.map((rings) => ringEdges(cloneRings(rings)));
    const geometry = solids.length === 1 ? solids[0] : (mergeGeometries(solids) ?? solids[0]);
    const edges = outlines.length === 1 ? outlines[0] : (mergeGeometries(outlines) ?? outlines[0]);

    states.push({
      id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      name,
      centroid: new THREE.Vector2(c.x, c.y),
      height,
      geometry,
      edges,
    });
  }

  return { states, center, bounds };
}

/** Convenience: fetch the bundled geojson and build the map. */
export async function loadIndiaMap(options: BuildOptions = {}): Promise<IndiaMapData> {
  const res = await fetch(GEOJSON_URL, { cache: "force-cache" });
  if (!res.ok) throw new Error(`India geojson failed: ${res.status}`);
  const fc = await res.json();
  return buildIndiaMap(fc, options);
}
