import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { expect, it } from 'vitest'
import { getDemoRepository } from '../../data/demoRepository'
import { ProjectActionsPage } from './ProjectActionsPage'

it('offers upload and download only after a project is selected', () => {
  render(<MemoryRouter><ProjectActionsPage repository={getDemoRepository()} /></MemoryRouter>)
  expect(screen.getByRole('link', { name: /上传我的修改/ })).toHaveAttribute('href', '/workspace/upload/gitlab')
  expect(screen.getByRole('link', { name: /下载服务器内容/ })).toHaveAttribute('href', '/workspace/retrieve')
})
