/**
 * External asset pipeline.
 *
 *     DROP GLB → npm run assets:build → USE
 *
 * Discovers every GLB/GLTF the developer dropped into `public/assets/external/`,
 * inspects it, decides whether it earns a place in the world, normalises the
 * ones that do, writes them to `public/assets/external/build/`, and emits a
 * machine-readable registry the React side consumes through
 * `src/data/assets.ts`.
 *
 * The developer's whole job is step one. Nothing here requires Blender, a JSON
 * sidecar, coordinate maths or a material assignment (brief §14).
 *
 * Usage:
 *   node scripts/glb/external/build-external.mjs          # build everything
 *   node scripts/glb/external/build-external.mjs --check  # report only
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import draco3d from 'draco3d'
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer'

import { CATEGORY_RUNTIME, CLASSES, TEXTURE_BUDGET, classify, slugify } from './lib/spec.mjs'
import { inspectDocument } from './lib/inspect.mjs'
import { judge } from './lib/verdict.mjs'
import { normalizeDocument } from './lib/normalize.mjs'
import { isolateSubject } from './lib/isolate.mjs'
import { materialMapFor } from './lib/materials.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../../..')
const SOURCE_DIR = path.join(ROOT, 'public/assets/external')
const BUILD_DIR = path.join(SOURCE_DIR, 'build')
const REGISTRY_PATH = path.join(ROOT, 'src/data/external-manifest.json')
const REPORT_PATH = path.join(ROOT, 'docs/3d/EXTERNAL_ASSETS.md')
const CREDITS_PATH = path.join(SOURCE_DIR, 'CREDITS.json')

const CHECK_ONLY = process.argv.includes('--check')

/* ------------------------------------------------------------------- io */

async function createIO() {
  return new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({
      'draco3d.decoder': await draco3d.createDecoderModule(),
      'draco3d.encoder': await draco3d.createEncoderModule(),
      'meshopt.decoder': MeshoptDecoder,
      'meshopt.encoder': MeshoptEncoder,
    })
}

/** Every GLB/GLTF the developer dropped in, ignoring our own build output. */
function discover() {
  if (!fs.existsSync(SOURCE_DIR)) return []
  return fs
    .readdirSync(SOURCE_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.(glb|gltf)$/i.test(entry.name))
    .map((entry) => entry.name)
    .sort()
}

