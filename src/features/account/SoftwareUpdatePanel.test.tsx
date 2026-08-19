import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { SoftwareUpdatePanel } from './SoftwareUpdatePanel'

it('shows immediate and live feedback while an update is downloading', async () => {
  vi.useFakeTimers()
  let finishDownload!: (value: {
    phase: 'ready'
    currentVersion: string
    availableVersion: string
  }) => void
  const download = vi.fn().mockReturnValue(new Promise((resolve) => {
    finishDownload = resolve
  }))
  const client = {
    status: vi.fn()
      .mockResolvedValueOnce({
        phase: 'available',
        currentVersion: '1.0.0',
        availableVersion: '1.1.0',
      })
      .mockResolvedValue({
        phase: 'downloading',
        currentVersion: '1.0.0',
        availableVersion: '1.1.0',
        progress: 42,
      }),
    check: vi.fn(),
    download,
    install: vi.fn(),
  }

  render(<SoftwareUpdatePanel client={client} />)
  await act(async () => { await Promise.resolve() })
  fireEvent.click(screen.getByRole('button', { name: '下载新版本' }))
  expect(screen.getByRole('button', { name: '正在下载 0%' })).toBeDisabled()

  await act(async () => {
    await vi.advanceTimersByTimeAsync(600)
  })
  expect(screen.getByRole('button', { name: '正在下载 42%' })).toBeDisabled()
  expect(screen.getByRole('progressbar')).toHaveAttribute('value', '42')

  await act(async () => {
    finishDownload({
      phase: 'ready',
      currentVersion: '1.0.0',
      availableVersion: '1.1.0',
    })
    await Promise.resolve()
  })
  expect(screen.getByRole('button', { name: '重启并安装' })).toBeVisible()
  vi.useRealTimers()
})

it('requires separate clicks to check, download, and install', async () => {
  const client = {
    status: vi.fn().mockResolvedValue({ phase: 'idle', currentVersion: '1.0.0' }),
    check: vi.fn().mockResolvedValue({
      phase: 'available',
      currentVersion: '1.0.0',
      availableVersion: '1.1.0',
      releases: [
        { version: '1.1.0', notes: ['修复登录页面', '文件核对更清楚'] },
      ],
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
  expect(screen.getByText('这次更新了什么')).toBeVisible()
  expect(screen.getByText('修复登录页面')).toBeVisible()
  expect(screen.getByText('文件核对更清楚')).toBeVisible()
  expect(client.download).not.toHaveBeenCalled()

  fireEvent.click(screen.getByRole('button', { name: '下载新版本' }))
  await screen.findByRole('button', { name: '重启并安装' })
  expect(client.install).not.toHaveBeenCalled()

  fireEvent.click(screen.getByRole('button', { name: '重启并安装' }))
  await waitFor(() => expect(client.install).toHaveBeenCalledOnce())
})

it('shows a GitHub project link in the update panel', async () => {
  const client = {
    status: vi.fn().mockResolvedValue({ phase: 'idle', currentVersion: '1.0.0' }),
    check: vi.fn(),
    download: vi.fn(),
    install: vi.fn(),
  }

  render(<SoftwareUpdatePanel client={client} />)

  expect(screen.getByRole('link', { name: 'GitHub 项目' })).toHaveAttribute(
    'href',
    'https://github.com/DocJ2000/ironforge-workbench',
  )
})
