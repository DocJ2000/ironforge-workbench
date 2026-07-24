// @vitest-environment node

import { execFileSync } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  commitRepositoryChanges,
  previewRepositoryCommit,
} from './repositoryCommit'

const repositories: string[] = []

function git(repositoryPath: string, ...args: string[]) {
  return execFileSync('git', ['-C', repositoryPath, ...args], {
    encoding: 'utf8',
  }).trim()
}

async function createRepository() {
  const repositoryPath = await mkdtemp(join(tmpdir(), 'ironforge-commit-'))
  repositories.push(repositoryPath)
  git(repositoryPath, 'init', '-b', 'dev/T2')
  git(repositoryPath, 'config', 'user.name', 'Test Engineer')
  git(repositoryPath, 'config', 'user.email', 'engineer@example.com')
  await writeFile(join(repositoryPath, 'part.prt'), 'v1')
  await writeFile(join(repositoryPath, 'notes.txt'), 'v1')
  git(repositoryPath, 'add', '.')
  git(repositoryPath, 'commit', '-m', 'initial')
  await writeFile(join(repositoryPath, 'part.prt'), 'v2')
  await writeFile(join(repositoryPath, 'notes.txt'), 'v2')
  return repositoryPath
}

afterEach(async () => {
  await Promise.all(
    repositories.splice(0).map((path) => rm(path, { recursive: true, force: true })),
  )
})

describe('repository commit service', () => {
  it('previews only paths that currently exist in the working tree', async () => {
    const repositoryPath = await createRepository()

    const preview = await previewRepositoryCommit(repositoryPath, {
      message: '更新零件',
      paths: ['part.prt'],
      confirmedDeletions: [],
    })

    expect(preview).toMatchObject({
      branch: 'dev/T2',
      message: '更新零件',
      paths: ['part.prt'],
    })
    await expect(
      previewRepositoryCommit(repositoryPath, {
        message: '越界',
        paths: ['../outside.txt'],
        confirmedDeletions: [],
      }),
    ).rejects.toThrow('选择的文件不在当前修改列表中')
  })

  it('commits selected files without including other changes', async () => {
    const repositoryPath = await createRepository()

    const result = await commitRepositoryChanges(repositoryPath, {
      message: '更新零件',
      paths: ['part.prt'],
      confirmedDeletions: [],
    })

    expect(result.commit).toMatch(/^[0-9a-f]{7,}$/)
    expect(git(repositoryPath, 'show', '--pretty=', '--name-only', 'HEAD')).toBe('part.prt')
    expect(git(repositoryPath, 'status', '--short')).toContain('notes.txt')
  })

  it('blocks commits when unrelated files are already staged', async () => {
    const repositoryPath = await createRepository()
    git(repositoryPath, 'add', 'notes.txt')

    await expect(
      previewRepositoryCommit(repositoryPath, {
        message: '更新零件',
        paths: ['part.prt'],
        confirmedDeletions: [],
      }),
    ).rejects.toThrow('暂存区已有其他文件')
  })
})
