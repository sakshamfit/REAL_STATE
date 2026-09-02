import type { Presence } from "@/data/content";
import { PRESENCE } from "@/data/content";

export type IndiaFeature = {
  name: string;
  polys: { outer: [number, number][]; holes: [number, number][][] }[];
};

export const PRESENCE_BY_GEO = new Map<string, Presence>(
  PRESENCE.map((p) => [p.geoName, p])
);

const LAT0 = (22.4 * Math.PI) / 180;

/** Equirectangular-ish projection of lon/lat into planar x/z (y is north-up). */
export function project(lon: number, lat: number): [number, number] {
  return [(lon - 82.6) * Math.cos(LAT0), 23.2 - lat];
}

export function flattenGeo(geo: {
  features: Array<{ properties?: { name?: string }; geometry: { type: string; coordinates: any } }>;
}): IndiaFeature[] {
  const features: IndiaFeature[] = [];
  for (const f of geo.features) {
    const name = f.properties?.name ?? "Unknown";
    const polys: IndiaFeature["polys"] = [];
    const geoms = f.geometry.type === "MultiPolygon" ? f.geometry.coordinates : [f.geometry.coordinates];
    for (const poly of geoms) {
      polys.push({
        outer: poly[0].map((c: number[]) => [c[0], c[1]] as [number, number]),
        holes: poly.slice(1).map((ring: number[][]) => ring.map((c) => [c[0], c[1]] as [number, number])),
      });
    }
    features.push({ name, polys });
  }
  return features;
}

export function centroidOf(f: IndiaFeature): [number, number] {
  let sx = 0;
  let sy = 0;
  let n = 0;
  for (const poly of f.polys) {
    for (const [lon, lat] of poly.outer) {
      const [x, y] = project(lon, lat);
      sx += x;
      sy += y;
      n++;
    }
  }
  return [sx / Math.max(1, n), sy / Math.max(1, n)];
}

/** SVG path in projected planar coordinates for a feature (used by the non-WebGL fallback). */
export function pathDFor(f: IndiaFeature): string {
  const parts: string[] = [];
  for (const poly of f.polys) {
    const outer = poly.outer
      .map(([lon, lat]) => {
        const [x, y] = project(lon, lat);
        return `${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(" L");
    parts.push(`M${outer} Z`);
    for (const hole of poly.holes) {
      const h = hole
        .map(([lon, lat]) => {
          const [x, y] = project(lon, lat);
          return `${x.toFixed(2)},${y.toFixed(2)}`;
        })
        .join(" L");
      parts.push(`M${h} Z`);
    }
  }
  return parts.join(" ");
}

export function geoBounds(features: IndiaFeature[]): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const f of features) {
    for (const poly of f.polys) {
      for (const [lon, lat] of poly.outer) {
        const [x, y] = project(lon, lat);
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  return { minX, minY, maxX, maxY };
}
