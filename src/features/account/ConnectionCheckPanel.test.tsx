import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { ConnectionCheckPanel } from './ConnectionCheckPanel'

it('runs and explains the three connection checks', async () => {
  const onConnected = vi.fn()
  const onCheck = vi.fn().mockResolvedValue({
    connected: true,
    username: 'jiangcheng',
    checks: [
      { id: 'network', label: '公司网络', status: 'passed' },
      { id: 'access_code', label: '软件访问码', status: 'passed' },
      { id: 'identity', label: '电脑身份钥匙', status: 'passed' },
    ],
  })
  render(<ConnectionCheckPanel onCheck={onCheck} onConnected={onConnected} />)
  fireEvent.click(screen.getByRole('button', { name: '检查连接' }))
  expect(await screen.findByText('全部连接正常')).toBeInTheDocument()
  expect(screen.getByText(/jiangcheng/)).toBeInTheDocument()
  expect(onConnected).toHaveBeenCalledOnce()
})
