---
description: Search for TypeScript SYMBOLS (functions, types, classes) - NOT text
allowed-tools: Bash
---

# LSP Find

Search for TypeScript **symbols** (functions, types, classes, variables) across the codebase.

**Arguments:** $ARGUMENTS

## When to Use Each Tool

| Tool | Purpose |
|------|---------|
| **Glob** | Find files by pattern |
| **Grep** | Search text content |
| **lsp-find** | Search TypeScript symbols |
| **lsp-hover** | Get type info + TSDoc documentation |

## Usage

```
/lsp-find <query> <context-file>
```

- `query`: TypeScript symbol name (function, type, class, variable)
- `context-file`: Any `.ts` file in the project for LSP context

## When NOT to Use

```
# ❌ WRONG: Searching for text (use Grep instead)
/lsp-find scaffold
/lsp-find TODO

# ❌ WRONG: Missing context file
/lsp-find createClient

# ✅ CORRECT: Symbol search with context file
/lsp-find createClient src/lsp-client.ts
```

## Instructions

### Step 1: Parse Arguments

Extract query and context file from `$ARGUMENTS`.

If either is missing, show usage:
```
Usage: /lsp-find <query> <context-file>

Examples:
  /lsp-find LspClient src/lsp-client.ts
  /lsp-find createClient src/app.ts
```

### Step 2: Run LSP Find

Execute the development-skills CLI command:
```bash
bunx @plaited/development-skills lsp-find <query> <context-file>
```

### Step 3: Format Output

Parse the JSON output and present results as a table:

| Symbol | Kind | File | Line |
|--------|------|------|------|
| ... | ... | ... | ... |

Group results by file if there are many matches. Highlight the most relevant matches (exact name matches first).
