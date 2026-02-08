#!/usr/bin/env bun
/**
 * Scaffold development rules - Copy bundled rules and create symlinks
 *
 * Copies rules from the package to `.agents/rules/` (canonical location),
 * creates symlinks for `.claude/` and `.cursor/` agent directories,
 * and falls back to appending links in `AGENTS.md` if no agent dirs exist.
 *
 * @throws When source rules directory cannot be read
 * @throws When target directory cannot be created (permissions)
 * @throws When symlink creation fails (existing file, not directory)
 */

import { mkdir, readdir, readlink, stat, symlink } from 'node:fs/promises'
import { join } from 'node:path'
import { parseArgs } from 'node:util'

/** Agents that get symlinks to .agents/rules (not .agents itself) */
const SYMLINK_AGENTS = ['.claude', '.cursor'] as const

/** All supported agent directories (including .agents which gets direct copy) */
const ALL_AGENTS = ['.agents', ...SYMLINK_AGENTS] as const

/** Canonical rules location */
const TARGET_RULES = '.agents/rules' as const

/**
 * NOTE: This tool only scaffolds RULES, not skills.
 * Skills symlinks (.claude/skills -> ../.agents/skills) are managed separately
 * via the skills-installer or manual setup.
 */

/**
 * Check if path is a directory
 */
const isDirectory = async (path: string): Promise<boolean> => {
  try {
    const s = await stat(path)
    return s.isDirectory()
  } catch {
    return false
  }
}

/**
 * Main scaffold-rules function
 */
export const scaffoldRules = async (args: string[]): Promise<void> => {
  const { values } = parseArgs({
    args,
    options: {
      list: { type: 'boolean', short: 'l' },
      'dry-run': { type: 'boolean', short: 'n' },
    },
    allowPositionals: true,
    strict: false,
  })

  const dryRun = values['dry-run'] as boolean | undefined
  const listOnly = values.list as boolean | undefined

  const sourceRules = join(import.meta.dir, '../.agents/rules')
  const cwd = process.cwd()

  // Get available rules
  const files = await readdir(sourceRules)
  const rules = files.filter((f) => f.endsWith('.md'))

  // --list: just output available rules
  if (listOnly) {
    console.log(JSON.stringify({ rules: rules.map((f) => f.replace('.md', '')) }))
    return
  }

  const actions: string[] = []

  // Check for agent directories BEFORE copying (since copy creates .agents/)
  // This determines whether to fall back to AGENTS.md append
  let hadAgentDirBeforeScaffold = false
  for (const agent of ALL_AGENTS) {
    if (await isDirectory(join(cwd, agent))) {
      hadAgentDirBeforeScaffold = true
      break
    }
  }

  // 1. Copy rules to .agents/rules/ (canonical location, serves .agents agent)
  const targetDir = join(cwd, TARGET_RULES)
  if (!dryRun) {
    await mkdir(targetDir, { recursive: true })
  }

  for (const file of rules) {
    const src = join(sourceRules, file)
    const dest = join(targetDir, file)
    if (!dryRun) {
      await Bun.write(dest, await Bun.file(src).text())
    }
    actions.push(`copy: ${TARGET_RULES}/${file}`)
  }

  // 2. Symlink for other agents (.claude, .cursor)
  for (const agent of SYMLINK_AGENTS) {
    const agentDir = join(cwd, agent)
    if (await isDirectory(agentDir)) {
      const rulesLink = join(agentDir, 'rules')

      // Check if symlink already exists and points to right place
      try {
        const existing = await readlink(rulesLink)
        if (existing === '../.agents/rules') {
          actions.push(`skip: ${agent}/rules (symlink exists)`)
          continue
        }
      } catch {
        // Doesn't exist or not a symlink - proceed to create
      }

      if (!dryRun) {
        await symlink('../.agents/rules', rulesLink)
      }
      actions.push(`symlink: ${agent}/rules -> ../.agents/rules`)
    }
  }

  // 3. Fallback: append to AGENTS.md only if NO agent directories existed before copy
  if (!hadAgentDirBeforeScaffold) {
    const agentsMdPath = join(cwd, 'AGENTS.md')
    const agentsMd = Bun.file(agentsMdPath)

    if (await agentsMd.exists()) {
      const content = await agentsMd.text()
      if (content.includes('.agents/rules')) {
        actions.push('skip: AGENTS.md (already has rules)')
      } else {
        const links = rules.map((f) => `- [${f.replace('.md', '')}](${TARGET_RULES}/${f})`).join('\n')
        const section = `\n## Rules\n\n${links}\n`

        if (!dryRun) {
          await Bun.write(agentsMdPath, content + section)
        }
        actions.push('append: AGENTS.md (rules section)')
      }
    }
  }

  console.log(JSON.stringify({ dryRun: !!dryRun, targetRules: TARGET_RULES, actions }, null, 2))
}

// CLI entry point
if (import.meta.main) {
  await scaffoldRules(Bun.argv.slice(2))
}
