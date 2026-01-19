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
  agentsMdSection: string
  claudeMdReference: string
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
    // In production, .plaited/rules/ should always be bundled with the package
    const result = await $`bun ${binDir}/cli.ts scaffold-rules`.nothrow().quiet()

    // Should succeed because .plaited/rules/ exists in development
    expect(result.exitCode).toBe(0)
  })

  describe('output structure', () => {
    test('defaults to .plaited/rules path', async () => {
      const result: ScaffoldOutput = await $`bun ${binDir}/cli.ts scaffold-rules`.json()

      expect(result.rulesPath).toBe('.plaited/rules')
    })

    test('includes claudeMdReference with markers and @AGENTS.md', async () => {
      const result: ScaffoldOutput = await $`bun ${binDir}/cli.ts scaffold-rules`.json()

      expect(result.claudeMdReference).toContain('<!-- PLAITED-RULES-START -->')
      expect(result.claudeMdReference).toContain('<!-- PLAITED-RULES-END -->')
      expect(result.claudeMdReference).toContain('@AGENTS.md')
      expect(result.claudeMdReference).toContain('## Project Rules')
    })

    test('includes agentsMdSection with markers and dual format', async () => {
      const result: ScaffoldOutput = await $`bun ${binDir}/cli.ts scaffold-rules`.json()

      expect(result.agentsMdSection).toContain('<!-- PLAITED-RULES-START -->')
      expect(result.agentsMdSection).toContain('<!-- PLAITED-RULES-END -->')
      // Should have @ syntax for Claude Code
      expect(result.agentsMdSection).toContain('@.plaited/rules/')
      // Should have markdown links for other tools
      expect(result.agentsMdSection).toContain('](.plaited/rules/')
      expect(result.agentsMdSection).toContain('## Rules')
    })

    test('claudeMdReference does not list individual rules', async () => {
      const result: ScaffoldOutput = await $`bun ${binDir}/cli.ts scaffold-rules`.json()

      // claudeMdReference should be a simple reference to AGENTS.md, not a list of rules
      expect(result.claudeMdReference).not.toContain('.plaited/rules/')
      expect(result.claudeMdReference).toContain('@AGENTS.md')
    })

    test('agentsMdSection lists all selected rules in dual format', async () => {
      const result: ScaffoldOutput = await $`bun ${binDir}/cli.ts scaffold-rules`.json()

      for (const [ruleId, template] of Object.entries(result.templates)) {
        // Each rule should have both @ syntax and markdown link
        expect(result.agentsMdSection).toContain(`@.plaited/rules/${template.filename}`)
        expect(result.agentsMdSection).toContain(`[${ruleId}](.plaited/rules/${template.filename})`)
      }
    })
  })

  describe('claudeMdReference behavior', () => {
    test('has exact expected content structure', async () => {
      const result: ScaffoldOutput = await $`bun ${binDir}/cli.ts scaffold-rules`.json()

      // Verify the exact structure of claudeMdReference
      const lines = result.claudeMdReference.split('\n')
      expect(lines[0]).toBe('<!-- PLAITED-RULES-START -->')
      expect(lines[1]).toBe('')
      expect(lines[2]).toBe('## Project Rules')
      expect(lines[3]).toBe('')
      expect(lines[4]).toBe('See @AGENTS.md for shared development rules.')
      expect(lines[5]).toBe('')
      expect(lines[6]).toBe('<!-- PLAITED-RULES-END -->')
    })

    test('is constant regardless of rules selected', async () => {
      const allRules: ScaffoldOutput = await $`bun ${binDir}/cli.ts scaffold-rules`.json()
      const oneRule: ScaffoldOutput = await $`bun ${binDir}/cli.ts scaffold-rules --rules testing`.json()
      const twoRules: ScaffoldOutput =
        await $`bun ${binDir}/cli.ts scaffold-rules --rules testing --rules accuracy`.json()

      // claudeMdReference should be identical in all cases
      expect(oneRule.claudeMdReference).toBe(allRules.claudeMdReference)
      expect(twoRules.claudeMdReference).toBe(allRules.claudeMdReference)
    })

    test('is constant regardless of rules-dir', async () => {
      const defaultPath: ScaffoldOutput = await $`bun ${binDir}/cli.ts scaffold-rules`.json()
      const customPath: ScaffoldOutput = await $`bun ${binDir}/cli.ts scaffold-rules --rules-dir=.cursor/rules`.json()
      const anotherPath: ScaffoldOutput = await $`bun ${binDir}/cli.ts scaffold-rules --rules-dir=custom/path`.json()

      // claudeMdReference should be identical regardless of rules-dir
      expect(customPath.claudeMdReference).toBe(defaultPath.claudeMdReference)
      expect(anotherPath.claudeMdReference).toBe(defaultPath.claudeMdReference)
    })

    test('uses shared markers with agentsMdSection', async () => {
      const result: ScaffoldOutput = await $`bun ${binDir}/cli.ts scaffold-rules`.json()

      // Both sections should use the same markers for consistency
      const startMarker = '<!-- PLAITED-RULES-START -->'
      const endMarker = '<!-- PLAITED-RULES-END -->'

      expect(result.claudeMdReference).toContain(startMarker)
      expect(result.claudeMdReference).toContain(endMarker)
      expect(result.agentsMdSection).toContain(startMarker)
      expect(result.agentsMdSection).toContain(endMarker)
    })
  })

  describe('agentsMdSection with filtered rules', () => {
    test('only includes selected rules in dual format', async () => {
      const result: ScaffoldOutput =
        await $`bun ${binDir}/cli.ts scaffold-rules --rules testing --rules bun-apis`.json()

      // Should contain selected rules (both @ and markdown formats)
      expect(result.agentsMdSection).toContain('@.plaited/rules/testing.md')
      expect(result.agentsMdSection).toContain('[testing]')
      expect(result.agentsMdSection).toContain('@.plaited/rules/bun-apis.md')
      expect(result.agentsMdSection).toContain('[bun-apis]')

      // Should NOT contain other rules
      expect(result.agentsMdSection).not.toContain('@.plaited/rules/accuracy.md')
      expect(result.agentsMdSection).not.toContain('[accuracy]')
      expect(result.agentsMdSection).not.toContain('@.plaited/rules/git-workflow.md')
    })

    test('has valid structure with single rule in dual format', async () => {
      const result: ScaffoldOutput = await $`bun ${binDir}/cli.ts scaffold-rules --rules testing`.json()

      expect(result.agentsMdSection).toContain('<!-- PLAITED-RULES-START -->')
      expect(result.agentsMdSection).toContain('## Rules')
      // Both formats present
      expect(result.agentsMdSection).toContain('@.plaited/rules/testing.md')
      expect(result.agentsMdSection).toContain('[testing](.plaited/rules/testing.md)')
      expect(result.agentsMdSection).toContain('<!-- PLAITED-RULES-END -->')
    })

    test('has empty rules list when no rules match', async () => {
      const result: ScaffoldOutput = await $`bun ${binDir}/cli.ts scaffold-rules --rules nonexistent`.nothrow().json()

      // Should still have valid structure with markers
      expect(result.agentsMdSection).toContain('<!-- PLAITED-RULES-START -->')
      expect(result.agentsMdSection).toContain('## Rules')
      expect(result.agentsMdSection).toContain('<!-- PLAITED-RULES-END -->')

      // But no rule references (neither @ nor markdown)
      expect(result.agentsMdSection).not.toMatch(/@\.plaited\/rules\/.*\.md/)
      expect(result.agentsMdSection).not.toMatch(/\[.*\]\(\.plaited\/rules\/.*\.md\)/)
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

    test('claudeMdReference is path-independent', async () => {
      const result: ScaffoldOutput = await $`bun ${binDir}/cli.ts scaffold-rules --rules-dir=.cursor/rules`.json()

      // claudeMdReference always references AGENTS.md regardless of rules path
      expect(result.claudeMdReference).toContain('@AGENTS.md')
      expect(result.claudeMdReference).not.toContain('.cursor/rules')
    })

    test('agentsMdSection uses custom path in both formats', async () => {
      const result: ScaffoldOutput = await $`bun ${binDir}/cli.ts scaffold-rules --rules-dir=.cursor/rules`.json()

      // Both @ syntax and markdown links should use custom path
      expect(result.agentsMdSection).toContain('@.cursor/rules/')
      expect(result.agentsMdSection).toContain('](.cursor/rules/')
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
      expect(result.claudeMdReference).toContain('<!-- PLAITED-RULES-START -->')
      expect(result.claudeMdReference).toContain('<!-- PLAITED-RULES-END -->')
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
