---
description: Type-aware symbol search across workspace (use /fast-find for quick text search)
allowed-tools: Bash, Glob
---

# LSP Find

**Type-aware** symbol search across the TypeScript/JavaScript codebase. Understands type aliases, re-exports, and symbol scope.

**Arguments:** $ARGUMENTS

**When to use:**
- Need accurate symbol matching (not just text)
- Understanding type aliases and re-exports
- Symbol disambiguation (e.g., multiple `Config` types)

**For faster text-based search, use `/fast-find` instead.**

## Usage

```
/lsp-find <query> [context-file]
```

- `query`: Symbol name or partial name to search for
- `context-file`: Optional file to open for project context

## Instructions

### Step 1: Parse Arguments

Extract query and optional context file from `$ARGUMENTS`.

If query is missing, show usage:
```
Usage: /lsp-find <query> [context-file]

Examples:
  /lsp-find bElement
  /lsp-find useTemplate src/main/use-template.ts
```

### Step 2: Locate typescript-lsp Skill

Find the typescript-lsp skill directory. Use Glob to locate it:
```glob
**/typescript-lsp/SKILL.md
```

The skill directory is the parent of SKILL.md.

### Step 3: Run LSP Find

From the skill directory, run:
```bash
bun <skill-dir>/scripts/lsp-find.ts <query> [context-file]
```

### Step 4: Format Output

Parse the JSON output and present results as a table:

| Symbol | Kind | File | Line |
|--------|------|------|------|
| ... | ... | ... | ... |

Group results by file if there are many matches. Highlight the most relevant matches (exact name matches first).
