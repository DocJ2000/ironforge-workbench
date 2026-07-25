import { contextBridge } from 'electron'

contextBridge.exposeInMainWorld('ironforgeDesktop', {
  platform: process.platform,
  packaged: true,
})
