#!/usr/bin/env bun
/**
 * Find all references to a symbol at a position
 *
 * Usage: bun lsp-references.ts <file> <line> <character> [options]
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
LSP References - Find all references to a symbol

Usage: bun lsp-references.ts <file> <line> <character> [options]

Arguments:
  file       Path to TypeScript/JavaScript file
  line       Line number (0-indexed)
  character  Character position (0-indexed)

Options:
  --timeout <ms>  Request timeout in milliseconds (default: 60000)
  --debug, -d     Enable debug logging to stderr
  --help, -h      Show this help

Examples:
  bun lsp-references.ts src/utils.ts 42 10
  bun lsp-references.ts src/utils.ts 42 10 --timeout 120000 --debug
`)
  process.exit(0)
}

const [filePath, lineStr, charStr] = positionals

if (!filePath || !lineStr || !charStr) {
  console.error('Usage: bun lsp-references.ts <file> <line> <character> [options]')
  console.error('  file: Path to TypeScript/JavaScript file')
  console.error('  line: Line number (0-indexed)')
  console.error('  character: Character position (0-indexed)')
  console.error('  Run with --help for more options')
  process.exit(1)
}

const line = parseInt(lineStr, 10)
const character = parseInt(charStr, 10)

if (Number.isNaN(line) || Number.isNaN(character)) {
  console.error('Error: line and character must be numbers')
  process.exit(1)
}

const absolutePath = await resolveFilePath(filePath)
const uri = `file://${absolutePath}`
const rootUri = `file://${process.cwd()}`

const timeout = values.timeout ? parseInt(values.timeout, 10) : 60000
const debug = values.debug ?? false

const client = new LspClient({ rootUri, requestTimeout: timeout, debug })

try {
  await client.start()

  const file = Bun.file(absolutePath)
  if (!(await file.exists())) {
    console.error(`Error: File not found: ${absolutePath}`)
    process.exit(1)
  }

  const text = await file.text()
  const languageId = absolutePath.endsWith('.tsx')
    ? 'typescriptreact'
    : absolutePath.endsWith('.ts')
      ? 'typescript'
      : absolutePath.endsWith('.jsx')
        ? 'javascriptreact'
        : 'javascript'

  client.openDocument(uri, languageId, 1, text)

  const result = await client.references(uri, line, character, true)

  client.closeDocument(uri)
  await client.stop()

  console.log(JSON.stringify(result, null, 2))
} catch (error) {
  console.error(`Error: ${error}`)
  await client.stop()
  process.exit(1)
}
