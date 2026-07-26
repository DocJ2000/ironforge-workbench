import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { expect, it, vi } from 'vitest'
import { getDemoRepository } from '../../data/demoRepository'
import type { DeliveryApi } from '../../data/deliveryClient'
import { ProjectUploadPage } from './ProjectUploadPage'

it('uploads all project changes without a tag', async () => {
  const syncGitLab = vi.fn().mockResolvedValue({ commit: 'abc12345', branch: 'dev/T2' })
  const api = { syncGitLab, createBranch: vi.fn() } as unknown as DeliveryApi
  render(<MemoryRouter><ProjectUploadPage api={api} repository={getDemoRepository()} /></MemoryRouter>)
  fireEvent.click(screen.getByRole('button', { name: '下一步' }))
  fireEvent.click(screen.getByRole('button', { name: '下一步' }))
  fireEvent.change(screen.getByLabelText('本次更新标题'), { target: { value: '更新整个结构工程' } })
  fireEvent.click(screen.getByRole('button', { name: '下一步' }))
  fireEvent.click(screen.getByRole('button', { name: '确认上传' }))
  await waitFor(() => expect(syncGitLab).toHaveBeenCalledOnce())
  expect(syncGitLab).toHaveBeenCalledWith(expect.not.objectContaining({ tag: expect.anything() }))
  expect(screen.getByText('工程已上传')).toBeVisible()
})
