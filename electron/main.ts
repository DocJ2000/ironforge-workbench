import { app, BrowserWindow, ipcMain, safeStorage, shell } from 'electron'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CredentialVault, type GitLabCredentialInput } from './credentialVault.js'
import { startLocalServer } from './localServer.js'
import { createRepositoryMiddleware } from '../server/repositoryApiPlugin.js'

const currentDirectory = fileURLToPath(new URL('.', import.meta.url))

function registerCredentialHandlers() {
  const vault = new CredentialVault(
    join(app.getPath('userData'), 'gitlab-credentials.dat'),
    safeStorage,
  )
  ipcMain.handle('credentials:status', (_event, projectId: string) =>
    vault.status(projectId),
  )
  ipcMain.handle(
    'credentials:save',
    (_event, input: GitLabCredentialInput) => vault.save(input),
  )
  ipcMain.handle('credentials:clear', (_event, projectId: string) =>
    vault.clear(projectId),
  )
}

let productionOrigin: string | null = null

function createWindow() {
  const window = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 900,
    minHeight: 640,
    show: false,
    backgroundColor: '#edf0f1',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: join(currentDirectory, 'preload.js'),
    },
  })

  window.once('ready-to-show', () => window.show())
  window.webContents.setWindowOpenHandler(({ url }) => {
    const target = new URL(url)
    const allowed =
      target.protocol === 'https:' ||
      (target.protocol === 'http:' && target.hostname === 'ironforge.holo.tp')
    if (allowed) void shell.openExternal(url)
    return { action: 'deny' }
  })

  const developmentUrl = process.env.VITE_DEV_SERVER_URL
  if (developmentUrl) {
    void window.loadURL(developmentUrl)
  } else {
    void window.loadURL(`${productionOrigin}/workspace`)
  }
}

app.whenReady().then(async () => {
  registerCredentialHandlers()
  if (!process.env.VITE_DEV_SERVER_URL) {
    const repositoryPath = app.getPath('documents')
    const middleware = createRepositoryMiddleware({ repositoryPath })
    const localServer = await startLocalServer({
      staticRoot: join(currentDirectory, '..', '..', 'dist'),
      middleware,
    })
    productionOrigin = localServer.origin
    app.once('before-quit', () => void localServer.close())
  }
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
