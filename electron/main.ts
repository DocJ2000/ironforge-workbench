import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  net,
  Notification,
  safeStorage,
  session,
  shell,
  type MessageBoxOptions,
  type WebContents,
} from 'electron'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CredentialVault, type GitLabCredentialInput } from './credentialVault.js'
import { startLocalServer } from './localServer.js'
import { createRepositoryMiddleware } from '../server/repositoryApiPlugin.js'
import { ProjectRegistry } from '../server/projectRegistry.js'
import { access, mkdir, rm, writeFile } from 'node:fs/promises'
import { IdentityKeyService } from './identityKeyService.js'
import electronUpdater from 'electron-updater'
import { UpdateCoordinator } from './updateCoordinator.js'
import { createUpdateBackup } from './updateBackup.js'
import {
  mayTrustInternalCertificate,
  mayTrustInternalCertificateForHosts,
  mayTrustEmbeddedNavigationCertificate,
} from './certificatePolicy.js'
import { AppSettingsStore, type AppSettings } from './appSettingsStore.js'

const { autoUpdater } = electronUpdater

ipcMain.handle('notifications:show', (_event, input: { title: string; body: string }) => {
  if (!Notification.isSupported()) return false
  new Notification({ title: input.title, body: input.body }).show()
  return true
})
app.setPath(
  'userData',
  join(
    app.getPath('appData'),
    app.isPackaged ? 'ironforge-workbench-data' : 'ironforge-workbench-dev',
  ),
)
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

function registerIronforgeHandlers() {
  const ironforgeSession = session.fromPartition('persist:ironforge')
  const trustedHosts = new Set<string>()
  const trackedContents = new Set<number>()
  ironforgeSession.setCertificateVerifyProc((request, callback) => {
    callback(mayTrustInternalCertificateForHosts(
      request.verificationResult,
      request.hostname,
      trustedHosts,
    ) ? 0 : -3)
  })

  const trustNavigationTarget = (url: string) => {
    try {
      const target = new URL(url)
      if (target.protocol === 'https:' || target.protocol === 'http:') {
        trustedHosts.add(target.hostname.toLowerCase())
      }
    } catch {
      // Invalid navigation targets remain untrusted.
    }
  }

  const trackLoginNavigation = (contents: WebContents) => {
    trackedContents.add(contents.id)
    contents.once('destroyed', () => trackedContents.delete(contents.id))
    contents.on('will-navigate', (_event, url) => trustNavigationTarget(url))
    contents.on('will-redirect', (_event, url) => trustNavigationTarget(url))
    contents.on('did-create-window', (child) => {
      trackLoginNavigation(child.webContents)
    })
    contents.on('did-fail-load', (_event, errorCode, errorDescription, validatedUrl, isMainFrame) => {
      if (!isMainFrame || errorCode === -3) return
      const parent = BrowserWindow.fromWebContents(contents)
      const options: MessageBoxOptions = {
        type: 'error',
        title: '登录页面没有打开',
        message: '铁炉堡登录页面加载失败',
        detail: `${errorDescription}\n\n可以重试，或者改用系统浏览器打开。`,
        buttons: ['重试', '用系统浏览器打开', '关闭'],
        defaultId: 0,
        cancelId: 2,
      }
      const prompt = parent
        ? dialog.showMessageBox(parent, options)
        : dialog.showMessageBox(options)
      void prompt.then(({ response }) => {
        if (response === 0) void contents.reload()
        if (response === 1 && validatedUrl) void shell.openExternal(validatedUrl)
      })
    })
  }

  app.on('certificate-error', (event, contents, url, error, _certificate, callback) => {
    const trusted = mayTrustEmbeddedNavigationCertificate(
      error,
      url,
      Boolean(contents && trackedContents.has(contents.id)),
    )
    if (trusted) event.preventDefault()
    callback(trusted)
  })

  ipcMain.handle('ironforge:open', (_event, url: string) => {
    const target = new URL(url)
    if (target.protocol !== 'https:' && target.protocol !== 'http:') {
      throw new Error('交付平台地址必须是网页地址')
    }
    trustNavigationTarget(target.toString())
    const window = new BrowserWindow({
      width: 1280,
      height: 820,
      minWidth: 900,
      minHeight: 640,
      title: '铁炉堡',
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        partition: 'persist:ironforge',
      },
    })
    trackLoginNavigation(window.webContents)
    window.webContents.setWindowOpenHandler(({ url: popupUrl }) => {
      const popupTarget = new URL(popupUrl)
      if (popupTarget.protocol !== 'https:' && popupTarget.protocol !== 'http:') {
        return { action: 'deny' }
      }
      trustNavigationTarget(popupTarget.toString())
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 1100,
          height: 760,
          title: '登录铁炉堡',
          webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
            partition: 'persist:ironforge',
          },
        },
      }
    })
    void window.loadURL(target.toString())
    return true
  })
}

