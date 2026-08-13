import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import type { DeliveryApi } from '../../data/deliveryClient'
import { getDemoRepository } from '../../data/demoRepository'
import { IronforgeDeliveryPage } from './IronforgeDeliveryPage'

afterEach(() => localStorage.clear())

it('continues tracking an existing merge request after returning', () => {
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
  localStorage.setItem(`ironforge-workbench:merge-request:${repository.id}`, JSON.stringify({
    iid: 9,
    webUrl: 'https://gitlab/project/-/merge_requests/9',
    sourceBranch: repository.branch,
    sourceCommit: repository.latestCommit,
    state: 'opened',
    createdAt: new Date().toISOString(),
  }))

  render(<MemoryRouter><IronforgeDeliveryPage repository={repository} /></MemoryRouter>)

  expect(screen.getByRole('heading', { name: '已提交管理员审核' })).toBeVisible()
  expect(screen.getByRole('link', { name: '查看本次审核单' })).toHaveAttribute(
    'href',
    'https://gitlab/project/-/merge_requests/9',
  )
})

it('restores an unfinished merge request draft after leaving the page', async () => {
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
    overview: vi.fn().mockResolvedValue({
      packages: [],
      reviewers: [{ id: 7, name: '审核人', username: 'reviewer', role: 'Maintainer', recommended: true }],
    }),
  } as unknown as DeliveryApi

  const first = render(
    <MemoryRouter>
      <IronforgeDeliveryPage api={api} repository={repository} />
    </MemoryRouter>,
  )
  await waitFor(() => expect(api.overview).toHaveBeenCalled())
  fireEvent.click(screen.getByRole('button', { name: '下一步' }))
  fireEvent.change(screen.getByLabelText('本次交付标题'), {
    target: { value: 'T2 正式交付' },
  })
  first.unmount()

  render(
    <MemoryRouter>
      <IronforgeDeliveryPage api={api} repository={repository} />
    </MemoryRouter>,
  )
  expect(screen.getByLabelText('本次交付标题')).toHaveValue('T2 正式交付')
})

it('creates an MR from the previously uploaded charge without syncing again', async () => {
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
    syncGitLab: vi.fn(),
    createMergeRequest: vi.fn().mockResolvedValue({ iid: 9, webUrl: 'https://gitlab/mr/9' }),
    uploadAttachment: vi.fn(),
  } as unknown as DeliveryApi
  render(<MemoryRouter><IronforgeDeliveryPage api={api} repository={repository} /></MemoryRouter>)
  await waitFor(() => expect(api.overview).toHaveBeenCalled())
  fireEvent.click(screen.getByRole('button', { name: '下一步' }))
  fireEvent.change(screen.getByLabelText('本次交付标题'), { target: { value: '更新 T2 设变零件' } })
  fireEvent.click(screen.getByRole('button', { name: '下一步' }))
  fireEvent.click(screen.getByRole('button', { name: '下一步' }))
  expect(screen.getByRole('checkbox', { name: '选择审核人 胡庆磊' })).toBeChecked()
  fireEvent.click(screen.getByRole('checkbox', { name: '选择经办人 胡庆磊' }))
  fireEvent.click(screen.getByRole('button', { name: '下一步' }))
  fireEvent.click(screen.getByRole('button', { name: '确认交付' }))
  await waitFor(() => expect(api.createMergeRequest).toHaveBeenCalledWith(expect.objectContaining({ assigneeIds: [7], reviewerIds: [7], title: '更新 T2 设变零件' })))
  expect(api.syncGitLab).not.toHaveBeenCalled()
  localStorage.clear()
})

