/**
 * Cosine-weighted hemispherical irradiance from an equirectangular sky map.
 *
 * This is `E` in `radiance = albedo · E / π` — the number the browser gets for
 * free from PMREM, computed here directly from the map so the offline renderer
 * and the daylight probe fill shadows the way the site does.
 */
import * as THREE from 'three'

export function skyIrradiance(texture, normal, samples = 48) {
  const { data, width, height } = texture.image
  const n = normal.clone().normalize()
  const up = new THREE.Vector3(0, 1, 0)
  const basisA = Math.abs(n.y) > 0.95 ? new THREE.Vector3(1, 0, 0) : up.clone().cross(n).normalize()
  const basisB = new THREE.Vector3().crossVectors(n, basisA).normalize()

  const sum = [0, 0, 0]
  let weight = 0
  for (let i = 0; i < samples; i++) {
    for (let j = 0; j < samples; j++) {
      const u = (i + 0.5) / samples
      const v = (j + 0.5) / samples
      const r = Math.sqrt(u)
      const phi = 2 * Math.PI * v
      const cosT = Math.sqrt(Math.max(0, 1 - u))
      const dir = new THREE.Vector3()
        .addScaledVector(basisA, r * Math.cos(phi))
        .addScaledVector(basisB, r * Math.sin(phi))
        .addScaledVector(n, cosT)
        .normalize()

      const theta = Math.acos(Math.min(1, Math.max(-1, dir.y)))
      const phi2 = Math.atan2(dir.x, dir.z)
      const px = Math.min(width - 1, Math.max(0, Math.floor(((phi2 + Math.PI) / (2 * Math.PI)) * width)))
      const py = Math.min(height - 1, Math.max(0, Math.floor((theta / Math.PI) * height)))
      const idx = (py * width + px) * 4
      sum[0] += data[idx]
      sum[1] += data[idx + 1]
      sum[2] += data[idx + 2]
      weight += 1
    }
  }
  // mean cosine-weighted radiance = E / π ; return E
  return sum.map((c) => (Math.PI * c) / weight)
}
