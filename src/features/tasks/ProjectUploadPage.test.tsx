import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { expect, it, vi } from 'vitest'
import { getDemoRepository } from '../../data/demoRepository'
import type { DeliveryApi } from '../../data/deliveryClient'
import { initialUploadBranch, ProjectUploadPage, uploadBranchNames } from './ProjectUploadPage'

it('only offers cloud development branches and falls back from a local-only branch', () => {
  const repository = structuredClone(getDemoRepository())
  repository.branch = 'dev/T2+'
  repository.branches = [
    ...repository.branches,
    {
      name: 'dev/T2+',
      stage: 'T2 设计',
      commit: 'abc12345',
      commitMessage: 'local upload',
      updatedAt: '2026-07-28',
      remote: false,
      current: true,
    },
    {
      name: 'codex/internal',
      stage: '开发分支',
      commit: 'def67890',
      commitMessage: 'internal work',
      updatedAt: '2026-07-28',
      remote: false,
      current: false,
    },
  ]

  expect(uploadBranchNames(repository)).toEqual(['dev/T1', 'dev/T2'])
  expect(initialUploadBranch(repository)).toBe('dev/T2')
})

it('separates added, modified, and deleted files during review', () => {
  const api = { overview: vi.fn().mockResolvedValue({ packages: [], reviewers: [] }) } as unknown as DeliveryApi
  render(<MemoryRouter><ProjectUploadPage api={api} repository={getDemoRepository()} /></MemoryRouter>)
  fireEvent.click(screen.getByRole('button', { name: '下一步' }))

  expect(screen.getByRole('tab', { name: /新增/ })).toHaveAttribute('aria-selected', 'true')
  fireEvent.click(screen.getByRole('tab', { name: /已删除/ }))
  expect(screen.getByText(/这些文件会随本次上传从 GitLab/)).toBeVisible()
  expect(screen.getByRole('tabpanel')).toBeVisible()
})

it('uploads all project changes without a tag', async () => {
  const syncGitLab = vi.fn().mockResolvedValue({ commit: 'abc12345', branch: 'dev/T2' })
  const api = {
    overview: vi.fn().mockResolvedValue({
      packages: [{ id: 'p', name: '机加件', path: 'output/mechanical/机加件', domain: 'mechanical', files: [] }],
      reviewers: [],
    }),
    syncGitLab,
  } as unknown as DeliveryApi
  render(<MemoryRouter><ProjectUploadPage api={api} repository={getDemoRepository()} /></MemoryRouter>)
  await waitFor(() => expect(api.overview).toHaveBeenCalled())
  fireEvent.click(screen.getByRole('button', { name: '下一步' }))
  fireEvent.click(screen.getByRole('button', { name: '下一步' }))
  expect(screen.getByRole('checkbox', { name: '选择 机加件' })).toBeChecked()
  fireEvent.click(screen.getByRole('button', { name: '下一步' }))
  fireEvent.click(screen.getByRole('button', { name: '下一步' }))
  fireEvent.click(screen.getByRole('button', { name: '下一步' }))
  fireEvent.change(screen.getByLabelText('本次更新标题'), { target: { value: '更新整个结构工程' } })
  fireEvent.click(screen.getByRole('button', { name: '下一步' }))
  fireEvent.click(screen.getByRole('button', { name: '确认上传' }))
  await waitFor(() => expect(syncGitLab).toHaveBeenCalledOnce())
  expect(syncGitLab).toHaveBeenCalledWith(expect.objectContaining({ selectedPackageIds: ['p'] }))
  expect(syncGitLab).toHaveBeenCalledWith(expect.not.objectContaining({ tag: expect.anything() }))
  expect(screen.getByText('工程已上传')).toBeVisible()
})
