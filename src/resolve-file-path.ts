import { join } from 'node:path'

/**
 * Check if a path is a package specifier (not a file path)
 *
 * @remarks
 * Package specifiers include:
 * - Scoped packages: `@org/pkg`, `@org/pkg/subpath.js`
 * - Bare imports: `lodash`, `lodash/fp`
 *
 * File paths start with `/`, `./`, or `../`
 */
const isPackageSpecifier = (path: string): boolean => {
  // Scoped packages always start with @
  if (path.startsWith('@')) return true
  // File paths start with / or .
  if (path.startsWith('/') || path.startsWith('.')) return false
  // Bare imports don't start with / or . (e.g., "lodash", "lodash/fp")
  return true
}

/**
 * Check if a path has a source file extension
 */
const hasSourceExtension = (path: string): boolean => /\.(tsx?|jsx?|mjs|cjs|json)$/.test(path)

/**
 * Resolve a file path to an absolute path
 *
 * @remarks
 * Resolution order:
 * 1. Absolute paths (starting with `/`) - returned as-is
 * 2. Package specifiers (`@org/pkg`, `lodash/fp`) - resolved via Bun.resolveSync()
 * 3. Relative paths with extensions (`./foo.ts`) - resolved from cwd
 * 4. Relative paths without extensions (`./testing`) - try Bun.resolveSync() for exports field
 * 5. Fallback to joining with cwd
 *
 * This allows paths like `./testing` to resolve via package.json exports:
 * `"./testing": "./src/testing.ts"` → resolves to `./src/testing.ts`
 */
export const resolveFilePath = (filePath: string): string => {
  const cwd = process.cwd()

  // Absolute path - return as-is
  if (filePath.startsWith('/')) {
    return filePath
  }

  // Package specifier - always use Bun.resolveSync()
  if (isPackageSpecifier(filePath)) {
    try {
      return Bun.resolveSync(filePath, cwd)
    } catch {
      // Fall back to joining with cwd for bare paths like "src/foo.ts"
      return join(cwd, filePath)
    }
  }

  // Relative path with extension - resolve directly from cwd
  if (hasSourceExtension(filePath)) {
    return join(cwd, filePath)
  }

  // Relative path without extension - try Bun.resolveSync() for exports field resolution
  // This handles cases like "./testing" → "./src/testing.ts" via package.json exports
  try {
    return Bun.resolveSync(filePath, cwd)
  } catch {
    // Fall back to joining with cwd
    return join(cwd, filePath)
  }
}
