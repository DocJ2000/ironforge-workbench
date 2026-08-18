import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

interface ForgeRootEntry {
  root?: string
}

interface ForgeConfig {
  roots?: Record<string, ForgeRootEntry> | ForgeRootEntry[]
}

function normalizePath(path: string) {
  return path.replaceAll('\\', '/')
}

function collectRootPaths(config: ForgeConfig | null, repositoryPath: string) {
  if (!config?.roots) return null
  const entries = Array.isArray(config.roots)
    ? config.roots
    : Object.values(config.roots)
  const roots = entries
    .map((entry) => entry.root?.trim())
    .filter((root): root is string => Boolean(root))
    .map((root) => normalizePath(resolve(repositoryPath, root)))
  return roots.length ? [...new Set(roots)] : []
}

export async function loadForgeRoots(repositoryPath: string) {
  try {
    const config = JSON.parse(
      await readFile(resolve(repositoryPath, 'forge.json'), 'utf8'),
    ) as ForgeConfig
    return collectRootPaths(config, repositoryPath)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
    return null
  }
}
