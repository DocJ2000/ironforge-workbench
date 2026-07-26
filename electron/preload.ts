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
})
