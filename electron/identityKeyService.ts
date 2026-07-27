import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { access, mkdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export interface IdentityKeyResult {
  configured: boolean
  publicKey?: string
  pathHint?: string
}

function identityName(projectId: string) {
  if (!projectId.trim()) throw new Error('请先选择项目')
  return `identity-${createHash('sha256')
    .update(projectId.trim())
    .digest('hex')
    .slice(0, 16)}`
}

export class IdentityKeyService {
  constructor(
    private readonly rootPath: string,
    private readonly sshKeygenExecutable: string,
  ) {}

  private paths(projectId: string) {
    const privateKey = join(this.rootPath, identityName(projectId))
    return { privateKey, publicKey: `${privateKey}.pub` }
  }

  async status(projectId: string): Promise<IdentityKeyResult> {
    const paths = this.paths(projectId)
    const exists = await Promise.all([
      access(paths.privateKey).then(() => true).catch(() => false),
      access(paths.publicKey).then(() => true).catch(() => false),
    ])
    return exists.every(Boolean)
      ? { configured: true, pathHint: paths.privateKey }
      : { configured: false }
  }

  async generate(input: {
    projectId: string
    passphrase?: string
  }): Promise<IdentityKeyResult> {
    const paths = this.paths(input.projectId)
    if ((await this.status(input.projectId)).configured) {
      throw new Error('这台电脑的身份钥匙已经创建')
    }
    await mkdir(this.rootPath, { recursive: true })
    await execFileAsync(
      this.sshKeygenExecutable,
      [
        '-t',
        'ed25519',
        '-f',
        paths.privateKey,
        '-N',
        input.passphrase ?? '',
        '-C',
        `ironforge-workbench:${input.projectId}`,
      ],
      { encoding: 'utf8', windowsHide: true },
    )
    return {
      configured: true,
      publicKey: (await readFile(paths.publicKey, 'utf8')).trim(),
      pathHint: paths.privateKey,
    }
  }

  async publicKey(projectId: string) {
    const { publicKey } = this.paths(projectId)
    try {
      return (await readFile(publicKey, 'utf8')).trim()
    } catch {
      throw new Error('这台电脑还没有创建身份钥匙')
    }
  }
}
