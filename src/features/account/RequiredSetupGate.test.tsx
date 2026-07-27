import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { RequiredSetupGate } from './RequiredSetupGate'

afterEach(() => {
  localStorage.clear()
  delete window.ironforgeDesktop
})

it('redirects packaged users to account settings when required setup is missing', async () => {
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
    <MemoryRouter initialEntries={['/workspace']}>
      <Routes>
        <Route element={<RequiredSetupGate />}>
          <Route path="/workspace" element={<p>项目页面</p>} />
        </Route>
        <Route path="/account" element={<p>请先前往账户页面填写必填项</p>} />
      </Routes>
    </MemoryRouter>,
  )

  await waitFor(() =>
    expect(
      screen.getByText('请先前往账户页面填写必填项'),
    ).toBeInTheDocument(),
  )
  expect(screen.queryByText('项目页面')).not.toBeInTheDocument()
})

it('opens the requested page after both required settings are complete', async () => {
  localStorage.setItem(
    'ironforge-workbench:organization',
    JSON.stringify({ gitlabUrl: 'https://gitlab.example.com', ironforgeUrl: '' }),
  )
  window.ironforgeDesktop = {
    platform: 'win32',
    packaged: true,
    credentials: {
      status: vi.fn().mockResolvedValue({ configured: true }),
      save: vi.fn(),
      clear: vi.fn(),
    },
  }

  render(
    <MemoryRouter initialEntries={['/workspace']}>
      <Routes>
        <Route element={<RequiredSetupGate />}>
          <Route path="/workspace" element={<p>项目页面</p>} />
        </Route>
        <Route path="/account" element={<p>账户页面</p>} />
      </Routes>
    </MemoryRouter>,
  )

  await waitFor(() => expect(screen.getByText('项目页面')).toBeInTheDocument())
})
