import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AccountPage } from './AccountPage'

afterEach(() => {
  localStorage.clear()
  delete window.ironforgeDesktop
})

function configuredDesktop() {
  window.ironforgeDesktop = {
    platform: 'win32',
    packaged: true,
    credentials: {
      status: vi.fn().mockResolvedValue({
        configured: true,
        baseUrl: 'https://git.example.com',
        sshKeyPath: 'C:\\keys\\computer',
      }),
      save: vi.fn(),
      clear: vi.fn(),
    },
    identity: {
      status: vi.fn().mockResolvedValue({ configured: true }),
      generate: vi.fn(),
      publicKey: vi.fn(),
    },
    userData: {
      reset: vi.fn().mockResolvedValue({ ok: true }),
    },
  }
}

it('starts with a simple welcome screen and reveals one setup step', () => {
  render(<MemoryRouter><AccountPage /></MemoryRouter>)

  expect(screen.getByRole('heading', { name: '连接公司项目服务器' })).toBeVisible()
  expect(screen.queryByLabelText('GitLab Token', { selector: 'input' })).not.toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: '开始设置' }))

  expect(screen.getByRole('heading', { name: '填写公司地址' })).toBeVisible()
  expect(screen.getByText('第 1 步，共 6 步')).toBeVisible()
})

it('explains what reset clears before doing it', async () => {
  configuredDesktop()
  localStorage.setItem('ironforge-workbench:organization', JSON.stringify({ gitlabUrl: 'https://git.example.com' }))
  localStorage.setItem('ironforge-workbench:connection-verified', 'true')
  render(<MemoryRouter><AccountPage /></MemoryRouter>)

  await screen.findByRole('heading', { name: '重置用户信息' })
  fireEvent.click(screen.getByRole('button', { name: '重置用户信息' }))

  expect(screen.getByRole('heading', { name: '确定重置这台电脑的用户信息？' })).toBeVisible()
  expect(screen.getByText('不会清除')).toBeVisible()
  expect(screen.getByText(/工程图纸和 GitLab 云端文件/)).toBeVisible()
})

it('shows a compact summary and keeps software update outside professional display', async () => {
  configuredDesktop()
  localStorage.setItem(
    'ironforge-workbench:organization',
    JSON.stringify({
      gitlabUrl: 'https://git.example.com',
      ironforgeUrl: 'https://delivery.example.com/projects',
    }),
  )
  localStorage.setItem('ironforge-workbench:connection-verified', 'true')

  render(<MemoryRouter><AccountPage /></MemoryRouter>)

  expect(await screen.findByRole('heading', { name: '已完成初始设置' })).toBeVisible()
  expect(screen.getByRole('heading', { name: '软件更新' })).toBeVisible()
  expect(screen.getByText('专业显示：手动使用已有的电脑身份钥匙')).toBeVisible()
  expect(screen.getByLabelText('GitLab Token', { selector: 'input' })).not.toBeVisible()

  fireEvent.click(screen.getByText('专业显示：手动使用已有的电脑身份钥匙'))
  await waitFor(() => expect(screen.getByLabelText('GitLab Token', { selector: 'input' })).toHaveAttribute('type', 'password'))
})
