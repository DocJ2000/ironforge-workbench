import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { SoftwareUpdatePanel } from './SoftwareUpdatePanel'

it('requires separate clicks to check, download, and install', async () => {
  const client = {
    status: vi.fn().mockResolvedValue({ phase: 'idle', currentVersion: '1.0.0' }),
    check: vi.fn().mockResolvedValue({
      phase: 'available',
      currentVersion: '1.0.0',
      availableVersion: '1.1.0',
    }),
    download: vi.fn().mockResolvedValue({
      phase: 'ready',
      currentVersion: '1.0.0',
      availableVersion: '1.1.0',
    }),
    install: vi.fn().mockResolvedValue({ phase: 'ready', currentVersion: '1.0.0' }),
  }
  render(<SoftwareUpdatePanel client={client} />)
  await screen.findByText('当前版本 1.0.0')

  fireEvent.click(screen.getByRole('button', { name: '检查新版本' }))
  await screen.findByText('发现新版本 1.1.0')
  expect(client.download).not.toHaveBeenCalled()

  fireEvent.click(screen.getByRole('button', { name: '下载新版本' }))
  await screen.findByRole('button', { name: '重启并安装' })
  expect(client.install).not.toHaveBeenCalled()

  fireEvent.click(screen.getByRole('button', { name: '重启并安装' }))
  await waitFor(() => expect(client.install).toHaveBeenCalledOnce())
})
