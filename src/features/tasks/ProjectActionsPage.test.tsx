import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, it } from 'vitest'
import { getDemoRepository } from '../../data/demoRepository'
import { organizationClient } from '../../data/organizationClient'
import { uploadReceiptClient } from '../../data/uploadReceiptClient'
import { ProjectActionsPage } from './ProjectActionsPage'

beforeEach(() => localStorage.clear())

it('offers upload and download only after a project is selected', () => {
  organizationClient.save({
    gitlabUrl: 'https://gitlab.example.com/',
    ironforgeUrl: '',
  })
  render(<MemoryRouter><ProjectActionsPage repository={getDemoRepository()} /></MemoryRouter>)
  expect(screen.getByRole('link', { name: /上传我的修改/ })).toHaveAttribute('href', '/workspace/upload/gitlab')
  expect(screen.getByRole('link', { name: /下载服务器内容/ })).toHaveAttribute('href', '/workspace/retrieve')
  expect(screen.getByRole('link', { name: /查看操作历史/ })).toHaveAttribute('href', '/history')
  expect(screen.getByRole('link', { name: /在 GitLab 查看本项目/ })).toHaveAttribute(
    'href',
    'https://gitlab.example.com/example-group/sample-project',
  )
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

it('offers merge review from the real synchronized branch state without a local upload receipt', () => {
  const repository = {
    ...getDemoRepository(),
    ahead: 0,
    behind: 0,
    changes: [],
  }

  render(<MemoryRouter><ProjectActionsPage repository={repository} /></MemoryRouter>)

  expect(screen.getByRole('link', { name: /提交合并审核/ })).toHaveAttribute(
    'href',
    '/workspace/upload/ironforge',
  )
})
