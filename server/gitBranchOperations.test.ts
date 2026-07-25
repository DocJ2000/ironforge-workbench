// @vitest-environment node

import { execFileSync } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  assertTagAvailable,
  createAnnotatedTag,
  createRepositoryBranch,
} from './gitBranchOperations'

const repositories: string[] = []

function git(repositoryPath: string, ...args: string[]) {
  return execFileSync('git', ['-C', repositoryPath, ...args], {
    encoding: 'utf8',
  }).trim()
}

async function createRepository() {
  const repositoryPath = await mkdtemp(join(tmpdir(), 'ironforge-branch-'))
  repositories.push(repositoryPath)
  git(repositoryPath, 'init', '-b', 'dev/T2')
  git(repositoryPath, 'config', 'user.name', 'Test Engineer')
  git(repositoryPath, 'config', 'user.email', 'engineer@example.com')
  await writeFile(join(repositoryPath, 'README.md'), 'test')
  git(repositoryPath, 'add', '.')
  git(repositoryPath, 'commit', '-m', 'initial')
  return repositoryPath
}

afterEach(async () => {
  await Promise.all(
    repositories.splice(0).map((path) =>
      rm(path, { recursive: true, force: true }),
    ),
  )
})

describe('createRepositoryBranch', () => {
  it('creates and switches to a new branch from the selected start point', async () => {
    const repositoryPath = await createRepository()

    await createRepositoryBranch(repositoryPath, {
      name: 'dev/T3',
      startPoint: 'dev/T2',
    })

    expect(git(repositoryPath, 'branch', '--show-current')).toBe('dev/T3')
  })

  it('refuses existing and invalid branch names', async () => {
    const repositoryPath = await createRepository()

    await expect(
      createRepositoryBranch(repositoryPath, {
        name: 'dev/T2',
        startPoint: 'dev/T2',
      }),
    ).rejects.toThrow('分支 dev/T2 已存在')
    await expect(
      createRepositoryBranch(repositoryPath, {
        name: 'bad branch',
        startPoint: 'dev/T2',
      }),
    ).rejects.toThrow('分支名称不合法')
    expect(git(repositoryPath, 'branch', '--show-current')).toBe('dev/T2')
  })
})

describe('version Tags', () => {
  it('creates an annotated Tag and refuses to reuse its name', async () => {
    const repositoryPath = await createRepository()
    const commit = git(repositoryPath, 'rev-parse', 'HEAD')

    await createAnnotatedTag(
      repositoryPath,
      { name: 'T2-v1', message: 'Dragon T2 存档版本' },
      commit,
    )

    await expect(
      assertTagAvailable(repositoryPath, 'T2-v1'),
    ).rejects.toThrow('版本 Tag T2-v1 已存在')
    expect(git(repositoryPath, 'tag', '--list')).toBe('T2-v1')
  })
})
