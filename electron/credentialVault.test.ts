// @vitest-environment node

import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { afterEach, expect, it } from 'vitest'
import { CredentialVault } from './credentialVault'

const roots: string[] = []
const protector = {
  isEncryptionAvailable: () => true,
  encryptString: (value: string) => Buffer.from(`encrypted:${value}`),
  decryptString: (value: Buffer) =>
    value.toString().replace(/^encrypted:/, ''),
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

it('stores encrypted credentials and returns only redacted status', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ironforge-credentials-'))
  roots.push(root)
  const keyPath = join(root, 'id_ed25519')
  const vaultPath = join(root, 'credentials.dat')
  await writeFile(keyPath, 'private key')
  const vault = new CredentialVault(vaultPath, protector)

  const status = await vault.save({
    projectId: 'project-one',
    baseUrl: 'https://gitlfs.lab.tp/',
    token: 'top-secret-token',
    sshKeyPath: keyPath,
    sshPassphrase: 'key-secret',
  })

  expect(status).toEqual({
    configured: true,
    projectId: 'project-one',
    baseUrl: 'https://gitlfs.lab.tp',
    sshKeyPath: keyPath,
  })
  const disk = await readFile(vaultPath, 'utf8')
  expect(disk).not.toContain('top-secret-token')
  expect(await vault.status('project-one')).not.toHaveProperty('token')
  await expect(vault.get('project-one')).resolves.toMatchObject({
    token: 'top-secret-token',
  })
  expect(await vault.clear('project-one')).toEqual({ configured: false })
  await expect(vault.get('project-one')).rejects.toThrow('尚未连接')
})

it('rejects a missing SSH private key before writing credentials', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ironforge-credentials-'))
  roots.push(root)
  const vault = new CredentialVault(join(root, 'credentials.dat'), protector)
  await expect(
    vault.save({
      projectId: 'project-one',
      baseUrl: 'https://gitlfs.lab.tp',
      token: 'token',
      sshKeyPath: join(root, 'missing-key'),
    }),
  ).rejects.toThrow('不存在')
})

it('keeps credentials isolated by project', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ironforge-credentials-'))
  roots.push(root)
  const firstKey = join(root, 'first-key')
  const secondKey = join(root, 'second-key')
  await Promise.all([
    writeFile(firstKey, 'first private key'),
    writeFile(secondKey, 'second private key'),
  ])
  const vault = new CredentialVault(join(root, 'credentials.dat'), protector)

  await vault.save({
    projectId: 'project-one',
    baseUrl: 'https://gitlfs.lab.tp',
    token: 'first-token',
    sshKeyPath: firstKey,
  })
  await vault.save({
    projectId: 'project-two',
    baseUrl: 'https://gitlfs.lab.tp',
    token: 'second-token',
    sshKeyPath: secondKey,
  })

  expect(await vault.status('project-one')).toMatchObject({ sshKeyPath: firstKey })
  expect(await vault.status('project-two')).toMatchObject({ sshKeyPath: secondKey })
  await vault.clear('project-one')
  expect(await vault.status('project-one')).toEqual({ configured: false })
  expect(await vault.status('project-two')).toMatchObject({ configured: true })
})

it('uses one computer connection for every project', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ironforge-credentials-'))
  roots.push(root)
  const keyPath = join(root, 'computer-key')
  await writeFile(keyPath, 'computer private key')
  const vault = new CredentialVault(join(root, 'credentials.dat'), protector)

  await vault.save({
    projectId: 'computer',
    baseUrl: 'https://gitlfs.lab.tp',
    token: 'computer-token',
    sshKeyPath: keyPath,
  })

  expect(await vault.status('project-one')).toMatchObject({
    configured: true,
    sshKeyPath: keyPath,
  })
  await expect(vault.get('project-two')).resolves.toMatchObject({
    token: 'computer-token',
  })
})

it('does not overwrite an unreadable credential file when saving', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ironforge-credentials-'))
  roots.push(root)
  const keyPath = join(root, 'computer-key')
  const vaultPath = join(root, 'credentials.dat')
  await Promise.all([
    writeFile(keyPath, 'computer private key'),
    writeFile(vaultPath, 'not-an-encrypted-payload'),
  ])
  const vault = new CredentialVault(vaultPath, protector)

  await expect(vault.save({
    projectId: 'computer',
    baseUrl: 'https://git.example.com',
    token: 'token',
    sshKeyPath: keyPath,
  })).rejects.toThrow('凭据文件')

  expect(await readFile(vaultPath, 'utf8')).toBe('not-an-encrypted-payload')
})
