import { ChevronDown, ChevronRight, FileText, Package } from 'lucide-react'
import { useState } from 'react'
import type { OutputPackageCandidate } from '../../domain/delivery'
import type { WorkingTreeChange } from '../../domain/repository'
import { buildPackageTree, type PackageTreeNode } from './buildPackageTree'
import './packageTree.css'

interface Props { item: OutputPackageCandidate; changes: WorkingTreeChange[]; selected: boolean; onToggle: () => void }

export function PackageTree({ item, changes, selected, onToggle }: Props) {
  const tree = buildPackageTree(item, changes)
  return (
    <section className="package-tree">
      <header className="package-tree__header">
        <label><input aria-label={`选择 ${item.name}`} checked={selected} onChange={onToggle} type="checkbox" /><Package size={18} /><span><strong>{item.name}</strong><small>{item.files.length} 个文件</small></span></label>
        <CountBadges node={tree} />
      </header>
      <ul className="tree-list"><TreeChildren nodes={tree.children} /></ul>
    </section>
  )
}

function TreeChildren({ nodes }: { nodes: PackageTreeNode[] }) {
  return <>{nodes.map((node) => <TreeNode key={node.path} node={node} />)}</>
}

function TreeNode({ node }: { node: PackageTreeNode }) {
  const [open, setOpen] = useState(node.changed)
  if (node.kind === 'file') {
    return <li className="tree-file"><FileText size={15} /><span>{node.name}</span>{node.status !== 'unchanged' ? <small className={`tree-status tree-status--${node.status}`}>{node.status === 'added' ? '新增' : node.status === 'modified' ? '已修改' : '已删除'}</small> : null}</li>
  }
  return <li className="tree-folder"><button aria-expanded={open} onClick={() => setOpen((value) => !value)} type="button">{open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}<Package size={16} /><strong>{node.name}</strong><CountBadges node={node} /></button>{open ? <ul className="tree-list"><TreeChildren nodes={node.children} /></ul> : null}</li>
}

function CountBadges({ node }: { node: PackageTreeNode }) {
  return <span className="tree-counts">{node.counts.added ? <small className="tree-status tree-status--added">新增 {node.counts.added}</small> : null}{node.counts.modified ? <small className="tree-status tree-status--modified">修改 {node.counts.modified}</small> : null}{node.counts.deleted ? <small className="tree-status tree-status--deleted">删除 {node.counts.deleted}</small> : null}</span>
}
