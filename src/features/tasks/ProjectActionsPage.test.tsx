import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import type { DeliveryApi } from '../../data/deliveryClient'
import { getDemoRepository } from '../../data/demoRepository'
import { organizationClient } from '../../data/organizationClient'
import { uploadReceiptClient } from '../../data/uploadReceiptClient'
import { ProjectActionsPage } from './ProjectActionsPage'

beforeEach(() => localStorage.clear())

it('offers download and history after a clean project is selected', () => {
  organizationClient.save({
    gitlabUrl: 'https://gitlab.example.com/',
    ironforgeUrl: '',
  })
  render(<MemoryRouter><ProjectActionsPage repository={{
    ...getDemoRepository(),
    ahead: 0,
    behind: 0,
    changes: [],
  }} /></MemoryRouter>)
  expect(screen.queryByRole('link', { name: /上传我的修改/ })).not.toBeInTheDocument()
  expect(screen.getByText('当前工作分支没有本机修改，也没有待上传提交。')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /下载服务器内容/ })).toHaveAttribute('href', '/workspace/retrieve')
  expect(screen.getByRole('link', { name: /查看操作历史/ })).toHaveAttribute('href', '/history')
  expect(screen.getByRole('link', { name: /在 GitLab 查看本项目/ })).toHaveAttribute(
    'href',
    'https://gitlab.example.com/example-group/sample-project',
  )
  expect(screen.getByText('当前本机工作分支：dev/T2')).toBeInTheDocument()
  expect(screen.getByLabelText('切换到哪个工作分支')).toHaveValue('dev/T2')
  expect(screen.getByRole('button', { name: '新建工作版本' })).toBeVisible()
  expect(screen.getByRole('button', { name: '刷新工作版本' })).toBeVisible()
})

it('offers upload when the current branch has local changes', () => {
  const repository = {
    ...getDemoRepository(),
    changes: [getDemoRepository().changes[0]],
  }

  render(<MemoryRouter><ProjectActionsPage repository={repository} /></MemoryRouter>)

  expect(screen.getByRole('link', { name: /上传我的修改/ })).toHaveAttribute(
    'href',
    '/workspace/upload/gitlab',
  )
})

it('checks out a cloud work branch before project operations', async () => {
  const repository = {
    ...getDemoRepository(),
    branch: 'dev/deleted',
    branches: [
      ...getDemoRepository().branches,
      {
        name: 'dev/deleted',
        stage: '开发分支',
        commit: 'abc12345',
        commitMessage: 'local-only',
        updatedAt: '2026-08-14',
        remote: false,
        current: true,
      },
    ],
  }
  const checkoutBranch = vi.fn().mockResolvedValue({ branch: 'dev/T2' })
  const onRefresh = vi.fn().mockResolvedValue(undefined)
  const api = { checkoutBranch } as unknown as DeliveryApi

  render(
    <MemoryRouter>
      <ProjectActionsPage api={api} onRefresh={onRefresh} repository={repository} />
    </MemoryRouter>,
  )

  expect(screen.getByText(/可能已经被删除/)).toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('切换到哪个工作分支'), {
    target: { value: 'dev/T2' },
  })
  fireEvent.click(screen.getByRole('button', { name: '切换分支' }))

  await waitFor(() => expect(checkoutBranch).toHaveBeenCalledWith('dev/T2'))
  expect(onRefresh).toHaveBeenCalledOnce()
})

it('creates and switches to a new work version from project operations', async () => {
  const repository = {
    ...getDemoRepository(),
    ahead: 0,
    behind: 0,
    changes: [],
  }
  const createBranch = vi.fn().mockResolvedValue({ branch: 'dev/T3' })
  const checkoutBranch = vi.fn().mockResolvedValue({ branch: 'dev/T3' })
  const onRefresh = vi.fn().mockResolvedValue(undefined)
  const api = { createBranch, checkoutBranch } as unknown as DeliveryApi

  render(
    <MemoryRouter>
      <ProjectActionsPage api={api} onRefresh={onRefresh} repository={repository} />
    </MemoryRouter>,
  )

  fireEvent.click(screen.getByRole('button', { name: '新建工作版本' }))
  fireEvent.change(screen.getByLabelText('新工作版本名称'), {
    target: { value: 'dev/T3' },
  })
  fireEvent.click(screen.getByRole('button', { name: '创建并选中' }))

  await waitFor(() => expect(createBranch).toHaveBeenCalledWith({
    name: 'dev/T3',
    startPoint: 'dev/T2',
  }))
  await waitFor(() => expect(checkoutBranch).toHaveBeenCalledWith('dev/T3'))
  expect(onRefresh).toHaveBeenCalledOnce()
  expect(screen.getByLabelText('切换到哪个工作分支')).toHaveValue('dev/T3')
})

it('refreshes the branch list from GitLab', async () => {
  const repository = {
    ...getDemoRepository(),
    ahead: 0,
    behind: 0,
    changes: [],
  }
  const refreshBranches = vi.fn().mockResolvedValue({
    refreshed: true,
    branches: [
      ...getDemoRepository().branches,
      {
        name: 'dev/T3',
        stage: '开发分支',
        commit: 'abc99999',
        commitMessage: 'GitLab web branch',
        updatedAt: '2026-08-17',
        remote: true,
        current: false,
      },
    ],
  })
  const onRefresh = vi.fn().mockResolvedValue(undefined)
  const api = { refreshBranches } as unknown as DeliveryApi

  render(
    <MemoryRouter>
      <ProjectActionsPage api={api} onRefresh={onRefresh} repository={repository} />
    </MemoryRouter>,
  )

  fireEvent.click(screen.getByRole('button', { name: '刷新工作版本' }))

  await waitFor(() => expect(refreshBranches).toHaveBeenCalledOnce())
  await waitFor(() => expect(screen.getByRole('option', { name: 'dev/T3' })).toBeInTheDocument())
  expect(onRefresh).toHaveBeenCalledOnce()
})

it('offers merge review for the latest successfully uploaded commit', () => {
  const repository = {
    ...getDemoRepository(),
    ahead: 0,
    behind: 0,
    changes: [],
  }
  uploadReceiptClient.save(repository.id, {
    branch: repository.branch,
    commit: repository.latestCommit,
  })

  render(<MemoryRouter><ProjectActionsPage repository={repository} /></MemoryRouter>)

  expect(screen.getByRole('link', { name: /提交合并审核/ })).toHaveAttribute(
    'href',
    '/workspace/upload/ironforge',
  )
  expect(screen.getByText(/服务器上的 dev\/T2/)).toBeInTheDocument()
})

it('does not offer merge review from a clean branch without an upload receipt', () => {
  const repository = {
    ...getDemoRepository(),
    ahead: 0,
    behind: 0,
    changes: [],
  }

  render(<MemoryRouter><ProjectActionsPage repository={repository} /></MemoryRouter>)

  expect(screen.queryByRole('link', { name: /提交合并审核/ })).not.toBeInTheDocument()
})
