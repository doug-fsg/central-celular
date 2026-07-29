import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC_ROOT = join(process.cwd(), 'src')

function collectSourceFiles(dir: string): string[] {
  const entries = readdirSync(dir)
  const files: string[] = []

  for (const entry of entries) {
    const fullPath = join(dir, entry)
    const stat = statSync(fullPath)
    if (stat.isDirectory()) {
      files.push(...collectSourceFiles(fullPath))
      continue
    }
    if (/\.(ts|vue)$/.test(entry) && !entry.endsWith('.test.ts')) {
      files.push(fullPath)
    }
  }

  return files
}

/** Vite expõe env via import.meta.env — process.env quebra no browser. */
describe('client source must not use process.env', () => {
  it('src/ files avoid Node process.env (use import.meta.env)', () => {
    const offenders: string[] = []

    for (const file of collectSourceFiles(SRC_ROOT)) {
      const content = readFileSync(file, 'utf8')
      if (/\bprocess\.env\b/.test(content)) {
        offenders.push(relative(process.cwd(), file))
      }
    }

    expect(offenders).toEqual([])
  })
})
