import { describe, expect, test } from 'bun:test'
import { join } from 'node:path'
import { $ } from 'bun'

const scriptsDir = join(import.meta.dir, '..')
const testFile = join(import.meta.dir, 'fixtures/sample.ts')

describe('lsp-analyze', () => {
  test('shows help with --help flag', async () => {
    const result = await $`bun ${scriptsDir}/lsp-analyze.ts --help`.text()

    expect(result).toContain('LSP Analyze')
    expect(result).toContain('--symbols')
    expect(result).toContain('--exports')
    expect(result).toContain('--timeout')
    expect(result).toContain('--debug')
  })

  test('outputs JSON with --all flag', async () => {
    const result = await $`bun ${scriptsDir}/lsp-analyze.ts ${testFile} --all`.json()

    expect(result.file).toEndWith('sample.ts')
    expect(result.symbols).toBeDefined()
    expect(Array.isArray(result.symbols)).toBe(true)
    expect(result.exports).toBeDefined()
    expect(Array.isArray(result.exports)).toBe(true)
  })

  test('outputs symbols only with --symbols flag', async () => {
    const result = await $`bun ${scriptsDir}/lsp-analyze.ts ${testFile} --symbols`.json()

    expect(result.file).toEndWith('sample.ts')
    expect(result.symbols).toBeDefined()
    expect(Array.isArray(result.symbols)).toBe(true)
    expect(result.exports).toBeUndefined()
  })

  test('outputs exports only with --exports flag', async () => {
    const result = await $`bun ${scriptsDir}/lsp-analyze.ts ${testFile} --exports`.json()

    expect(result.file).toEndWith('sample.ts')
    expect(result.exports).toBeDefined()
    expect(Array.isArray(result.exports)).toBe(true)
    expect(result.symbols).toBeUndefined()
  })

  test('accepts custom timeout via --timeout flag', async () => {
    // Test that the script accepts the timeout option without error
    const result = await $`bun ${scriptsDir}/lsp-analyze.ts ${testFile} --symbols --timeout 90000`.json()

    expect(result.file).toEndWith('sample.ts')
    expect(result.symbols).toBeDefined()
  })

  test('fails with very short timeout', async () => {
    // Use a timeout so short that initialization will fail
    const proc = Bun.spawn(['bun', `${scriptsDir}/lsp-analyze.ts`, testFile, '--symbols', '--timeout', '1'], {
      stderr: 'pipe',
      stdout: 'pipe',
    })

    const exitCode = await proc.exited

    expect(exitCode).toBe(1)
  }, 10000)

  test('outputs debug info to stderr with --debug flag', async () => {
    const proc = Bun.spawn(['bun', `${scriptsDir}/lsp-analyze.ts`, testFile, '--symbols', '--debug'], {
      stderr: 'pipe',
      stdout: 'pipe',
    })

    const stderr = await new Response(proc.stderr).text()
    const exitCode = await proc.exited

    expect(exitCode).toBe(0)
    expect(stderr).toContain('[DEBUG]')
    expect(stderr).toContain('File:')
    expect(stderr).toContain('Timeout:')
  })

  test('debug flag shows LSP requests', async () => {
    const proc = Bun.spawn(['bun', `${scriptsDir}/lsp-analyze.ts`, testFile, '--symbols', '--debug'], {
      stderr: 'pipe',
      stdout: 'pipe',
    })

    const stderr = await new Response(proc.stderr).text()
    const exitCode = await proc.exited

    expect(exitCode).toBe(0)
    expect(stderr).toContain('[LSP] Request')
    expect(stderr).toContain('[LSP] Response')
  })

  test('debug mode shows resolved typescript-language-server path', async () => {
    const proc = Bun.spawn(['bun', `${scriptsDir}/lsp-analyze.ts`, testFile, '--symbols', '--debug'], {
      stderr: 'pipe',
      stdout: 'pipe',
    })

    const stderr = await new Response(proc.stderr).text()
    const exitCode = await proc.exited

    expect(exitCode).toBe(0)
    expect(stderr).toContain('[LSP] Using typescript-language-server:')
    // Should contain either local path or global path
    expect(stderr).toMatch(/typescript-language-server/)
  })

  test('processes hover positions', async () => {
    const result = await $`bun ${scriptsDir}/lsp-analyze.ts ${testFile} --hover 0:0`.json()

    expect(result.file).toEndWith('sample.ts')
    expect(result.hovers).toBeDefined()
    expect(Array.isArray(result.hovers)).toBe(true)
    expect(result.hovers?.length).toBe(1)
  })

  test('exits with error for non-existent file', async () => {
    const proc = Bun.spawn(['bun', `${scriptsDir}/lsp-analyze.ts`, '/nonexistent/file.ts', '--symbols'], {
      stderr: 'pipe',
      stdout: 'pipe',
    })

    const exitCode = await proc.exited

    expect(exitCode).toBe(1)
  })
})
