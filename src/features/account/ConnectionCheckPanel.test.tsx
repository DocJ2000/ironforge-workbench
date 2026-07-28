import { fireEvent, render, screen, waitFor } from '@testing-library/react'
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

it('waits for durable completion before leaving the connection check', async () => {
  let finish: (() => void) | undefined
  const onConnected = vi.fn().mockImplementation(() => new Promise<void>((resolve) => {
    finish = resolve
  }))
  render(<ConnectionCheckPanel
    onCheck={vi.fn().mockResolvedValue({ connected: true, checks: [] })}
    onConnected={onConnected}
  />)

  fireEvent.click(screen.getByRole('button', { name: '检查连接' }))
  await waitFor(() => expect(onConnected).toHaveBeenCalledOnce())
  expect(screen.getByRole('button', { name: '正在检查' })).toBeDisabled()
  finish?.()
  await screen.findByRole('button', { name: '检查连接' })
})
