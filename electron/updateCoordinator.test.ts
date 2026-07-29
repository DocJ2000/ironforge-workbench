import { EventEmitter } from 'node:events'
import { afterEach, expect, it, vi } from 'vitest'
import { UpdateCoordinator } from './updateCoordinator'

afterEach(() => vi.useRealTimers())

class FakeUpdater extends EventEmitter {
  autoDownload = true
  autoInstallOnAppQuit = true
  fullChangelog = false
  checkForUpdates = vi.fn().mockResolvedValue(undefined)
  downloadUpdate = vi.fn().mockResolvedValue(undefined)
  quitAndInstall = vi.fn()
}

it('keeps checking, downloading, and installing as separate user actions', async () => {
  const updater = new FakeUpdater()
  const beforeInstall = vi.fn().mockResolvedValue(undefined)
  const coordinator = new UpdateCoordinator({
    updater,
    packaged: true,
    currentVersion: '1.0.0',
    beforeInstall,
  })

  expect(updater.autoDownload).toBe(false)
  expect(updater.autoInstallOnAppQuit).toBe(false)
  expect(updater.fullChangelog).toBe(true)

  await coordinator.check()
  expect(updater.checkForUpdates).toHaveBeenCalledOnce()
  expect(updater.downloadUpdate).not.toHaveBeenCalled()

  updater.emit('update-available', { version: '1.1.0' })
  expect(coordinator.status()).toMatchObject({ phase: 'available', availableVersion: '1.1.0' })

  await coordinator.download()
  expect(updater.downloadUpdate).toHaveBeenCalledOnce()
  expect(updater.quitAndInstall).not.toHaveBeenCalled()

  updater.emit('update-downloaded', { version: '1.1.0' })
  await coordinator.install()
  expect(beforeInstall).toHaveBeenCalledOnce()
  expect(updater.quitAndInstall).toHaveBeenCalledOnce()
})

it('keeps readable release notes when a new version is available', () => {
  const updater = new FakeUpdater()
  const coordinator = new UpdateCoordinator({
    updater,
    packaged: true,
    currentVersion: '1.0.0',
    beforeInstall: vi.fn(),
  })

  updater.emit('update-available', {
    version: '1.2.0',
    releaseNotes: [
      { version: '1.2.0', note: '- 文件列表更清楚' },
      { version: '1.1.0', note: '- 修复登录页面\n\n[下载安装包](https://example.com)' },
    ],
  })

  expect(coordinator.status()).toMatchObject({
    phase: 'available',
    releases: [
      { version: '1.2.0', notes: ['文件列表更清楚'] },
      { version: '1.1.0', notes: ['修复登录页面', '下载安装包'] },
    ],
  })
})

it('does not contact the update server from a development build', async () => {
  const updater = new FakeUpdater()
  const coordinator = new UpdateCoordinator({
    updater,
    packaged: false,
    currentVersion: '1.0.0',
    beforeInstall: vi.fn(),
  })

  await coordinator.check()

  expect(updater.checkForUpdates).not.toHaveBeenCalled()
  expect(coordinator.status().phase).toBe('unavailable')
})

it('reports download progress and friendly failures', () => {
  const updater = new FakeUpdater()
  const coordinator = new UpdateCoordinator({
    updater,
    packaged: true,
    currentVersion: '1.0.0',
    beforeInstall: vi.fn(),
  })

  updater.emit('download-progress', { percent: 48.6 })
  expect(coordinator.status()).toMatchObject({ phase: 'downloading', progress: 49 })
  updater.emit('error', new Error('network down'))
  expect(coordinator.status()).toMatchObject({ phase: 'error' })
})

it('checks shortly after startup and then every six hours without downloading', async () => {
  vi.useFakeTimers()
  const updater = new FakeUpdater()
  const coordinator = new UpdateCoordinator({
    updater,
    packaged: true,
    currentVersion: '1.0.0',
    beforeInstall: vi.fn(),
  })

  coordinator.startPeriodicChecks()
  await vi.advanceTimersByTimeAsync(30_000)
  expect(updater.checkForUpdates).toHaveBeenCalledTimes(1)

  updater.emit('update-not-available', {})
  await vi.advanceTimersByTimeAsync(6 * 60 * 60 * 1000)
  expect(updater.checkForUpdates).toHaveBeenCalledTimes(2)
  expect(updater.downloadUpdate).not.toHaveBeenCalled()

  coordinator.stopPeriodicChecks()
  await vi.advanceTimersByTimeAsync(6 * 60 * 60 * 1000)
  expect(updater.checkForUpdates).toHaveBeenCalledTimes(2)
})

it('announces a newly available version once without starting the download', () => {
  const updater = new FakeUpdater()
  const onUpdateAvailable = vi.fn()
  new UpdateCoordinator({
    updater,
    packaged: true,
    currentVersion: '1.0.0',
    beforeInstall: vi.fn(),
    onUpdateAvailable,
  })

  updater.emit('update-available', { version: '1.1.0' })

  expect(onUpdateAvailable).toHaveBeenCalledWith('1.1.0')
  expect(updater.downloadUpdate).not.toHaveBeenCalled()
})
