---
name: typescript-lsp
description: REQUIRED for searching code in *.ts, *.tsx, *.js, *.jsx files. Use INSTEAD of Grep for TypeScript/JavaScript - provides type-aware symbol search that understands imports, exports, and relationships. Activate before reading, editing, or searching TypeScript code to verify signatures and find references.
license: ISC
compatibility: Requires bun
allowed-tools: Bash
metadata:
  file-triggers: "*.ts,*.tsx,*.js,*.jsx"
  replaces-tools: Grep
---

# TypeScript LSP Skill

## Purpose

This skill provides **two tiers** of tools for exploring TypeScript/JavaScript codebases:

1. **⚡ Fast Module Analysis** (Bun native) - Lightning-fast import/export scanning
2. **🔍 Type-Aware Analysis** (LSP) - Accurate symbol understanding with type information

**Use `scan-module`** for quick import/export analysis, then **use LSP tools** (`lsp-find`, `lsp-references`, `lsp-hover`) when you need type-aware symbol understanding.

Use these tools to:
- **⚡ Quick module analysis** - Fast import/export scanning with `scan-module`
- **🔍 Accurate symbol search** - Type-aware with `lsp-find` (understands scope, aliases)
- **🔍 Find all references** - Comprehensive with `lsp-references` (includes re-exports)
- **🔍 Understand types** - Get signatures/docs with `lsp-hover`
- **🔍 Batch analysis** - Multiple queries with `lsp-analyze`

## Tool Selection Guide

### Fast Module Analysis (Bun Native)
**Use for**: Quick import/export analysis, dependency graphs

- ⚡ **scan-module** - Analyze imports/exports using Bun.Transpiler.scan()
  - Show imports and exports
  - Build dependency graphs
  - Find reverse dependencies
  - **Performance**: ~50-200ms

### Type-Aware Analysis (LSP)
**Use for**: Symbol understanding, type information, finding references

- 🔍 **lsp-find** - Search for symbols across workspace
- 🔍 **lsp-references** - Find all symbol references (understands re-exports)
- 🔍 **lsp-hover** - Get type signatures and documentation
- 🔍 **lsp-analyze** - Batch analysis (symbols/exports/hover/refs)
- **Performance**: ~500-5000ms depending on operation

### General Search (Built-in Tools)
**Use for**: File patterns, text search, non-TS files

- 📄 **Grep** - Text search in all file types
- 📄 **Glob** - File pattern matching

## When to Use Each Tool

| Task | Best Tool | Why |
|------|-----------|-----|
| Find symbol "parseConfig" | `lsp-find` | Type-aware, understands scope |
| Find all uses of a function | `lsp-references` | Finds aliases, re-exports |
| Get function signature | `lsp-hover` | Shows full type info |
| Understand file exports | `lsp-analyze -e` or `scan-module` | LSP resolves re-exports, scan-module is faster |
| Find who imports a file | `scan-module -r` | Fast reverse dependency search |
| Build dependency graph | `scan-module -g` | Fast dependency tree |
| Understand module structure | `scan-module` | Shows all imports + exports |
| Find files matching pattern | `Glob` | File pattern matching |
| Search for text in comments | `Grep` | Text search |

### Trade-offs

**scan-module vs lsp-analyze**:
- `scan-module`: ~50-200ms, shows imports/exports via transpiler, doesn't resolve re-exports
- `lsp-analyze --exports`: ~1000-3000ms, type-aware, resolves re-exports and type-only exports

**scan-module vs lsp-references**:
- `scan-module -r`: ~50-200ms, finds direct imports only
- `lsp-references`: ~1000-5000ms, finds all references including through re-exports

**Rule of thumb**: Use `scan-module` for quick module exploration, use LSP tools when you need type-aware accuracy.

## When to Use

**Exploring module structure (fast):**
- Run `scan-module` to see imports and exports
- Run `scan-module -g` to visualize dependency graph
- Run `scan-module -r` to find what imports a file

**Finding symbols (type-aware):**
- Run `lsp-find` to search for symbols across the workspace
- Run `lsp-analyze --symbols` to get file structure with types

**Before editing code:**
- Run `lsp-references` to find all usages of a symbol you plan to modify
- Run `lsp-hover` to verify current type signatures
- Run `lsp-analyze --exports` to understand module's public API

**Before writing code:**
- Run `lsp-find` to search for similar patterns or related symbols
- Run `lsp-hover` on APIs you plan to use

## Path Resolution

All scripts accept three types of file paths:
- **Absolute paths**: `/Users/name/project/src/file.ts`
- **Relative paths**: `./src/file.ts` or `../other/file.ts`
- **Package export paths**: `my-package/src/module.ts` (resolved via `Bun.resolve()`)

Package export paths are recommended for portability and consistency with the package's exports field.

## Scripts

### Fast Module Analysis (Bun Native)

#### scan-module
Fast import/export analysis using Bun.Transpiler.scan().

```bash
bun scripts/scan-module.ts <file> [options]
```

**Options:**
- `--imports, -i`: Show imports and exports from the file (default)
- `--graph, -g`: Show full dependency graph with exports
- `--reverse, -r`: Show reverse dependencies (what imports this file)
- `--tree, -t`: Show dependency tree with exports

**Examples:**
```bash
bun scripts/scan-module.ts src/index.ts              # Show imports & exports
bun scripts/scan-module.ts src/utils.ts -g           # Dependency graph
bun scripts/scan-module.ts src/config.ts -r          # Who imports this?
bun scripts/scan-module.ts src/app.ts -t             # Dependency tree
```

