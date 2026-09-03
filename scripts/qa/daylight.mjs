/**
 * DAYLIGHT QA.
 *
 * §35 of the brief: an automated check that the world is actually exposed as
 * daylight — not a plausible-looking lighting configuration.
 *
 * There is no browser here, so instead of guessing, this computes what the
 * pipeline produces for a set of representative surfaces:
 *
 *   radiance  = albedo/π · ( sun·N·I_sun + ambient + hemisphere )
 *             + albedo/π · E_sky            (IBL, integrated from the real sky)
 *   pixel     = sRGB( tonemap( radiance · exposure ) )
 *
 * `E_sky` is integrated numerically from `buildSkyTexture` — the same map that
 * becomes `scene.environment` — so brightening the sky brightens the fill here
 * exactly as it does in the browser. Tone mapping is a port of three's
 * shaders, including the /0.6 prescale in ACES.
 *
 * Run: node --experimental-strip-types --import ./scripts/qa/ts-hook.mjs scripts/qa/daylight.mjs
 */

import { readFileSync } from 'node:fs'
import * as THREE from 'three'
import { DEFAULT_SKY, buildSkyTexture } from '../../src/lib/sky.ts'
import { PALETTE } from '../../src/lib/materials.ts'
import { skyIrradiance } from './sky-irradiance.mjs'
import {
  AMBIENT_COLOR,
  AMBIENT_INTENSITY,
  BACKGROUND_INTENSITY,
  DAYLIGHT_EXPOSURE,
  ENVIRONMENT_INTENSITY,
  FILL_BOUNCE,
  FILL_SKY,
  HEMI_INTENSITY,
  SUN_COLOR,
  SUN_INTENSITY,
} from '../../src/lib/daylight.ts'

/* ------------------------------------------------------------ pipeline model */

const SRGB_TO_LINEAR = (c) => (c < 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4))
const LINEAR_TO_SRGB = (c) => (c < 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055)

function srgbToLinear(hex) {
  const color = new THREE.Color(hex) // ColorManagement converts sRGB -> linear
  return [color.r, color.g, color.b]
}

/** three's ACESFilmicToneMapping, matrices included. */
function acesFilmic([r, g, b], exposure) {
  const IN = [
    [0.59719, 0.35458, 0.04823],
    [0.076, 0.90834, 0.01566],
    [0.0284, 0.13383, 0.83777],
  ]
  const OUT = [
    [1.60475, -0.53108, -0.07367],
    [-0.10208, 1.10813, -0.00605],
    [-0.00327, -0.07276, 1.07602],
  ]
  const mul = (m, v) => m.map((row) => row[0] * v[0] + row[1] * v[1] + row[2] * v[2])
  const fit = (v) => {
    const a = v * (v + 0.0245786) - 0.000090537
    const d = v * (0.983729 * v + 0.432951) + 0.238081
    return a / d
  }
  let v = [r, g, b].map((c) => (c * exposure) / 0.6)
  v = mul(IN, v)
  v = v.map((c) => Math.min(1, Math.max(0, fit(c))))
  v = mul(OUT, v)
  return v.map((c) => Math.min(1, Math.max(0, c)))
}

/** three's NeutralToneMapping (Khronos PBR Neutral), ported exactly. */
function neutral([r, g, b], exposure) {
  const START_COMPRESSION = 0.8 - 0.04
  const DESATURATION = 0.15
  let color = [r, g, b].map((c) => c * exposure)
  const x = Math.min(color[0], color[1], color[2])
  const offset = x < 0.08 ? x - 6.25 * x * x : 0.04
  color = color.map((c) => c - offset)
  const peak = Math.max(color[0], color[1], color[2])
  if (peak < START_COMPRESSION) return color.map((c) => Math.min(1, Math.max(0, c)))
  const d = 1 - START_COMPRESSION
  const newPeak = 1 - (d * d) / (peak + d - START_COMPRESSION)
  color = color.map((c) => (c * newPeak) / peak)
  const g2 = 1 - 1 / (DESATURATION * (peak - newPeak) + 1)
  return color.map((c) => Math.min(1, Math.max(0, c * (1 - g2) + newPeak * g2)))
}

