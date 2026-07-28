// @vitest-environment node

import { execFileSync } from 'node:child_process'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { scanRepository } from './repositoryScanner'

const temporaryRepositories: string[] = []

function git(repositoryPath: string, ...args: string[]) {
  return execFileSync('git', ['-C', repositoryPath, ...args], {
    encoding: 'utf8',
  }).trim()
}

async function createRepository() {
  const repositoryPath = await mkdtemp(join(tmpdir(), 'ironforge-repository-'))
  const remotePath = await mkdtemp(join(tmpdir(), 'ironforge-remote-'))
  temporaryRepositories.push(repositoryPath)
  temporaryRepositories.push(remotePath)

  git(remotePath, 'init', '--bare')
  git(repositoryPath, 'init', '-b', 'dev/T2')
  git(repositoryPath, 'config', 'user.name', 'Test Engineer')
  git(repositoryPath, 'config', 'user.email', 'engineer@example.com')
  await mkdir(join(repositoryPath, 'source'), { recursive: true })
  await writeFile(join(repositoryPath, 'source', 'part.prt'), 'version one')
  await writeFile(join(repositoryPath, 'charge.json'), '[]\n')
  git(repositoryPath, 'add', '.')
  git(repositoryPath, 'commit', '-m', 'initial design')
  git(repositoryPath, 'remote', 'add', 'origin', remotePath)
  git(repositoryPath, 'push', '--set-upstream', 'origin', 'dev/T2')
  git(repositoryPath, 'branch', 'dev/T2+')

  await writeFile(join(repositoryPath, 'source', 'part.prt'), 'version two')
  const packagePath = join(repositoryPath, 'output', 'mechanical', '铝合金散热片')
  await mkdir(packagePath, { recursive: true })
  await writeFile(join(packagePath, '铝合金散热片.stp'), 'step')
  await writeFile(
    join(repositoryPath, 'charge.json'),
    `${JSON.stringify([
      {
        name: '铝合金散热片',
        path: 'output/mechanical/铝合金散热片',
      },
    ])}\n`,
  )

  return repositoryPath
}

afterEach(async () => {
  await Promise.all(
    temporaryRepositories.splice(0).map((path) => rm(path, { recursive: true, force: true })),
  )
})

describe('scanRepository', () => {
  it('reads branch, commit, working tree, and delivery packages from Git', async () => {
    const repositoryPath = await createRepository()

    const snapshot = await scanRepository(repositoryPath)

    expect(snapshot.branch).toBe('dev/T2')
    expect(snapshot.branches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'dev/T2', remote: true }),
        expect.objectContaining({ name: 'dev/T2+', remote: false }),
      ]),
    )
    expect(snapshot.latestCommitMessage).toBe('initial design')
    expect(snapshot.changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'charge.json', kind: 'modified' }),
        expect.objectContaining({ path: 'source/part.prt', kind: 'modified', isCad: true }),
        expect.objectContaining({
          path: 'output/mechanical/铝合金散热片/铝合金散热片.stp',
          kind: 'untracked',
        }),
      ]),
    )
    expect(snapshot.deliveryPackages).toEqual([
      expect.objectContaining({
        name: '铝合金散热片',
        validation: 'valid',
        files: [expect.objectContaining({ name: '铝合金散热片.stp', type: 'STEP' })],
      }),
    ])
  })
})
