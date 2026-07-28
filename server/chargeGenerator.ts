import { readFile, rename, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { OutputPackageCandidate } from '../src/domain/delivery.js'

interface ChargeEntry {
  name: string
  path: string
}

export interface ChargePreview {
  before: unknown
  after: unknown
  changed: boolean
  serialized: string
}

export interface ChargeFileSnapshot {
  existed: boolean
  contents?: Buffer
}

export async function captureChargeFile(
  repositoryPath: string,
): Promise<ChargeFileSnapshot> {
  try {
    return {
      existed: true,
      contents: await readFile(join(repositoryPath, 'charge.json')),
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { existed: false }
    }
    throw error
  }
}

export async function restoreChargeFile(
  repositoryPath: string,
  snapshot: ChargeFileSnapshot,
) {
  const chargePath = join(repositoryPath, 'charge.json')
  if (!snapshot.existed) {
    await rm(chargePath, { force: true })
    return
  }
  await writeFile(chargePath, snapshot.contents ?? Buffer.alloc(0))
}

function selectedEntries(
  candidates: OutputPackageCandidate[],
  selectedIds: string[],
): ChargeEntry[] {
  const candidatesById = new Map(
    candidates.map((candidate) => [candidate.id, candidate]),
  )
  const unknownIds = selectedIds.filter((id) => !candidatesById.has(id))
  if (unknownIds.length) {
    throw new Error('选择了无法识别的 output 交付包')
  }

  return [...new Set(selectedIds)]
    .map((id) => candidatesById.get(id))
    .filter((candidate): candidate is OutputPackageCandidate =>
      Boolean(candidate),
    )
    .sort((left, right) => left.path.localeCompare(right.path, 'zh-CN'))
    .map(({ name, path }) => ({ name, path }))
}

export async function previewCharge(
  repositoryPath: string,
  candidates: OutputPackageCandidate[],
  selectedIds: string[],
): Promise<ChargePreview> {
  const chargePath = join(repositoryPath, 'charge.json')
  let before: unknown

  try {
    before = JSON.parse(await readFile(chargePath, 'utf8')) as unknown
  } catch {
    before = []
  }

  const entries = selectedEntries(candidates, selectedIds)
  const after =
    Array.isArray(before)
      ? entries
      : before && typeof before === 'object'
        ? { ...before, packages: entries }
        : entries
  const serialized = `${JSON.stringify(after, null, 2)}\n`

  return {
    before,
    after,
    changed: JSON.stringify(before) !== JSON.stringify(after),
    serialized,
  }
}

export async function writeChargeAtomically(
  repositoryPath: string,
  preview: ChargePreview,
) {
  const chargePath = join(repositoryPath, 'charge.json')
  const temporaryPath = `${chargePath}.tmp`

  await writeFile(temporaryPath, preview.serialized, 'utf8')
  try {
    JSON.parse(await readFile(temporaryPath, 'utf8'))
    await rename(temporaryPath, chargePath)
  } catch (error) {
    await rm(temporaryPath, { force: true })
    throw error
  }
}
