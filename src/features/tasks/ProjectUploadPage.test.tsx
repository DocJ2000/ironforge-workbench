import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { expect, it, vi } from 'vitest'
import { getDemoRepository } from '../../data/demoRepository'
import type { DeliveryApi } from '../../data/deliveryClient'
import { ProjectUploadPage } from './ProjectUploadPage'

it('separates added, modified, and deleted files during review', () => {
  render(<MemoryRouter><ProjectUploadPage repository={getDemoRepository()} /></MemoryRouter>)
  fireEvent.click(screen.getByRole('button', { name: '下一步' }))
  fireEvent.click(screen.getByRole('button', { name: '下一步' }))

  expect(screen.getByRole('tab', { name: /新增/ })).toHaveAttribute('aria-selected', 'true')
  fireEvent.click(screen.getByRole('tab', { name: /已删除/ }))
  expect(screen.getByText(/这些文件上传后会从公司服务器中移除/)).toBeVisible()
  expect(screen.getByRole('tabpanel')).toBeVisible()
})

it('uploads all project changes without a tag', async () => {
  const syncGitLab = vi.fn().mockResolvedValue({ commit: 'abc12345', branch: 'dev/T2' })
  const api = { syncGitLab, createBranch: vi.fn() } as unknown as DeliveryApi
  render(<MemoryRouter><ProjectUploadPage api={api} repository={getDemoRepository()} /></MemoryRouter>)
  fireEvent.click(screen.getByRole('button', { name: '下一步' }))
  fireEvent.click(screen.getByRole('button', { name: '下一步' }))
  fireEvent.click(screen.getByRole('button', { name: '下一步' }))
  fireEvent.change(screen.getByLabelText('本次更新标题'), { target: { value: '更新整个结构工程' } })
  fireEvent.click(screen.getByRole('button', { name: '下一步' }))
  fireEvent.click(screen.getByRole('button', { name: '下一步' }))
  fireEvent.click(screen.getByRole('button', { name: '确认上传' }))
  await waitFor(() => expect(syncGitLab).toHaveBeenCalledOnce())
  expect(syncGitLab).toHaveBeenCalledWith(expect.not.objectContaining({ tag: expect.anything() }))
  expect(screen.getByText('工程已上传')).toBeVisible()
})
