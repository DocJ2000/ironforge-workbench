import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

async function git(repositoryPath: string, args: string[]) {
  const { stdout } = await execFileAsync('git', ['-C', repositoryPath, ...args], {
    encoding: 'utf8',
    windowsHide: true,
    maxBuffer: 10 * 1024 * 1024,
  })
  return stdout.trim()
}

export interface CreateBranchInput {
  name: string
  startPoint: string
}

export async function createRepositoryBranch(
  repositoryPath: string,
  input: CreateBranchInput,
) {
  const name = input.name.trim()
  const startPoint = input.startPoint.trim()
  if (!name || !startPoint) throw new Error('请填写分支名称并选择起点')

  try {
    await git(repositoryPath, ['check-ref-format', '--branch', name])
  } catch {
    throw new Error('分支名称不合法')
  }

  const existing = await git(repositoryPath, [
    'branch',
    '--list',
    '--format=%(refname:short)',
    name,
  ])
  if (existing) throw new Error(`分支 ${name} 已存在`)

  await git(repositoryPath, ['switch', '-c', name, startPoint])
}

export async function checkoutRepositoryBranch(
  repositoryPath: string,
  branch: string,
) {
  await git(repositoryPath, ['switch', branch])
}

export async function pushRepositoryBranch(
  repositoryPath: string,
  branch: string,
) {
  await git(repositoryPath, ['push', '--set-upstream', 'origin', branch])
}

export async function assertTagAvailable(
  repositoryPath: string,
  name: string,
) {
  const normalized = name.trim()
  try {
    await git(repositoryPath, ['check-ref-format', `refs/tags/${normalized}`])
  } catch {
    throw new Error('版本 Tag 名称不合法')
  }
  const local = await git(repositoryPath, ['tag', '--list', normalized])
  if (local) throw new Error(`版本 Tag ${normalized} 已存在`)
  const remote = await git(repositoryPath, [
    'ls-remote',
    '--tags',
    'origin',
    `refs/tags/${normalized}`,
  ])
  if (remote) throw new Error(`远端版本 Tag ${normalized} 已存在`)
}

export async function createAnnotatedTag(
  repositoryPath: string,
  tag: { name: string; message: string },
  commit: string,
) {
  await git(repositoryPath, [
    'tag',
    '-a',
    tag.name,
    commit,
    '-m',
    tag.message,
  ])
}

export async function pushRepositoryTag(
  repositoryPath: string,
  name: string,
) {
  await git(repositoryPath, ['push', 'origin', `refs/tags/${name}`])
}
