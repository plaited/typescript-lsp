---
name: scan-module
description: Fast import/export analysis using Bun.Transpiler.scan() (instant module analysis)
skill: typescript-lsp
---

Fast import/export analysis using Bun's native transpiler.

## Usage

Analyze module imports and exports, build dependency graphs, or find reverse dependencies.

**When to use:**
- Understanding module structure quickly (imports + exports)
- Building dependency graphs
- Finding what imports a file
- Exploring module relationships

**Performance:** ~50-200ms for full dependency graphs

**Benefits over LSP:**
- 10-50x faster for simple import/export analysis
- No need to start TypeScript server
- Accurate parsing using Bun's transpiler

**Limitations:**
- Doesn't understand type-only imports vs runtime imports
- Doesn't resolve re-exports in dependency trees (shows direct imports only)

For comprehensive type-aware reference finding, use `/lsp-refs` instead.

## Examples

Show all imports and exports from a file:
```
/scan-module src/index.ts
```

Build dependency graph with exports:
```
/scan-module src/app.ts -g
```

Find who imports this file (reverse dependencies):
```
/scan-module src/utils/config.ts -r
```

Show dependency tree with exports:
```
/scan-module src/main.ts -t
```
