import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import type { OutputPackageCandidate } from '../src/domain/delivery'
import { previewCharge, writeChargeAtomically } from './chargeGenerator'

const temporaryDirectories: string[] = []

const candidates: OutputPackageCandidate[] = [
  {
    id: 'output/mechanical/五金件',
    name: '五金件',
    path: 'output/mechanical/五金件',
    domain: 'mechanical',
    files: [],
  },
  {
    id: 'output/electrical/PCB资料',
    name: 'PCB资料',
    path: 'output/electrical/PCB资料',
    domain: 'electrical',
    files: [],
  },
]

async function createRoot(charge: unknown) {
  const root = await mkdtemp(join(tmpdir(), 'ironforge-charge-'))
  temporaryDirectories.push(root)
  await writeFile(
    join(root, 'charge.json'),
    `${JSON.stringify(charge, null, 2)}\n`,
  )
  return root
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((path) =>
      rm(path, { recursive: true, force: true }),
    ),
  )
})

describe('previewCharge', () => {
  it('preserves object fields and updates only selected package entries', async () => {
    const root = await createRoot({ version: 1, packages: [] })

    const result = await previewCharge(root, candidates, [
      'output/mechanical/五金件',
    ])

    expect(result.after).toEqual({
      version: 1,
      packages: [
        { name: '五金件', path: 'output/mechanical/五金件' },
      ],
    })
    expect(result.changed).toBe(true)
  })

  it('preserves the existing array format', async () => {
    const root = await createRoot([])

    const result = await previewCharge(root, candidates, [
      'output/electrical/PCB资料',
    ])

    expect(result.after).toEqual([
      { name: 'PCB资料', path: 'output/electrical/PCB资料' },
    ])
  })

  it('rejects unknown package ids', async () => {
    const root = await createRoot([])

    await expect(
      previewCharge(root, candidates, ['output/mechanical/不存在']),
    ).rejects.toThrow('选择了无法识别的 output 交付包')
  })
})

describe('writeChargeAtomically', () => {
  it('writes the preview and leaves no temporary file', async () => {
    const root = await createRoot([])
    const preview = await previewCharge(root, candidates, [
      'output/mechanical/五金件',
    ])

    await writeChargeAtomically(root, preview)

    expect(JSON.parse(await readFile(join(root, 'charge.json'), 'utf8'))).toEqual(
      preview.after,
    )
    await expect(
      readFile(join(root, 'charge.json.tmp'), 'utf8'),
    ).rejects.toThrow()
  })
})
