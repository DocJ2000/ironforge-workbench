import { execFile } from 'node:child_process'
import { mkdir, readdir, stat } from 'node:fs/promises'
import { dirname, isAbsolute, resolve } from 'node:path'
import { promisify } from 'node:util'
import {
  gitRemoteEnvironment,
  type GitRemoteCredentials,
} from './gitBranchOperations.js'

const execFileAsync = promisify(execFile)

export interface CloneRepositoryInput {
  remoteUrl: string
  destination: string
  credentials?: GitRemoteCredentials
}

export async function cloneRepository(input: CloneRepositoryInput) {
  const remoteUrl = input.remoteUrl.trim()
  const destination = resolve(input.destination.trim())
  if (!remoteUrl) throw new Error('请填写 GitLab 项目地址')
  if (!isAbsolute(input.destination.trim())) throw new Error('请选择完整的本地保存路径')
  if (input.credentials) {
    if (!isAbsolute(input.credentials.sshKeyPath)) {
      throw new Error('请选择完整的 SSH 私钥路径')
    }
    const key = await stat(input.credentials.sshKeyPath).catch(() => null)
    if (!key?.isFile()) throw new Error('SSH 私钥文件不存在')
  }
  const existing = await stat(destination).catch(() => null)
  if (existing && !existing.isDirectory()) throw new Error('保存位置不是文件夹')
  if (existing && (await readdir(destination)).length) {
    throw new Error('选择的文件夹不是空的，请换一个新文件夹')
  }
  await mkdir(dirname(destination), { recursive: true })
  await execFileAsync('git', ['clone', '--', remoteUrl, destination], {
    encoding: 'utf8',
    windowsHide: true,
    maxBuffer: 10 * 1024 * 1024,
    ...(input.credentials
      ? { env: gitRemoteEnvironment(input.credentials) }
      : {}),
  })
  return { path: destination }
}
