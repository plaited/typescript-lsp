#!/usr/bin/env bun
/**
 * Scaffold development rules from templates
 *
 * Reads bundled rule templates, processes template variables,
 * and outputs JSON for agent consumption.
 *
 * All agents use `.plaited/rules/` as the unified default location.
 * AGENTS.md serves as the single source of truth for rules content,
 * while CLAUDE.md simply references it via @AGENTS.md syntax.
 *
 * Options:
 * - --rules-dir, -d: Custom rules directory path (overrides default .plaited/rules)
 * - --rules, -r: Filter to specific rules (can be used multiple times)
 * - --list, -l: List available rules without full output
 *
 * Output includes:
 * - agentsMdSection: Marker-wrapped section with markdown links for AGENTS.md
 * - claudeMdReference: Short reference snippet pointing to @AGENTS.md
 * - templates: Processed rule content for each selected rule
 *
 * Template syntax:
 * - {{LINK:rule-id}} - Cross-reference to another rule
 * - {{#if development-skills}}...{{/if}} - Conditional block (always true when using CLI)
 * - {{^if development-skills}}...{{/if}} - Inverse conditional
 * - <!-- RULE TEMPLATE ... --> - Template header (removed)
 *
 * @example
 * ```bash
 * # Default: outputs to .plaited/rules/
 * bunx @plaited/development-skills scaffold-rules
 *
 * # Custom rules directory
 * bunx @plaited/development-skills scaffold-rules --rules-dir=.cursor/rules
 *
 * # Filter specific rules
 * bunx @plaited/development-skills scaffold-rules --rules testing --rules bun-apis
 *
 * # List available rules
 * bunx @plaited/development-skills scaffold-rules --list
 * ```
 */

import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { parseArgs } from 'node:util'

/**
 * Marker delimiters for programmatic file updates
 *
 * @remarks
 * These markers allow scaffold-rules to update CLAUDE.md and AGENTS.md
 * without destroying user content outside the marked section.
 *
 * Use these markers to implement idempotent updates:
 * 1. Find existing markers in file content
 * 2. Replace content between markers (inclusive) with new section
 * 3. If no markers exist, append section to end of file
 *
 * @property start - Opening marker to place before rules section
 * @property end - Closing marker to place after rules section
 *
 * @public
 */
export const MARKERS = {
  start: '<!-- PLAITED-RULES-START -->',
  end: '<!-- PLAITED-RULES-END -->',
} as const

/**
 * Unified rules directory path
 *
 * @remarks
 * All agents use `.plaited/rules/` as the default location.
 * This provides consistency and allows both CLAUDE.md and AGENTS.md
 * to reference the same rule files.
 */
const UNIFIED_RULES_PATH = '.plaited/rules' as const

type TemplateContext = {
  rulesPath: string
}

/**
 * Processed template with filename, content, and description
 */
export type ProcessedTemplate = {
  filename: string
  content: string
  description: string
}

/**
 * Output from scaffold-rules CLI
 */
export type ScaffoldOutput = {
  rulesPath: string
  /** Marker-wrapped section with markdown links for AGENTS.md */
  agentsMdSection: string
  /** Short reference snippet for CLAUDE.md pointing to AGENTS.md */
  claudeMdReference: string
  templates: Record<string, ProcessedTemplate>
}

/**
 * Process template conditionals
 *
 * Handles:
 * - {{#if development-skills}}...{{/if}} - Always true (using our CLI means dev-skills is installed)
 * - {{^if development-skills}}...{{/if}} - Always false
 *
 * Processes iteratively to handle nested conditionals correctly.
 */
