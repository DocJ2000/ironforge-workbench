import { afterEach, expect, it, vi } from 'vitest'
import { identityClient } from './identityClient'

afterEach(() => {
  delete window.ironforgeDesktop
})

it('uses the narrow desktop identity bridge', async () => {
  const status = vi.fn().mockResolvedValue({ configured: false })
  const generate = vi.fn().mockResolvedValue({
    configured: true,
    publicKey: 'ssh-ed25519 AAAA test',
    pathHint: 'C:\\identity',
  })
  const publicKey = vi.fn().mockResolvedValue({
    publicKey: 'ssh-ed25519 AAAA test',
  })
  window.ironforgeDesktop = {
    platform: 'win32',
    packaged: true,
    credentials: {
      status: vi.fn(),
      save: vi.fn(),
      clear: vi.fn(),
    },
    identity: { status, generate, publicKey },
  }

  expect(identityClient.available()).toBe(true)
  await identityClient.status('project-one')
  await identityClient.generate({ projectId: 'project-one' })
  await identityClient.publicKey('project-one')

  expect(status).toHaveBeenCalledWith('project-one')
  expect(generate).toHaveBeenCalledWith({ projectId: 'project-one' })
  expect(publicKey).toHaveBeenCalledWith('project-one')
})
