import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { expect, it, vi } from 'vitest'
import type { DeliveryApi } from '../../data/deliveryClient'
import { getDemoRepository } from '../../data/demoRepository'
import { IronforgeDeliveryPage } from './IronforgeDeliveryPage'

it('syncs a free-form tag then creates an MR', async () => {
  const repository = {
    ...getDemoRepository(),
    changes: [],
    ahead: 0,
    behind: 0,
    latestCommit: 'abcdef123456',
  }
  localStorage.setItem(`ironforge-workbench:gitlab-upload:${repository.id}`, JSON.stringify({
    branch: repository.branch,
    commit: repository.latestCommit,
    createdAt: new Date().toISOString(),
  }))
  const api = {
    overview: vi.fn().mockResolvedValue({ packages: [{ id: 'p', name: '机加件', path: 'output/mechanical/机加件', domain: 'mechanical', files: [{ name: '零件.pdf', path: 'output/mechanical/机加件/零件.pdf', type: 'PDF', size: '1 KB' }] }], reviewers: [{ id: 7, name: '胡庆磊', username: 'lulu', role: 'Maintainer', recommended: true }] }),
    syncGitLab: vi.fn().mockResolvedValue({ commit: 'abc', branch: 'dev/T2', tag: 'T2设变零件' }),
    createMergeRequest: vi.fn().mockResolvedValue({ iid: 9, webUrl: 'https://gitlab/mr/9' }),
    uploadAttachment: vi.fn(),
  } as unknown as DeliveryApi
  render(<MemoryRouter><IronforgeDeliveryPage api={api} repository={repository} /></MemoryRouter>)
  await screen.findByRole('checkbox', { name: '选择 机加件' })
  fireEvent.click(screen.getByRole('button', { name: '下一步' }))
  fireEvent.change(screen.getByLabelText('本次更新标题'), { target: { value: '更新 T2 设变零件' } })
  fireEvent.change(screen.getByLabelText('本次交付标签'), { target: { value: 'T2设变零件' } })
  fireEvent.click(screen.getByRole('button', { name: '下一步' }))
  fireEvent.click(screen.getByRole('button', { name: '上传图纸' }))
  await waitFor(() => expect(api.syncGitLab).toHaveBeenCalledWith(expect.objectContaining({ tag: { name: 'T2设变零件', message: '更新 T2 设变零件' } })))
  expect(api.syncGitLab).toHaveBeenCalledWith(
    expect.objectContaining({
      changePaths: [],
    }),
  )
  fireEvent.click(screen.getByRole('button', { name: '下一步' }))
  expect(screen.getByRole('checkbox', { name: '选择审核人 胡庆磊' })).toBeChecked()
  fireEvent.click(screen.getByRole('button', { name: '下一步' }))
  fireEvent.click(screen.getByRole('button', { name: '创建审核单' }))
  await waitFor(() => expect(api.createMergeRequest).toHaveBeenCalledWith(expect.objectContaining({ reviewerIds: [7], title: '更新 T2 设变零件' })))
  localStorage.clear()
})

it('requires the same project to be uploaded before an Ironforge delivery', () => {
  const repository = getDemoRepository()
  render(<MemoryRouter><IronforgeDeliveryPage repository={repository} /></MemoryRouter>)

  expect(screen.getByRole('heading', { name: '请先上传这个项目' })).toBeVisible()
  expect(screen.getByRole('link', { name: '去上传这个项目' })).toHaveAttribute('href', '/workspace/upload/gitlab')
})
