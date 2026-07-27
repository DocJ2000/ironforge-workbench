import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { CredentialGate } from './CredentialGate'

afterEach(() => {
  delete window.ironforgeDesktop
})

it('keeps browser preview available without pretending credentials are saved', () => {
  render(
    <MemoryRouter>
      <CredentialGate projectId="project-one"><p>联网操作</p></CredentialGate>
    </MemoryRouter>,
  )
  expect(screen.getByText('联网操作')).toBeInTheDocument()
})

it('guides desktop users to configure the selected project', async () => {
  window.ironforgeDesktop = {
    platform: 'win32',
    packaged: true,
    credentials: {
      status: vi.fn().mockResolvedValue({ configured: false }),
      save: vi.fn(),
      clear: vi.fn(),
    },
  }
  render(
    <MemoryRouter>
      <CredentialGate projectId="project-one"><p>联网操作</p></CredentialGate>
    </MemoryRouter>,
  )

  await waitFor(() => expect(screen.getByText('先连接这台电脑')).toBeInTheDocument())
  expect(screen.queryByText('联网操作')).not.toBeInTheDocument()
  expect(screen.getByRole('link', { name: '去设置连接' })).toHaveAttribute(
    'href',
    '/account',
  )
})
