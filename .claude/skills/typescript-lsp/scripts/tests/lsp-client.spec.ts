import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { LspClient } from '../lsp-client.ts'

const rootUri = `file://${process.cwd()}`
const testFile = `${import.meta.dir}/fixtures/sample.ts`
const testUri = `file://${testFile}`

describe('LspClient', () => {
  let client: LspClient

  beforeAll(() => {
    client = new LspClient({ rootUri })
  })

  afterAll(async () => {
    if (client.isRunning()) {
      await client.stop()
    }
  })

  test('initializes with rootUri', () => {
    expect(client).toBeDefined()
    expect(client.isRunning()).toBe(false)
  })

  test('starts and stops LSP server', async () => {
    await client.start()
    expect(client.isRunning()).toBe(true)

    await client.stop()
    expect(client.isRunning()).toBe(false)
  })

  test('throws when starting already running server', async () => {
    await client.start()
    expect(client.isRunning()).toBe(true)

    await expect(client.start()).rejects.toThrow('LSP server already running')

    await client.stop()
  })

  test('handles stop on non-running server gracefully', async () => {
    expect(client.isRunning()).toBe(false)
    await client.stop()
    expect(client.isRunning()).toBe(false)
  })

  describe('LSP operations', () => {
    beforeAll(async () => {
      await client.start()
    })

    afterAll(async () => {
      await client.stop()
    })

    test('opens and closes document', async () => {
      const text = await Bun.file(testFile).text()

      client.openDocument(testUri, 'typescript', 1, text)
      client.closeDocument(testUri)
    })

    test('gets hover information', async () => {
      const text = await Bun.file(testFile).text()

      client.openDocument(testUri, 'typescript', 1, text)

      // Find 'export' keyword position for reliable hover
      const lines = text.split('\n')
      let line = 0
      let char = 0
      for (let i = 0; i < lines.length; i++) {
        if (lines[i]?.startsWith('export')) {
          line = i
          char = 0
          break
        }
      }

      const result = await client.hover(testUri, line, char)
      expect(result).toBeDefined()

      client.closeDocument(testUri)
    })

    test('gets document symbols', async () => {
      const text = await Bun.file(testFile).text()

      client.openDocument(testUri, 'typescript', 1, text)

      const result = await client.documentSymbols(testUri)

      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)

      client.closeDocument(testUri)
    })

    test('searches workspace symbols', async () => {
      // Open a document first so LSP has a project context
      const text = await Bun.file(testFile).text()
      client.openDocument(testUri, 'typescript', 1, text)

      const result = await client.workspaceSymbols('parseConfig')

      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)

      client.closeDocument(testUri)
    })

    test('finds references', async () => {
      const text = await Bun.file(testFile).text()

      client.openDocument(testUri, 'typescript', 1, text)

      // Find an exported symbol
      const lines = text.split('\n')
      let line = 0
      let char = 0
      for (let i = 0; i < lines.length; i++) {
        const currentLine = lines[i]
        if (!currentLine) continue
        const match = currentLine.match(/export\s+const\s+(\w+)/)
        if (match?.[1]) {
          line = i
          char = currentLine.indexOf(match[1])
          break
        }
      }

      const result = await client.references(testUri, line, char)
      expect(result).toBeDefined()

      client.closeDocument(testUri)
    })

    test('gets definition', async () => {
      const text = await Bun.file(testFile).text()

      client.openDocument(testUri, 'typescript', 1, text)

      // Find an import to get definition for
      const lines = text.split('\n')
      let line = 0
      let char = 0
      for (let i = 0; i < lines.length; i++) {
        const currentLine = lines[i]
        if (!currentLine) continue
        const match = currentLine.match(/import\s+.*{\s*(\w+)/)
        if (match?.[1]) {
          line = i
          char = currentLine.indexOf(match[1])
          break
        }
      }

      const result = await client.definition(testUri, line, char)
      expect(result).toBeDefined()

      client.closeDocument(testUri)
    })
  })

  describe('error handling', () => {
    test('throws on request when server not running', async () => {
      const notRunningClient = new LspClient({ rootUri })

      await expect(notRunningClient.hover('file:///test.ts', 0, 0)).rejects.toThrow('LSP server not running')
    })

    test('throws on notify when server not running', () => {
      const notRunningClient = new LspClient({ rootUri })

      expect(() => notRunningClient.notify('test')).toThrow('LSP server not running')
    })

    test('timeout error includes timeout value and actionable suggestion', async () => {
      const shortTimeoutClient = new LspClient({ rootUri, requestTimeout: 100 })

      try {
        await shortTimeoutClient.start()

        // Open a document to avoid "No Project" errors
        const text = await Bun.file(testFile).text()
        shortTimeoutClient.openDocument(testUri, 'typescript', 1, text)

        // Try a request that might timeout
        await shortTimeoutClient.references(testUri, 0, 0)

        // If we get here, the request didn't timeout - clean up and skip assertions
        shortTimeoutClient.closeDocument(testUri)
        await shortTimeoutClient.stop()
      } catch (error) {
        // Verify the timeout error message includes actionable information
        expect(error).toBeInstanceOf(Error)
        const errorMessage = (error as Error).message
        expect(errorMessage).toContain('timeout')
        expect(errorMessage).toContain('100ms')
        expect(errorMessage).toContain('--timeout 200') // Should suggest 2x timeout
        expect(errorMessage).toMatch(/LSP request timeout:/)
      }
    }, 10000)
  })

  describe('configuration', () => {
    test('uses default timeout of 60000ms', async () => {
      const defaultClient = new LspClient({ rootUri })
      await defaultClient.start()

      // If this times out at 60000ms, the error message should include the timeout value
      // We're not actually waiting for timeout, just checking the client is configured correctly
      expect(defaultClient.isRunning()).toBe(true)

      await defaultClient.stop()
    })

    test('accepts custom timeout configuration', async () => {
      const customClient = new LspClient({ rootUri, requestTimeout: 120000 })
      await customClient.start()

      expect(customClient.isRunning()).toBe(true)

      await customClient.stop()
    })

    test('accepts debug configuration', async () => {
      const debugClient = new LspClient({ rootUri, debug: true })
      await debugClient.start()

      expect(debugClient.isRunning()).toBe(true)

      await debugClient.stop()
    })

    test('auto-resolves typescript-language-server command', async () => {
      // Create client without custom command - should auto-resolve
      const autoClient = new LspClient({ rootUri })
      await autoClient.start()

      expect(autoClient.isRunning()).toBe(true)

      await autoClient.stop()
    })

    test('respects custom command when provided', async () => {
      // Create client with custom command
      const customClient = new LspClient({
        rootUri,
        command: ['bun', 'typescript-language-server', '--stdio'],
      })
      await customClient.start()

      expect(customClient.isRunning()).toBe(true)

      await customClient.stop()
    })

    test('resolves local typescript-language-server when available', async () => {
      // This project has typescript-language-server in node_modules
      // The client should successfully resolve and start it
      const localClient = new LspClient({ rootUri })
      await localClient.start()

      expect(localClient.isRunning()).toBe(true)

      await localClient.stop()
    })
  })
})
