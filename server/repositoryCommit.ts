import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { scanRepository } from './repositoryScanner.js'
import { gitExecutable } from './gitExecutable.js'

const execFileAsync = promisify(execFile)

export interface RepositoryCommitRequest {
  message: string
  paths: string[]
  confirmedDeletions: string[]
}

export interface RepositoryCommitPreview {
  branch: string
  message: string
  paths: string[]
  deletedCadPaths: string[]
}

async function git(repositoryPath: string, args: string[]) {
  const { stdout } = await execFileAsync(gitExecutable(), ['-C', repositoryPath, ...args], {
    encoding: 'utf8',
    windowsHide: true,
    maxBuffer: 10 * 1024 * 1024,
  })
  return stdout.replace(/[\r\n]+$/, '')
}

function validateMessage(message: string) {
  const normalized = message.trim()
  if (!normalized) throw new Error('提交说明不能为空')
  if (normalized.length > 200) throw new Error('提交说明不能超过 200 个字符')
  return normalized
}

export async function previewRepositoryCommit(
  repositoryPath: string,
  request: RepositoryCommitRequest,
): Promise<RepositoryCommitPreview> {
  const message = validateMessage(request.message)
  const paths = [...new Set(request.paths)]
  if (!paths.length) throw new Error('至少选择一个文件')

  const staged = await git(repositoryPath, ['diff', '--cached', '--name-only', '-z'])
  if (staged) throw new Error('暂存区已有其他文件，请先处理后再继续')

  const repository = await scanRepository(repositoryPath)
  const changesByPath = new Map(repository.changes.map((change) => [change.path, change]))
  if (paths.some((path) => !changesByPath.has(path))) {
    throw new Error('选择的文件不在当前修改列表中')
  }

  const deletedCadPaths = paths.filter((path) => {
    const change = changesByPath.get(path)
    return change?.kind === 'deleted' && change.isCad
  })
  const confirmed = new Set(request.confirmedDeletions)
  if (deletedCadPaths.some((path) => !confirmed.has(path))) {
    throw new Error('删除的 CAD 文件尚未逐项确认')
  }

  return {
    branch: repository.branch,
    message,
    paths,
    deletedCadPaths,
  }
}

export async function commitRepositoryChanges(
  repositoryPath: string,
  request: RepositoryCommitRequest,
) {
  const preview = await previewRepositoryCommit(repositoryPath, request)
  await git(repositoryPath, ['add', '--', ...preview.paths])

  try {
    await git(repositoryPath, ['commit', '-m', preview.message])
  } catch (error) {
    await git(repositoryPath, ['reset', '--', ...preview.paths])
    throw error
  }

  return {
    commit: await git(repositoryPath, ['rev-parse', '--short', 'HEAD']),
    branch: preview.branch,
    paths: preview.paths,
  }
}
