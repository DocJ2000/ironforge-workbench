import { EventEmitter } from 'node:events'
import { expect, it, vi } from 'vitest'
import { UpdateCoordinator } from './updateCoordinator'

class FakeUpdater extends EventEmitter {
  autoDownload = true
  autoInstallOnAppQuit = true
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
