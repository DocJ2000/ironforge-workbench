import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { expect, it } from 'vitest'
import { getDemoRepository } from '../../data/demoRepository'
import { organizationClient } from '../../data/organizationClient'
import { ProjectActionsPage } from './ProjectActionsPage'

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
