import type { RepositorySnapshot } from '../domain/repository'

export interface RepositoryResponse {
  source: 'live'
  repository: RepositorySnapshot
}

export async function fetchRepositorySnapshot(projectId?: string): Promise<RepositoryResponse> {
  const query = projectId ? `?projectId=${encodeURIComponent(projectId)}` : ''
  const response = await fetch(`/api/repository${query}`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`本地仓库读取失败 (${response.status})`)
  }

  return response.json() as Promise<RepositoryResponse>
}
