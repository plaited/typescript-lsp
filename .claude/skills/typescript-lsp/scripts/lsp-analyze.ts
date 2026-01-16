#!/usr/bin/env bun
/**
 * Batch analysis script for TypeScript/JavaScript files
 *
 * Performs multiple LSP queries in a single session for efficiency.
 * Useful for understanding a file before making changes.
 *
 * Usage: bun lsp-analyze.ts <file> [options]
 *
 * Options:
 *   --symbols, -s       List all symbols in the file
 *   --exports, -e       List only exported symbols
 *   --hover <line:char> Get type info at position (can be repeated)
 *   --refs <line:char>  Find references at position (can be repeated)
 *   --all               Run all analyses (symbols + exports)
 */

import { parseArgs } from 'node:util'
import { LspClient } from './lsp-client.ts'
import { resolveFilePath } from './resolve-file-path.ts'

type SymbolInfo = {
  name: string
  kind: number
  range: { start: { line: number; character: number }; end: { line: number; character: number } }
  children?: SymbolInfo[]
}

const symbolKindNames: Record<number, string> = {
  1: 'File',
  2: 'Module',
  3: 'Namespace',
  4: 'Package',
  5: 'Class',
  6: 'Method',
  7: 'Property',
  8: 'Field',
  9: 'Constructor',
  10: 'Enum',
  11: 'Interface',
  12: 'Function',
  13: 'Variable',
  14: 'Constant',
  15: 'String',
  16: 'Number',
  17: 'Boolean',
  18: 'Array',
  19: 'Object',
  20: 'Key',
  21: 'Null',
  22: 'EnumMember',
  23: 'Struct',
  24: 'Event',
  25: 'Operator',
  26: 'TypeParameter',
}

const { values, positionals } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    symbols: { type: 'boolean', short: 's' },
    exports: { type: 'boolean', short: 'e' },
    hover: { type: 'string', multiple: true },
    refs: { type: 'string', multiple: true },
    all: { type: 'boolean' },
    timeout: { type: 'string' },
    debug: { type: 'boolean', short: 'd' },
    help: { type: 'boolean', short: 'h' },
  },
  allowPositionals: true,
})

if (values.help || positionals.length === 0) {
  console.log(`
LSP Analyze - Batch analysis for TypeScript/JavaScript files

Usage: bun lsp-analyze.ts <file> [options]

Options:
  --symbols, -s       List all symbols in the file
  --exports, -e       List only exported symbols
  --hover <line:char> Get type info at position (can be repeated)
  --refs <line:char>  Find references at position (can be repeated)
  --all               Run all analyses (symbols + exports)
  --timeout <ms>      Request timeout in milliseconds (default: 60000)
  --debug, -d         Enable debug logging to stderr
  --help, -h          Show this help

Examples:
  bun lsp-analyze.ts plaited/main/b-element.ts --all
  bun lsp-analyze.ts plaited/main/b-element.ts --symbols
  bun lsp-analyze.ts plaited/main/b-element.ts --hover 50:15 --hover 60:20
  bun lsp-analyze.ts plaited/main/b-element.ts --refs 10:8
  bun lsp-analyze.ts plaited/main/b-element.ts --all --timeout 120000 --debug
`)
  process.exit(0)
}

const filePath = positionals[0]!
const absolutePath = await resolveFilePath(filePath)
const uri = `file://${absolutePath}`
const rootUri = `file://${process.cwd()}`

const timeout = values.timeout ? parseInt(values.timeout, 10) : 60000
const debug = values.debug ?? false

if (debug) {
  console.error(`[DEBUG] File: ${filePath}`)
  console.error(`[DEBUG] Absolute path: ${absolutePath}`)
  console.error(`[DEBUG] Timeout: ${timeout}ms`)
}

const client = new LspClient({ rootUri, requestTimeout: timeout, debug })

type AnalysisResult = {
  file: string
  symbols?: Array<{ name: string; kind: string; line: number }>
  exports?: Array<{ name: string; kind: string; line: number }>
  hovers?: Array<{ position: string; content: unknown }>
  references?: Array<{ position: string; locations: unknown }>
}

