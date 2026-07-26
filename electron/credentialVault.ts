import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute } from 'node:path'

export interface GitLabCredentialInput {
  projectId: string
  baseUrl: string
  token: string
  sshKeyPath: string
  sshPassphrase?: string
}

export interface CredentialStatus {
  projectId?: string
  configured: boolean
  baseUrl?: string
  sshKeyPath?: string
}

export interface CredentialProtector {
  isEncryptionAvailable: () => boolean
  encryptString: (value: string) => Buffer
  decryptString: (value: Buffer) => string
}

export class CredentialVault {
  private readonly filePath: string
  private readonly protector: CredentialProtector

  constructor(filePath: string, protector: CredentialProtector) {
    this.filePath = filePath
    this.protector = protector
  }

  private async read(): Promise<Record<string, GitLabCredentialInput>> {
    try {
      const encrypted = Buffer.from(await readFile(this.filePath, 'utf8'), 'base64')
      return JSON.parse(this.protector.decryptString(encrypted)) as Record<
        string,
        GitLabCredentialInput
      >
    } catch {
      return {}
    }
  }

  async status(projectId: string): Promise<CredentialStatus> {
    const credentials = (await this.read())[projectId]
    return credentials
      ? {
          configured: true,
          projectId,
          baseUrl: credentials.baseUrl,
          sshKeyPath: credentials.sshKeyPath,
        }
      : { configured: false }
  }

  async get(projectId: string): Promise<GitLabCredentialInput> {
    const credentials = (await this.read())[projectId]
    if (!credentials) throw new Error('当前项目尚未配置 GitLab 登录')
    return credentials
  }

  private async persist(credentials: Record<string, GitLabCredentialInput>) {
    const encrypted = this.protector
      .encryptString(JSON.stringify(credentials))
      .toString('base64')
    await mkdir(dirname(this.filePath), { recursive: true })
    const temporaryPath = `${this.filePath}.${process.pid}.tmp`
    await writeFile(temporaryPath, encrypted, 'utf8')
    await rename(temporaryPath, this.filePath)
  }

  async save(input: GitLabCredentialInput): Promise<CredentialStatus> {
    if (!this.protector.isEncryptionAvailable()) {
      throw new Error('当前 Windows 环境无法使用系统安全存储')
    }
    const baseUrl = input.baseUrl.trim().replace(/\/+$/, '')
    const token = input.token.trim()
    const sshKeyPath = input.sshKeyPath.trim()
    const projectId = input.projectId.trim()
    if (!projectId) throw new Error('请选择要配置的项目')
    if (!/^https:\/\/[^/]+/i.test(baseUrl)) {
      throw new Error('GitLab 地址必须使用 HTTPS')
    }
    if (!token) throw new Error('请填写 GitLab Token')
    if (!isAbsolute(sshKeyPath)) throw new Error('请选择完整的 SSH 私钥路径')
    const key = await stat(sshKeyPath).catch(() => null)
    if (!key?.isFile()) throw new Error('SSH 私钥文件不存在')

    const payload: GitLabCredentialInput = {
      projectId,
      baseUrl,
      token,
      sshKeyPath,
      ...(input.sshPassphrase ? { sshPassphrase: input.sshPassphrase } : {}),
    }
    const credentials = await this.read()
    credentials[projectId] = payload
    await this.persist(credentials)
    return { configured: true, projectId, baseUrl, sshKeyPath }
  }

  async clear(projectId: string): Promise<CredentialStatus> {
    const credentials = await this.read()
    delete credentials[projectId]
    if (Object.keys(credentials).length) await this.persist(credentials)
    else await rm(this.filePath, { force: true })
    return { configured: false }
  }
}
