// @vitest-environment node

import { execFileSync } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, expect, it } from 'vitest'
import { pullRepository } from './repositoryPull'

const roots: string[] = []
const git = (cwd: string, ...args: string[]) =>
  execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8' }).trim()

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'ironforge-pull-'))
  roots.push(root)
  const origin = join(root, 'origin.git')
  const first = join(root, 'first')
  const second = join(root, 'second')
  execFileSync('git', ['init', '--bare', origin])
  execFileSync('git', ['clone', origin, first])
  git(first, 'config', 'user.name', 'First')
  git(first, 'config', 'user.email', 'first@example.com')
  await writeFile(join(first, 'README.md'), 'one')
  git(first, 'add', '.')
  git(first, 'commit', '-m', 'initial')
  git(first, 'push', '-u', 'origin', 'HEAD:main')
  execFileSync('git', ['--git-dir', origin, 'symbolic-ref', 'HEAD', 'refs/heads/main'])
  execFileSync('git', ['clone', origin, second])
  git(second, 'config', 'user.name', 'Second')
  git(second, 'config', 'user.email', 'second@example.com')
  return { first, second }
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

it('fast-forwards a clean repository to remote changes', async () => {
  const { first, second } = await fixture()
  await writeFile(join(first, 'remote.txt'), 'remote')
  git(first, 'add', '.')
  git(first, 'commit', '-m', 'remote change')
  git(first, 'push', 'origin', 'HEAD:main')

  const result = await pullRepository(second)

  expect(result.updated).toBe(true)
  expect(result.receivedCommits).toBe(1)
  expect(git(second, 'log', '-1', '--pretty=%s')).toBe('remote change')
})

it('stops before fetching when local files have unsaved changes', async () => {
  const { second } = await fixture()
  await writeFile(join(second, 'README.md'), 'local edit')

  await expect(pullRepository(second)).rejects.toThrow('本地还有未上传的改动')
})
