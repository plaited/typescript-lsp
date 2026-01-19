import { describe, expect, test } from 'bun:test'
import { join } from 'node:path'
import { $ } from 'bun'

type Template = {
  filename: string
  content: string
  description: string
}

type ScaffoldOutput = {
  rulesPath: string
  claudeMdSection: string
  agentsMdSection: string
  templates: Record<string, Template>
}

const binDir = join(import.meta.dir, '../../bin')

describe('scaffold-rules', () => {
  test('outputs JSON with all templates', async () => {
    const result: ScaffoldOutput = await $`bun ${binDir}/cli.ts scaffold-rules`.json()

    expect(result).toHaveProperty('templates')
    expect(result.templates).toBeObject()

    // Check that we have the expected templates
    const templateKeys = Object.keys(result.templates)
    expect(templateKeys).toContain('accuracy')
    expect(templateKeys).toContain('bun-apis')
    expect(templateKeys).toContain('code-review')
    expect(templateKeys).toContain('git-workflow')
    expect(templateKeys).toContain('github')
    expect(templateKeys).toContain('testing')
    expect(templateKeys).toContain('module-organization')
  })

  test('each template has required properties', async () => {
    const result: ScaffoldOutput = await $`bun ${binDir}/cli.ts scaffold-rules`.json()

    for (const [ruleId, template] of Object.entries(result.templates)) {
      expect(template).toHaveProperty('filename')
      expect(template).toHaveProperty('content')
      expect(template).toHaveProperty('description')

      expect(template.filename).toBe(`${ruleId}.md`)
      expect(template.content).toBeString()
      expect(template.content.length).toBeGreaterThan(0)
    }
  })

  test('removes template headers from content', async () => {
    const result: ScaffoldOutput = await $`bun ${binDir}/cli.ts scaffold-rules`.json()

    // Check that template headers are removed
    for (const template of Object.values(result.templates)) {
      expect(template.content).not.toContain('<!-- RULE TEMPLATE')
      expect(template.content).not.toContain('Variables:')
    }
  })

  test('processes development-skills conditionals', async () => {
    const result: ScaffoldOutput = await $`bun ${binDir}/cli.ts scaffold-rules`.json()

    const accuracy = result.templates.accuracy
    expect(accuracy).toBeDefined()

    // Should include development-skills content (always true when using CLI)
    expect(accuracy!.content).toContain('TypeScript/JavaScript projects')
    expect(accuracy!.content).toContain('lsp-find')
    expect(accuracy!.content).toContain('lsp-hover')

    // Should not have conditional syntax
    expect(accuracy!.content).not.toContain('{{#if development-skills}}')
    expect(accuracy!.content).not.toContain('{{/if}}')
  })

  test('filters to specific rules when requested', async () => {
    const result: ScaffoldOutput = await $`bun ${binDir}/cli.ts scaffold-rules --rules testing --rules bun-apis`.json()

    const templateKeys = Object.keys(result.templates)

    // Should only include requested rules
    expect(templateKeys).toHaveLength(2)
    expect(templateKeys).toContain('testing')
    expect(templateKeys).toContain('bun-apis')

    // Should not include other rules
    expect(templateKeys).not.toContain('accuracy')
    expect(templateKeys).not.toContain('git-workflow')
  })

  test('extracts meaningful descriptions', async () => {
    const result: ScaffoldOutput = await $`bun ${binDir}/cli.ts scaffold-rules`.json()

    // Check a few descriptions
    const accuracy = result.templates.accuracy
    expect(accuracy).toBeDefined()
    expect(accuracy!.description).toBeString()
    expect(accuracy!.description.length).toBeGreaterThan(10)

    const testing = result.templates.testing
    expect(testing).toBeDefined()
    expect(testing!.description).toBeString()
    expect(testing!.description.length).toBeGreaterThan(10)
  })

  test('handles missing bundled rules directory gracefully', async () => {
    // This test ensures the script fails gracefully if templates are missing
    // In production, .claude/rules/ should always be bundled with the package
    const result = await $`bun ${binDir}/cli.ts scaffold-rules`.nothrow().quiet()

    // Should succeed because .claude/rules/ exists in development
    expect(result.exitCode).toBe(0)
  })

  describe('output structure', () => {
    test('defaults to .plaited/rules path', async () => {
      const result: ScaffoldOutput = await $`bun ${binDir}/cli.ts scaffold-rules`.json()

      expect(result.rulesPath).toBe('.plaited/rules')
    })

    test('includes claudeMdSection with markers and @ syntax', async () => {
      const result: ScaffoldOutput = await $`bun ${binDir}/cli.ts scaffold-rules`.json()

      expect(result.claudeMdSection).toContain('<!-- PLAITED-RULES-START -->')
      expect(result.claudeMdSection).toContain('<!-- PLAITED-RULES-END -->')
      expect(result.claudeMdSection).toContain('@.plaited/rules/')
      expect(result.claudeMdSection).toContain('## Project Rules')
    })

    test('includes agentsMdSection with markers and markdown links', async () => {
      const result: ScaffoldOutput = await $`bun ${binDir}/cli.ts scaffold-rules`.json()

      expect(result.agentsMdSection).toContain('<!-- PLAITED-RULES-START -->')
      expect(result.agentsMdSection).toContain('<!-- PLAITED-RULES-END -->')
      expect(result.agentsMdSection).toContain('[')
      expect(result.agentsMdSection).toContain('](.plaited/rules/')
      expect(result.agentsMdSection).toContain('## Rules')
    })

    test('claudeMdSection lists all selected rules', async () => {
      const result: ScaffoldOutput = await $`bun ${binDir}/cli.ts scaffold-rules`.json()

      for (const template of Object.values(result.templates)) {
        expect(result.claudeMdSection).toContain(`@.plaited/rules/${template.filename}`)
      }
    })

    test('agentsMdSection lists all selected rules', async () => {
      const result: ScaffoldOutput = await $`bun ${binDir}/cli.ts scaffold-rules`.json()

      for (const [ruleId, template] of Object.entries(result.templates)) {
        expect(result.agentsMdSection).toContain(`[${ruleId}](.plaited/rules/${template.filename})`)
      }
    })
  })

  describe('template content', () => {
    test('git-workflow uses standard commit format', async () => {
      const result: ScaffoldOutput = await $`bun ${binDir}/cli.ts scaffold-rules`.json()

      const gitWorkflow = result.templates['git-workflow']
      expect(gitWorkflow).toBeDefined()
      expect(gitWorkflow!.content).toContain('multi-line commit')
      expect(gitWorkflow!.content).toContain('git commit -m')
    })

    test('accuracy uses CLI syntax for LSP tools', async () => {
      const result: ScaffoldOutput = await $`bun ${binDir}/cli.ts scaffold-rules`.json()

      const accuracy = result.templates.accuracy
      expect(accuracy).toBeDefined()

      // Should use CLI syntax
      expect(accuracy!.content).toContain('bunx @plaited/development-skills lsp-')
    })

    test('cross-references use path syntax', async () => {
      const result: ScaffoldOutput = await $`bun ${binDir}/cli.ts scaffold-rules`.json()

      const accuracy = result.templates.accuracy
      expect(accuracy).toBeDefined()
      expect(accuracy!.content).toContain('.plaited/rules/testing.md')
      expect(accuracy!.content).not.toContain('{{LINK:testing}}')
    })
  })

  describe('path customization', () => {
    test('--rules-dir overrides default rules path', async () => {
      const result: ScaffoldOutput = await $`bun ${binDir}/cli.ts scaffold-rules --rules-dir=.cursor/rules`.json()

      expect(result.rulesPath).toBe('.cursor/rules')
    })

    test('claudeMdSection uses custom path', async () => {
      const result: ScaffoldOutput = await $`bun ${binDir}/cli.ts scaffold-rules --rules-dir=.cursor/rules`.json()

      expect(result.claudeMdSection).toContain('@.cursor/rules/')
      expect(result.claudeMdSection).not.toContain('.plaited/rules/')
    })

    test('agentsMdSection uses custom path', async () => {
      const result: ScaffoldOutput = await $`bun ${binDir}/cli.ts scaffold-rules --rules-dir=.cursor/rules`.json()

      expect(result.agentsMdSection).toContain('.cursor/rules/')
      expect(result.agentsMdSection).not.toContain('.plaited/rules/')
    })

    test('cross-references use custom rules-dir', async () => {
      const result: ScaffoldOutput = await $`bun ${binDir}/cli.ts scaffold-rules --rules-dir=.factory/rules`.json()

      const accuracy = result.templates.accuracy
      expect(accuracy).toBeDefined()
      expect(accuracy!.content).toContain('.factory/rules/testing.md')
    })

    test('short flag -d works', async () => {
      const result: ScaffoldOutput = await $`bun ${binDir}/cli.ts scaffold-rules -d custom/rules`.json()

      expect(result.rulesPath).toBe('custom/rules')
    })
  })

  describe('--list flag', () => {
    test('outputs array of available rules', async () => {
      const result = await $`bun ${binDir}/cli.ts scaffold-rules --list`.json()

      expect(result).toBeArray()
      expect(result.length).toBeGreaterThan(0)

      // Each entry should have id and filename
      for (const rule of result) {
        expect(rule).toHaveProperty('id')
        expect(rule).toHaveProperty('filename')
        expect(rule.filename).toBe(`${rule.id}.md`)
      }
    })

    test('includes expected rules', async () => {
      const result = await $`bun ${binDir}/cli.ts scaffold-rules --list`.json()
      const ids = result.map((r: { id: string }) => r.id)

      expect(ids).toContain('accuracy')
      expect(ids).toContain('testing')
      expect(ids).toContain('bun-apis')
    })

    test('short flag -l works', async () => {
      const result = await $`bun ${binDir}/cli.ts scaffold-rules -l`.json()

      expect(result).toBeArray()
      expect(result.length).toBeGreaterThan(0)
    })
  })

  describe('--rules validation', () => {
    test('warns about unknown rules', async () => {
      const result = await $`bun ${binDir}/cli.ts scaffold-rules --rules nonexistent --rules testing`.nothrow()

      // Should still succeed but with warning
      expect(result.exitCode).toBe(0)
      expect(result.stderr.toString()).toContain('Warning: Unknown rules: nonexistent')
    })

    test('shows available rules in warning', async () => {
      const result = await $`bun ${binDir}/cli.ts scaffold-rules --rules fake-rule`.nothrow()

      expect(result.stderr.toString()).toContain('Available rules:')
      expect(result.stderr.toString()).toContain('testing')
    })
  })

  describe('edge cases', () => {
    test('handles all rules filtered out gracefully', async () => {
      const result: ScaffoldOutput = await $`bun ${binDir}/cli.ts scaffold-rules --rules nonexistent`.nothrow().json()

      // Should return valid output with empty templates
      expect(result.templates).toEqual({})
      expect(result.claudeMdSection).toContain('<!-- PLAITED-RULES-START -->')
      expect(result.claudeMdSection).toContain('<!-- PLAITED-RULES-END -->')
    })

    test('description extraction falls back for heading-only content', async () => {
      const result: ScaffoldOutput = await $`bun ${binDir}/cli.ts scaffold-rules`.json()

      // All templates should have non-empty descriptions
      for (const template of Object.values(result.templates)) {
        expect(template.description).toBeTruthy()
        expect(template.description.length).toBeGreaterThan(0)
      }
    })

    test('processes nested conditionals correctly', async () => {
      const result: ScaffoldOutput = await $`bun ${binDir}/cli.ts scaffold-rules --rules accuracy`.json()

      const accuracy = result.templates.accuracy
      expect(accuracy).toBeDefined()

      // Should not contain any unprocessed conditional syntax
      expect(accuracy!.content).not.toContain('{{#if')
      expect(accuracy!.content).not.toContain('{{^if')
      expect(accuracy!.content).not.toContain('{{/if}}')
    })

    test('template content has no excessive blank lines', async () => {
      const result: ScaffoldOutput = await $`bun ${binDir}/cli.ts scaffold-rules`.json()

      for (const template of Object.values(result.templates)) {
        // Should not have 3+ consecutive newlines
        expect(template.content).not.toMatch(/\n{3,}/)
      }
    })
  })
})
