import { readFile, readdir, stat } from 'node:fs/promises'
import { extname, join, relative, resolve } from 'node:path'
import { homedir } from 'node:os'

const root = resolve(import.meta.dirname, '..')
const targets = ['dist', 'dist-electron', 'dist-runtime', 'package.json']
const textExtensions = new Set(['.js', '.cjs', '.mjs', '.json', '.html', '.css', '.yml', '.yaml', '.txt'])
const escapePattern = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const forbidden = [
  /tinyphoton/i,
  /gitlfs\.lab\.tp/i,
  /sso\.lab\.tp/i,
  /ironforge\.holo\.tp/i,
  /\brockteam\b/i,
  /\bdragon\b/i,
  /lens-mechanics/i,
  /huqinglei/i,
  /蒋/,
  /BaiduSyncdisk/i,
  /场旋框|导轴/,
  /github_pat_[A-Za-z0-9_]+|ghp_[A-Za-z0-9]+/,
  /-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----/,
  new RegExp(escapePattern(homedir()), 'i'),
]

async function filesAt(path) {
  const info = await stat(path)
  if (info.isFile()) return [path]
  const entries = await readdir(path)
  return (await Promise.all(entries.map((entry) => filesAt(join(path, entry))))).flat()
}

const violations = []
for (const target of targets) {
  for (const file of await filesAt(join(root, target))) {
    if (!textExtensions.has(extname(file).toLowerCase())) continue
    const content = await readFile(file, 'utf8')
    for (const pattern of forbidden) {
      if (pattern.test(content)) {
        violations.push(`${relative(root, file)} matches ${pattern}`)
      }
    }
  }
}

if (violations.length) {
  console.error('Public release audit failed:')
  for (const violation of violations) console.error(`- ${violation}`)
  process.exitCode = 1
} else {
  console.log('Public release audit passed: no blocked organization, person, project, path, or credential markers found.')
}
