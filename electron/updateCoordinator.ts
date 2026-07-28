interface UpdateInfo {
  version?: string
  releaseNotes?: string | Array<{ version?: string; note?: string | null }>
}

interface DownloadProgress {
  percent?: number
}

export interface DesktopUpdater {
  autoDownload: boolean
  autoInstallOnAppQuit: boolean
  fullChangelog?: boolean
  on(event: 'checking-for-update', listener: () => void): unknown
  on(event: 'update-available' | 'update-not-available' | 'update-downloaded', listener: (info: UpdateInfo) => void): unknown
  on(event: 'download-progress', listener: (progress: DownloadProgress) => void): unknown
  on(event: 'error', listener: (error: Error) => void): unknown
  checkForUpdates(): Promise<unknown>
  downloadUpdate(): Promise<unknown>
  quitAndInstall(): void
}

export type UpdatePhase =
  | 'unavailable'
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'ready'
  | 'error'

export interface UpdateStatus {
  phase: UpdatePhase
  currentVersion: string
  availableVersion?: string
  progress?: number
  message?: string
  releases?: Array<{ version: string; notes: string[] }>
}

interface UpdateCoordinatorOptions {
  updater: DesktopUpdater
  packaged: boolean
  currentVersion: string
  beforeInstall: () => Promise<unknown>
}

export class UpdateCoordinator {
  private readonly updater: DesktopUpdater
  private readonly packaged: boolean
  private readonly beforeInstall: () => Promise<unknown>
  private state: UpdateStatus

  constructor({ updater, packaged, currentVersion, beforeInstall }: UpdateCoordinatorOptions) {
    this.updater = updater
    this.packaged = packaged
    this.beforeInstall = beforeInstall
    this.state = {
      phase: packaged ? 'idle' : 'unavailable',
      currentVersion,
      ...(!packaged ? { message: '安装正式版本后才能检查更新' } : {}),
    }
    updater.autoDownload = false
    updater.autoInstallOnAppQuit = false
    updater.fullChangelog = true
    updater.on('checking-for-update', () => this.set({ phase: 'checking' }))
    updater.on('update-available', (info) =>
      this.set({
        phase: 'available',
        availableVersion: info.version,
        releases: normalizeReleaseNotes(info),
      }),
    )
    updater.on('update-not-available', () =>
      this.set({ phase: 'idle', message: '当前已经是最新版本' }),
    )
    updater.on('download-progress', (progress) =>
      this.set({
        phase: 'downloading',
        progress: Math.round(progress.percent ?? 0),
      }),
    )
    updater.on('update-downloaded', (info) =>
      this.set({ phase: 'ready', availableVersion: info.version }),
    )
    updater.on('error', () =>
      this.set({
        phase: 'error',
        message: '暂时无法完成更新，请稍后重试。当前版本仍可正常使用。',
      }),
    )
  }

  private set(next: Partial<UpdateStatus>) {
    this.state = {
      ...this.state,
      ...next,
    }
  }

  status() {
    return { ...this.state }
  }

  async check() {
    if (!this.packaged) return this.status()
    this.set({ phase: 'checking', message: undefined, progress: undefined })
    await this.updater.checkForUpdates().catch(() => {
      this.set({ phase: 'error', message: '检查更新失败，请确认网络连接后重试。' })
    })
    return this.status()
  }

  async download() {
    if (this.state.phase !== 'available') throw new Error('当前没有可下载的新版本')
    this.set({ phase: 'downloading', progress: 0 })
    await this.updater.downloadUpdate()
    return this.status()
  }

  async install() {
    if (this.state.phase !== 'ready') throw new Error('新版本尚未下载完成')
    await this.beforeInstall()
    this.updater.quitAndInstall()
    return this.status()
  }
}

function normalizeReleaseNotes(info: UpdateInfo) {
  const entries = Array.isArray(info.releaseNotes)
    ? info.releaseNotes.map((release) => ({
        version: release.version ?? info.version ?? '新版本',
        note: release.note ?? '',
      }))
    : [{ version: info.version ?? '新版本', note: info.releaseNotes ?? '' }]

  return entries
    .map(({ version, note }) => ({ version, notes: markdownToPlainItems(note) }))
    .filter((release) => release.notes.length > 0)
}

function markdownToPlainItems(markdown: string) {
  return markdown
    .split(/\r?\n/)
    .map((line) => line
      .replace(/^\s*(?:[-*+]|\d+[.)])\s+/, '')
      .replace(/^#{1,6}\s+/, '')
      .replace(/\[([^\]]+)]\([^)]+\)/g, '$1')
      .replace(/[*_`~]/g, '')
      .trim())
    .filter(Boolean)
    .slice(0, 30)
}
