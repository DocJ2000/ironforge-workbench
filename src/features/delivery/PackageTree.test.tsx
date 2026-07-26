import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import type { OutputPackageCandidate } from '../../domain/delivery'
import type { WorkingTreeChange } from '../../domain/repository'
import { PackageTree } from './PackageTree'

it('selects only the parent package and expands changed folders', () => {
  const item = { id: 'p', name: '3D打印治具', path: 'output/mechanical/3D打印治具', domain: 'mechanical', files: [{ name: '夹具.stp', path: 'output/mechanical/3D打印治具/模型/夹具.stp', type: 'STEP', size: '1 MB' }] } satisfies OutputPackageCandidate
  const changes = [{ id: '1', path: item.files[0].path, name: '夹具.stp', kind: 'untracked' }] as WorkingTreeChange[]
  const onToggle = vi.fn()
  render(<PackageTree changes={changes} item={item} onToggle={onToggle} selected />)
  expect(screen.getByText('夹具.stp')).toBeVisible()
  expect(screen.getAllByText(/新增/).length).toBeGreaterThan(0)
  fireEvent.click(screen.getByRole('checkbox', { name: '选择 3D打印治具' }))
  expect(onToggle).toHaveBeenCalledOnce()
  expect(screen.getAllByRole('checkbox')).toHaveLength(1)
})
