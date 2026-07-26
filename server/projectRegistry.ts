import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, readFile, realpath, rename, writeFile } from 'node:fs/promises'
import { basename, dirname, resolve as resolvePath } from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export interface ProjectRecord {
  id: string
  path: string
  name: string
  gitlabRemote: string
  addedAt: string
}

interface StoredRegistry {
  version: 1
  projects: ProjectRecord[]
}

async function git(path: string, args: string[]) {
  const { stdout } = await execFileAsync('git', ['-C', path, ...args], {
    encoding: 'utf8',
    windowsHide: true,
  })
  return stdout.trim()
}

async function optionalGit(path: string, args: string[]) {
  try {
    return await git(path, args)
  } catch {
    return ''
  }
}

async function canonicalGitRoot(candidate: string) {
  const absolute = resolvePath(candidate.trim())
  const root = await git(absolute, ['rev-parse', '--show-toplevel'])
  return realpath(resolvePath(root))
}

function projectId(path: string) {
  return `project-${createHash('sha256').update(path.toLowerCase()).digest('hex').slice(0, 16)}`
}

export class ProjectRegistry {
  private projects: ProjectRecord[] | null = null
  private readonly storagePath: string
  private readonly seedPath?: string

  constructor(storagePath: string, seedPath?: string) {
    this.storagePath = storagePath
    this.seedPath = seedPath
  }

  private async record(path: string): Promise<ProjectRecord> {
    const root = await canonicalGitRoot(path)
    return {
      id: projectId(root),
      path: root,
      name: basename(root),
      gitlabRemote: await optionalGit(root, ['remote', 'get-url', 'origin']),
      addedAt: new Date().toISOString(),
    }
  }

  private async load() {
    if (this.projects) return this.projects
    let stored: StoredRegistry = { version: 1, projects: [] }
    try {
      stored = JSON.parse(await readFile(this.storagePath, 'utf8')) as StoredRegistry
    } catch {
      // A missing or unreadable registry starts empty; validated seed follows.
    }
    this.projects = Array.isArray(stored.projects) ? stored.projects : []
    if (this.seedPath) {
      const seed = await this.record(this.seedPath)
      if (!this.projects.some((project) => project.id === seed.id)) {
        this.projects.unshift(seed)
        await this.persist()
      }
    }
    return this.projects
  }

  private async persist() {
    if (!this.projects) return
    await mkdir(dirname(this.storagePath), { recursive: true })
    const temporaryPath = `${this.storagePath}.${process.pid}.tmp`
    await writeFile(
      temporaryPath,
      `${JSON.stringify({ version: 1, projects: this.projects }, null, 2)}\n`,
      'utf8',
    )
    await rename(temporaryPath, this.storagePath)
  }

  async list() {
    return [...(await this.load())]
  }

  async add(candidatePath: string) {
    if (!candidatePath.trim()) throw new Error('请选择本地 Git 项目文件夹')
    const candidate = await this.record(candidatePath)
    const projects = await this.load()
    const existing = projects.find((project) => project.id === candidate.id)
    if (existing) return existing
    projects.push(candidate)
    await this.persist()
    return candidate
  }

  async remove(id: string) {
    const projects = await this.load()
    const index = projects.findIndex((project) => project.id === id)
    if (index < 0) throw new Error('项目不存在或已移除')
    const [removed] = projects.splice(index, 1)
    await this.persist()
    return removed
  }

  async resolve(id: string) {
    const project = (await this.load()).find((item) => item.id === id)
    if (!project) throw new Error('项目不存在或尚未登记')
    return project
  }
}