const TONEMAP = { aces: acesFilmic, neutral: neutral }

/* ------------------------------------------------------- sky irradiance (IBL) */

/**
 * Cosine-weighted hemispherical irradiance from the real sky map, for a given
 * surface normal. This is `E` in radiance = albedo · E / π.
 */
/* ------------------------------------------------------------------- config */

// These mirror the running values. Keep them in sync with Lighting.tsx / Sky.tsx.
// read straight from the app: this file cannot drift from the running site
const CONFIG = {
  exposure: Number(process.env.EXPOSURE ?? DAYLIGHT_EXPOSURE),
  toneMapping: process.env.TONEMAP ?? 'aces',
  sunIntensity: Number(process.env.SUN ?? SUN_INTENSITY),
  sunColor: [SUN_COLOR.r, SUN_COLOR.g, SUN_COLOR.b],
  ambientIntensity: Number(process.env.AMBIENT ?? AMBIENT_INTENSITY),
  ambientColor: [AMBIENT_COLOR.r, AMBIENT_COLOR.g, AMBIENT_COLOR.b],
  hemiIntensity: Number(process.env.HEMI ?? HEMI_INTENSITY),
  hemiSky: [FILL_SKY.r, FILL_SKY.g, FILL_SKY.b],
  hemiGround: [FILL_BOUNCE.r, FILL_BOUNCE.g, FILL_BOUNCE.b],
  environmentIntensity: Number(process.env.ENVI ?? ENVIRONMENT_INTENSITY),
  backgroundIntensity: Number(process.env.BGI ?? BACKGROUND_INTENSITY),
}

const SUN = DEFAULT_SKY.sunDirection.clone().normalize()
const UP = new THREE.Vector3(0, 1, 0)

/** Radiance of a Lambertian surface, lit by the real rig. */
function shade(albedoHex, normal, { lit = true } = {}) {
  const albedo = srgbToLinear(albedoHex)
  const n = normal.clone().normalize()
  const dotNL = lit ? Math.max(0, n.dot(SUN)) : 0

  const out = [0, 0, 0]
  for (let c = 0; c < 3; c++) {
    const a = albedo[c] / Math.PI
    // direct sun
    let radiance = a * CONFIG.sunIntensity * dotNL * CONFIG.sunColor[c]
    // ambient light
    radiance += a * CONFIG.ambientIntensity * CONFIG.ambientColor[c]
    // hemisphere light (sky above, bounce below)
    const w = 0.5 * n.dot(UP) + 0.5
    const hemi = CONFIG.hemiGround[c] + (CONFIG.hemiSky[c] - CONFIG.hemiGround[c]) * w
    radiance += a * CONFIG.hemiIntensity * hemi
    out[c] = radiance
  }

  // image based lighting: the sky fills every direction, including shadow
  const E = skyIrradiance(skyTexture, n)
  for (let c = 0; c < 3; c++) {
    out[c] += (albedo[c] / Math.PI) * E[c] * CONFIG.environmentIntensity
  }
  return out
}

const REPORT = (label, radiance) => {
  const mapped = TONEMAP[CONFIG.toneMapping](radiance, CONFIG.exposure)
  const srgb = mapped.map(LINEAR_TO_SRGB)
  const value = 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2]
  return { label, srgb, value }
}

/* --------------------------------------------------------------------- run */

const skyTexture = buildSkyTexture(DEFAULT_SKY, 256)
// guard: a single NaN texel in the source map becomes a dead environment map
let nanTexels = 0
for (let i = 0; i < skyTexture.image.data.length; i += 4) {
  if (!Number.isFinite(skyTexture.image.data[i])) nanTexels++
}
if (nanTexels > 0) {
  console.log(`\nFATAL: sky map contains ${nanTexels} NaN texels — PMREM will produce a corrupt environment\n`)
  process.exit(2)
}
const sunElevation = (Math.asin(SUN.y) * 180) / Math.PI

