import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { getDemoRepository } from '../../data/demoRepository'
import type { DeliveryApi } from '../../data/deliveryClient'
import { initialUploadBranch, ProjectUploadPage, uploadBranchNames } from './ProjectUploadPage'

function readyRepository() {
  return {
    ...getDemoRepository(),
    ahead: 0,
    behind: 0,
  }
}

afterEach(() => localStorage.clear())

it('restores the unfinished upload step after leaving the page', async () => {
  const repository = readyRepository()
  const api = {
    overview: vi.fn().mockResolvedValue({
      packages: [{
        id: 'fixture',
        name: '治具',
        path: 'output/mechanical/治具',
        domain: 'mechanical',
        files: [],
      }],
      reviewers: [],
    }),
  } as unknown as DeliveryApi

  const first = render(
    <MemoryRouter>
      <ProjectUploadPage api={api} repository={repository} />
    </MemoryRouter>,
  )
  await waitFor(() => expect(api.overview).toHaveBeenCalled())
  for (let index = 0; index < 3; index += 1) {
    fireEvent.click(screen.getByRole('button', { name: '下一步' }))
  }
  expect(screen.getByRole('heading', { name: '核对自动生成的交付清单' })).toBeVisible()
  first.unmount()

  render(
    <MemoryRouter>
      <ProjectUploadPage api={api} repository={repository} />
    </MemoryRouter>,
  )
  expect(screen.getByRole('heading', { name: '核对自动生成的交付清单' })).toBeVisible()
})

it('offers to continue an existing local commit after returning to the page', async () => {
  const repository = {
    ...readyRepository(),
    ahead: 1,
    latestCommit: 'a5e149a6212b',
    latestCommitMessage: '更新结构件图纸',
    changes: [],
  }
  const retryPush = vi.fn().mockResolvedValue({
    branch: 'dev/T2',
    commit: 'a5e149a6212b',
  })
  const syncGitLab = vi.fn()
  const api = {
    overview: vi.fn().mockResolvedValue({ packages: [], reviewers: [] }),
    retryPush,
    syncGitLab,
  } as unknown as DeliveryApi

  render(
    <MemoryRouter>
      <ProjectUploadPage api={api} repository={repository} />
    </MemoryRouter>,
  )

  expect(screen.getByRole('heading', {
    name: '有 1 次更新还没有传到公司服务器',
  })).toBeVisible()
  expect(screen.getByText('更新结构件图纸')).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: '继续上传' }))

  await waitFor(() => expect(retryPush).toHaveBeenCalledWith('dev/T2'))
  expect(syncGitLab).not.toHaveBeenCalled()
  expect(screen.getByText('工程已上传')).toBeVisible()
})

it('blocks upload when both the computer and cloud have newer work', () => {
  const repository = {
    ...readyRepository(),
    ahead: 1,
    behind: 2,
    changes: [],
  }
  const retryPush = vi.fn()
  const api = {
    overview: vi.fn().mockResolvedValue({ packages: [], reviewers: [] }),
    retryPush,
  } as unknown as DeliveryApi

  render(
    <MemoryRouter>
      <ProjectUploadPage api={api} repository={repository} />
    </MemoryRouter>,
  )

  expect(screen.getByRole('heading', { name: '电脑和云端都有新的内容' })).toBeVisible()
  expect(screen.getByText(/不会强行覆盖任何一边/)).toBeVisible()
  expect(screen.queryByRole('button', { name: '继续上传' })).not.toBeInTheDocument()
  expect(retryPush).not.toHaveBeenCalled()
})

it('creates a new cloud work version from an existing cloud branch', async () => {
  const repository = readyRepository()
  const createBranch = vi.fn().mockResolvedValue({ branch: 'dev/T3' })
  const api = {
    overview: vi.fn().mockResolvedValue({
      packages: [{
        id: 'package',
        name: '结构件',
        path: 'output/mechanical/结构件',
        domain: 'mechanical',
        files: [],
      }],
      reviewers: [],
    }),
    createBranch,
  } as unknown as DeliveryApi

  render(
    <MemoryRouter>
      <ProjectUploadPage api={api} repository={repository} />
    </MemoryRouter>,
  )
  await waitFor(() => expect(api.overview).toHaveBeenCalled())
  for (let index = 0; index < 4; index += 1) {
    fireEvent.click(screen.getByRole('button', { name: '下一步' }))
  }

  fireEvent.click(screen.getByRole('button', { name: '新建工作版本' }))
  fireEvent.change(screen.getByLabelText('新工作版本名称'), {
    target: { value: 'T3' },
  })
  fireEvent.change(screen.getByLabelText('从哪个工作版本复制'), {
    target: { value: 'dev/T2' },
  })
  fireEvent.click(screen.getByRole('button', { name: '创建到 GitLab' }))

  await waitFor(() => expect(createBranch).toHaveBeenCalledWith({
    name: 'dev/T3',
    startPoint: 'dev/T2',
  }))
  await waitFor(() => {
    expect(screen.getByLabelText('上传到哪个工作版本')).toHaveValue('dev/T3')
  })
})

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
  render(<MemoryRouter><ProjectUploadPage api={api} repository={readyRepository()} /></MemoryRouter>)
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
  render(<MemoryRouter><ProjectUploadPage api={api} repository={readyRepository()} /></MemoryRouter>)
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
