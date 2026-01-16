#!/usr/bin/env bun
/**
 * Search for symbols across the workspace by name
 *
 * Usage: bun lsp-find.ts <query> [file] [options]
 */

import { parseArgs } from 'node:util'
import { LspClient } from './lsp-client.ts'
import { resolveFilePath } from './resolve-file-path.ts'

const { values, positionals } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    timeout: { type: 'string' },
    debug: { type: 'boolean', short: 'd' },
    help: { type: 'boolean', short: 'h' },
  },
  allowPositionals: true,
})

if (values.help) {
  console.log(`
LSP Find - Search for symbols across the workspace

Usage: bun lsp-find.ts <query> [file] [options]

Arguments:
  query  Symbol name or partial name to search
  file   Optional file to open for project context

Options:
  --timeout <ms>  Request timeout in milliseconds (default: 60000)
  --debug, -d     Enable debug logging to stderr
  --help, -h      Show this help

Examples:
  bun lsp-find.ts parseConfig
  bun lsp-find.ts validateInput src/lib/validator.ts
  bun lsp-find.ts UserConfig --timeout 120000 --debug
`)
  process.exit(0)
}

const [query, filePath] = positionals

if (!query) {
  console.error('Usage: bun lsp-find.ts <query> [file] [options]')
  console.error('  query: Symbol name or partial name to search')
  console.error('  file: Optional file to open for project context')
  console.error('  Run with --help for more options')
  process.exit(1)
}

const rootUri = `file://${process.cwd()}`
const timeout = values.timeout ? parseInt(values.timeout, 10) : 60000
const debug = values.debug ?? false
const client = new LspClient({ rootUri, requestTimeout: timeout, debug })

/**
 * Find a default context file when none is provided
 *
 * @remarks
 * Checks common TypeScript entry points in order of preference
 */
const findDefaultContextFile = async (): Promise<string | null> => {
  const candidates = [`${process.cwd()}/src/index.ts`, `${process.cwd()}/src/main.ts`, `${process.cwd()}/index.ts`]
  for (const candidate of candidates) {
    if (await Bun.file(candidate).exists()) {
      return candidate
    }
  }
  return null
}

try {
  await client.start()

  // Open a file to establish project context if provided, otherwise find a default
  const contextFile = filePath ? await resolveFilePath(filePath) : await findDefaultContextFile()

  if (!contextFile) {
    console.error('Error: No context file found.')
    console.error('Provide a file path or ensure src/index.ts, src/main.ts, or index.ts exists.')
    await client.stop()
    process.exit(1)
  }

  const file = Bun.file(contextFile)
  if (!(await file.exists())) {
    console.error(`Error: Context file not found: ${contextFile}`)
    console.error('Workspace symbol search requires at least one open document.')
    await client.stop()
    process.exit(1)
  }

  const text = await file.text()
  const uri = `file://${contextFile}`
  const languageId = contextFile.endsWith('.tsx')
    ? 'typescriptreact'
    : contextFile.endsWith('.ts')
      ? 'typescript'
      : contextFile.endsWith('.jsx')
        ? 'javascriptreact'
        : 'javascript'

  client.openDocument(uri, languageId, 1, text)

  const result = await client.workspaceSymbols(query)

  client.closeDocument(uri)
  await client.stop()

  console.log(JSON.stringify(result, null, 2))
} catch (error) {
  console.error(`Error: ${error}`)
  await client.stop()
  process.exit(1)
}