const extractSymbols = (symbols: SymbolInfo[], prefix = ''): Array<{ name: string; kind: string; line: number }> => {
  const result: Array<{ name: string; kind: string; line: number }> = []
  for (const sym of symbols) {
    result.push({
      name: prefix ? `${prefix}.${sym.name}` : sym.name,
      kind: symbolKindNames[sym.kind] || `Unknown(${sym.kind})`,
      line: sym.range.start.line,
    })
    if (sym.children) {
      result.push(...extractSymbols(sym.children, sym.name))
    }
  }
  return result
}

try {
  if (debug) console.error('[DEBUG] Starting LSP server...')
  await client.start()
  if (debug) console.error('[DEBUG] LSP server started')

  const file = Bun.file(absolutePath)
  if (!(await file.exists())) {
    console.error(`Error: File not found: ${absolutePath}`)
    process.exit(1)
  }

  if (debug) console.error('[DEBUG] Reading file...')
  const text = await file.text()
  const languageId = absolutePath.endsWith('.tsx')
    ? 'typescriptreact'
    : absolutePath.endsWith('.ts')
      ? 'typescript'
      : absolutePath.endsWith('.jsx')
        ? 'javascriptreact'
        : 'javascript'

  if (debug) console.error(`[DEBUG] Opening document (${languageId})...`)
  client.openDocument(uri, languageId, 1, text)

  const result: AnalysisResult = { file: filePath }

  // Get symbols if requested
  if (values.symbols || values.exports || values.all) {
    if (debug) console.error('[DEBUG] Fetching document symbols...')
    const symbols = (await client.documentSymbols(uri)) as SymbolInfo[]
    if (debug) console.error(`[DEBUG] Got ${symbols.length} symbols`)
    const extracted = extractSymbols(symbols)

    if (values.symbols || values.all) {
      result.symbols = extracted
    }

    if (values.exports || values.all) {
      if (debug) console.error('[DEBUG] Filtering exports...')
      // Filter to only top-level exports (items that start with export in source)
      const lines = text.split('\n')
      result.exports = extracted.filter((sym) => {
        const line = lines[sym.line]
        return line?.includes('export')
      })
      if (debug) console.error(`[DEBUG] Found ${result.exports.length} exports`)
    }
  }

  // Get hover info if requested
  if (values.hover?.length) {
    if (debug) console.error(`[DEBUG] Fetching hover info for ${values.hover.length} position(s)...`)
    result.hovers = []
    for (const pos of values.hover) {
      const parts = pos.split(':')
      const lineStr = parts[0] ?? ''
      const charStr = parts[1] ?? ''
      const line = parseInt(lineStr, 10)
      const char = parseInt(charStr, 10)

      if (!Number.isNaN(line) && !Number.isNaN(char)) {
        if (debug) console.error(`[DEBUG] Hover at ${pos}...`)
        const hover = await client.hover(uri, line, char)
        result.hovers.push({ position: pos, content: hover })
      }
    }
  }

  // Get references if requested
  if (values.refs?.length) {
    if (debug) console.error(`[DEBUG] Fetching references for ${values.refs.length} position(s)...`)
    result.references = []
    for (const pos of values.refs) {
      const parts = pos.split(':')
      const lineStr = parts[0] ?? ''
      const charStr = parts[1] ?? ''
      const line = parseInt(lineStr, 10)
      const char = parseInt(charStr, 10)

      if (!Number.isNaN(line) && !Number.isNaN(char)) {
        if (debug) console.error(`[DEBUG] References at ${pos}...`)
        const refs = await client.references(uri, line, char, true)
        result.references.push({ position: pos, locations: refs })
      }
    }
  }

  if (debug) console.error('[DEBUG] Closing document...')
  client.closeDocument(uri)
  if (debug) console.error('[DEBUG] Stopping LSP server...')
  await client.stop()
  if (debug) console.error('[DEBUG] Done')

  console.log(JSON.stringify(result, null, 2))
} catch (error) {
  console.error(`Error: ${error}`)
  await client.stop()
  process.exit(1)
}
