import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { ConnectionWizard } from './ConnectionWizard'

afterEach(() => {
  delete window.ironforgeDesktop
})

function desktopBridge() {
  const save = vi.fn().mockResolvedValue({ configured: true })
  window.ironforgeDesktop = {
    platform: 'win32',
    packaged: true,
    credentials: {
      status: vi.fn().mockResolvedValue({ configured: false }),
      save,
      clear: vi.fn(),
    },
    identity: {
      status: vi.fn().mockResolvedValue({ configured: false }),
      generate: vi.fn().mockResolvedValue({
        configured: true,
        publicKey: 'ssh-ed25519 AAAA engineer',
        pathHint: 'C:\\identities\\project-one',
      }),
      publicKey: vi.fn(),
    },
  }
  return { save }
}

it('starts with plain-language access-code guidance', () => {
  render(<ConnectionWizard onConfigured={vi.fn()} projectId="project-one" />)
  expect(
    screen.getByRole('heading', { name: '让软件连接公司 GitLab' }),
  ).toBeVisible()
  expect(screen.getByLabelText('软件访问码', { selector: 'input' })).toHaveAttribute('type', 'password')
  expect(screen.queryByText('SSH 私钥路径')).not.toBeInTheDocument()
})

it('generates a computer identity and saves the connection', async () => {
  const { save } = desktopBridge()
  render(<ConnectionWizard onConfigured={vi.fn()} projectId="project-one" />)
  await waitFor(() =>
    expect(screen.queryByText('正在读取连接状态')).not.toBeInTheDocument(),
  )
  fireEvent.change(screen.getByLabelText('软件访问码', { selector: 'input' }), {
    target: { value: 'token-value' },
  })
  fireEvent.click(screen.getByRole('button', { name: '下一步' }))
  fireEvent.click(
    screen.getByRole('button', { name: '创建这台电脑的身份钥匙' }),
  )

  expect(await screen.findByRole('button', { name: '复制公钥' })).toBeVisible()
  expect(screen.getByText(/ssh-ed25519 AAAA/)).toBeVisible()
  expect(save).toHaveBeenCalledWith(
    expect.objectContaining({
      projectId: 'project-one',
      token: 'token-value',
      sshKeyPath: 'C:\\identities\\project-one',
    }),
  )
})

it('turns technical connection failures into a next action', async () => {
  desktopBridge()
  window.ironforgeDesktop!.identity!.generate = vi
    .fn()
    .mockRejectedValue(new Error('connect ETIMEDOUT'))
  render(<ConnectionWizard onConfigured={vi.fn()} projectId="project-one" />)
  await waitFor(() =>
    expect(screen.queryByText('正在读取连接状态')).not.toBeInTheDocument(),
  )
  fireEvent.change(screen.getByLabelText('软件访问码', { selector: 'input' }), {
    target: { value: 'token-value' },
  })
  fireEvent.click(screen.getByRole('button', { name: '下一步' }))
  fireEvent.click(
    screen.getByRole('button', { name: '创建这台电脑的身份钥匙' }),
  )

  expect(
    await screen.findByText(
      '暂时无法连接公司服务器。请确认已连接公司网络后重试。',
    ),
  ).toBeVisible()
})
