// @vitest-environment node

import { execFileSync } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { previewCharge, writeChargeAtomically } from './chargeGenerator'
import { syncGitLab } from './deliveryWorkflow'
import {
  assertTagAvailable,
  checkoutRepositoryBranch,
  createAnnotatedTag,
  createRepositoryBranch,
  pushRepositoryBranch,
  pushRepositoryTag,
} from './gitBranchOperations'
import { scanOutputPackages } from './outputPackages'
import {
  commitRepositoryChanges,
  previewRepositoryCommit,
} from './repositoryCommit'
import { scanRepository } from './repositoryScanner'

const temporaryPaths: string[] = []

function git(repositoryPath: string, ...args: string[]) {
  return execFileSync('git', ['-C', repositoryPath, ...args], {
    encoding: 'utf8',
  }).trim()
}

afterEach(async () => {
  await Promise.all(
    temporaryPaths.splice(0).map((path) =>
      rm(path, { recursive: true, force: true }),
    ),
  )
})

describe('tagged delivery release flow', () => {
  it('pushes a created branch and a unique version Tag to a temporary remote', async () => {
    const root = await mkdtemp(join(tmpdir(), 'ironforge-release-'))
    const repositoryPath = join(root, 'repository')
    const remotePath = join(root, 'origin.git')
    temporaryPaths.push(root)
    await mkdir(join(repositoryPath, 'output', 'mechanical', '五金件'), {
      recursive: true,
    })
    git(root, 'init', '--bare', remotePath)
    git(root, 'init', '-b', 'main', repositoryPath)
    git(repositoryPath, 'config', 'user.name', 'Test Engineer')
    git(repositoryPath, 'config', 'user.email', 'engineer@example.com')
    git(repositoryPath, 'remote', 'add', 'origin', remotePath)
    await writeFile(
      join(repositoryPath, 'output', 'mechanical', '五金件', '导轴.pdf'),
      'v1',
    )
    await writeFile(join(repositoryPath, 'charge.json'), '[]\n')
    git(repositoryPath, 'add', '.')
    git(repositoryPath, 'commit', '-m', 'initial')
    git(repositoryPath, 'push', '-u', 'origin', 'main')
    await createRepositoryBranch(repositoryPath, {
      name: 'dev/T3',
      startPoint: 'main',
    })
    await writeFile(
      join(repositoryPath, 'output', 'mechanical', '五金件', '导轴.pdf'),
      'v2',
    )

    const result = await syncGitLab(
      repositoryPath,
      {
        confirmed: true,
        draft: {
          message: '提交 T3 交付资料',
          changePaths: ['output/mechanical/五金件/导轴.pdf'],
          confirmedDeletions: [],
          selectedPackageIds: ['output/mechanical/五金件'],
          branch: 'dev/T3',
          tag: { name: 'T3-v1', message: 'Dragon T3 第一版存档' },
        },
      },
      {
        scanRepository,
        scanPackages: scanOutputPackages,
        previewCharge,
        writeCharge: writeChargeAtomically,
        previewCommit: previewRepositoryCommit,
        commit: commitRepositoryChanges,
        checkout: checkoutRepositoryBranch,
        push: pushRepositoryBranch,
        assertTagAvailable,
        createTag: createAnnotatedTag,
        pushTag: pushRepositoryTag,
        createMergeRequest: vi.fn(),
      },
    )

    expect(result).toMatchObject({ branch: 'dev/T3', tag: 'T3-v1' })
    expect(git(remotePath, 'show-ref', '--verify', 'refs/heads/dev/T3')).toBeTruthy()
    expect(git(remotePath, 'show-ref', '--verify', 'refs/tags/T3-v1')).toBeTruthy()
  }, 15_000)
})
