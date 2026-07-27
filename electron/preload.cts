import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('ironforgeDesktop', {
  platform: process.platform,
  packaged: true,
  credentials: {
    status: (projectId: string) =>
      ipcRenderer.invoke('credentials:status', projectId),
    save: (input: {
      projectId: string
      baseUrl: string
      token: string
      sshKeyPath: string
      sshPassphrase?: string
    }) => ipcRenderer.invoke('credentials:save', input),
    clear: (projectId: string) =>
      ipcRenderer.invoke('credentials:clear', projectId),
  },
  dialogs: {
    chooseDirectory: () => ipcRenderer.invoke('dialog:directory'),
    chooseSshKey: () => ipcRenderer.invoke('dialog:ssh-key'),
  },
  ironforge: {
    open: (url: string) => ipcRenderer.invoke('ironforge:open', url),
  },
  identity: {
    status: (projectId: string) =>
      ipcRenderer.invoke('identity:status', projectId),
    generate: (input: { projectId: string; passphrase?: string }) =>
      ipcRenderer.invoke('identity:generate', input),
    publicKey: (projectId: string) =>
      ipcRenderer.invoke('identity:public-key', projectId),
  },
})
