import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export function extractReleaseNotes(changelog, version) {
  const marker = `## ${version}`
  const start = changelog.indexOf(marker)
  if (start < 0) throw new Error(`CHANGELOG.md 中没有找到版本 ${version}`)
  const bodyStart = start + marker.length
  const nextVersion = changelog.indexOf('\n## ', bodyStart)
  const body = changelog.slice(
    bodyStart,
    nextVersion < 0 ? changelog.length : nextVersion,
  )
  return `${marker}\n\n${body.trim()}\n`
}

export async function writeReleaseNotes(root, requestedVersion) {
  const packageJson = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
  const changelog = await readFile(join(root, 'CHANGELOG.md'), 'utf8')
  const version = requestedVersion ?? packageJson.version
  const outputPath = join(root, 'release', 'release-notes.md')
  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(
    outputPath,
    extractReleaseNotes(changelog, version),
    'utf8',
  )
  return outputPath
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const root = fileURLToPath(new URL('..', import.meta.url))
  console.log(await writeReleaseNotes(root, process.argv[2]))
}
