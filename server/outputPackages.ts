import { readdir, stat } from 'node:fs/promises'
import { extname, join, relative, resolve } from 'node:path'
import type {
  OutputPackageCandidate,
  OutputPackageFile,
} from '../src/domain/delivery.js'

const fileTypeLabels: Record<string, string> = {
  '.asm': 'Creo 装配',
  '.drw': 'Creo 工程图',
  '.dwg': 'DWG 工程图',
  '.dxf': 'DXF 工程图',
  '.json': 'JSON',
  '.pdf': 'PDF',
  '.prt': 'Creo 零件',
  '.step': 'STEP',
  '.stp': 'STEP',
  '.txt': '文本',
  '.zip': '压缩包',
}

function normalizePath(path: string) {
  return path.replaceAll('\\', '/')
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

async function collectFiles(
  repositoryPath: string,
  directoryPath: string,
): Promise<OutputPackageFile[]> {
  const entries = await readdir(directoryPath, { withFileTypes: true })
  const files: OutputPackageFile[] = []

  for (const entry of entries) {
    const absolutePath = join(directoryPath, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(repositoryPath, absolutePath)))
      continue
    }
    if (!entry.isFile()) continue

    const extension = extname(entry.name).toLowerCase()
    files.push({
      name: entry.name,
      path: normalizePath(relative(repositoryPath, absolutePath)),
      type:
        fileTypeLabels[extension] ??
        (extension.slice(1).toUpperCase() || '文件'),
      size: formatBytes((await stat(absolutePath)).size),
    })
  }

  return files.sort((left, right) =>
    left.path.localeCompare(right.path, 'zh-CN'),
  )
}

export async function scanOutputPackages(
  repositoryPath: string,
): Promise<OutputPackageCandidate[]> {
  const root = resolve(repositoryPath)
  const outputPath = join(root, 'output')
  let domains

  try {
    domains = await readdir(outputPath, { withFileTypes: true })
  } catch {
    return []
  }

  const packages: OutputPackageCandidate[] = []

  for (const domain of domains) {
    if (!domain.isDirectory()) continue
    const domainPath = join(outputPath, domain.name)
    const packageEntries = await readdir(domainPath, { withFileTypes: true })

    for (const packageEntry of packageEntries) {
      if (!packageEntry.isDirectory()) continue
      const packagePath = join(domainPath, packageEntry.name)
      const files = await collectFiles(root, packagePath)
      if (!files.length) continue

      const normalizedPath = normalizePath(relative(root, packagePath))
      packages.push({
        id: normalizedPath,
        name: packageEntry.name,
        path: normalizedPath,
        domain: domain.name,
        files,
      })
    }
  }

  return packages.sort((left, right) =>
    left.path.localeCompare(right.path, 'zh-CN'),
  )
}
