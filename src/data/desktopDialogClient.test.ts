import { afterEach, expect, it, vi } from 'vitest'
import { desktopDialogClient } from './desktopDialogClient'

afterEach(() => {
  delete window.ironforgeDesktop
})

it('uses native desktop path pickers without exposing filesystem access', async () => {
  const chooseDirectory = vi.fn().mockResolvedValue('D:\\Projects\\Dragon')
  const chooseSshKey = vi.fn().mockResolvedValue('C:\\Users\\engineer\\.ssh\\id_ed25519')
  window.ironforgeDesktop = {
    platform: 'win32',
    packaged: true,
    credentials: {
      status: vi.fn(),
      save: vi.fn(),
      clear: vi.fn(),
    },
    dialogs: { chooseDirectory, chooseSshKey },
  }

  await expect(desktopDialogClient.chooseDirectory()).resolves.toBe('D:\\Projects\\Dragon')
  await expect(desktopDialogClient.chooseSshKey()).resolves.toContain('id_ed25519')
})
