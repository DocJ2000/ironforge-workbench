import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

export interface AppSettings {
  gitlabUrl: string
  ironforgeUrl: string
  connectionVerified: boolean
}

const emptySettings: AppSettings = {
  gitlabUrl: '',
  ironforgeUrl: '',
  connectionVerified: false,
}

export class AppSettingsStore {
  constructor(private readonly filePath: string) {}

  async load(): Promise<AppSettings> {
    try {
      const parsed = JSON.parse(await readFile(this.filePath, 'utf8')) as Partial<AppSettings>
      return {
        gitlabUrl: parsed.gitlabUrl?.trim() ?? '',
        ironforgeUrl: parsed.ironforgeUrl?.trim() ?? '',
        connectionVerified: parsed.connectionVerified === true,
      }
    } catch {
      return { ...emptySettings }
    }
  }

  async save(input: AppSettings): Promise<AppSettings> {
    const settings: AppSettings = {
      gitlabUrl: input.gitlabUrl.trim().replace(/\/+$/, ''),
      ironforgeUrl: input.ironforgeUrl.trim().replace(/\/+$/, ''),
      connectionVerified: input.connectionVerified === true,
    }
    await mkdir(dirname(this.filePath), { recursive: true })
    const temporaryPath = `${this.filePath}.${process.pid}.tmp`
    await writeFile(temporaryPath, `${JSON.stringify(settings, null, 2)}\n`, 'utf8')
    await rename(temporaryPath, this.filePath)
    return settings
  }
}
