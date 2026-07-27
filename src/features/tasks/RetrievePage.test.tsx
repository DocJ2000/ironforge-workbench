import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { expect, it, vi } from 'vitest'
import type { DeliveryApi } from '../../data/deliveryClient'
import { getDemoRepository } from '../../data/demoRepository'
import { RetrievePage } from './RetrievePage'

it('uses the already selected project without asking again', () => {
  const repository = getDemoRepository()
  render(<MemoryRouter><RetrievePage repository={repository} /></MemoryRouter>)

  expect(screen.getByText(repository.displayName)).toBeVisible()
  expect(screen.queryByLabelText('查看哪个项目的记录')).not.toBeInTheDocument()
  expect(screen.queryByText('这次要获取哪个项目？')).not.toBeInTheDocument()
  expect(screen.queryByText('下载铁炉堡已发布图纸')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: '下一步' }))
  expect(screen.getByText('准备下载')).toBeVisible()
})

it('downloads updates only after explicit confirmation', async () => {
  const repository = getDemoRepository()
  const pull = vi.fn().mockResolvedValue({
    branch: repository.branch,
    updated: true,
    receivedCommits: 2,
    commit: 'abc1234',
  })
  render(<MemoryRouter><RetrievePage api={{ pull } as unknown as DeliveryApi} repository={repository} /></MemoryRouter>)

  fireEvent.click(screen.getByRole('button', { name: '下一步' }))
  fireEvent.click(screen.getByRole('button', { name: '确认下载' }))

  expect(await screen.findByText('已下载同事上传的新内容')).toBeVisible()
  expect(screen.getByText('本次收到 2 个新版本。')).toBeVisible()
  expect(pull).toHaveBeenCalledOnce()
})
