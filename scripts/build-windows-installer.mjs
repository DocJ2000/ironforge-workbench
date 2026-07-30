import { execFileSync } from 'node:child_process'
import { cp, mkdir, mkdtemp, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { extname, join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const temporaryOutput = await mkdtemp(join(tmpdir(), 'workbench-release-'))
const finalOutput = join(root, 'release')

try {
  execFileSync(
    process.execPath,
    [
      join(root, 'node_modules', 'electron-builder', 'out', 'cli', 'cli.js'),
      '--config',
      'electron-builder.config.cjs',
      '--win',
      'nsis',
      '--publish',
      'never',
    ],
    {
      cwd: root,
      env: { ...process.env, RELEASE_OUTPUT_DIR: temporaryOutput },
      stdio: 'inherit',
    },
  )
  await mkdir(finalOutput, { recursive: true })
  const files = await readdir(temporaryOutput)
  const releaseFiles = files.filter((file) => {
    if (file.startsWith('builder-')) return false
    return ['.exe', '.yml', '.yaml', '.blockmap'].includes(
      extname(file).toLowerCase(),
    )
  })
  for (const file of releaseFiles) {
    await cp(join(temporaryOutput, file), join(finalOutput, file), { force: true })
  }
  console.log(`Copied ${releaseFiles.length} release artifacts to ${finalOutput}`)
} finally {
  await rm(temporaryOutput, { recursive: true, force: true })
}
