import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import {
  gitRemoteEnvironment,
  type GitRemoteCredentials,
} from './gitBranchOperations.js'

const execFileAsync = promisify(execFile)

async function git(
  repositoryPath: string,
  args: string[],
  credentials?: GitRemoteCredentials,
) {
  const { stdout } = await execFileAsync('git', ['-C', repositoryPath, ...args], {
    encoding: 'utf8',
    windowsHide: true,
    maxBuffer: 10 * 1024 * 1024,
    ...(credentials ? { env: gitRemoteEnvironment(credentials) } : {}),
  })
  return stdout.trim()
}

export async function pullRepository(
  repositoryPath: string,
  credentials?: GitRemoteCredentials,
) {
  if (await git(repositoryPath, ['status', '--porcelain'])) {
    throw new Error('本地还有未上传的改动，请先上传或处理这些文件后再获取')
  }
  const branch = await git(repositoryPath, ['branch', '--show-current'])
  if (!branch) throw new Error('当前没有选择工作分支')
  await git(repositoryPath, ['fetch', 'origin', branch], credentials)
  const counts = await git(repositoryPath, [
    'rev-list',
    '--left-right',
    '--count',
    'HEAD...FETCH_HEAD',
  ])
  const [ahead, behind] = counts.split(/\s+/).map(Number)
  if (ahead > 0 && behind > 0) {
    throw new Error('本地版本和云端版本已经分叉，请交给熟悉 Git 的同事处理')
  }
  if (behind > 0) {
    await git(repositoryPath, ['merge', '--ff-only', 'FETCH_HEAD'])
  }
  return {
    branch,
    updated: behind > 0,
    receivedCommits: behind,
    commit: await git(repositoryPath, ['rev-parse', '--short', 'HEAD']),
  }
}
