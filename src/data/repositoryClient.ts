import type { RepositorySnapshot } from '../domain/repository'

export interface RepositoryResponse {
  source: 'live'
  repository: RepositorySnapshot
}

export async function fetchRepositorySnapshot(): Promise<RepositoryResponse> {
  const response = await fetch('/api/repository', {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`本地仓库读取失败 (${response.status})`)
  }

  return response.json() as Promise<RepositoryResponse>
}
