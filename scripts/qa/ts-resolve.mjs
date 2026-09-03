/**
 * Resolve hook so the offline QA tools can import the TypeScript modules the
 * site actually runs (`src/lib/*.ts`), including the `@/` alias and
 * extensionless relative imports.
 */
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

/**
 * Add the extension Node needs for an extensionless TypeScript import.
 *
 * `.json` is included because the external asset registry is a generated JSON
 * manifest imported by `src/data/assets.ts`, and the QA tools import that
 * module to place the same objects the browser does.
 */
function withExtension(candidate) {
  if (existsSync(candidate) && !existsSync(path.join(candidate, '.'))) return candidate
  for (const attempt of [
    `${candidate}.ts`,
    `${candidate}.tsx`,
    `${candidate}.json`,
    path.join(candidate, 'index.ts'),
    path.join(candidate, 'index.tsx'),
  ]) {
    if (existsSync(attempt)) return attempt
  }
  return null
}

export async function resolve(specifier, context, next) {
  let spec = specifier

  if (spec.startsWith('@/')) {
    const candidate = path.join(ROOT, 'src', spec.slice(2))
    const resolved = withExtension(candidate)
    spec = pathToFileURL(resolved ?? candidate).href
  }

  if (spec.startsWith('.') && context.parentURL) {
    const base = path.dirname(fileURLToPath(context.parentURL))
    const resolved = withExtension(path.resolve(base, spec))
    if (resolved) spec = pathToFileURL(resolved).href
  }

  // Node's ESM loader demands `with { type: 'json' }` on a JSON import; the
  // Next.js bundler does not, and `src/data/assets.ts` is application code that
  // has to compile there. Stamping the attribute onto the resolution lets the
  // QA tools import the real module rather than a copy that drifts from it.
  if (spec.endsWith('.json')) {
    const resolved = await next(spec, {
      ...context,
      importAttributes: { ...context.importAttributes, type: 'json' },
    })
    return { ...resolved, importAttributes: { ...resolved.importAttributes, type: 'json' } }
  }

  return next(spec, context)
}
