import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdir, readlink, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { $ } from 'bun'

type ListOutput = {
  rules: string[]
}

type ScaffoldOutput = {
  dryRun: boolean
  targetRules: string
  actions: string[]
}

const binDir = join(import.meta.dir, '../../bin')

describe('scaffold-rules', () => {
  let testDir: string

  beforeEach(async () => {
    // Create a temp directory for each test
    testDir = join(import.meta.dir, `test-scaffold-${Date.now()}`)
    await mkdir(testDir, { recursive: true })
  })

  afterEach(async () => {
    // Clean up temp directory
    await rm(testDir, { recursive: true, force: true })
  })

  describe('--list flag', () => {
    test('outputs available rules as JSON', async () => {
      const result: ListOutput = await $`bun ${binDir}/cli.ts scaffold-rules --list`.json()

      expect(result).toHaveProperty('rules')
      expect(result.rules).toBeArray()
      expect(result.rules.length).toBeGreaterThan(0)
    })

    test('includes expected compressed rules', async () => {
      const result: ListOutput = await $`bun ${binDir}/cli.ts scaffold-rules --list`.json()

      expect(result.rules).toContain('accuracy')
      expect(result.rules).toContain('bun')
      expect(result.rules).toContain('core')
      expect(result.rules).toContain('documentation')
      expect(result.rules).toContain('modules')
      expect(result.rules).toContain('testing')
      expect(result.rules).toContain('workflow')
    })

    test('short flag -l works', async () => {
      const result: ListOutput = await $`bun ${binDir}/cli.ts scaffold-rules -l`.json()

      expect(result).toHaveProperty('rules')
      expect(result.rules).toBeArray()
    })
  })

  describe('--dry-run flag', () => {
    test('outputs planned actions without executing', async () => {
      const result: ScaffoldOutput = await $`cd ${testDir} && bun ${binDir}/cli.ts scaffold-rules --dry-run`.json()

      expect(result.dryRun).toBe(true)
      expect(result.targetRules).toBe('.agents/rules')
      expect(result.actions).toBeArray()
    })

    test('shows copy actions for each rule', async () => {
      const result: ScaffoldOutput = await $`cd ${testDir} && bun ${binDir}/cli.ts scaffold-rules --dry-run`.json()

      const copyActions = result.actions.filter((a) => a.startsWith('copy:'))
      expect(copyActions.length).toBeGreaterThan(0)

      // Should include our compressed rules
      expect(copyActions.some((a) => a.includes('core.md'))).toBe(true)
      expect(copyActions.some((a) => a.includes('testing.md'))).toBe(true)
    })

    test('does not create files in dry-run mode', async () => {
      await $`cd ${testDir} && bun ${binDir}/cli.ts scaffold-rules --dry-run`.json()

      const rulesDir = Bun.file(join(testDir, '.agents/rules'))
      expect(await rulesDir.exists()).toBe(false)
    })

    test('short flag -n works', async () => {
      const result: ScaffoldOutput = await $`cd ${testDir} && bun ${binDir}/cli.ts scaffold-rules -n`.json()

      expect(result.dryRun).toBe(true)
    })
  })

  describe('copy behavior', () => {
    test('copies rules to .agents/rules/', async () => {
      await $`cd ${testDir} && bun ${binDir}/cli.ts scaffold-rules`.quiet()

      const coreRule = Bun.file(join(testDir, '.agents/rules/core.md'))
      expect(await coreRule.exists()).toBe(true)

      const content = await coreRule.text()
      expect(content).toContain('# Core Conventions')
    })

    test('copies all compressed rules', async () => {
      await $`cd ${testDir} && bun ${binDir}/cli.ts scaffold-rules`.quiet()

      const expectedRules = ['accuracy', 'bun', 'core', 'documentation', 'modules', 'testing', 'workflow']

      for (const rule of expectedRules) {
        const ruleFile = Bun.file(join(testDir, `.agents/rules/${rule}.md`))
        expect(await ruleFile.exists()).toBe(true)
      }
    })

    test('creates .agents/rules directory if missing', async () => {
      await $`cd ${testDir} && bun ${binDir}/cli.ts scaffold-rules`.quiet()

      const rulesDir = await Bun.file(join(testDir, '.agents/rules/core.md')).exists()
      expect(rulesDir).toBe(true)
    })
  })

  describe('symlink behavior', () => {
    test('creates symlink for .claude/rules when .claude exists', async () => {
      // Create .claude directory
      await mkdir(join(testDir, '.claude'), { recursive: true })

      await $`cd ${testDir} && bun ${binDir}/cli.ts scaffold-rules`.quiet()

      // Check symlink exists and points to right place
      const linkTarget = await readlink(join(testDir, '.claude/rules'))
      expect(linkTarget).toBe('../.agents/rules')
    })

    test('creates symlink for .cursor/rules when .cursor exists', async () => {
      // Create .cursor directory
      await mkdir(join(testDir, '.cursor'), { recursive: true })

      await $`cd ${testDir} && bun ${binDir}/cli.ts scaffold-rules`.quiet()

      const linkTarget = await readlink(join(testDir, '.cursor/rules'))
      expect(linkTarget).toBe('../.agents/rules')
    })

    test('skips symlink if already exists with correct target', async () => {
      await mkdir(join(testDir, '.claude'), { recursive: true })

      // Run twice
      await $`cd ${testDir} && bun ${binDir}/cli.ts scaffold-rules`.quiet()
      const result: ScaffoldOutput = await $`cd ${testDir} && bun ${binDir}/cli.ts scaffold-rules`.json()

      // Second run should skip the symlink
      const skipAction = result.actions.find((a) => a.includes('.claude/rules') && a.includes('skip'))
      expect(skipAction).toBeDefined()
    })

    test('does not create symlink if agent dir does not exist', async () => {
      const result: ScaffoldOutput = await $`cd ${testDir} && bun ${binDir}/cli.ts scaffold-rules`.json()

      // Should not have any symlink actions
      const symlinkActions = result.actions.filter((a) => a.startsWith('symlink:'))
      expect(symlinkActions.length).toBe(0)
    })
  })

  describe('AGENTS.md fallback', () => {
    test('appends rules to AGENTS.md when no agent dirs exist', async () => {
      // Create AGENTS.md without any agent directories
      await Bun.write(join(testDir, 'AGENTS.md'), '# AGENTS\n\nSome content\n')

      await $`cd ${testDir} && bun ${binDir}/cli.ts scaffold-rules`.quiet()

      const content = await Bun.file(join(testDir, 'AGENTS.md')).text()
      expect(content).toContain('## Rules')
      expect(content).toContain('.agents/rules/')
    })

    test('does not append if agent dir exists', async () => {
      await Bun.write(join(testDir, 'AGENTS.md'), '# AGENTS\n\nSome content\n')
      await mkdir(join(testDir, '.agents'), { recursive: true })

      await $`cd ${testDir} && bun ${binDir}/cli.ts scaffold-rules`.quiet()

      const content = await Bun.file(join(testDir, 'AGENTS.md')).text()
      // Should not have appended rules section (since .agents exists)
      expect(content).not.toContain('## Rules')
    })

    test('skips if AGENTS.md already has rules', async () => {
      await Bun.write(join(testDir, 'AGENTS.md'), '# AGENTS\n\nSee .agents/rules/ for rules\n')

      const result: ScaffoldOutput = await $`cd ${testDir} && bun ${binDir}/cli.ts scaffold-rules`.json()

      const skipAction = result.actions.find((a) => a.includes('AGENTS.md') && a.includes('skip'))
      expect(skipAction).toBeDefined()
    })
  })

  describe('output structure', () => {
    test('returns JSON with expected fields', async () => {
      const result: ScaffoldOutput = await $`cd ${testDir} && bun ${binDir}/cli.ts scaffold-rules`.json()

      expect(result).toHaveProperty('dryRun')
      expect(result).toHaveProperty('targetRules')
      expect(result).toHaveProperty('actions')

      expect(result.dryRun).toBe(false)
      expect(result.targetRules).toBe('.agents/rules')
      expect(result.actions).toBeArray()
    })
  })

  describe('symlink readability', () => {
    test('rules are readable through .claude symlink', async () => {
      await mkdir(join(testDir, '.claude'), { recursive: true })
      await $`cd ${testDir} && bun ${binDir}/cli.ts scaffold-rules`.quiet()

      // Read through symlink path
      const content = await Bun.file(join(testDir, '.claude/rules/core.md')).text()
      expect(content).toContain('# Core Conventions')
    })

    test('rules are readable through .cursor symlink', async () => {
      await mkdir(join(testDir, '.cursor'), { recursive: true })
      await $`cd ${testDir} && bun ${binDir}/cli.ts scaffold-rules`.quiet()

      // Read through symlink path
      const content = await Bun.file(join(testDir, '.cursor/rules/core.md')).text()
      expect(content).toContain('# Core Conventions')
    })
  })

  describe('error handling', () => {
    test('fails when existing file blocks symlink creation', async () => {
      await mkdir(join(testDir, '.claude'), { recursive: true })
      // Create a file where symlink should go
      await Bun.write(join(testDir, '.claude/rules'), 'not a directory')

      // Should fail when trying to create symlink over existing file
      const result = await $`cd ${testDir} && bun ${binDir}/cli.ts scaffold-rules 2>&1`.nothrow().text()
      expect(result).toContain('EEXIST')
    })
  })

  describe('rule content', () => {
    test('core.md contains TypeScript conventions', async () => {
      await $`cd ${testDir} && bun ${binDir}/cli.ts scaffold-rules`.quiet()

      const content = await Bun.file(join(testDir, '.agents/rules/core.md')).text()
      expect(content).toContain('Type over interface')
      expect(content).toContain('Arrow functions')
    })

    test('testing.md contains test conventions', async () => {
      await $`cd ${testDir} && bun ${binDir}/cli.ts scaffold-rules`.quiet()

      const content = await Bun.file(join(testDir, '.agents/rules/testing.md')).text()
      expect(content).toContain('test not it')
      expect(content).toContain('No conditional assertions')
    })

    test('rules include verification patterns', async () => {
      await $`cd ${testDir} && bun ${binDir}/cli.ts scaffold-rules`.quiet()

      const content = await Bun.file(join(testDir, '.agents/rules/core.md')).text()
      expect(content).toContain('*Verify:*')
      expect(content).toContain('*Fix:*')
    })

    test('rules are compressed (no verbose examples)', async () => {
      await $`cd ${testDir} && bun ${binDir}/cli.ts scaffold-rules`.quiet()

      const content = await Bun.file(join(testDir, '.agents/rules/core.md')).text()

      // Should not have verbose code blocks with Good/Avoid patterns
      expect(content).not.toContain('// ✅ Good')
      expect(content).not.toContain('// ❌ Avoid')
    })
  })
})
