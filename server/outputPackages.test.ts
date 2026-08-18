import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { scanOutputPackages } from './outputPackages'

const temporaryDirectories: string[] = []

async function createRoot() {
  const root = await mkdtemp(join(tmpdir(), 'ironforge-output-'))
  temporaryDirectories.push(root)
  return root
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((path) =>
      rm(path, { recursive: true, force: true }),
    ),
  )
})

describe('scanOutputPackages', () => {
  it('returns only non-empty second-level output packages', async () => {
    const root = await createRoot()
    await mkdir(join(root, 'output', 'mechanical', '五金件'), {
      recursive: true,
    })
    await mkdir(join(root, 'output', 'mechanical', '空包'), {
      recursive: true,
    })
    await writeFile(
      join(root, 'output', 'mechanical', '五金件', '导轴.pdf'),
      'pdf',
    )

    const packages = await scanOutputPackages(root)

    expect(packages.map(({ name, path }) => ({ name, path }))).toEqual([
      { name: '五金件', path: 'output/mechanical/五金件' },
    ])
  })

  it('collects nested files and sorts packages and files by path', async () => {
    const root = await createRoot()
    await mkdir(join(root, 'output', 'electrical', 'PCB资料', 'gerber'), {
      recursive: true,
    })
    await mkdir(join(root, 'output', 'mechanical', '模图'), {
      recursive: true,
    })
    await writeFile(
      join(root, 'output', 'electrical', 'PCB资料', 'gerber', 'board.zip'),
      'zip',
    )
    await writeFile(
      join(root, 'output', 'electrical', 'PCB资料', 'readme.txt'),
      'text',
    )
    await writeFile(
      join(root, 'output', 'mechanical', '模图', 'model.stp'),
      'step',
    )

    const packages = await scanOutputPackages(root)

    expect(packages.map((item) => item.id)).toEqual([
      'output/electrical/PCB资料',
      'output/mechanical/模图',
    ])
    expect(packages[0].files.map((file) => file.path)).toEqual([
      'output/electrical/PCB资料/gerber/board.zip',
      'output/electrical/PCB资料/readme.txt',
    ])
  })

  it('returns an empty list when output does not exist', async () => {
    const root = await createRoot()
    await expect(scanOutputPackages(root)).resolves.toEqual([])
  })

  it('treats electronics as a normal output category', async () => {
    const root = await createRoot()
    await mkdir(join(root, 'output', 'electronics', 'PCB'), {
      recursive: true,
    })
    await writeFile(
      join(root, 'output', 'electronics', 'PCB', 'board.zip'),
      'zip',
    )

    const packages = await scanOutputPackages(root)

    expect(packages).toEqual([
      expect.objectContaining({
        id: 'output/electronics/PCB',
        path: 'output/electronics/PCB',
        domain: 'electronics',
      }),
    ])
  })

  it('filters packages by forge.json roots when they are configured', async () => {
    const root = await createRoot()
    await writeFile(
      join(root, 'forge.json'),
      JSON.stringify({
        schemaVersion: 1,
        roots: {
          mechanical: { root: 'output/mechanical' },
        },
      }, null, 2),
    )
    await mkdir(join(root, 'output', 'mechanical', 'A'), { recursive: true })
    await mkdir(join(root, 'output', 'electrical', 'B'), { recursive: true })
    await writeFile(join(root, 'output', 'mechanical', 'A', 'a.pdf'), 'pdf')
    await writeFile(join(root, 'output', 'electrical', 'B', 'b.pdf'), 'pdf')

    const packages = await scanOutputPackages(root)

    expect(packages.map(({ path }) => path)).toEqual(['output/mechanical/A'])
  })
})