const processConditionals = (content: string): string => {
  let result = content
  let previousResult = ''
  const maxIterations = 100
  let iterations = 0

  // Process iteratively until no more changes (handles nested conditionals)
  while (result !== previousResult && iterations < maxIterations) {
    previousResult = result
    iterations++

    // Process positive conditionals {{#if development-skills}}...{{/if}}
    // Always true - include the block content
    result = result.replace(
      /\{\{#if development-skills\}\}((?:(?!\{\{#if )(?!\{\{\^if )(?!\{\{\/if\}\})[\s\S])*?)\{\{\/if\}\}/g,
      (_, block) => block,
    )

    // Process inverse conditionals {{^if development-skills}}...{{/if}}
    // Always false - remove the block content
    result = result.replace(
      /\{\{\^if development-skills\}\}((?:(?!\{\{#if )(?!\{\{\^if )(?!\{\{\/if\}\})[\s\S])*?)\{\{\/if\}\}/g,
      () => '',
    )
  }

  if (iterations >= maxIterations) {
    console.warn('Warning: Max iterations reached in template processing. Some conditionals may be unprocessed.')
  }

  return result
}

/**
 * Process template variables
 *
 * Handles:
 * - {{LINK:rule-id}} - Generate cross-reference path
 * - {{RULES_PATH}} - Rules path
 */
const processVariables = (content: string, context: TemplateContext): string => {
  let result = content

  // Replace {{LINK:rule-id}} with path reference
  result = result.replace(/\{\{LINK:(\w+)\}\}/g, (_, ruleId) => {
    return `${context.rulesPath}/${ruleId}.md`
  })

  // Replace {{RULES_PATH}}
  result = result.replace(/\{\{RULES_PATH\}\}/g, context.rulesPath)

  return result
}

/**
 * Remove template headers
 */
const removeTemplateHeaders = (content: string): string => {
  return content.replace(/<!--[\s\S]*?-->\n*/g, '')
}

/**
 * Extract description from rule content
 */
const extractDescription = (content: string): string => {
  // Look for first paragraph or heading after main title
  const lines = content.split('\n')
  let description = ''

  for (let i = 1; i < lines.length; i++) {
    // Non-null assertion safe: loop condition guarantees i < lines.length
    const line = lines[i]!.trim()
    if (line && !line.startsWith('#') && !line.startsWith('**')) {
      description = line
      break
    }
  }

  return description || 'Development rule'
}

/**
 * Process a template with context
 */
const processTemplate = (content: string, context: TemplateContext): string => {
  let result = content

  // 1. Remove template headers
  result = removeTemplateHeaders(result)

  // 2. Process conditionals
  result = processConditionals(result)

  // 3. Process variables
  result = processVariables(result, context)

  // 4. Clean up extra blank lines
  result = result.replace(/\n{3,}/g, '\n\n')

  return result
}

/**
 * Generate marker-wrapped reference snippet for CLAUDE.md
 *
 * @remarks
 * Claude Code uses `@file.md` syntax to include file contents.
 * This generates a short reference pointing to AGENTS.md as the single source of truth.
 * The markers allow this section to be updated without affecting other content.
 */
const generateClaudeMdReference = (): string => {
  const lines = [
    MARKERS.start,
    '',
    '## Project Rules',
    '',
    'See @AGENTS.md for shared development rules.',
    '',
    MARKERS.end,
  ]

  return lines.join('\n')
}

/**
 * Generate marker-wrapped section for AGENTS.md with dual format
 *
 * @remarks
 * AGENTS.md uses both formats for maximum compatibility:
 * - `@path` syntax for Claude Code to load file contents
 * - `[name](path)` markdown links for other tools and GitHub rendering
 * The markers allow this section to be updated without affecting other content.
 */
const generateAgentsMdSection = (templates: Record<string, ProcessedTemplate>, rulesPath: string): string => {
  const lines = [
    MARKERS.start,
    '',
    '## Rules',
    '',
    `This project uses modular development rules stored in \`${rulesPath}/\`.`,
    'Each rule file covers a specific topic:',
    '',
  ]

  for (const [ruleId, template] of Object.entries(templates)) {
    // Dual format: @ syntax for Claude Code, markdown link for other tools
    lines.push(`- @${rulesPath}/${template.filename} - [${ruleId}](${rulesPath}/${template.filename})`)
  }

  lines.push('')
  lines.push(MARKERS.end)

  return lines.join('\n')
}

/**
 * Main scaffold-rules function
 */
export const scaffoldRules = async (args: string[]): Promise<void> => {
  const { values } = parseArgs({
    args,
    options: {
      rules: {
        type: 'string',
        short: 'r',
        multiple: true,
      },
      'rules-dir': {
        type: 'string',
        short: 'd',
      },
      list: {
        type: 'boolean',
        short: 'l',
      },
    },
    allowPositionals: true,
    strict: false,
  })

  const rulesFilter = values.rules as string[] | undefined
  const customRulesDir = values['rules-dir'] as string | undefined
  const listOnly = values.list as boolean | undefined

  // Get bundled templates directory
  const packageRulesDir = join(import.meta.dir, '../.plaited/rules')

  // Read template files
  const templateFiles = await readdir(packageRulesDir)

  // Filter to .md files
  const mdFiles = templateFiles.filter((f) => f.endsWith('.md'))
  const availableRuleIds = mdFiles.map((f) => f.replace('.md', ''))

  // Validate requested rules exist
  if (rulesFilter) {
    const invalidRules = rulesFilter.filter((r) => !availableRuleIds.includes(r))
    if (invalidRules.length > 0) {
      console.error(`Warning: Unknown rules: ${invalidRules.join(', ')}`)
      console.error(`Available rules: ${availableRuleIds.join(', ')}`)
    }
  }

  // Handle --list flag: output available rules and exit
  if (listOnly) {
    const listOutput = availableRuleIds.map((id) => ({ id, filename: `${id}.md` }))
    console.log(JSON.stringify(listOutput, null, 2))
    return
  }

  // Filter if specific rules requested
  const rulesToProcess = rulesFilter ? mdFiles.filter((f) => rulesFilter.includes(f.replace('.md', ''))) : mdFiles

  // Process each template
  const templates: Record<string, ProcessedTemplate> = {}

  // Use custom path or unified default
  const rulesPath = customRulesDir ?? UNIFIED_RULES_PATH

  const context: TemplateContext = {
    rulesPath,
  }

  for (const file of rulesToProcess) {
    const templatePath = join(packageRulesDir, file)
    const ruleId = file.replace('.md', '')

    try {
      const content = await Bun.file(templatePath).text()

      // Process template
      const processed = processTemplate(content, context)

      templates[ruleId] = {
        filename: file,
        content: processed,
        description: extractDescription(processed),
      }
    } catch (error) {
      console.error(`Error processing template ${file}:`, error)
      process.exit(1)
    }
  }

  // Generate marker-wrapped section for AGENTS.md and reference for CLAUDE.md
  const agentsMdSection = generateAgentsMdSection(templates, rulesPath)
  const claudeMdReference = generateClaudeMdReference()

  // Build output
  const output: ScaffoldOutput = {
    rulesPath,
    agentsMdSection,
    claudeMdReference,
    templates,
  }

  console.log(JSON.stringify(output, null, 2))
}

// CLI entry point
if (import.meta.main) {
  await scaffoldRules(Bun.argv.slice(2))
}
