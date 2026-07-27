// @vitest-environment node

import { execFileSync } from 'node:child_process'
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { afterEach, describe, expect, it } from 'vitest'
import { ProjectRegistry } from './projectRegistry'

const roots: string[] = []

async function createRepository(name: string) {
  const root = await mkdtemp(join(tmpdir(), `ironforge-${name}-`))
  roots.push(root)
  execFileSync('git', ['init', '-b', 'main', root], { windowsHide: true })
  execFileSync('git', ['-C', root, 'config', 'user.name', 'Test Engineer'])
  execFileSync('git', ['-C', root, 'config', 'user.email', 'test@example.com'])
  await writeFile(join(root, 'README.md'), name)
  execFileSync('git', ['-C', root, 'add', '.'])
  execFileSync('git', ['-C', root, 'commit', '-m', 'initial'])
  return root
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

describe('ProjectRegistry', () => {
  it('canonicalizes nested folders and prevents duplicate projects', async () => {
    const repository = await createRepository('registry')
    const nested = join(repository, 'source')
    await mkdir(nested)
    const storage = join(repository, '..', `${Date.now()}-projects.json`)
    roots.push(storage)
    const registry = new ProjectRegistry(storage)

    const first = await registry.add(nested)
    const second = await registry.add(repository)

    expect(second.id).toBe(first.id)
    expect(await registry.list()).toHaveLength(1)
    expect(JSON.parse(await readFile(storage, 'utf8')).projects).toHaveLength(1)
  })

  it('resolves only registered IDs and removal never deletes files', async () => {
    const repository = await createRepository('isolation')
    const storage = join(repository, '..', `${Date.now()}-projects.json`)
    roots.push(storage)
    const registry = new ProjectRegistry(storage)
    const project = await registry.add(repository)

    await expect(registry.resolve('project-unknown')).rejects.toThrow('尚未登记')
    await registry.remove(project.id)
    await expect(stat(repository)).resolves.toBeTruthy()
    await expect(registry.resolve(project.id)).rejects.toThrow('尚未登记')
  })

  it('ignores a packaged fallback path that is not a Git repository', async () => {
    const root = await mkdtemp(join(tmpdir(), 'ironforge-invalid-seed-'))
    roots.push(root)
    const registry = new ProjectRegistry(join(root, 'projects.json'), root)

    await expect(registry.list()).resolves.toEqual([])
  })

  it('explains that an ordinary folder must be downloaded or prepared first', async () => {
    const root = await mkdtemp(join(tmpdir(), 'ironforge-ordinary-folder-'))
    roots.push(root)
    const registry = new ProjectRegistry(join(root, 'projects.json'))

    await expect(registry.add(root)).rejects.toThrow('下载新项目')
  })
})
