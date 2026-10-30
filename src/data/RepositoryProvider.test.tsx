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
      <span data-testid="project-ids">{projects.map((project) => project.id).join(',')}</span>
      <span>{repository.branch}</span>
      <span>{source}</span>
      <span>{error ?? 'ok'}</span>
      <span>{operationReady ? 'ready' : 'blocked'}</span>
      <button onClick={() => selectProject(projects[1]?.id)} type="button">select second</button>
      <button onClick={() => void refresh()} type="button">refresh</button>
    </>
  )
}

function projects() {
  return {
    list: [
      { id: 'project-one', path: 'C:\\one', name: 'one', gitlabRemote: '', addedAt: '2026-07-26T00:00:00Z' },
      { id: 'project-two', path: 'C:\\two', name: 'two', gitlabRemote: '', addedAt: '2026-07-26T00:00:00Z' },
    ],
  }
}

function snapshot(id: string, branch: string, displayName = 'Example') {
  return { ...getDemoRepository(), id, displayName, branch }
}

function respond(input: string, records: ReturnType<typeof projects>['list']) {
  if (input === '/api/projects') {
    return {
      ok: true,
      json: async () => ({ projects: records }),
    }
  }
  if (input.startsWith('/api/projects/summaries')) {
    return {
      ok: true,
      json: async () => ({
        projects: records.map((record) => ({
          id: record.id,
          repository: snapshot(
            record.id,
            record.id === 'project-two' ? 'dev/T1' : 'dev/T2',
            record.id === 'project-two' ? 'Second Project' : 'First Project',
          ),
        })),
      }),
    }
  }
  const second = input.includes('project-two')
  return {
    ok: true,
    json: async () => ({
      source: 'live',
      repository: snapshot(
        second ? 'project-two' : 'project-one',
        second ? 'dev/T1' : 'dev/T2',
        second ? 'Second Project' : 'First Project',
      ),
    }),
  }
}

describe('RepositoryProvider', () => {
  it('loads registered projects and refreshes the selected project', async () => {
    const fetcher = vi.fn().mockImplementation(async (input: string) => respond(input, projects().list))
    vi.stubGlobal('fetch', fetcher)
    render(<RepositoryProvider><Probe /></RepositoryProvider>)
    await waitFor(() => expect(screen.getByText('live')).toBeVisible())
    expect(screen.getByText('ready')).toBeVisible()
    await act(async () => screen.getByRole('button', { name: 'refresh' }).click())
    expect(screen.getByText('dev/T2')).toBeVisible()
  })

  it('lists every project from summaries and hydrates only the selected one', async () => {
    const fetcher = vi.fn().mockImplementation(async (input: string) => respond(input, projects().list))
    vi.stubGlobal('fetch', fetcher)

    render(<RepositoryProvider><Probe /></RepositoryProvider>)
    await waitFor(() => expect(screen.getByTestId('project-ids')).toHaveTextContent('project-one,project-two'))
    await waitFor(() => expect(screen.getByText('dev/T2')).toBeVisible())

    const repositoryReads = fetcher.mock.calls
      .map((call) => String(call[0]))
      .filter((url) => url.startsWith('/api/repository'))
    expect(repositoryReads).toHaveLength(1)
    expect(repositoryReads[0]).toContain('project-one')
    expect(fetcher.mock.calls.some((call) => String(call[0]).startsWith('/api/projects/summaries'))).toBe(true)
  })

  it('reloads the project list so a newly downloaded project becomes visible', async () => {
    let projectListRequests = 0
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (input: string) => {
      if (input === '/api/projects') {
        projectListRequests += 1
      }
      const records = projectListRequests > 1 ? projects().list : [projects().list[0]]
      return respond(input, records)
    }))

    render(<RepositoryProvider><Probe /></RepositoryProvider>)
    await waitFor(() => expect(screen.getByTestId('project-ids')).toHaveTextContent('project-one'))

    await act(async () => screen.getByRole('button', { name: 'refresh' }).click())

    await waitFor(() =>
      expect(screen.getByTestId('project-ids')).toHaveTextContent('project-one,project-two'),
    )
  })

  it('keeps demo data and exposes the registry error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    render(<RepositoryProvider><Probe /></RepositoryProvider>)
    await waitFor(() => expect(screen.getByText('offline')).toBeVisible())
    expect(screen.getByText('demo')).toBeVisible()
    expect(screen.getByText('blocked')).toBeVisible()
  })

  it('switches between two registered operational projects', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (input: string) => respond(input, projects().list)))
    render(<RepositoryProvider><Probe /></RepositoryProvider>)
    await waitFor(() => expect(screen.getByText('ready')).toBeVisible())
    await act(async () =>
      screen.getByRole('button', { name: 'select second' }).click(),
    )
    await waitFor(() => expect(screen.getByText('dev/T1')).toBeVisible())
    expect(screen.getByText('ready')).toBeVisible()
  })
})
