import { execFile } from 'node:child_process'
import { readdir, readFile, stat } from 'node:fs/promises'
import { basename, extname, join, resolve } from 'node:path'
import { promisify } from 'node:util'
import { gitExecutable } from './gitExecutable.js'
import type {
  BranchSummary,
  ChangeKind,
  DeliveryPackage,
  RepositorySnapshot,
  WorkingTreeChange,
} from '../src/domain/repository.js'

const execFileAsync = promisify(execFile)
const cadExtensions = new Set([
  '.asm',
  '.drw',
  '.dwg',
  '.dxf',
  '.igs',
  '.iges',
  '.prt',
  '.step',
  '.stp',
])

const fileTypeLabels: Record<string, string> = {
  '.asm': 'Creo 装配',
  '.drw': 'Creo 工程图',
  '.dwg': 'DWG 工程图',
  '.dxf': 'DXF 工程图',
  '.igs': 'IGES 模型',
  '.iges': 'IGES 模型',
  '.json': 'Ironforge 配置',
  '.pdf': '工程图 PDF',
  '.prt': 'Creo 零件',
  '.step': 'STEP 模型',
  '.stp': 'STEP 模型',
}

interface ChargeEntry {
  name: string
  path: string
}

async function git(repositoryPath: string, args: string[]) {
  const { stdout } = await execFileAsync(gitExecutable(), ['-C', repositoryPath, ...args], {
    encoding: 'utf8',
    windowsHide: true,
    maxBuffer: 10 * 1024 * 1024,
  })
  return stdout.replace(/[\r\n]+$/, '')
}

async function optionalGit(repositoryPath: string, args: string[]) {
  try {
    return await git(repositoryPath, args)
  } catch {
    return ''
  }
}

function normalizePath(path: string) {
  return path.replaceAll('\\', '/')
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function changeKind(status: string): ChangeKind {
  if (status === '??') return 'untracked'
  if (status.includes('D')) return 'deleted'
  if (status.includes('A')) return 'added'
  return 'modified'
}

async function workingTreeChanges(repositoryPath: string): Promise<WorkingTreeChange[]> {
  const output = await git(repositoryPath, [
    'status',
    '--porcelain=v1',
    '-z',
    '--untracked-files=all',
  ])
  const entries = output.split('\0').filter(Boolean)
  const changes: WorkingTreeChange[] = []

  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index]
    const status = entry.slice(0, 2)
    let path = entry.slice(3)
    if (status.includes('R') || status.includes('C')) {
      path = entries[index + 1] ?? path
      index += 1
    }

    const normalizedPath = normalizePath(path)
    const extension = extname(normalizedPath).toLowerCase()
    let bytes = 0
    try {
      bytes = (await stat(join(repositoryPath, path))).size
    } catch {
      // Deleted files intentionally have no current filesystem size.
    }

    changes.push({
      id: `${status}-${normalizedPath}`,
      path: normalizedPath,
      name: basename(normalizedPath),
      kind: changeKind(status),
      fileType: fileTypeLabels[extension] ?? (extension ? extension.slice(1).toUpperCase() : '文件'),
      size: bytes ? formatBytes(bytes) : '-',
      isCad: cadExtensions.has(extension),
      lfsTracked: cadExtensions.has(extension) || extension === '.pdf',
    })
  }

  return changes.sort((left, right) => left.path.localeCompare(right.path, 'zh-CN'))
}

async function packageFiles(repositoryPath: string, packagePath: string) {
  const absolutePath = resolve(repositoryPath, packagePath)
  const files = await readdir(absolutePath, { withFileTypes: true })
  const result: DeliveryPackage['files'] = []

  for (const file of files) {
    if (!file.isFile()) continue
    const absoluteFile = join(absolutePath, file.name)
    const extension = extname(file.name).toLowerCase()
    result.push({
      name: file.name,
      type: fileTypeLabels[extension]?.split(' ')[0] ?? extension.slice(1).toUpperCase(),
      size: formatBytes((await stat(absoluteFile)).size),
    })
  }

  return result.sort((left, right) => left.name.localeCompare(right.name, 'zh-CN'))
}

