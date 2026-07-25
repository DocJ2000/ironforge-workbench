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
