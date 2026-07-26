// @vitest-environment node

import { execFileSync } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, expect, it } from 'vitest'
import { cloneRepository } from './repositoryClone'

const roots: string[] = []

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

it('clones a repository into an explicitly selected empty path', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ironforge-clone-'))
  roots.push(root)
  const source = join(root, 'source')
  const destination = join(root, 'downloaded')
  execFileSync('git', ['init', '-b', 'main', source])
  execFileSync('git', ['-C', source, 'config', 'user.name', 'Test'])
  execFileSync('git', ['-C', source, 'config', 'user.email', 'test@example.com'])
  await writeFile(join(source, 'README.md'), 'project')
  execFileSync('git', ['-C', source, 'add', '.'])
  execFileSync('git', ['-C', source, 'commit', '-m', 'initial'])

  const result = await cloneRepository({
    remoteUrl: source,
    destination,
  })

  expect(result.path).toBe(destination)
  expect(execFileSync('git', ['-C', destination, 'log', '-1', '--pretty=%s'], {
    encoding: 'utf8',
  }).trim()).toBe('initial')
})

it('refuses to clone over an existing non-empty folder', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ironforge-clone-'))
  roots.push(root)
  const destination = join(root, 'occupied')
  await mkdir(destination)
  await writeFile(join(destination, 'keep.txt'), 'keep')

  await expect(cloneRepository({
    remoteUrl: 'git@gitlfs.lab.tp:rockteam/project.git',
    destination,
  })).rejects.toThrow('文件夹不是空的')
})