async function deliveryPackages(repositoryPath: string): Promise<DeliveryPackage[]> {
  let entries: ChargeEntry[]
  try {
    entries = JSON.parse(await readFile(join(repositoryPath, 'charge.json'), 'utf8'))
  } catch {
    return []
  }

  return Promise.all(
    entries.map(async (entry, index) => {
      try {
        const files = await packageFiles(repositoryPath, entry.path)
        return {
          id: `package-${index}`,
          name: entry.name,
          path: normalizePath(entry.path),
          supplier: '待配置',
          files,
          validation: files.length ? 'valid' : 'warning',
        } satisfies DeliveryPackage
      } catch {
        return {
          id: `package-${index}`,
          name: entry.name,
          path: normalizePath(entry.path),
          supplier: '待配置',
          files: [],
          validation: 'invalid',
        } satisfies DeliveryPackage
      }
    }),
  )
}

function branchStage(name: string) {
  if (name === 'main' || name === 'master') return '正式主线'
  const stage = name.match(/(?:^|\/)(T\d+)$/i)?.[1]
  return stage ? `${stage.toUpperCase()} 设计` : '开发分支'
}

async function branches(repositoryPath: string, currentBranch: string): Promise<BranchSummary[]> {
  const output = await git(repositoryPath, [
    'for-each-ref',
    '--format=%(refname:short)%00%(objectname:short)%00%(subject)%00%(committerdate:iso8601)',
    'refs/heads',
  ])
  if (!output) return []

  return output.split('\n').map((line) => {
    const [name, commit, commitMessage, updatedAt] = line.split('\0')
    return {
      name,
      stage: branchStage(name),
      commit,
      commitMessage,
      updatedAt,
      remote: false,
      current: name === currentBranch,
    }
  })
}

async function upstreamState(repositoryPath: string) {
  const upstream = await optionalGit(repositoryPath, [
    'rev-parse',
    '--abbrev-ref',
    '--symbolic-full-name',
    '@{upstream}',
  ])
  if (!upstream) return { upstream: '未设置远程分支', ahead: 0, behind: 0 }

  const counts = await optionalGit(repositoryPath, [
    'rev-list',
    '--left-right',
    '--count',
    `HEAD...${upstream}`,
  ])
  const [ahead = 0, behind = 0] = counts.split(/\s+/).map(Number)
  return { upstream, ahead, behind }
}

export async function scanRepository(repositoryPath: string): Promise<RepositorySnapshot> {
  const root = resolve(await git(repositoryPath, ['rev-parse', '--show-toplevel']))
  const name = basename(root)
  const branch = await git(root, ['branch', '--show-current'])
  const latestCommit = await git(root, ['rev-parse', '--short', 'HEAD'])
  const latestCommitMessage = await git(root, ['log', '-1', '--pretty=%s'])
  const sync = await upstreamState(root)
  const packages = await deliveryPackages(root)

  return {
    id: name,
    name,
    displayName: name,
    path: root,
    gitlabPath: await optionalGit(root, ['remote', 'get-url', 'origin']),
    branch,
    upstream: sync.upstream,
    stage: branchStage(branch),
    ahead: sync.ahead,
    behind: sync.behind,
    latestCommit,
    latestCommitMessage,
    changes: await workingTreeChanges(root),
    branches: await branches(root, branch),
    deliveryPackages: packages,
    mergeRequest: {
      id: 0,
      sourceBranch: branch,
      targetBranch: 'main',
      title: '尚未读取 GitLab MR',
      status: 'draft',
      reviewer: '待管理员审核',
    },
    publishJob: {
      id: 'not-connected',
      status: 'not_started',
      commit: latestCommit,
      packageCount: packages.length,
    },
    history: [
      {
        id: latestCommit,
        type: 'commit',
        title: latestCommitMessage,
        description: `当前分支 ${branch} 的最新提交`,
        actor: await optionalGit(root, ['log', '-1', '--pretty=%an']),
        timestamp: await optionalGit(root, ['log', '-1', '--date=format:%Y-%m-%d %H:%M', '--pretty=%ad']),
        reference: latestCommit,
        tone: 'info',
      },
    ],
  }
}
