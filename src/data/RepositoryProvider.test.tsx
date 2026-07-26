import { act, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getDemoRepository } from './demoRepository'
import { RepositoryProvider } from './RepositoryProvider'
import { useRepository } from './repositoryContext'

afterEach(() => vi.unstubAllGlobals())

function Probe() {
  const { repository, projects, source, error, refresh, selectProject, operationReady } =
    useRepository()
  return (
    <>
      <span>{repository.branch}</span>
      <span>{source}</span>
      <span>{error ?? 'ok'}</span>
      <span>{operationReady ? 'ready' : 'blocked'}</span>
      <button onClick={() => selectProject(projects[1]?.id)} type="button">select second</button>
      <button onClick={() => void refresh()} type="button">refresh</button>
    </>
  )
}

function liveFetch() {
  const first = { ...getDemoRepository(), id: 'project-one', branch: 'dev/T2' }
  const second = {
    ...getDemoRepository(),
    id: 'project-two',
    displayName: 'Second Project',
    branch: 'dev/T1',
  }
  return vi.fn().mockImplementation(async (input: string) => {
    if (input === '/api/projects') {
      return {
        ok: true,
        json: async () => ({
          projects: [
            { id: 'project-one', path: 'C:\\one', name: 'one', gitlabRemote: '', addedAt: '2026-07-26T00:00:00Z' },
            { id: 'project-two', path: 'C:\\two', name: 'two', gitlabRemote: '', addedAt: '2026-07-26T00:00:00Z' },
          ],
        }),
      }
    }
    const repository = input.includes('project-two') ? second : first
    return {
      ok: true,
      json: async () => ({ source: 'live', repository }),
    }
  })
}

describe('RepositoryProvider', () => {
  it('loads registered projects and refreshes the selected project', async () => {
    vi.stubGlobal('fetch', liveFetch())
    render(<RepositoryProvider><Probe /></RepositoryProvider>)
    await waitFor(() => expect(screen.getByText('live')).toBeVisible())
    expect(screen.getByText('ready')).toBeVisible()
    await act(async () => screen.getByRole('button', { name: 'refresh' }).click())
    expect(screen.getByText('dev/T2')).toBeVisible()
  })

  it('keeps demo data and exposes the registry error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    render(<RepositoryProvider><Probe /></RepositoryProvider>)
    await waitFor(() => expect(screen.getByText('offline')).toBeVisible())
    expect(screen.getByText('demo')).toBeVisible()
    expect(screen.getByText('blocked')).toBeVisible()
  })

  it('switches between two registered operational projects', async () => {
    vi.stubGlobal('fetch', liveFetch())
    render(<RepositoryProvider><Probe /></RepositoryProvider>)
    await waitFor(() => expect(screen.getByText('ready')).toBeVisible())
    await act(async () =>
      screen.getByRole('button', { name: 'select second' }).click(),
    )
    await waitFor(() => expect(screen.getByText('dev/T1')).toBeVisible())
    expect(screen.getByText('ready')).toBeVisible()
  })
})
