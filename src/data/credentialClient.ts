export interface CredentialInput {
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

const bridge = () => window.ironforgeDesktop?.credentials

export const credentialClient = {
  available: () => Boolean(bridge()),
  status: (projectId: string): Promise<CredentialStatus> =>
    bridge()?.status(projectId) ?? Promise.resolve({ configured: false }),
  save: (input: CredentialInput): Promise<CredentialStatus> => {
    const credentials = bridge()
    if (!credentials) throw new Error('安全保存仅在桌面版中可用')
    return credentials.save(input)
  },
  clear: (projectId: string): Promise<CredentialStatus> => {
    const credentials = bridge()
    if (!credentials) throw new Error('安全保存仅在桌面版中可用')
    return credentials.clear(projectId)
  },
}
