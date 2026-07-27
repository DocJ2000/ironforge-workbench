// @vitest-environment node

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, expect, it } from 'vitest'
import { IdentityKeyService } from './identityKeyService'

const roots: string[] = []

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) =>
      rm(root, { recursive: true, force: true }),
    ),
  )
})

it('generates an ed25519 identity outside the repository', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ironforge-identity-'))
  roots.push(root)
  const service = new IdentityKeyService(root, 'ssh-keygen')

  const result = await service.generate({ projectId: 'project-one' })

  expect(result.configured).toBe(true)
  expect(result.publicKey).toMatch(/^ssh-ed25519 /)
  expect(result.pathHint).toContain(root)
  expect(result).not.toHaveProperty('privateKey')
})

it('does not overwrite an existing identity', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ironforge-identity-'))
  roots.push(root)
  const service = new IdentityKeyService(root, 'ssh-keygen')
  await service.generate({ projectId: 'project-one' })

  await expect(
    service.generate({ projectId: 'project-one' }),
  ).rejects.toThrow('已经创建')
})

it('returns only a redacted status for a generated identity', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ironforge-identity-'))
  roots.push(root)
  const service = new IdentityKeyService(root, 'ssh-keygen')
  expect(await service.status('project-one')).toEqual({ configured: false })

  await service.generate({ projectId: 'project-one' })

  const status = await service.status('project-one')
  expect(status).toMatchObject({ configured: true })
  expect(status).not.toHaveProperty('publicKey')
})
