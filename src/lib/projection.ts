/**
 * Equirectangular projection tuned for the Indian subcontinent.
 *
 * The 3D map is built in shape space (x = east, y = north) and rotated -90° on
 * X, so shape-space +Y becomes world -Z. That means:
 *
 *   world.x =  (lng - LNG0) * cos(LAT0) * SCALE
 *   world.z = -(lat - LAT0) * SCALE
 *
 * North ends up "further away" along -Z, which matches the direction the whole
 * experience travels in.
 */

export const LNG0 = 82.8
export const LAT0 = 22.4
export const MAP_SCALE = 0.86
const COS_LAT0 = Math.cos((LAT0 * Math.PI) / 180)

export type LatLng = { lat: number; lng: number }

/** Shape-space coordinates (before the -90° X rotation). */
export function latLngToShape(lat: number, lng: number): [number, number] {
  return [(lng - LNG0) * COS_LAT0 * MAP_SCALE, (lat - LAT0) * MAP_SCALE]
}

/** World space XZ on the map plane (map group sits at y = 0 locally). */
export function latLngToXZ(lat: number, lng: number): [number, number] {
  return [(lng - LNG0) * COS_LAT0 * MAP_SCALE, -(lat - LAT0) * MAP_SCALE]
}

export function latLngToXZPoint(point: LatLng): [number, number] {
  return latLngToXZ(point.lat, point.lng)
}

/** Reverse projection — used for debug / future data import. */
export function xzToLatLng(x: number, z: number): LatLng {
  return { lng: x / (COS_LAT0 * MAP_SCALE) + LNG0, lat: -z / MAP_SCALE + LAT0 }
}
