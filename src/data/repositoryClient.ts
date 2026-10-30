import type { RepositorySnapshot } from '../domain/repository'

export interface RepositoryResponse {
  source: 'live'
  repository: RepositorySnapshot
}

export interface RepositorySummaryEntry {
  id: string
  repository?: RepositorySnapshot
  error?: string
}

/**
 * Lightweight snapshots for the project list: branch, change count and sync
 * state without scanning every delivery package. The selected project is
 * hydrated with `fetchRepositorySnapshot`.
 */
export async function fetchRepositorySummaries(
  options: { refresh?: boolean } = {},
): Promise<{ projects: RepositorySummaryEntry[] }> {
  const query = options.refresh ? '?refresh=1' : ''
  const response = await fetch(`/api/projects/summaries${query}`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  })
  if (!response.ok) {
    throw new Error(`项目列表读取失败 (${response.status})`)
  }
  return response.json() as Promise<{ projects: RepositorySummaryEntry[] }>
}

/**
 * Reads one project snapshot.
 *
 * `refresh` asks the local service to fetch the remote before scanning. Only
 * an explicit user action ("刷新项目概况") should pass it: automatic page loads
 * must not run a `git fetch` per project.
 */
export async function fetchRepositorySnapshot(
  projectId?: string,
  options: { refresh?: boolean; signal?: AbortSignal } = {},
): Promise<RepositoryResponse> {
  const params = new URLSearchParams()
  if (projectId) params.set('projectId', projectId)
  if (options.refresh) params.set('refresh', '1')
  const query = params.size ? `?${params.toString()}` : ''
  const response = await fetch(`/api/repository${query}`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
    ...(options.signal ? { signal: options.signal } : {}),
  })

  if (!response.ok) {
    throw new Error(`本地仓库读取失败 (${response.status})`)
  }

  return response.json() as Promise<RepositoryResponse>
}