**Performance:** ~50-200ms for dependency graphs

### LSP Scripts (Type-Aware)

These scripts start the TypeScript Language Server and provide type-aware analysis.

#### lsp-hover
Get type information at a specific position.

```bash
bun scripts/lsp-hover.ts <file> <line> <char> [options]
```

**Arguments:**
- `file`: Path to TypeScript/JavaScript file
- `line`: Line number (0-indexed)
- `char`: Character position (0-indexed)

**Options:**
- `--timeout <ms>`: Request timeout in milliseconds (default: 60000)
- `--debug, -d`: Enable debug logging to stderr

**Examples:**
```bash
bun scripts/lsp-hover.ts src/utils/parser.ts 42 10
bun scripts/lsp-hover.ts src/utils/parser.ts 42 10 --timeout 120000 --debug
```

#### lsp-references
Find all references to a symbol.

```bash
bun scripts/lsp-references.ts <file> <line> <char> [options]
```

**Options:**
- `--timeout <ms>`: Request timeout in milliseconds (default: 60000)
- `--debug, -d`: Enable debug logging to stderr

**Examples:**
```bash
bun scripts/lsp-references.ts src/utils/parser.ts 42 10
bun scripts/lsp-references.ts src/utils/parser.ts 42 10 --timeout 120000 --debug
```

#### lsp-find
Search for symbols across the workspace.

```bash
bun scripts/lsp-find.ts <query> [context-file] [options]
```

**Arguments:**
- `query`: Symbol name or partial name
- `context-file`: Optional file to open for project context

**Options:**
- `--timeout <ms>`: Request timeout in milliseconds (default: 60000)
- `--debug, -d`: Enable debug logging to stderr

**Examples:**
```bash
bun scripts/lsp-find.ts parseConfig
bun scripts/lsp-find.ts validateInput src/lib/validator.ts
bun scripts/lsp-find.ts UserConfig --timeout 120000 --debug
```

### Batch Script

#### lsp-analyze
Perform multiple analyses in a single session for efficiency.

```bash
bun scripts/lsp-analyze.ts <file> [options]
```

**Options:**
- `--symbols, -s`: List all symbols
- `--exports, -e`: List only exported symbols
- `--hover <line:char>`: Get type info (repeatable)
- `--refs <line:char>`: Find references (repeatable)
- `--all`: Run symbols + exports analysis
- `--timeout <ms>`: Request timeout in milliseconds (default: 60000)
- `--debug, -d`: Enable debug logging to stderr

**Examples:**
```bash
# Get file overview
bun scripts/lsp-analyze.ts src/utils/parser.ts --all

# Check multiple positions
bun scripts/lsp-analyze.ts src/utils/parser.ts --hover 50:10 --hover 75:5

# Before refactoring: find all references
bun scripts/lsp-analyze.ts src/utils/parser.ts --refs 42:10

# Large file with longer timeout and debug output
bun scripts/lsp-analyze.ts src/large-file.ts --all --timeout 120000 --debug
```

## Common Workflows

### Understanding a File

```bash
# 1. Get exports overview
bun scripts/lsp-analyze.ts path/to/file.ts --exports

# 2. For specific type info, hover on interesting symbols
bun scripts/lsp-hover.ts path/to/file.ts <line> <char>
```

### Before Modifying an Export

```bash
# 1. Find all references first
bun scripts/lsp-references.ts path/to/file.ts <line> <char>

# 2. Check what depends on it
# Review the output to understand impact
```

### Finding Patterns

```bash
# Search for similar implementations
bun scripts/lsp-find.ts handleRequest
bun scripts/lsp-find.ts parseConfig
```

### Pre-Implementation Verification

```bash
# Before writing code that uses an API, verify its signature
bun scripts/lsp-hover.ts path/to/api.ts <line> <char>
```

## Output Format

All scripts output JSON to stdout. Errors go to stderr.

**Hover output:**
```json
{
  "contents": {
    "kind": "markdown",
    "value": "```typescript\nconst parseConfig: (options: Options) => Config\n```"
  },
  "range": { "start": {...}, "end": {...} }
}
```

**Symbols output:**
```json
[
  {
    "name": "symbolName",
    "kind": 13,
    "range": { "start": {...}, "end": {...} }
  }
]
```

**Analyze output:**
```json
{
  "file": "path/to/file.ts",
  "exports": [
    { "name": "exportName", "kind": "Constant", "line": 139 }
  ]
}
```

## Performance

Each script invocation:
1. Starts TypeScript Language Server (~300-500ms)
2. Initializes LSP connection
3. Opens document
4. Performs query
5. Closes and stops

For multiple queries on the same file, use `lsp-analyze` to batch operations in a single session.

## Timeout Handling

All LSP scripts have a default timeout of 60 seconds. Large files or complex queries may require longer timeouts.

**When timeouts occur:**
- Error messages include the current timeout value
- Error messages suggest a new timeout value (2x current)
- Use the `--timeout` flag to increase timeout

**Example timeout error:**
```
Error: LSP request timeout: textDocument/hover (timeout=60000ms). Try increasing timeout with --timeout 120000
```

**Retry with suggested timeout:**
```bash
bun scripts/lsp-hover.ts src/large-file.ts 100 50 --timeout 120000
```

**Debug timeout issues:**
Use the `--debug` flag to see which operations are slow:
```bash
bun scripts/lsp-analyze.ts src/large-file.ts --all --debug
```

## Related Skills

- **code-documentation**: TSDoc standards for documentation