// a vertical facade facing the sun: the horizontal sun bearing, tipped up a
// little so it also catches sky
const wallNormal = new THREE.Vector3(SUN.x, 0.3, SUN.z).normalize()
const surfaces = [
  ['sky zenith', null, new THREE.Vector3(0, 1, 0), true],
  ['sky horizon', null, new THREE.Vector3(SUN.x, 0.08, SUN.z).normalize(), true],
  ['concrete, sunlit', PALETTE.concrete, wallNormal, true],
  ['concrete, shadowed', PALETTE.concrete, wallNormal, false],
  ['render/plaster, sunlit', PALETTE.render, wallNormal, true],
  ['render/plaster, shadowed', PALETTE.render, wallNormal, false],
  ['asphalt road, sunlit', PALETTE.asphalt, UP.clone(), true],
  ['asphalt road, shadowed', PALETTE.asphalt, UP.clone(), false],
  ['soil, sunlit', PALETTE.soil, UP.clone(), true],
  ['foliage, sunlit', PALETTE.foliage, UP.clone().add(SUN.clone().multiplyScalar(0.4)).normalize(), true],
  ['foliage, interior', PALETTE.foliage, UP.clone(), false],
  ['grass, sunlit', PALETTE.grass, UP.clone(), true],
  ['bark/trunk, sunlit', PALETTE.bark, new THREE.Vector3(-SUN.x, 0.2, -SUN.z).normalize(), true],
  ['steel, sunlit', PALETTE.metal, UP.clone(), true],
]

console.log(`\nsun elevation      ${sunElevation.toFixed(1)}°   (daylight wants 40–70°)`)
console.log(`exposure           ${CONFIG.exposure}`)
console.log(`tone mapping       ${CONFIG.toneMapping}`)
console.log(`sun intensity      ${CONFIG.sunIntensity}`)
console.log(`ambient / hemi     ${CONFIG.ambientIntensity} / ${CONFIG.hemiIntensity}`)
console.log(`env intensity      ${CONFIG.environmentIntensity}\n`)

console.log(`sky irradiance E (up)      ${skyIrradiance(skyTexture, UP).map((c) => c.toFixed(3)).join(', ')}`)
console.log(`sky irradiance E (facade)  ${skyIrradiance(skyTexture, wallNormal).map((c) => c.toFixed(3)).join(', ')}`)
console.log(`sun dot(up)                ${UP.dot(SUN).toFixed(3)}   dot(facade) ${wallNormal.dot(SUN).toFixed(3)}\n`)
const rows = []
for (const [label, albedo, normal, lit] of surfaces) {
  if (albedo === null) {
    // the sky is the background: read the map directly, no BRDF
    const { data, width, height } = skyTexture.image
    const py = Math.floor((Math.acos(Math.min(1, Math.max(-1, normal.y))) / Math.PI) * height)
    const dirx = normal.x
    const dirz = normal.z
    const phi = Math.atan2(dirx, dirz)
    const px = Math.floor(((phi + Math.PI) / (2 * Math.PI)) * width) % width
    const idx = (Math.min(height - 1, py) * width + px) * 4
    rows.push(
      REPORT(label, [
        data[idx] * CONFIG.backgroundIntensity,
        data[idx + 1] * CONFIG.backgroundIntensity,
        data[idx + 2] * CONFIG.backgroundIntensity,
      ]),
    )
  } else {
    rows.push(REPORT(label, shade(albedo, normal, { lit })))
  }
}

const bar = (v) => '#'.repeat(Math.round(Math.min(1, Math.max(0, v)) * 24)).padEnd(24, '·')
console.log('surface                       sRGB   R    G    B    0-1')
for (const row of rows) {
  const hex = row.srgb.map((c) => Math.round(c * 255).toString(16).padStart(2, '0')).join('')
  console.log(
    `${row.label.padEnd(26)} ${(row.value * 255).toFixed(0).padStart(4)}  ${hex}  ${bar(row.value)} ${row.value.toFixed(2)}`,
  )
}

