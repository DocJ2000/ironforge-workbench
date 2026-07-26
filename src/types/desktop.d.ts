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
    credentials: {
      status: (projectId: string) => Promise<DesktopCredentialStatus>
      save: (input: DesktopCredentialInput) => Promise<DesktopCredentialStatus>
      clear: (projectId: string) => Promise<DesktopCredentialStatus>
    }
    dialogs?: {
      chooseDirectory: () => Promise<string | null>
      chooseSshKey: () => Promise<string | null>
    }
  }
}