it('creates a version tag before submitting a key-version MR', async () => {
  const repository = {
    ...getDemoRepository(),
    changes: [],
    ahead: 0,
    behind: 0,
    latestCommit: 'abcdef123456',
  }
  const api = {
    overview: vi.fn().mockResolvedValue({
      packages: [],
      reviewers: [{ id: 7, name: '胡庆磊', username: 'lulu', role: 'Maintainer', recommended: true }],
    }),
    createMergeRequest: vi.fn().mockResolvedValue({ iid: 10, webUrl: 'https://gitlab/mr/10' }),
    uploadAttachment: vi.fn(),
  } as unknown as DeliveryApi
  render(<MemoryRouter><IronforgeDeliveryPage api={api} repository={repository} /></MemoryRouter>)
  await waitFor(() => expect(api.overview).toHaveBeenCalled())

  fireEvent.click(screen.getByRole('button', { name: '下一步' }))
  fireEvent.change(screen.getByLabelText('本次交付标题'), { target: { value: 'T2 第二次打样' } })
  fireEvent.click(screen.getByRole('button', { name: '下一步' }))
  fireEvent.click(screen.getByRole('checkbox', { name: /为这次关键版本建立标记/ }))
  fireEvent.change(screen.getByLabelText('本次版本标记'), { target: { value: 'T2-第二次打样' } })
  fireEvent.change(screen.getByLabelText('版本标记说明'), { target: { value: '供应商第二次打样版本' } })
  fireEvent.click(screen.getByRole('button', { name: '下一步' }))
  fireEvent.click(screen.getByRole('checkbox', { name: '选择经办人 胡庆磊' }))
  fireEvent.click(screen.getByRole('button', { name: '下一步' }))
  fireEvent.click(screen.getByRole('button', { name: '确认交付' }))

  await waitFor(() => expect(api.createMergeRequest).toHaveBeenCalledWith(expect.objectContaining({
    tag: { name: 'T2-第二次打样', message: '供应商第二次打样版本' },
  })))
})

it('uploads pasted images into the MR description at the pasted position', async () => {
  const repository = { ...getDemoRepository(), changes: [], ahead: 0, behind: 0 }
  const api = {
    overview: vi.fn().mockResolvedValue({
      packages: [],
      reviewers: [{ id: 7, name: '胡庆磊', username: 'lulu', role: 'Maintainer', recommended: true }],
    }),
    uploadAttachment: vi.fn().mockResolvedValue({ markdown: '![截图](/uploads/screenshot.png)' }),
    createMergeRequest: vi.fn().mockResolvedValue({ iid: 11, webUrl: 'https://gitlab/mr/11' }),
  } as unknown as DeliveryApi
  render(<MemoryRouter><IronforgeDeliveryPage api={api} repository={repository} /></MemoryRouter>)
  await waitFor(() => expect(api.overview).toHaveBeenCalled())

  fireEvent.click(screen.getByRole('button', { name: '下一步' }))
  fireEvent.change(screen.getByLabelText('本次交付标题'), { target: { value: '带截图的交付' } })
  fireEvent.change(screen.getByLabelText('交付补充说明（可选）'), { target: { value: '请检查这里' } })
  const image = new File(['PNG'], 'image.png', { type: 'image/png' })
  fireEvent.paste(screen.getByLabelText('交付补充说明（可选）'), {
    clipboardData: { items: [{ kind: 'file', type: 'image/png', getAsFile: () => image }] },
  })
  fireEvent.click(screen.getByRole('button', { name: '下一步' }))
  fireEvent.click(screen.getByRole('button', { name: '下一步' }))
  fireEvent.click(screen.getByRole('checkbox', { name: '选择经办人 胡庆磊' }))
  fireEvent.click(screen.getByRole('button', { name: '下一步' }))
  fireEvent.click(screen.getByRole('button', { name: '确认交付' }))

  await waitFor(() => expect(api.createMergeRequest).toHaveBeenCalledWith(expect.objectContaining({
    description: expect.stringContaining('![截图](/uploads/screenshot.png)'),
    attachmentMarkdown: [],
  })))
})

it('requires the same project to be uploaded before an Ironforge delivery', () => {
  const repository = getDemoRepository()
  render(<MemoryRouter><IronforgeDeliveryPage repository={repository} /></MemoryRouter>)

  expect(screen.getByRole('heading', { name: '项目还没有准备好交付' })).toBeVisible()
  expect(screen.getByRole('link', { name: '去上传这个项目' })).toHaveAttribute('href', '/workspace/upload/gitlab')
})

it('accepts a clean cloud-synced commit pushed by another Git tool', async () => {
  const repository = {
    ...getDemoRepository(),
    changes: [],
    ahead: 0,
    behind: 0,
    latestCommit: 'newer-commit',
  }
  localStorage.setItem(`ironforge-workbench:gitlab-upload:${repository.id}`, JSON.stringify({
    branch: repository.branch,
    commit: 'older-commit',
    createdAt: new Date().toISOString(),
  }))

  const api = {
    overview: vi.fn().mockResolvedValue({ packages: [], reviewers: [] }),
  } as unknown as DeliveryApi
  render(<MemoryRouter><IronforgeDeliveryPage api={api} repository={repository} /></MemoryRouter>)

  await waitFor(() => expect(api.overview).toHaveBeenCalled())
  expect(screen.queryByRole('heading', { name: '项目还没有准备好交付' })).not.toBeInTheDocument()
})
