import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { expect, it, vi } from 'vitest'
import type { DeliveryApi } from '../../data/deliveryClient'
import { CloneProjectPage } from './CloneProjectPage'

it('downloads a new project through a separate confirmed flow', async () => {
  const clone = vi.fn().mockResolvedValue({ project: { path: 'D:\\Projects\\new-project' } })
  render(<MemoryRouter><CloneProjectPage api={{ clone } as unknown as DeliveryApi} /></MemoryRouter>)
  fireEvent.change(screen.getByLabelText('项目的 SSH 地址', { selector: 'input' }), { target: { value: 'git@gitlab.example.com:group/new-project.git' } })
  fireEvent.change(screen.getByLabelText('新项目保存位置'), { target: { value: 'D:\\Projects\\new-project' } })
  fireEvent.click(screen.getByRole('button', { name: '确认下载新项目' }))
  expect(await screen.findByText('项目已经下载完成')).toBeVisible()
  expect(clone).toHaveBeenCalledOnce()
})
