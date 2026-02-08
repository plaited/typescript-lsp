# AGENTS.md

## Overview

**@plaited/development-skills** - Dual distribution: CLI + AI agent skills

## Capabilities

**LSP** (`lsp-*`): Type-aware hover, symbol search, references, batch analysis  
**Docs**: TSDoc generation utilities  
**Validation** (`validate-skill`): AgentSkills spec compliance  
**Rules** (`scaffold-rules`): Development rule scaffolding

## Structure

```
bin/cli.ts              # CLI entry point
src/                    # TypeScript source
.agents/skills/        # Agent skills
.agents/rules/         # Shared rules (bundled)
```

**Test CLI:** `bun bin/cli.ts <command>`  
**Install skills:** `npx skills add plaited/development-skills` or `bunx skills add plaited/development-skills`

## Commands

```bash
bun install              # Setup (bun >= v1.2.9)
bun run check            # Type/lint/format check
bun run check:write      # Auto-fix lint/format
bun test                 # Unit tests
```

## Verification

After code changes:
1. `bun run check` - Must pass
2. `bun test` - Must pass  
3. `bun bin/cli.ts <cmd>` - Test CLI changes
4. For skills: `bunx @plaited/development-skills validate-skill .agents/skills`

**Rule compliance:** Read rules below, use verification patterns to self-check

## Workflow

- **Plan first**: Multi-file changes require approved plan
- **Verify incrementally**: Test after each change
- **Sync distributions**: Skills + CLI must stay aligned

## Constraints

- Open-source, not open-contribution
- Requires: Bun >= v1.2.9, ES2024 features

<!-- PLAITED-RULES-START -->

## Rules

Compressed rules with embedded verification patterns:

- @.agents/rules/core.md - TypeScript conventions (type>interface, no any, arrow fns)
- @.agents/rules/testing.md - Test patterns (test>it, no conditional assertions)
- @.agents/rules/modules.md - Module organization (no index.ts, explicit .ts)
- @.agents/rules/workflow.md - Git + GitHub CLI patterns
- @.agents/rules/bun.md - Bun APIs over Node.js
- @.agents/rules/accuracy.md - 95% confidence, verify before stating
- @.agents/rules/documentation.md - TSDoc standards

<!-- PLAITED-RULES-END -->

## Learnings

<!-- Patterns discovered during development -->
- 2026-01-24: Skills use CLI tools, never duplicate logic
- 2026-01-24: Rules include verification patterns - agents self-check using lsp-find/grep
