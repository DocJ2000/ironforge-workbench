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

const unavailable: UpdateStatus = {
  phase: 'unavailable',
  currentVersion: '网页预览',
  message: '安装正式版本后才能检查更新',
}

export const updateClient = {
  available: () => Boolean(window.ironforgeDesktop?.updates),
  status: () => window.ironforgeDesktop?.updates?.status() ?? Promise.resolve(unavailable),
  check: () => window.ironforgeDesktop?.updates?.check() ?? Promise.resolve(unavailable),
  download: () => window.ironforgeDesktop?.updates?.download() ?? Promise.resolve(unavailable),
  install: () => window.ironforgeDesktop?.updates?.install() ?? Promise.resolve(unavailable),
}
