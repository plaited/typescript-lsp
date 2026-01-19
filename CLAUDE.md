# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This repository provides the **@plaited/development-skills** package with dual distribution:

1. **CLI Tool** - TypeScript LSP integration, code documentation, and skill validation via `bunx @plaited/development-skills`
2. **AI Agent Skills** - Installable skills for Claude Code and other AI coding agents via marketplace

The package provides development tools including TypeScript LSP integration, code documentation utilities, and skill validation.

## Essential Commands

### Development Setup
```bash
# Install dependencies (requires bun >= v1.2.9)
bun install

# Type, lint, and format check (check only, no fixes)
bun run check

# Lint and format fix (auto-fix issues)
bun run check:write

# Run unit tests
bun test
```

## Project Rules

This project uses `.plaited/rules/` for shared development rules:

- **Testing**: @.plaited/rules/testing.md - Test commands and workflow
- **Code Review**: @.plaited/rules/code-review.md - Review standards
- **Accuracy**: @.plaited/rules/accuracy.md - Confidence thresholds
- **Bun APIs**: @.plaited/rules/bun-apis.md - Bun platform API preferences
- **Git Workflow**: @.plaited/rules/git-workflow.md - Commit conventions
- **GitHub**: @.plaited/rules/github.md - GitHub CLI integration
- **Module Organization**: @.plaited/rules/module-organization.md - No index files, explicit imports

### Rules Directory Convention

| Directory | Purpose | Scope |
|-----------|---------|-------|
| `.plaited/rules/` | Shared rules from scaffold-rules | Cross-agent (Claude, Cursor, Copilot, etc.) |
| `.claude/rules/` | Claude Code-specific overrides | Claude Code only |
| `.cursor/rules/` | Cursor-specific overrides | Cursor only |

**How it works:**
- `.plaited/rules/` contains rules scaffolded via `scaffold-rules` skill - shared across all agents
- Agent-specific directories (`.claude/rules/`, `.cursor/rules/`) can override or extend shared rules
- Both CLAUDE.md and AGENTS.md reference `.plaited/rules/` for consistency

## Quick Reference

### Package Overview

This repository provides the **@plaited/development-skills** package with the following capabilities:

**TypeScript LSP** (`lsp-*` commands):
- `lsp-hover` - Get type information at a position
- `lsp-find` - Search for symbols across workspace
- `lsp-refs` - Find all references to a symbol
- `lsp-analyze` - Batch analysis of a file

**Code Documentation** - Documentation generation utilities

**Skill Validation** (`validate-skill`) - Validate skills against AgentSkills spec

**Scaffold Rules** (`scaffold-rules`) - Scaffold development rules for AI coding agents

### Code Style Essentials

- Prefer arrow functions and `type` over `interface`
- Use `test` instead of `it` in test files
- Prefer Bun native APIs over Node.js equivalents
- Object parameters for functions with 2+ parameters
- JSON imports require `with { type: 'json' }` attribute

For complete conventions, see `.plaited/rules/code-review.md`

### Package Structure

This project has dual distribution (CLI + AI agent skills):

**CLI Tool:**
- `bin/cli.ts` - CLI entry point with command routing
- `src/` - TypeScript source files (LSP, validation, utilities)
- `package.json` - Defines `bin` entry for CLI execution

**AI Agent Skills:**
- `.claude/skills/typescript-lsp/` - TypeScript LSP skill
- `.claude/skills/code-documentation/` - Code documentation skill
- `.claude/skills/validate-skill/` - Skill validation skill
- `.claude/skills/scaffold-rules/` - Scaffold development rules skill
- `.plaited/rules/` - Shared development rules (bundled with CLI)

**Distribution:**
- CLI: Published to npm, usable via `bunx @plaited/development-skills`
- Skills: Installed via marketplace curl script to `.claude/skills/` for AI agents

When working on the package:
- Test CLI: `bun bin/cli.ts <command>`
- All skills use the CLI tools under the hood

### Documentation

- Public APIs require comprehensive TSDoc documentation
- No `@example` sections - tests are living examples
- Use `@internal` marker for non-public APIs
- Always use `type` over `interface`
- Use Mermaid diagrams only (not ASCII art)

## Important Constraints

1. **No Open Contribution**: This is open-source but not open-contribution
2. **Bun Required**: Development requires bun >= v1.2.9
3. **ES2024 Features**: Uses modern APIs

## CLI Commands

The **@plaited/development-skills** CLI provides:

**TypeScript LSP** (`lsp-*` commands):
- `lsp-hover` - Type-aware hover information (type signatures, docs)
- `lsp-find` - Symbol search across workspace
- `lsp-refs` - Reference finding before refactoring
- `lsp-analyze` - Batch analysis for efficiency

**Skill Validation** (`validate-skill` command):
- Validate skills against AgentSkills spec

**Scaffold Rules** (`scaffold-rules` command):
- Scaffold development rules for AI coding agents

**Usage:**
```bash
# Direct CLI usage
bunx @plaited/development-skills lsp-hover src/app.ts 25 10
bunx @plaited/development-skills lsp-find UserConfig
bunx @plaited/development-skills validate-skill .claude/skills
bunx @plaited/development-skills scaffold-rules

# Or install globally
bun add -g @plaited/development-skills
development-skills lsp-hover src/app.ts 25 10
```

**AI Agent Skills:**
Skills can be installed for AI coding agents (Claude Code, Cursor, etc.) via marketplace:
```bash
curl -fsSL https://raw.githubusercontent.com/plaited/marketplace/main/install.sh | bash -s -- --agent claude --plugin development-skills
```

See individual skill SKILL.md files in `.claude/skills/` for complete documentation.
