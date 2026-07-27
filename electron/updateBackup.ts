import { copyFile, mkdir, readdir, rm, stat } from 'node:fs/promises'
import { basename, join } from 'node:path'

interface UpdateBackupOptions {
  userDataPath: string
  projectRegistryPath: string
  now?: Date
  retention?: number
}

async function copyIfPresent(source: string, destination: string) {
  const info = await stat(source).catch(() => null)
  if (info?.isFile()) await copyFile(source, destination)
}

export async function createUpdateBackup({
  userDataPath,
  projectRegistryPath,
  now = new Date(),
  retention = 5,
}: UpdateBackupOptions) {
  const root = join(userDataPath, 'update-backups')
  const name = now.toISOString().replace(/[:.]/g, '-')
  const destination = join(root, name)
  await mkdir(destination, { recursive: true })
  await copyIfPresent(
    join(userDataPath, 'gitlab-credentials.dat'),
    join(destination, 'gitlab-credentials.dat'),
  )
  await copyIfPresent(
    projectRegistryPath,
    join(destination, basename(projectRegistryPath)),
  )

  const entries = (await readdir(root, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
  const removeCount = Math.max(0, entries.length - Math.max(1, retention))
  await Promise.all(
    entries.slice(0, removeCount).map((entry) =>
      rm(join(root, entry), { recursive: true, force: true }),
    ),
  )
  return destination
}
