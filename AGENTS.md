# AGENTS.md

This file provides guidance to Agents when working with code in this repository.

## Overview

This repository provides the **@plaited/development-skills** package with dual distribution:

1. **CLI Tool** - TypeScript LSP integration, code documentation, and skill validation via `bunx @plaited/development-skills`
2. **AI Agent Skills** - Installable skills for AI coding agents

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
- Skills: Installed via [skills-installer](https://github.com/plaited/skills-installer) to `.claude/skills/` for AI agents

When working on the package:
- Test CLI: `bun bin/cli.ts <command>`
- All skills use the CLI tools under the hood

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
Install skills for AI coding agents:
```bash
curl -fsSL https://raw.githubusercontent.com/plaited/skills-installer/main/install.sh | bash -s -- --agent <agent-name> --project development-skills
```

Replace `<agent-name>` with: `claude`, `cursor`, `copilot`, `opencode`, `amp`, `goose`, `factory`

See individual skill SKILL.md files for complete documentation.
