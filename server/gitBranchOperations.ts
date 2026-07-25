import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

async function git(repositoryPath: string, args: string[]) {
  await execFileAsync('git', ['-C', repositoryPath, ...args], {
    encoding: 'utf8',
    windowsHide: true,
    maxBuffer: 10 * 1024 * 1024,
  })
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
