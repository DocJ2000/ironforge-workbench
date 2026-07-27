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

  it('keeps the public product name consistent across the Windows package', async () => {
    const config = await readFile(
      join(process.cwd(), 'electron-builder.config.cjs'),
      'utf8',
    )

    expect(config).toContain("productName: 'ironforge-workbench'")
    expect(config).toContain(
      "artifactName: 'ironforge-workbench-Setup.${ext}'",
    )
  })

  it('defaults new installs to D drive without moving existing installations', async () => {
    const installer = await readFile(
      join(process.cwd(), 'build/installer.nsh'),
      'utf8',
    )

    expect(installer).toContain('D:\\ironforge-workbench')
    expect(installer).toContain('ReadRegStr')
    expect(installer).toContain('StrCmp $0 ""')
  })

  it('keeps packaged project data separate from local development data', async () => {
    const source = await readFile(join(process.cwd(), 'electron/main.ts'), 'utf8')

    expect(source).toContain("'ironforge-workbench-data'")
    expect(source).toContain("'ironforge-workbench-dev'")
    expect(source).toContain('app.setPath(')
    expect(source).toContain("'userData'")
    expect(source).toContain("join(userDataPath, 'projects.json')")
  })

  it('does not ship a personal avatar initial', async () => {
    const source = await readFile(
      join(process.cwd(), 'src/components/AppShell.tsx'),
      'utf8',
    )

    expect(source).not.toContain('蒋')
    expect(source).toContain('<UserRound')
  })
})
