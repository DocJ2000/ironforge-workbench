// @vitest-environment node

import { execFileSync } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  assertTagAvailable,
  createAndPublishRepositoryBranch,
  createAnnotatedTag,
  createRepositoryBranch,
  ensureRepositoryTag,
  gitRemoteEnvironment,
  validateRetryPushBranch,
} from './gitBranchOperations'

it('only allows retrying uploads to development branches', () => {
  expect(() => validateRetryPushBranch('main')).toThrow('只能上传到开发分支')
  expect(() => validateRetryPushBranch('dev/T2')).not.toThrow()
})

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

async function createRepositoryWithRemote() {
  const repositoryPath = await createRepository()
  const remotePath = await mkdtemp(join(tmpdir(), 'ironforge-remote-'))
  repositories.push(remotePath)
  git(remotePath, 'init', '--bare')
  git(repositoryPath, 'remote', 'add', 'origin', remotePath)
  git(repositoryPath, 'push', '-u', 'origin', 'dev/T2')
  return { repositoryPath, remotePath }
}

afterEach(async () => {
  await Promise.all(
    repositories.splice(0).map((path) =>
      rm(path, { recursive: true, force: true }),
    ),
  )
})

it('builds a project-specific non-interactive SSH environment', () => {
  const environment = gitRemoteEnvironment({
    sshKeyPath: 'C:\\Users\\engineer\\.ssh\\dragon key',
  })
  expect(environment.GIT_SSH_COMMAND).toBe(
    '"ssh" -i "C:\\Users\\engineer\\.ssh\\dragon key" -o IdentitiesOnly=yes -o BatchMode=yes',
  )
})

it('uses an askpass helper without putting the passphrase in the Git command', () => {
  const environment = gitRemoteEnvironment({
    sshKeyPath: 'C:\\keys\\dragon',
    sshPassphrase: 'private password',
    sshAskPassPath: 'C:\\AppData\\ironforge-askpass.cmd',
  })
  expect(environment.SSH_ASKPASS).toContain('ironforge-askpass.cmd')
  expect(environment.IRONFORGE_SSH_PASSPHRASE).toBe('private password')
  expect(environment.GIT_SSH_COMMAND).not.toContain('private password')
  expect(environment.GIT_SSH_COMMAND).not.toContain('BatchMode')
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

describe('createAndPublishRepositoryBranch', () => {
  it('creates the branch remotely and configures upstream tracking', async () => {
    const { repositoryPath, remotePath } = await createRepositoryWithRemote()

    await createAndPublishRepositoryBranch(repositoryPath, {
      name: 'dev/T3',
      startPoint: 'dev/T2',
    })

    expect(git(repositoryPath, 'branch', '--show-current')).toBe('dev/T3')
    expect(git(repositoryPath, 'rev-parse', '--abbrev-ref', '@{upstream}'))
      .toBe('origin/dev/T3')
    expect(git(remotePath, 'show-ref', '--verify', 'refs/heads/dev/T3'))
      .toContain('refs/heads/dev/T3')
  })

  it('returns to the original branch and removes the local branch when push fails', async () => {
    const repositoryPath = await createRepository()
    git(repositoryPath, 'remote', 'add', 'origin', 'Z:/missing/remote.git')

    await expect(
      createAndPublishRepositoryBranch(repositoryPath, {
        name: 'dev/T3',
        startPoint: 'dev/T2',
      }),
    ).rejects.toThrow()

    expect(git(repositoryPath, 'branch', '--show-current')).toBe('dev/T2')
    expect(git(repositoryPath, 'branch', '--list', 'dev/T3')).toBe('')
  })

  it('only permits development branch names', async () => {
    const repositoryPath = await createRepository()

    await expect(
      createAndPublishRepositoryBranch(repositoryPath, {
        name: 'main-copy',
        startPoint: 'dev/T2',
      }),
    ).rejects.toThrow('只能创建 dev/ 开头的工作版本')
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

  it('reuses a remote Tag only when it points to the same commit', async () => {
    const repositoryPath = await createRepository()
    const remotePath = await mkdtemp(join(tmpdir(), 'ironforge-tag-remote-'))
    repositories.push(remotePath)
    git(remotePath, 'init', '--bare')
    git(repositoryPath, 'remote', 'add', 'origin', remotePath)
    git(repositoryPath, 'push', 'origin', 'dev/T2')
    const commit = git(repositoryPath, 'rev-parse', 'HEAD')

    await ensureRepositoryTag(
      repositoryPath,
      { name: 'T2-第二次打样', message: '供应商打样版本' },
      commit,
    )
    await ensureRepositoryTag(
      repositoryPath,
      { name: 'T2-第二次打样', message: '供应商打样版本' },
      commit,
    )

    await writeFile(join(repositoryPath, 'next.txt'), 'next')
    git(repositoryPath, 'add', '.')
    git(repositoryPath, 'commit', '-m', 'next')
    await expect(ensureRepositoryTag(
      repositoryPath,
      { name: 'T2-第二次打样', message: '不能移动' },
      git(repositoryPath, 'rev-parse', 'HEAD'),
    )).rejects.toThrow('已指向其他版本')
  })
})
