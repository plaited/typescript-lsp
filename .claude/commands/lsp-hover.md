---
description: Get TypeScript type signature + TSDoc documentation at a position
allowed-tools: Bash
---

# LSP Hover

Get type signature and TSDoc documentation at a specific position in a TypeScript/JavaScript file.

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
/lsp-hover <file> <line> <char>
```

- `file`: Path to TypeScript/JavaScript file (absolute, relative, or package export path)
- `line`: Line number (0-indexed)
- `char`: Character position (0-indexed)

## Instructions

### Step 1: Parse Arguments

Extract file path, line, and character from `$ARGUMENTS`.

If arguments are missing, show usage:
```
Usage: /lsp-hover <file> <line> <char>

Example: /lsp-hover src/utils/parser.ts 42 15
```

### Step 2: Run LSP Hover

Execute the development-skills CLI command:
```bash
bunx @plaited/development-skills lsp-hover <file> <line> <char>
```

### Step 3: Format Output

Parse the JSON output and present the type information in a readable format:

- Show the type signature in a code block
- If documentation is present, show it below
- If no hover info found, explain that no type information is available at that position
