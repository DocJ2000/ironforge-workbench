import { execFileSync } from 'node:child_process'
import { cp, mkdir, readFile, rm } from 'node:fs/promises'
import { extname, join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const stage = join(root, 'artifacts', 'public-source')
const archive = join(root, 'artifacts', 'engineering-delivery-workbench-source.zip')
const textExtensions = new Set([
  '.cjs', '.css', '.cts', '.html', '.js', '.json', '.md', '.mjs', '.ts', '.tsx',
])
const forbidden = [
  /tinyphoton/i,
  /gitlfs\.lab\.tp/i,
  /sso\.lab\.tp/i,
  /ironforge\.holo\.tp/i,
  /\brockteam\b/i,
  /lens-mechanics/i,
  /BaiduSyncdisk/i,
  /github_pat_[A-Za-z0-9_]+|ghp_[A-Za-z0-9]+/,
  /-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----/,
]
const topLevel = new Set([
  '.env.example',
  '.gitignore',
  '.oxlintrc.json',
  'README.md',
  'electron-builder.config.cjs',
  'index.html',
  'package-lock.json',
  'package.json',
  'tsconfig.app.json',
  'tsconfig.electron.json',
  'tsconfig.json',
  'tsconfig.node.json',
  'vite.config.ts',
])

function isPublicSource(path) {
  const normalized = path.replaceAll('\\', '/')
  if (topLevel.has(normalized)) return true
  if (/^(electron|server|src)\/.+/.test(normalized) && !/\.test\.[^.]+$/.test(normalized) && !normalized.includes('/test/')) return true
  if (/^public\/.+/.test(normalized)) return true
  return [
    'scripts/build-windows-installer.mjs',
    'scripts/stage-git-runtime.mjs',
  ].includes(normalized)
}

await rm(stage, { recursive: true, force: true })
await rm(archive, { force: true })
await mkdir(stage, { recursive: true })

const files = execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' })
  .split(/\r?\n/)
  .filter(Boolean)
  .filter(isPublicSource)

for (const file of files) {
  const destination = join(stage, file)
  await mkdir(resolve(destination, '..'), { recursive: true })
  await cp(join(root, file), destination)
  if (!textExtensions.has(extname(file).toLowerCase())) continue
  const content = await readFile(destination, 'utf8')
  for (const pattern of forbidden) {
    if (pattern.test(content)) throw new Error(`Public source audit failed: ${file}`)
  }
}

const publicPackagePath = join(stage, 'package.json')
const publicPackage = JSON.parse(await readFile(publicPackagePath, 'utf8'))
delete publicPackage.scripts['audit:public-release']
delete publicPackage.scripts['audit:public-artifacts']
delete publicPackage.scripts['package:source']
publicPackage.scripts['package:win'] =
  'npm run build:desktop && npm run stage:git && node scripts/build-windows-installer.mjs'
await import('node:fs/promises').then(({ writeFile }) =>
  writeFile(publicPackagePath, `${JSON.stringify(publicPackage, null, 2)}\n`),
)

execFileSync(
  'powershell.exe',
  ['-NoProfile', '-Command', `Compress-Archive -Path '${stage}\\*' -DestinationPath '${archive}' -Force`],
  { cwd: root, stdio: 'inherit' },
)
console.log(`Public source archive created: ${archive}`)