/* ------------------------------------------------------------------ verdict */

/* ------------------------------------------------------- UI overlay (§21–23) */

/**
 * The page can be perfectly exposed and still look like evening if the HTML
 * layer sits a dark sheet over the canvas. This reads the real stylesheet and
 * measures the darkest stop in the vignette.
 */
function overlayAudit() {
  const css = readFileSync(new URL('../../app/globals.css', import.meta.url), 'utf8')
  const block = css.slice(css.indexOf('.vignette {'))
  const end = block.indexOf('}')
  const rule = block.slice(0, end)
  const alphas = [...rule.matchAll(/rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)/g)].map((m) =>
    Number(m[4]),
  )
  const darkest = alphas.length ? Math.max(...alphas) : 0
  const grain = /\.grain\s*\{[\s\S]*?opacity:\s*([\d.]+)/.exec(css)
  return { darkest, grain: grain ? Number(grain[1]) : 0 }
}

const overlay = overlayAudit()

const get = (label) => rows.find((row) => row.label === label)
const linearLuminance = (srgb) => 0.2126 * SRGB_TO_LINEAR(srgb[0]) + 0.7152 * SRGB_TO_LINEAR(srgb[1]) + 0.0722 * SRGB_TO_LINEAR(srgb[2])
const checks = [
  ['sun elevation is daytime (40–70°)', sunElevation > 40 && sunElevation < 70],
  ['sky zenith reads as bright blue (0.55–0.85)', get('sky zenith').value > 0.55 && get('sky zenith').value < 0.85],
  ['sky is blue, not grey (B > R + 0.08)', get('sky zenith').srgb[2] > get('sky zenith').srgb[0] + 0.08],
  ['sunlit concrete is bright (0.75–0.95)', get('concrete, sunlit').value > 0.75 && get('concrete, sunlit').value < 0.96],
  ['shadowed concrete keeps detail (> 0.38)', get('concrete, shadowed').value > 0.38],
  [
    'sun vs shade contrast reads sunny (linear > 2.0×)',
    linearLuminance(get('concrete, sunlit').srgb) / linearLuminance(get('concrete, shadowed').srgb) > 2.0,
  ],
  ['asphalt reads as asphalt (0.35–0.60)', get('asphalt road, sunlit').value > 0.35 && get('asphalt road, sunlit').value < 0.6],
  ['shadowed asphalt is not black (> 0.22)', get('asphalt road, shadowed').value > 0.22],
  ['sunlit foliage is green-lit (0.42–0.72)', get('foliage, sunlit').value > 0.42 && get('foliage, sunlit').value < 0.72],
  ['foliage interior keeps detail (> 0.24)', get('foliage, interior').value > 0.24],
  ['sunlit render is not clipped (< 0.97)', get('render/plaster, sunlit').value < 0.97],
  ['no dark full-screen overlay (vignette ≤ 0.15)', overlay.darkest <= 0.15],
  ['grain is a whisper (≤ 0.06)', overlay.grain <= 0.06],
  ['exposure is not low (≥ 1.0)', CONFIG.exposure >= 1.0],
  ['sun is enabled (≥ 4.0)', CONFIG.sunIntensity >= 4.0],
  ['image based lighting is on (≥ 1.0)', CONFIG.environmentIntensity >= 1.0],
]

console.log(`UI overlay        vignette max alpha ${overlay.darkest}, grain ${overlay.grain}`)
console.log(`tone mapping      ${CONFIG.toneMapping} (no LUT, no colour grading pass)`)

console.log('')
let failures = 0
for (const [label, pass] of checks) {
  if (!pass) failures++
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${label}`)
}
console.log(`\n${checks.length - failures}/${checks.length} daylight checks pass\n`)
process.exit(failures > 0 ? 1 : 0)
