export interface IdentityStatus {
  configured: boolean
  pathHint?: string
}

export interface GeneratedIdentity extends IdentityStatus {
  publicKey: string
  pathHint: string
}

const bridge = () => window.ironforgeDesktop?.identity

export const identityClient = {
  available: () => Boolean(bridge()),
  status: (projectId: string): Promise<IdentityStatus> =>
    bridge()?.status(projectId) ?? Promise.resolve({ configured: false }),
  generate: (input: {
    projectId: string
    passphrase?: string
  }): Promise<GeneratedIdentity> => {
    const identity = bridge()
    if (!identity) throw new Error('创建身份钥匙仅在桌面版中可用')
    return identity.generate(input)
  },
  publicKey: async (projectId: string) => {
    const identity = bridge()
    if (!identity) throw new Error('读取公钥仅在桌面版中可用')
    return (await identity.publicKey(projectId)).publicKey
  },
}