function registerUpdateHandlers(coordinator: UpdateCoordinator) {
  ipcMain.handle('updates:status', () => coordinator.status())
  ipcMain.handle('updates:check', () => coordinator.check())
  ipcMain.handle('updates:download', () => coordinator.download())
  ipcMain.handle('updates:install', () => coordinator.install())
}

function registerResetHandler(userDataPath: string) {
  ipcMain.handle('user-data:reset', async () => {
    await session.fromPartition('persist:ironforge').clearStorageData()
    await Promise.all([
      rm(join(userDataPath, 'gitlab-credentials.dat'), { force: true }),
      rm(join(userDataPath, 'identities'), { recursive: true, force: true }),
      rm(join(userDataPath, 'projects.json'), { force: true }),
      rm(join(userDataPath, 'helpers'), { recursive: true, force: true }),
      rm(join(userDataPath, 'removed-legacy-project-seed'), { force: true }),
      rm(join(userDataPath, 'app-settings.json'), { force: true }),
    ])
    setTimeout(() => {
      app.relaunch()
      app.exit(0)
    }, 300)
    return true
  })
}

function registerSettingsHandlers(store: AppSettingsStore) {
  ipcMain.handle('settings:load', () => store.load())
  ipcMain.handle('settings:save', (_event, settings: AppSettings) =>
    store.save(settings),
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
      preload: join(currentDirectory, 'preload.cjs'),
    },
  })

  window.once('ready-to-show', () => window.show())
  window.webContents.setWindowOpenHandler(({ url }) => {
    const target = new URL(url)
    const allowed = target.protocol === 'https:' || target.protocol === 'http:'
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
  const projectRegistryPath = join(userDataPath, 'projects.json')
  registerSettingsHandlers(
    new AppSettingsStore(join(userDataPath, 'app-settings.json')),
  )
  registerResetHandler(userDataPath)
  registerUpdateHandlers(
    new UpdateCoordinator({
      updater: autoUpdater,
      packaged: app.isPackaged,
      currentVersion: app.getVersion(),
      beforeInstall: () =>
        createUpdateBackup({
          userDataPath,
          projectRegistryPath,
          retention: 5,
        }),
    }),
  )
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
  session.defaultSession.setCertificateVerifyProc((request, callback) => {
    void vault.get('computer')
      .then((credentials) => {
        callback(mayTrustInternalCertificate(
          request.verificationResult,
          `https://${request.hostname}`,
          credentials.baseUrl,
        ) ? 0 : -3)
      })
      .catch(() => callback(-3))
  })
  registerCredentialHandlers(vault)
  registerFileDialogHandlers()
  registerIronforgeHandlers()
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
    const registry = new ProjectRegistry(projectRegistryPath)
    const legacySeedMigration = join(userDataPath, 'removed-legacy-project-seed')
    if (!(await access(legacySeedMigration).then(() => true).catch(() => false))) {
      await registry.removeLegacySeed(repositoryPath)
      await writeFile(legacySeedMigration, 'completed\n', 'utf8')
    }
    const middleware = createRepositoryMiddleware({
      repositoryPath,
      registry,
      fetcher: net.fetch as typeof fetch,
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
