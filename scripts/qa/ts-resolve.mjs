/**
 * Resolve hook so the offline QA tools can import the TypeScript modules the
 * site actually runs (`src/lib/*.ts`), including the `@/` alias and
 * extensionless relative imports.
 */
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

export async function resolve(specifier, context, next) {
  let spec = specifier

  if (spec.startsWith('@/')) {
    spec = pathToFileURL(path.join(ROOT, 'src', spec.slice(2))).href
  }

  if (spec.startsWith('.') && context.parentURL) {
    const base = path.dirname(fileURLToPath(context.parentURL))
    const candidate = path.resolve(base, spec)
    for (const attempt of [`${candidate}.ts`, path.join(candidate, 'index.ts'), `${candidate}.tsx`]) {
      if (existsSync(attempt)) {
        spec = pathToFileURL(attempt).href
        break
      }
    }
  }

  return next(spec, context)
}
