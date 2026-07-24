import { act, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getDemoRepository } from './demoRepository'
import { RepositoryProvider } from './RepositoryProvider'
import { useRepository } from './repositoryContext'

afterEach(() => {
  vi.unstubAllGlobals()
})

function Probe() {
  const { repository, source, error, refresh } = useRepository()
  return (
    <>
      <span>{repository.branch}</span>
      <span>{source}</span>
      <span>{error ?? 'ok'}</span>
      <button onClick={() => void refresh()} type="button">
        refresh
      </button>
    </>
  )
}

describe('RepositoryProvider', () => {
  it('loads live data and replaces it on refresh', async () => {
    const first = { ...getDemoRepository(), branch: 'dev/T2' }
    const second = { ...getDemoRepository(), branch: 'dev/T3' }
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ source: 'live', repository: first }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ source: 'live', repository: second }),
      })
    vi.stubGlobal('fetch', fetchMock)

    render(
      <RepositoryProvider>
        <Probe />
      </RepositoryProvider>,
    )

    await waitFor(() => expect(screen.getByText('live')).toBeVisible())
    await act(async () => screen.getByRole('button', { name: 'refresh' }).click())
    await waitFor(() => expect(screen.getByText('dev/T3')).toBeVisible())
  })

  it('keeps demo data and exposes an offline error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))

    render(
      <RepositoryProvider>
        <Probe />
      </RepositoryProvider>,
    )

    await waitFor(() => expect(screen.getByText('demo')).toBeVisible())
    expect(screen.getByText('无法读取本地仓库，当前显示演示数据')).toBeVisible()
  })
})
