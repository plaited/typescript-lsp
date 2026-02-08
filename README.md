# @plaited/development-skills

[![npm version](https://img.shields.io/npm/v/@plaited/development-skills.svg)](https://www.npmjs.com/package/@plaited/development-skills)
[![CI](https://github.com/plaited/acp-harness/actions/workflows/ci.yml/badge.svg)](https://github.com/plaited/development-skills/actions/workflows/ci.yml)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

 > TypeScript LSP tools and AI agent skills for modern development workflows

## Examples

```bash
# Find where a type is defined
bunx @plaited/development-skills lsp-find UserConfig

# Get type info at cursor position (line 25, column 10)
bunx @plaited/development-skills lsp-hover src/app.ts 25 10

# Find all usages of a symbol
bunx @plaited/development-skills lsp-refs src/types.ts 15 12

# Validate your AI agent skills
bunx @plaited/development-skills validate-skill .claude/skills

# Scaffold development rules for your project
bunx @plaited/development-skills scaffold-rules
```

## Why LSP?

Text search finds strings. LSP finds *meaning*.

```bash
# Text search: finds "Config" in comments, strings, everywhere
grep -r "Config" src/

# LSP search: finds the actual Config type and its usages
bunx @plaited/development-skills lsp-find Config
```

LSP understands re-exports, aliases, and type relationships.

## Install for AI Agents

```bash
npx skills add plaited/development-skills
# or
bunx skills add plaited/development-skills
```

## Commands

| Command | What it does |
|---------|--------------|
| `lsp-hover` | Type info at position |
| `lsp-find` | Symbol search |
| `lsp-refs` | Find references |
| `lsp-analyze` | Batch file analysis |
| `validate-skill` | Validate AgentSkills |
| `scaffold-rules` | Scaffold dev rules |

## Skills Included

- **typescript-lsp** - LSP integration for AI agents
- **code-documentation** - TSDoc workflow and standards
- **validate-skill** - Skill validation
- **scaffold-rules** - Development rules scaffolding

## License

ISC
