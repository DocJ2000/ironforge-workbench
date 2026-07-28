interface DesktopCredentialInput {
  projectId: string
  baseUrl: string
  token: string
  sshKeyPath: string
  sshPassphrase?: string
}

interface DesktopCredentialStatus {
  projectId?: string
  configured: boolean
  baseUrl?: string
  sshKeyPath?: string
}

interface Window {
  ironforgeDesktop?: {
    platform: string
    packaged: boolean
    notifications?: {
      show: (input: { title: string; body: string }) => Promise<boolean>
    }
    credentials: {
      status: (projectId: string) => Promise<DesktopCredentialStatus>
      save: (input: DesktopCredentialInput) => Promise<DesktopCredentialStatus>
      clear: (projectId: string) => Promise<DesktopCredentialStatus>
    }
    dialogs?: {
      chooseDirectory: () => Promise<string | null>
      chooseSshKey: () => Promise<string | null>
    }
    ironforge?: {
      open: (url: string) => Promise<boolean>
    }
    identity?: {
      status: (projectId: string) => Promise<{
        configured: boolean
        pathHint?: string
      }>
      generate: (input: {
        projectId: string
        passphrase?: string
      }) => Promise<{
        configured: boolean
        publicKey: string
        pathHint: string
      }>
      publicKey: (projectId: string) => Promise<{ publicKey: string }>
    }
    updates?: {
      status: () => Promise<DesktopUpdateStatus>
      check: () => Promise<DesktopUpdateStatus>
      download: () => Promise<DesktopUpdateStatus>
      install: () => Promise<DesktopUpdateStatus>
    }
    userData?: {
      reset: () => Promise<boolean>
    }
    settings?: {
      load: () => Promise<DesktopAppSettings>
      save: (settings: DesktopAppSettings) => Promise<DesktopAppSettings>
    }
  }
}

interface DesktopAppSettings {
  gitlabUrl: string
  ironforgeUrl: string
  connectionVerified: boolean
}

interface DesktopUpdateStatus {
  phase:
    | 'unavailable'
    | 'idle'
    | 'checking'
    | 'available'
    | 'downloading'
    | 'ready'
    | 'error'
  currentVersion: string
  availableVersion?: string
  progress?: number
  message?: string
  releases?: Array<{ version: string; notes: string[] }>
}
