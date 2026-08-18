import { readFile } from 'node:fs/promises'
import { relative, resolve } from 'node:path'

interface ForgeRootEntry {
  root?: string
  title?: string
}

interface ForgeConfig {
  roots?: Record<string, ForgeRootEntry> | ForgeRootEntry[]
}

export interface ForgePackageRoot {
  absolutePath: string
  relativePath: string
  title: string
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
    .map((entry): ForgePackageRoot | null => {
      const configuredRoot = entry.root?.trim()
      if (!configuredRoot) return null
      const absolutePath = resolve(repositoryPath, configuredRoot)
      const relativePath = normalizePath(relative(repositoryPath, absolutePath))
      return {
        absolutePath: normalizePath(absolutePath),
        relativePath,
        title: entry.title?.trim() || relativePath.split('/').at(-1) || relativePath,
      }
    })
    .filter((root): root is ForgePackageRoot => Boolean(root))
  const uniqueRoots = new Map(roots.map((root) => [root.absolutePath, root]))
  return roots.length ? [...uniqueRoots.values()] : []
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
