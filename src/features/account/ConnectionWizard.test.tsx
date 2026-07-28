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
  render(<ConnectionWizard gitlabUrl="https://git.example.com" onConfigured={vi.fn()} projectId="project-one" />)
  expect(
    screen.getByRole('heading', { name: '让软件连接公司 GitLab' }),
  ).toBeVisible()
  expect(screen.getByLabelText('软件访问码', { selector: 'input' })).toHaveAttribute('type', 'password')
  expect(screen.queryByText('SSH 私钥路径')).not.toBeInTheDocument()
})

it('generates a computer identity and saves the connection', async () => {
  const { save } = desktopBridge()
  render(<ConnectionWizard gitlabUrl="https://git.example.com" onConfigured={vi.fn()} projectId="project-one" />)
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

  expect(await screen.findByRole('button', { name: '复制电脑登记码' })).toBeVisible()
  expect(screen.getByText(/ssh-ed25519 AAAA/)).toBeVisible()
  expect(save).toHaveBeenCalledWith(
    expect.objectContaining({
      projectId: 'project-one',
      token: 'token-value',
      sshKeyPath: 'C:\\identities\\project-one',
    }),
  )
})

it('only offers the connection check after the computer registration step', async () => {
  desktopBridge()
  render(
    <ConnectionWizard
      gitlabUrl="https://git.example.com"
      onConfigured={vi.fn()}
      projectId="project-one"
    />,
  )
  await waitFor(() =>
    expect(screen.queryByText('正在读取连接状态')).not.toBeInTheDocument(),
  )
  fireEvent.change(screen.getByLabelText('软件访问码', { selector: 'input' }), {
    target: { value: 'token-value' },
  })
  fireEvent.click(screen.getByRole('button', { name: '下一步' }))

  expect(screen.queryByRole('button', { name: '检查连接' })).not.toBeInTheDocument()

  fireEvent.click(
    screen.getByRole('button', { name: '创建这台电脑的身份钥匙' }),
  )

  expect(await screen.findByRole('button', { name: '已添加，下一步' })).toBeVisible()
  expect(screen.queryByRole('button', { name: '检查连接' })).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: '已添加，下一步' }))
  expect(screen.getByRole('button', { name: '检查连接' })).toBeVisible()
})

it('turns technical connection failures into a next action', async () => {
  desktopBridge()
  window.ironforgeDesktop!.identity!.generate = vi
    .fn()
    .mockRejectedValue(new Error('connect ETIMEDOUT'))
  render(<ConnectionWizard gitlabUrl="https://git.example.com" onConfigured={vi.fn()} projectId="project-one" />)
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

it('does not skip setup screens when credentials already exist', async () => {
  desktopBridge()
  window.ironforgeDesktop!.credentials!.status = vi.fn().mockResolvedValue({
    configured: true,
    baseUrl: 'https://git.example.com',
    sshKeyPath: 'C:\\identities\\project-one',
  })
  window.ironforgeDesktop!.identity!.status = vi.fn().mockResolvedValue({
    configured: true,
  })
  window.ironforgeDesktop!.identity!.publicKey = vi.fn().mockResolvedValue({
    publicKey: 'ssh-ed25519 AAAA engineer',
  })

  render(<ConnectionWizard gitlabUrl="https://git.example.com" onConfigured={vi.fn()} projectId="project-one" />)

  expect(await screen.findByRole('heading', { name: '让软件连接公司 GitLab' })).toBeVisible()
  expect(screen.getByText('软件访问码已安全保存，可以继续使用。')).toBeVisible()
  expect(screen.queryByRole('heading', { name: '把这台电脑登记到 GitLab' })).not.toBeInTheDocument()
})

it('requires the access code again when the saved identity key is missing', async () => {
  const { save } = desktopBridge()
  window.ironforgeDesktop!.credentials!.status = vi.fn().mockResolvedValue({
    configured: true,
    baseUrl: 'https://git.example.com',
    sshKeyPath: 'C:\\identities\\missing',
  })
  window.ironforgeDesktop!.identity!.status = vi.fn().mockResolvedValue({
    configured: false,
  })

  render(<ConnectionWizard gitlabUrl="https://git.example.com" onConfigured={vi.fn()} projectId="project-one" />)

  await waitFor(() => expect(screen.getByRole('button', { name: '下一步' })).toBeDisabled())
  expect(save).not.toHaveBeenCalled()
})
