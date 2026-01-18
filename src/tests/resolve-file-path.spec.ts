import { describe, expect, test } from 'bun:test'
import { resolveFilePath } from '../resolve-file-path.ts'

describe('resolveFilePath', () => {
  test('returns absolute path as-is', async () => {
    const absolutePath = '/Users/test/file.ts'
    const result = await resolveFilePath(absolutePath)
    expect(result).toBe(absolutePath)
  })

  test('resolves relative path from cwd', async () => {
    const relativePath = './plugin/skills/typescript-lsp/scripts/tests/fixtures/sample.ts'
    const result = await resolveFilePath(relativePath)
    expect(result).toBe(`${process.cwd()}/${relativePath}`)
  })

  test('resolves package export path via Bun.resolve', async () => {
    // Use typescript package which is installed as devDependency
    const packagePath = 'typescript'
    const result = await resolveFilePath(packagePath)

    // Should resolve to node_modules/typescript/...
    expect(result).toContain('node_modules/typescript')
    expect(result.startsWith('/')).toBe(true)
  })

  test('falls back to cwd for non-existent package', async () => {
    const invalidPath = 'nonexistent-package/file.ts'
    const result = await resolveFilePath(invalidPath)

    expect(result).toBe(`${process.cwd()}/${invalidPath}`)
  })

  test('resolves implicit relative path (src/foo.ts format) from cwd', async () => {
    // Paths that look like file paths (contain / and end with extension)
    // should resolve from cwd without trying Bun.resolve()
    const implicitRelative = 'src/utils/parser.ts'
    const result = await resolveFilePath(implicitRelative)

    expect(result).toBe(`${process.cwd()}/${implicitRelative}`)
  })

  test('resolves various file extensions as implicit relative paths', async () => {
    const extensions = ['ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'json']

    for (const ext of extensions) {
      const path = `src/file.${ext}`
      const result = await resolveFilePath(path)
      expect(result).toBe(`${process.cwd()}/${path}`)
    }
  })

  test('treats bare package names without extensions as package specifiers', async () => {
    // A path like 'typescript' (no slash, no extension) should try Bun.resolve()
    const barePkg = 'typescript'
    const result = await resolveFilePath(barePkg)

    // Should resolve to node_modules, not cwd/typescript
    expect(result).toContain('node_modules/typescript')
  })
})
