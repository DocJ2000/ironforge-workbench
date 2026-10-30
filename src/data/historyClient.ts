import type { HistoryEvent } from '../domain/repository'

/**
 * Reads the GitLab timeline for one project.
 *
 * The local service caches the assembled timeline for a short while; the
 * explicit "刷新记录" button passes `refresh` to bypass that cache.
 */
export async function fetchGitLabHistory(projectId: string, refresh = false) {
  const params = new URLSearchParams({ projectId })
  if (refresh) params.set('refresh', '1')
  const response = await fetch(`/api/gitlab/history?${params.toString()}`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  })
  const payload = (await response.json()) as {
    history?: HistoryEvent[]
    error?: string
  }
  if (!response.ok) throw new Error(payload.error ?? '无法读取 GitLab 历史')
  return payload.history ?? []
}
