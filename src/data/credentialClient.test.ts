import { afterEach, expect, it, vi } from 'vitest'
import { credentialClient } from './credentialClient'

afterEach(() => {
  delete window.ironforgeDesktop
})

it('uses the narrow desktop credential bridge without exposing secrets', async () => {
  const status = vi.fn().mockResolvedValue({
    configured: true,
    baseUrl: 'https://gitlfs.lab.tp',
    sshKeyPath: 'C:\\keys\\id_ed25519',
  })
  const save = vi.fn().mockResolvedValue({ configured: true })
  const clear = vi.fn().mockResolvedValue({ configured: false })
  window.ironforgeDesktop = {
    platform: 'win32',
    packaged: true,
    credentials: { status, save, clear },
  }

  expect(credentialClient.available()).toBe(true)
  await expect(credentialClient.status('project-one')).resolves.not.toHaveProperty('token')
  await credentialClient.save({
    projectId: 'project-one',
    baseUrl: 'https://gitlfs.lab.tp',
    token: 'secret',
    sshKeyPath: 'C:\\keys\\id_ed25519',
  })
  expect(status).toHaveBeenCalledWith('project-one')
  expect(save).toHaveBeenCalledWith(expect.objectContaining({ token: 'secret' }))
  await credentialClient.clear('project-one')
  expect(clear).toHaveBeenCalledWith('project-one')
})
