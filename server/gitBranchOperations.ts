import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { gitExecutable } from './gitExecutable.js'

const execFileAsync = promisify(execFile)

export interface GitRemoteCredentials {
  sshKeyPath: string
  sshPassphrase?: string
  sshAskPassPath?: string
}

export function gitRemoteEnvironment(credentials: GitRemoteCredentials) {
  const escapedKeyPath = credentials.sshKeyPath.replace(/"/g, '\\"')
  const sshExecutable = (
    process.env.IRONFORGE_SSH_EXECUTABLE?.trim() || 'ssh'
  ).replace(/"/g, '\\"')
  const passphraseEnvironment =
    credentials.sshPassphrase && credentials.sshAskPassPath
      ? {
          SSH_ASKPASS: credentials.sshAskPassPath,
          SSH_ASKPASS_REQUIRE: 'force',
          DISPLAY: 'ironforge-workbench',
          IRONFORGE_SSH_PASSPHRASE: credentials.sshPassphrase,
        }
      : {}
  return {
    ...process.env,
    ...passphraseEnvironment,
    GIT_SSH_COMMAND: `"${sshExecutable}" -i "${escapedKeyPath}" -o IdentitiesOnly=yes${credentials.sshPassphrase ? '' : ' -o BatchMode=yes'}`,
  }
}

async function git(
  repositoryPath: string,
  args: string[],
  credentials?: GitRemoteCredentials,
) {
  const { stdout } = await execFileAsync(gitExecutable(), ['-C', repositoryPath, ...args], {
    encoding: 'utf8',
    windowsHide: true,
    maxBuffer: 10 * 1024 * 1024,
    ...(credentials ? { env: gitRemoteEnvironment(credentials) } : {}),
  })
  return stdout.trim()
}

async function optionalGit(
  repositoryPath: string,
  args: string[],
  credentials?: GitRemoteCredentials,
) {
  try {
    return await git(repositoryPath, args, credentials)
  } catch {
    return ''
  }
}

export async function probeRepositoryRemote(
  repositoryPath: string,
  credentials: GitRemoteCredentials,
) {
  await git(repositoryPath, ['ls-remote', '--heads', 'origin'], credentials)
}

export async function refreshRepositoryRemoteBranches(
  repositoryPath: string,
  credentials?: GitRemoteCredentials,
) {
  await git(repositoryPath, ['fetch', 'origin', '--prune'], credentials)
}

export interface CreateBranchInput {
  name: string
  startPoint: string
}

export function validateRetryPushBranch(branch: string) {
  if (!/^dev\/[A-Za-z0-9._+/-]+$/.test(branch.trim())) {
    throw new Error('只能上传到开发分支')
  }
  return branch.trim()
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

export async function createAndPublishRepositoryBranch(
  repositoryPath: string,
  input: CreateBranchInput,
  credentials?: GitRemoteCredentials,
) {
  const name = input.name.trim()
  if (!/^dev\/[A-Za-z0-9._+/-]+$/.test(name)) {
    throw new Error('只能创建 dev/ 开头的工作版本')
  }

  const originalBranch = await git(repositoryPath, ['branch', '--show-current'])
  let created = false
  try {
    const startPoint = input.startPoint.startsWith('origin/')
      ? input.startPoint
      : `origin/${input.startPoint}`
    await createRepositoryBranch(repositoryPath, { ...input, name, startPoint })
    created = true
    await pushRepositoryBranch(repositoryPath, name, credentials)
    return { branch: name }
  } catch (error) {
    if (created) {
      await git(repositoryPath, ['switch', originalBranch])
      await git(repositoryPath, ['branch', '-D', name])
    }
    throw error
  }
}

export async function checkoutRepositoryBranch(
  repositoryPath: string,
  branch: string,
  credentials?: GitRemoteCredentials,
) {
  const name = branch.trim()
  if (!name) throw new Error('请选择工作版本')
  if (await optionalGit(repositoryPath, ['rev-parse', '--verify', name])) {
    await git(repositoryPath, ['switch', name])
    return
  }
  const remoteRef = `origin/${name}`
  if (await optionalGit(repositoryPath, ['ls-remote', '--heads', 'origin', name], credentials)) {
    await git(repositoryPath, ['fetch', 'origin', `${name}:${name}`], credentials)
    await git(repositoryPath, ['branch', '--set-upstream-to', remoteRef, name])
    await git(repositoryPath, ['switch', name])
    return
  }
  await git(repositoryPath, ['switch', name])
}

export async function pushRepositoryBranch(
  repositoryPath: string,
  branch: string,
  credentials?: GitRemoteCredentials,
) {
  await git(repositoryPath, ['push', '--set-upstream', 'origin', branch], credentials)
}

export async function repositoryBranchCommit(
  repositoryPath: string,
  branch: string,
) {
  return git(repositoryPath, ['rev-parse', '--verify', branch])
}

export async function assertTagAvailable(
  repositoryPath: string,
  name: string,
  credentials?: GitRemoteCredentials,
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
  ], credentials)
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
  credentials?: GitRemoteCredentials,
) {
  await git(repositoryPath, ['push', 'origin', `refs/tags/${name}`], credentials)
}

export async function ensureRepositoryTag(
  repositoryPath: string,
  tag: { name: string; message: string },
  commit: string,
  credentials?: GitRemoteCredentials,
) {
  const name = tag.name.trim()
  try {
    await git(repositoryPath, ['check-ref-format', `refs/tags/${name}`])
  } catch {
    throw new Error('版本 Tag 名称不合法')
  }

  const local = await git(repositoryPath, ['tag', '--list', name])
  if (local) {
    const localCommit = await git(repositoryPath, ['rev-list', '-n', '1', name])
    if (localCommit !== commit) throw new Error(`版本 Tag ${name} 已指向其他版本，请换一个名称`)
  }

  const remote = await git(repositoryPath, [
    'ls-remote',
    '--tags',
    'origin',
    `refs/tags/${name}*`,
  ], credentials)
  if (remote) {
    const remoteCommit = remote.split(/\r?\n/)
      .find((line) => line.endsWith(`refs/tags/${name}^{}`))
      ?.split(/\s+/)[0]
      ?? remote.split(/\s+/)[0]
    if (remoteCommit !== commit) throw new Error(`远端版本 Tag ${name} 已指向其他版本，请换一个名称`)
    return
  }

  if (!local) await createAnnotatedTag(repositoryPath, { ...tag, name }, commit)
  await pushRepositoryTag(repositoryPath, name, credentials)
}
