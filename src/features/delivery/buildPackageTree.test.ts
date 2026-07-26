import { describe, expect, it } from 'vitest'
import type { OutputPackageCandidate } from '../../domain/delivery'
import type { WorkingTreeChange } from '../../domain/repository'
import { buildPackageTree } from './buildPackageTree'

describe('buildPackageTree', () => {
  it('builds folders and includes deleted files with aggregate counts', () => {
    const item = { id: 'p', name: '3D打印治具', path: 'output/mechanical/3D打印治具', domain: 'mechanical', files: [
      { name: '夹具.stp', path: 'output/mechanical/3D打印治具/模型/夹具.stp', type: 'STEP', size: '1 MB' },
      { name: '说明.pdf', path: 'output/mechanical/3D打印治具/说明.pdf', type: 'PDF', size: '1 KB' },
    ] } satisfies OutputPackageCandidate
    const changes = [
      { id: '1', path: 'output/mechanical/3D打印治具/模型/夹具.stp', name: '夹具.stp', kind: 'modified' },
      { id: '2', path: 'output/mechanical/3D打印治具/旧图.dwg', name: '旧图.dwg', kind: 'deleted' },
    ] as WorkingTreeChange[]
    const tree = buildPackageTree(item, changes)
    expect(tree.children[0].name).toBe('模型')
    expect(tree.counts).toEqual({ added: 0, modified: 1, deleted: 1 })
    expect(tree.children.some((node) => node.name === '旧图.dwg' && node.status === 'deleted')).toBe(true)
  })
})
