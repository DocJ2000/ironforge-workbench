import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('desktop main process packaging', () => {
  it('loads electron-updater through its CommonJS-compatible default export', async () => {
    const source = await readFile(join(process.cwd(), 'electron/main.ts'), 'utf8')

    expect(source).toContain("import electronUpdater from 'electron-updater'")
    expect(source).toContain('const { autoUpdater } = electronUpdater')
    expect(source).not.toContain("import { autoUpdater } from 'electron-updater'")
  })
})
