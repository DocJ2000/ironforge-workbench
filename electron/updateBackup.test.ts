import { mkdtemp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, expect, it } from 'vitest'
import { rm } from 'node:fs/promises'
import { createUpdateBackup } from './updateBackup'

const roots: string[] = []

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

it('backs up encrypted settings and the project list without reading projects', async () => {
  const root = await mkdtemp(join(tmpdir(), 'workbench-update-backup-'))
  roots.push(root)
  const userDataPath = join(root, 'user-data')
  const registryPath = join(root, 'settings', 'projects.json')
  await mkdir(userDataPath, { recursive: true })
  await mkdir(join(root, 'settings'), { recursive: true })
  await writeFile(join(userDataPath, 'gitlab-credentials.dat'), 'encrypted')
  await writeFile(registryPath, '[{"path":"D:\\\\Engineering"}]')

  const backup = await createUpdateBackup({
    userDataPath,
    projectRegistryPath: registryPath,
    now: new Date('2026-07-27T12:00:00Z'),
    retention: 5,
  })

  await expect(readFile(join(backup, 'gitlab-credentials.dat'), 'utf8')).resolves.toBe('encrypted')
  await expect(readFile(join(backup, 'projects.json'), 'utf8')).resolves.toContain('Engineering')
  expect(await readdir(backup)).toEqual(['gitlab-credentials.dat', 'projects.json'])
})

it('keeps only the configured number of newest backups', async () => {
  const root = await mkdtemp(join(tmpdir(), 'workbench-update-retention-'))
  roots.push(root)
  const userDataPath = join(root, 'user-data')
  const registryPath = join(root, 'projects.json')
  await mkdir(join(userDataPath, 'update-backups', 'old-a'), { recursive: true })
  await mkdir(join(userDataPath, 'update-backups', 'old-b'), { recursive: true })
  await writeFile(registryPath, '[]')

  await createUpdateBackup({
    userDataPath,
    projectRegistryPath: registryPath,
    now: new Date('2026-07-27T12:00:00Z'),
    retention: 2,
  })

  expect((await readdir(join(userDataPath, 'update-backups'))).length).toBe(2)
})