/** Licence metadata the developer may optionally supply (brief §15). */
function loadCredits() {
  if (!fs.existsSync(CREDITS_PATH)) return {}
  try {
    const parsed = JSON.parse(fs.readFileSync(CREDITS_PATH, 'utf8'))
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch (error) {
    console.warn(`  ! CREDITS.json could not be parsed (${error.message}) — licence columns will read "unverified"`)
    return {}
  }
}

/**
 * Licences that permit commercial use on a client website.
 *
 * CC-BY needs attribution, which the generated docs page provides; the NC and
 * ND families do not permit this use at all and are refused outright.
 */
const COMMERCIAL_OK = /^(cc0|cc-?0-1\.0|public[- ]?domain|cc-?by(-sa)?(-[34]\.0)?|mit|apache-2\.0|bsd-3-clause|royalty[- ]?free|editorial-cleared|proprietary-licensed)$/i
const COMMERCIAL_NO = /(nc|non-?commercial|nd|no-?deriv|cc-?by-?nc|cc-?by-?nd|unlicensed|unknown)/i

function licenceVerdict(credit) {
  if (!credit || !credit.license) {
    return { ok: false, level: 'unverified', note: 'no licence recorded in CREDITS.json' }
  }
  const licence = String(credit.license).trim()
  if (COMMERCIAL_NO.test(licence) && !COMMERCIAL_OK.test(licence)) {
    return { ok: false, level: 'refused', note: `${licence} does not permit commercial use` }
  }
  if (COMMERCIAL_OK.test(licence)) {
    const attribution = /cc-?by/i.test(licence)
    return { ok: true, level: attribution ? 'attribution' : 'free', note: attribution ? 'attribution required' : '' }
  }
  return { ok: false, level: 'unverified', note: `licence "${licence}" not recognised — verify manually` }
}

/* ---------------------------------------------------------------- build */

async function processAsset(filename, credits) {
  const source = path.join(SOURCE_DIR, filename)
  const id = slugify(filename)
  const classId = classify(filename)
  const spec = CLASSES[classId]
  const credit = credits[filename] ?? credits[id] ?? null
  const licence = licenceVerdict(credit)

  const result = {
    id,
    file: filename,
    class: classId,
    category: spec.category,
    licence,
    credit,
    status: 'reject',
    errors: [],
    warnings: [],
    repairs: [],
    applied: [],
    before: null,
    after: null,
  }

  // Licence gate first: an asset we may not ship is not worth optimising.
  if (!licence.ok) {
    result.errors.push(`licence: ${licence.note}`)
    if (licence.level === 'refused') return result
    // unverified assets are built but held back from the runtime registry
    result.heldBack = true
  }

  const io = await createIO()
  let doc
  try {
    doc = await io.read(source)
  } catch (error) {
    result.errors.push(`unreadable: ${error.message}`)
    return result
  }

  // Report what the developer actually downloaded…
  const before = inspectDocument(doc, source)
  result.before = before

  // …then reduce a showcase file to the object it is showing, so every
  // measurement from here on describes the thing that will stand in the world
  // rather than its studio presentation.
  const { notes } = isolateSubject(doc)
  result.isolation = notes
  const subject = notes.length ? inspectDocument(doc, source) : before
  if (notes.length) result.subject = subject

  const decision = judge(subject, classId)
  result.status = decision.status
  result.errors.push(...decision.errors)
  result.warnings = decision.warnings
  result.repairs = decision.repairs
  result.plan = decision.plan

  if (decision.status === 'reject') {
    result.repairs = [...notes, ...result.repairs]
    return result
  }

  if (CHECK_ONLY) {
    result.repairs = [...notes, ...result.repairs]
    return result
  }

  result.repairs = [...notes, ...result.repairs]

  result.applied = await normalizeDocument(doc, decision.plan, {
    ground: spec.ground,
    maxTexture: TEXTURE_BUDGET[spec.category] ?? 1024,
    maxTriangles: spec.maxTriangles,
    triangles: subject.triangles,
  })

  fs.mkdirSync(BUILD_DIR, { recursive: true })
  const output = path.join(BUILD_DIR, `${id}.glb`)
  await io.write(output, doc)

  // Re-inspect the built file: the report the developer reads must describe
  // what actually shipped, not what we intended to ship.
  const verifyIO = await createIO()
  const built = await verifyIO.read(output)
  const after = inspectDocument(built, output)
  result.after = after

  // Post-build gates. A normalisation that did not land is a build failure, not
  // a warning — a floating car is exactly what §5 forbids.
  const floor = after.bounds ? after.bounds.min[1] : 0
  if (Math.abs(floor) > (spec.ground === 'trunk' ? 0.06 : 0.03)) {
    result.errors.push(`grounding failed: lowest geometry at y=${floor.toFixed(3)}`)
    result.status = 'reject'
  }
  if (after.nonFinite) {
    result.errors.push('normalisation produced non-finite vertices')
    result.status = 'reject'
  }

  if (result.status !== 'reject' && !result.heldBack) {
    result.materialMap = materialMapFor(after, spec)
  }

  return result
}

/* --------------------------------------------------------------- output */

function runtimeEntry(result) {
  const runtime = CATEGORY_RUNTIME[result.category] ?? CATEGORY_RUNTIME.environment
  const spec = CLASSES[result.class]
  const size = result.after?.bounds?.size ?? [0, 0, 0]
  return {
    id: `external-${result.id}`,
    path: `/assets/external/build/${result.id}.glb`,
    source: result.file,
    category: result.category,
    class: result.class,
    priority: runtime.priority,
    scene: runtime.scene,
    cullDistance: runtime.cullDistance,
    preload: runtime.preload,
    instanced: spec.instanced,
    /** replace | augment | never — how this asset competes with project assets */
    substitution: spec.substitution,
    dimensions: size.map((v) => Number(v.toFixed(3))),
    triangles: result.after?.triangles ?? 0,
    materials: result.after?.materials ?? 0,
    textures: result.after?.textures ?? 0,
    /**
     * External assets arrive with their own PBR. `preserveMaterials` tells the
     * runtime to keep them and only correct measurable defects, instead of
     * overwriting them with the project's procedural library (brief §6).
     */
    preserveMaterials: (result.after?.textures ?? 0) > 0,
    materialMap: result.materialMap ?? {},
    license: result.credit?.license ?? null,
    author: result.credit?.author ?? null,
    sourceUrl: result.credit?.source ?? null,
  }
}

function writeRegistry(results) {
  const usable = results.filter((r) => r.status !== 'reject' && !r.heldBack)
  const manifest = {
    generated: new Date().toISOString().slice(0, 10),
    note: 'Generated by `npm run assets:build`. Do not edit by hand — drop GLBs into public/assets/external/ instead.',
    assets: usable.map(runtimeEntry),
  }
  fs.writeFileSync(REGISTRY_PATH, `${JSON.stringify(manifest, null, 2)}\n`)
  return manifest
}

function writeReport(results) {
  const row = (r) => {
    const size = r.after?.bounds?.size
    const dims = size ? size.map((v) => v.toFixed(2)).join(' × ') : '—'
    const status =
      r.status === 'reject' ? '❌ rejected' : r.heldBack ? '⚠️ held back' : r.status === 'repair' ? '✅ repaired' : '✅ accepted'
    return `| \`${r.file}\` | ${CLASSES[r.class].label} | ${status} | ${dims} | ${
      r.after ? r.after.triangles.toLocaleString() : '—'
    } | ${r.credit?.source ? `[source](${r.credit.source})` : '—'} | ${r.credit?.license ?? '—'} | ${
      r.licence.ok ? (r.licence.level === 'attribution' ? 'yes, with credit' : 'yes') : 'NO'
    } |`
  }

  const detail = (r) => {
    const lines = [`### \`${r.file}\``, '']
    lines.push(`- **Class** — ${CLASSES[r.class].label} (\`${r.class}\`), inferred from the filename`)
    if (r.credit) {
      lines.push(`- **Author** — ${r.credit.author ?? 'unknown'}`)
      if (r.credit.source) lines.push(`- **Source** — ${r.credit.source}`)
      lines.push(`- **Licence** — ${r.credit.license ?? 'unrecorded'}${r.licence.note ? ` (${r.licence.note})` : ''}`)
    } else {
      lines.push('- **Licence** — not recorded in `CREDITS.json`; asset is held out of the runtime registry')
    }
    if (r.before) {
      const b = r.before.bounds
      lines.push(
        `- **As supplied** — ${b ? b.size.map((v) => v.toFixed(2)).join(' × ') : '?'} units, ${r.before.triangles.toLocaleString()} tris, ${
          r.before.materials
        } materials, ${r.before.textures} textures${r.before.maxTextureSize ? ` (max ${r.before.maxTextureSize}px)` : ''}, ${
          r.before.animations.length
        } animations`,
      )
    }
    if (r.after) {
      const b = r.after.bounds
      lines.push(
        `- **As shipped** — ${b ? b.size.map((v) => v.toFixed(2)).join(' × ') : '?'} m, ${r.after.triangles.toLocaleString()} tris, ${
          r.after.materials
        } materials, ${r.after.textures} textures, ${(r.after.fileBytes / 1024).toFixed(0)} kB, floor at y=${
          b ? b.min[1].toFixed(3) : '?'
        }`,
      )
    }
    if (r.repairs.length) {
      lines.push('- **Normalised**')
      for (const repair of r.repairs) lines.push(`  - ${repair}`)
    }
    if (r.warnings.length) {
      lines.push('- **Warnings**')
      for (const warning of r.warnings) lines.push(`  - ${warning}`)
    }
    if (r.errors.length) {
      lines.push('- **Errors**')
      for (const error of r.errors) lines.push(`  - ${error}`)
    }
    lines.push('')
    return lines.join('\n')
  }

  const accepted = results.filter((r) => r.status !== 'reject' && !r.heldBack)
  const rejected = results.filter((r) => r.status === 'reject')
  const held = results.filter((r) => r.heldBack && r.status !== 'reject')

  const lines = [
    '# External 3D Assets',
    '',
    `> Generated by \`npm run assets:build\` on ${new Date().toISOString().slice(0, 10)}. Do not edit by hand.`,
    '',
    '## Workflow',
    '',
    '```text',
    'DOWNLOAD GLB',
    '      ↓',
    'DROP INTO public/assets/external/',
    '      ↓',
    'RECORD THE LICENCE in public/assets/external/CREDITS.json',
    '      ↓',
    'npm run assets:build',
    '      ↓',
    'AUTOMATIC VALIDATION → NORMALISATION → REGISTRY',
    '      ↓',
    'ASSET AVAILABLE to the scene',
    '```',
    '',
    'The filename is the only instruction the pipeline needs. `car-sedan.glb`,',
    '`tree-large.glb`, `excavator-cat.glb` and `site-container.glb` all classify',
    'themselves. Nothing else — no Blender step, no coordinates, no material',
    'assignment, no per-asset JSON beyond the licence line.',
    '',
    '## Licence register',
    '',
    'Every external asset must permit commercial use on a client website. Assets',
    'with a non-commercial or no-derivatives licence are refused by the build;',
    'assets with no recorded licence are built but held out of the runtime',
    'registry until a licence is recorded.',
    '',
    '| Asset | Class | Status | Shipped size (m) | Triangles | Source | Licence | Commercial use |',
    '| --- | --- | --- | --- | ---: | --- | --- | --- |',
    ...(results.length ? results.map(row) : ['| _none yet_ | — | — | — | — | — | — | — |']),
    '',
    '## Attribution',
    '',
    ...(accepted.filter((r) => r.licence.level === 'attribution').length
      ? accepted
          .filter((r) => r.licence.level === 'attribution')
          .map(
            (r) =>
              `- **${r.credit?.title ?? r.file}** by ${r.credit?.author ?? 'unknown'}${
                r.credit?.source ? ` — ${r.credit.source}` : ''
              } — ${r.credit?.license}`,
          )
      : ['_No attribution-required assets in the build._']),
    '',
    '## Per-asset detail',
    '',
    ...(results.length ? results.map(detail) : ['_No external assets have been dropped in yet._', '']),
    '## Summary',
    '',
    `- ${accepted.length} asset(s) in the runtime registry`,
    `- ${held.length} asset(s) held back pending a licence`,
    `- ${rejected.length} asset(s) rejected`,
    '',
    '## What the validator checks',
    '',
    'Dimensions, triangle count, material count, texture count, texture',
    'resolution, bounding box, origin, node transforms, normals, UVs,',
    'animations, transparency, metallic workflow, roughness and missing',
    'textures. Assets are rejected for: no scene, no meshes, no materials,',
    'non-triangle primitives, non-finite vertices, negative node scale,',
    'unresolvable textures, implausible real-world proportions for their class,',
    'or a size that cannot be brought into the class envelope by a uniform',
    'scale. Everything else is repaired automatically.',
    '',
    '## What normalisation does',
    '',
    '- **Real-world scale** — the bounding box is measured, never trusted. A car',
    '  exported in centimetres and a car exported in metres both end up 4–5 m long.',
    '- **Orientation** — vehicles are rotated so their length runs along +X, which',
    '  is how `src/lib/layout.ts` places everything else.',
    '- **Grounding** — tyres on the road, trunks 2 cm into the soil, bases flat on',
    '  y=0, footprint centred on the origin. No floating, no sinking, no gaps.',
    '- **Budgets** — textures capped per category, triangles reduced only when over',
    '  budget and only by error-bounded simplification that preserves the silhouette.',
    '- **Hygiene** — animations, skins, orphan meshes, duplicate materials and',
    '  duplicate textures removed.',
    '',
    'Materials are deliberately **not** rewritten here. Good external PBR is kept',
    'and only measurable defects are corrected, at runtime, in',
    '`src/lib/external-materials.ts`.',
    '',
  ]

  fs.writeFileSync(REPORT_PATH, lines.join('\n'))
}

/* ----------------------------------------------------------------- main */

async function main() {
  fs.mkdirSync(SOURCE_DIR, { recursive: true })
  const files = discover()
  const credits = loadCredits()

  if (files.length === 0) {
    console.log('  No external assets found in public/assets/external/.')
    console.log('  Drop a GLB in there and run this again — the filename is the only instruction needed.')
    writeRegistry([])
    writeReport([])
    return
  }

  console.log(`  Found ${files.length} external asset(s).\n`)

  const results = []
  for (const file of files) {
    process.stdout.write(`  ${file.padEnd(34)}`)
    let result
    try {
      result = await processAsset(file, credits)
    } catch (error) {
      result = {
        id: slugify(file),
        file,
        class: classify(file),
        category: CLASSES[classify(file)].category,
        licence: { ok: false, level: 'unverified', note: 'build failed' },
        status: 'reject',
        errors: [`build failed: ${error.message}`],
        warnings: [],
        repairs: [],
        applied: [],
      }
    }
    results.push(result)

    const label =
      result.status === 'reject'
        ? 'REJECTED'
        : result.heldBack
          ? 'HELD (no licence)'
          : result.status === 'repair'
            ? 'REPAIRED'
            : 'ACCEPTED'
    const size = result.after?.bounds?.size
    console.log(`${label.padEnd(18)} ${size ? size.map((v) => v.toFixed(2)).join(' × ') + ' m' : ''}`)
    for (const repair of result.repairs) console.log(`      · ${repair}`)
    for (const warning of result.warnings) console.log(`      ! ${warning}`)
    for (const error of result.errors) console.log(`      ✗ ${error}`)
  }

  const manifest = writeRegistry(results)
  writeReport(results)

  console.log('')
  console.log(`  → ${path.relative(ROOT, REGISTRY_PATH)} (${manifest.assets.length} registered)`)
  console.log(`  → ${path.relative(ROOT, REPORT_PATH)}`)

  // A rejected asset is not a build failure: the developer dropped something in
  // and the pipeline told them why it cannot be used. The world still builds
  // from what passed.
  const rejected = results.filter((r) => r.status === 'reject')
  if (rejected.length) {
    console.log(`\n  ${rejected.length} asset(s) rejected — see docs/3d/EXTERNAL_ASSETS.md`)
  }
}

await main()
