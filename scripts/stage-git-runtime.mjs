import { execFileSync } from 'node:child_process'
import { cp, mkdir, rm } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'

const gitExecutable = execFileSync('where.exe', ['git'], {
  encoding: 'utf8',
}).split(/\r?\n/).find(Boolean)

if (!gitExecutable) throw new Error('构建电脑未安装 Git for Windows')

const gitRoot = resolve(dirname(gitExecutable), '..')
const output = resolve('dist-runtime', 'git')
await rm(output, { recursive: true, force: true })
await mkdir(output, { recursive: true })

for (const name of ['cmd', 'etc', 'mingw64', 'usr', 'LICENSE.txt']) {
  await cp(join(gitRoot, name), join(output, name), {
    recursive: true,
    force: true,
  })
}

console.log(`Staged Git runtime from ${gitRoot}`)
