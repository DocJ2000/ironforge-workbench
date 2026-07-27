import { app, BrowserWindow, dialog, ipcMain, safeStorage, shell } from 'electron'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CredentialVault, type GitLabCredentialInput } from './credentialVault.js'
import { startLocalServer } from './localServer.js'
import { createRepositoryMiddleware } from '../server/repositoryApiPlugin.js'
import { ProjectRegistry } from '../server/projectRegistry.js'
import { homedir } from 'node:os'
import { access, mkdir, writeFile } from 'node:fs/promises'
import { IdentityKeyService } from './identityKeyService.js'

const currentDirectory = fileURLToPath(new URL('.', import.meta.url))

function registerCredentialHandlers(vault: CredentialVault) {
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

function registerFileDialogHandlers() {
  ipcMain.handle('dialog:directory', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
    })
    return result.canceled ? null : result.filePaths[0] ?? null
  })
  ipcMain.handle('dialog:ssh-key', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      title: '选择 SSH 私钥',
    })
    return result.canceled ? null : result.filePaths[0] ?? null
  })
}

function registerIdentityHandlers(service: IdentityKeyService) {
  ipcMain.handle('identity:status', (_event, projectId: string) =>
    service.status(projectId),
  )
  ipcMain.handle(
    'identity:generate',
    (_event, input: { projectId: string; passphrase?: string }) =>
      service.generate(input),
  )
  ipcMain.handle('identity:public-key', async (_event, projectId: string) => ({
    publicKey: await service.publicKey(projectId),
  }))
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
      preload: join(currentDirectory, 'preload.cjs'),
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
  const userDataPath = app.getPath('userData')
  let sshKeygenExecutable = 'ssh-keygen'
  if (app.isPackaged) {
    const bundledGit = join(process.resourcesPath, 'git', 'cmd', 'git.exe')
    const bundledSsh = join(process.resourcesPath, 'git', 'usr', 'bin', 'ssh.exe')
    sshKeygenExecutable = join(
      process.resourcesPath,
      'git',
      'usr',
      'bin',
      'ssh-keygen.exe',
    )
    await Promise.all([
      access(bundledGit),
      access(bundledSsh),
      access(sshKeygenExecutable),
    ])
    process.env.IRONFORGE_GIT_EXECUTABLE = bundledGit
    process.env.IRONFORGE_SSH_EXECUTABLE = bundledSsh
  }
  const vault = new CredentialVault(
    join(userDataPath, 'gitlab-credentials.dat'),
    safeStorage,
  )
  registerCredentialHandlers(vault)
  registerFileDialogHandlers()
  registerIdentityHandlers(
    new IdentityKeyService(
      join(userDataPath, 'identities'),
      sshKeygenExecutable,
    ),
  )
  if (!process.env.VITE_DEV_SERVER_URL) {
    const helperDirectory = join(userDataPath, 'helpers')
    const sshAskPassPath = join(helperDirectory, 'ssh-askpass.cmd')
    await mkdir(helperDirectory, { recursive: true })
    await writeFile(
      sshAskPassPath,
      '@echo off\r\necho %IRONFORGE_SSH_PASSPHRASE%\r\n',
      'utf8',
    )
    const repositoryPath = app.getPath('documents')
    const registry = new ProjectRegistry(
      join(homedir(), '.ironforge-workbench', 'projects.json'),
      repositoryPath,
    )
    const middleware = createRepositoryMiddleware({
      repositoryPath,
      registry,
      credentials: async (projectId) => ({
        ...(await vault.get(projectId)),
        sshAskPassPath,
      }),
      sshAskPassPath,
    })
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
