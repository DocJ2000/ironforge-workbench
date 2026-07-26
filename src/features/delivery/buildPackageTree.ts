import type { OutputPackageCandidate } from '../../domain/delivery'
import type { WorkingTreeChange } from '../../domain/repository'

export type PackageFileStatus = 'added' | 'modified' | 'deleted' | 'unchanged'
export interface PackageStatusCounts { added: number; modified: number; deleted: number }
export interface PackageTreeNode {
  name: string
  path: string
  kind: 'folder' | 'file'
  status: PackageFileStatus
  counts: PackageStatusCounts
  changed: boolean
  children: PackageTreeNode[]
}

const emptyCounts = (): PackageStatusCounts => ({ added: 0, modified: 0, deleted: 0 })
const normalize = (path: string) => path.replaceAll('\\', '/').replace(/\/+/g, '/')

function statusFor(change?: WorkingTreeChange): PackageFileStatus {
  if (!change) return 'unchanged'
  if (change.kind === 'untracked') return 'added'
  return change.kind
}

export function buildPackageTree(item: OutputPackageCandidate, changes: WorkingTreeChange[]): PackageTreeNode {
  const rootPath = normalize(item.path)
  const changesByPath = new Map(changes.map((change) => [normalize(change.path), change]))
  const paths = new Set(item.files.map((file) => normalize(file.path)))
  for (const change of changes) {
    const path = normalize(change.path)
    if (path.startsWith(`${rootPath}/`)) paths.add(path)
  }

  const root: PackageTreeNode = { name: item.name, path: rootPath, kind: 'folder', status: 'unchanged', counts: emptyCounts(), changed: false, children: [] }
  for (const path of [...paths].sort((a, b) => a.localeCompare(b, 'zh-CN'))) {
    const relative = path.slice(rootPath.length).replace(/^\/+/, '')
    if (!relative) continue
    const parts = relative.split('/')
    let parent = root
    parts.forEach((name, index) => {
      const nodePath = `${rootPath}/${parts.slice(0, index + 1).join('/')}`
      let node = parent.children.find((child) => child.name === name)
      if (!node) {
        const isFile = index === parts.length - 1
        node = { name, path: nodePath, kind: isFile ? 'file' : 'folder', status: isFile ? statusFor(changesByPath.get(nodePath)) : 'unchanged', counts: emptyCounts(), changed: false, children: [] }
        parent.children.push(node)
      }
      parent = node
    })
  }

  function aggregate(node: PackageTreeNode): PackageStatusCounts {
    if (node.kind === 'file') {
      if (node.status !== 'unchanged') node.counts[node.status] = 1
      node.changed = node.status !== 'unchanged'
      return node.counts
    }
    node.children.sort((a, b) => a.kind === b.kind ? a.name.localeCompare(b.name, 'zh-CN') : a.kind === 'folder' ? -1 : 1)
    for (const child of node.children) {
      const counts = aggregate(child)
      node.counts.added += counts.added
      node.counts.modified += counts.modified
      node.counts.deleted += counts.deleted
    }
    node.changed = node.counts.added + node.counts.modified + node.counts.deleted > 0
    return node.counts
  }
  aggregate(root)
  return root
}
